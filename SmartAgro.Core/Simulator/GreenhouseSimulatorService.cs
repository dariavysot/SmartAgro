using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartAgro.Core.Alerts;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;
using SmartAgro.Core.ML;
using SmartAgro.Core.Security;

namespace SmartAgro.Core.Simulator;

public sealed class GreenhouseSimulatorService(
    IServiceScopeFactory scopeFactory,
    IDiseasePredictionService mlService,
    ITelemetryCryptoService cryptoService,
    ITelemetryNotifier telemetryNotifier,
    IConfiguration configuration,
    ILogger<GreenhouseSimulatorService> logger) : BackgroundService
{
    private readonly Random _random = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalMinutes = configuration.GetValue<double>("SimulatorSettings:IntervalMinutes", 10.0);
        var enableAnomalies = configuration.GetValue<bool>("SimulatorSettings:EnableAnomalies", true);
        var interval = TimeSpan.FromMinutes(intervalMinutes);

        logger.LogInformation("IoT симулятор мульти-теплиць запущено. Інтервал: {Minutes} хв.", intervalMinutes);

        using var timer = new PeriodicTimer(interval);

        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var alertService = scope.ServiceProvider.GetRequiredService<IAlertService>();
                var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

                // 1. Перевіряємо та підтягуємо всі теплиці
                var greenhouses = await dbContext.Greenhouses.ToListAsync(stoppingToken);

                // Якщо база повністю порожня — гарантуємо наявність першого адміна та базової теплиці
                if (greenhouses.Count == 0)
                {
                    var defaultUser = await dbContext.Users.FirstOrDefaultAsync(stoppingToken);
                    if (defaultUser == null)
                    {
                        var adminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == UserRole.Admin, stoppingToken)
                                        ?? await dbContext.Roles.FirstOrDefaultAsync(stoppingToken);

                        var (pwdHash, salt) = passwordHasher.HashPassword("Admin123!");

                        defaultUser = new User
                        {
                            Id = Guid.NewGuid(),
                            Username = "admin",
                            Email = "admin@smartagro.local",
                            PasswordHash = pwdHash,
                            Salt = salt,
                            RoleId = adminRole?.Id ?? 1,
                            CreatedAt = DateTime.UtcNow
                        };

                        await dbContext.Users.AddAsync(defaultUser, stoppingToken);
                        await dbContext.SaveChangesAsync(stoppingToken);

                        logger.LogInformation("Створено початкового адміністратора: {Email}", defaultUser.Email);
                    }

                    var initialGreenhouse = new Greenhouse
                    {
                        Id = Guid.NewGuid(),
                        Name = "Головна Теплиця (Smart Unit 1)",
                        Location = "Сектор А",
                        UserId = defaultUser.Id
                    };

                    await dbContext.Greenhouses.AddAsync(initialGreenhouse, stoppingToken);
                    await dbContext.SaveChangesAsync(stoppingToken);

                    greenhouses.Add(initialGreenhouse);
                }

                // 2. Розрахунок глобального добового циклу (сонце, час доби)
                var now = DateTime.UtcNow;
                double hourOfDay = now.Hour + (now.Minute / 60.0);
                double baseTemp = 22.0 + 5.5 * Math.Sin((2.0 * Math.PI / 24.0) * (hourOfDay - 8.0));
                double baseHumidity = 70.0 - 18.0 * Math.Sin((2.0 * Math.PI / 24.0) * (hourOfDay - 8.0));
                double baseCo2 = 800.0 - 250.0 * Math.Sin((2.0 * Math.PI / 24.0) * (hourOfDay - 8.0));

                var sensorBatch = new List<SensorData>();

                // 3. Генерація мікроклімату для кожної теплиці
                foreach (var gh in greenhouses)
                {
                    // Детермінований мікрокліматичний зсув на основі ID теплиці
                    int hash = Math.Abs(gh.Id.GetHashCode());
                    double tempOffset = ((hash % 7) - 3) * 0.4;       // від -1.2°C до +1.2°C
                    double humOffset = (((hash / 7) % 9) - 4) * 0.8;  // від -3.2% до +3.2%
                    double co2Offset = (((hash / 13) % 11) - 5) * 15; // від -75 до +75 ppm

                    double temp = Math.Round(baseTemp + tempOffset + (_random.NextDouble() * 0.4 - 0.2), 2);
                    double humidity = Math.Round(baseHumidity + humOffset + (_random.NextDouble() * 1.0 - 0.5), 2);
                    double co2 = Math.Round(baseCo2 + co2Offset + (_random.NextDouble() * 20.0 - 10.0), 2);
                    double soilMoisture = Math.Round(62.0 + ((hash % 5) * 2.0) + (_random.NextDouble() * 1.0 - 0.5), 2);

                    // Рідкісні аномалії для конкретної теплиці (2%)
                    if (enableAnomalies)
                    {
                        int anomalyChance = _random.Next(1, 100);
                        if (anomalyChance == 99)
                        {
                            temp = 36.5;
                            logger.LogWarning("[ANOMALY] Критичний перегрів у теплиці '{Name}': {Temp}°C", gh.Name, temp);
                        }
                        else if (anomalyChance == 1)
                        {
                            co2 = 1380.0;
                            logger.LogWarning("[ANOMALY] Критичний рівень CO2 у теплиці '{Name}': {Co2} ppm", gh.Name, co2);
                        }
                    }

                    // ML-інференс
                    float risk = mlService.PredictDiseaseRisk(temp, humidity, co2, soilMoisture);

                    var rawData = new SensorData
                    {
                        GreenhouseId = gh.Id,
                        Temperature = temp,
                        Humidity = humidity,
                        Co2Level = co2,
                        DiseaseRiskScore = Math.Round(risk, 2),
                        Timestamp = DateTime.UtcNow
                    };

                    // Шифрування та верифікація підпису
                    var encryptedPackage = cryptoService.EncryptAndSign(rawData);
                    var verifiedData = cryptoService.VerifyAndDecrypt<SensorData>(encryptedPackage);
                    verifiedData.Signature = encryptedPackage.HmacSignatureBase64;
                    verifiedData.Timestamp = encryptedPackage.TimestampUtc;

                    sensorBatch.Add(verifiedData);

                    // Трансляція в SignalR з обов'язковим вказанням GreenhouseId
                    await telemetryNotifier.BroadcastTelemetryAsync(new
                    {
                        verifiedData.Id,
                        verifiedData.GreenhouseId,
                        GreenhouseName = gh.Name,
                        verifiedData.Temperature,
                        verifiedData.Humidity,
                        verifiedData.Co2Level,
                        verifiedData.DiseaseRiskScore,
                        soilMoisture,
                        verifiedData.Timestamp,
                        verifiedData.Signature
                    }, stoppingToken);

                    // Перевірка індивідуальних тривог для кожної теплиці
                    await alertService.CheckThresholdsAndCreateAlertsAsync(verifiedData, stoppingToken);
                }

                // 4. Пакетне збереження в базу за одну швидку транзакцію
                if (sensorBatch.Count > 0)
                {
                    await dbContext.SensorData.AddRangeAsync(sensorBatch, stoppingToken);
                    await dbContext.SaveChangesAsync(stoppingToken);

                    logger.LogInformation("Оброблено та зафіксовано телеметрію для {Count} теплиць.", sensorBatch.Count);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Помилка під час ітерації фонового симулятора мульти-теплиць.");
            }
        }
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }
}