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

    // Стан теплиці для забезпечення теплової інерції (фізичної плавності)
    private double _currentTemp = 21.5;
    private double _currentHumidity = 68.0;
    private double _currentCo2 = 720.0;
    private double _currentSoil = 65.0;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Читання інтервалу з конфігурації (за замовчуванням 10 хвилин)
        var intervalMinutes = configuration.GetValue<double>("SimulatorSettings:IntervalMinutes", 10.0);
        var enableAnomalies = configuration.GetValue<bool>("SimulatorSettings:EnableAnomalies", true);
        var interval = TimeSpan.FromMinutes(intervalMinutes);

        logger.LogInformation("IoT симулятор запущено. Інтервал опитування: {Minutes} хв.", intervalMinutes);

        using var timer = new PeriodicTimer(interval);

        // Виконуємо першу ітерацію одразу при старті сервісу
        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var alertService = scope.ServiceProvider.GetRequiredService<IAlertService>();

                var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(stoppingToken);
                if (greenhouse == null)
                {
                    // 1. Шукаємо будь-якого наявного користувача
                    var defaultUser = await dbContext.Users.FirstOrDefaultAsync(stoppingToken);

                    // Якщо база порожня — створюємо системного користувача (Admin), щоб задовольнити foreign key
                    if (defaultUser == null)
                    {
                        var adminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == UserRole.Admin, stoppingToken)
                                        ?? await dbContext.Roles.FirstOrDefaultAsync(stoppingToken);

                        defaultUser = new User
                        {
                            Id = Guid.NewGuid(),
                            Username = "admin",
                            Email = "admin@smartagro.local",
                            PasswordHash = "AQAAAAIAAYagAAAAEOvSystemInitHashDefaultPlaceHolder==",
                            Salt = "SystemAutoSeedSalt==",
                            RoleId = adminRole?.Id ?? 1,
                            CreatedAt = DateTime.UtcNow
                        };

                        await dbContext.Users.AddAsync(defaultUser, stoppingToken);
                        await dbContext.SaveChangesAsync(stoppingToken);

                        logger.LogInformation("Створено початкового системного користувача: {Email} (ID: {UserId})", defaultUser.Email, defaultUser.Id);
                    }

                    // 2. Створюємо першу теплицю з коректним UserId
                    greenhouse = new Greenhouse
                    {
                        Id = Guid.NewGuid(),
                        Name = "Головна Теплиця (Smart Unit 1)",
                        Location = "Сектор А",
                        UserId = defaultUser.Id
                    };

                    await dbContext.Greenhouses.AddAsync(greenhouse, stoppingToken);
                    await dbContext.SaveChangesAsync(stoppingToken);

                    logger.LogInformation("Створено початкову теплицю: {Name} (ID: {GreenhouseId}) для користувача {UserId}", greenhouse.Name, greenhouse.Id, defaultUser.Id);
                }

                // 1. Фізична модель добового циклу (Diurnal Cycle)
                var now = DateTime.UtcNow;
                // Час доби в годинах (0.0 .. 23.99)
                double hourOfDay = now.Hour + (now.Minute / 60.0);

                // Температурний пік о 14:00 (сонячний полудень у теплиці), мінімум о 05:00
                // phaseShift = 14:00 - 6 годин (четвертина періоду) = 8.0
                double targetTemp = 22.0 + 5.5 * Math.Sin((2.0 * Math.PI / 24.0) * (hourOfDay - 8.0));

                // Вологість обернено пропорційна температурі (вдень сухіше, вночі конденсат)
                double targetHumidity = 70.0 - 18.0 * Math.Sin((2.0 * Math.PI / 24.0) * (hourOfDay - 8.0));

                // CO2 падає вдень через фотосинтез і накопичується вночі
                double targetCo2 = 800.0 - 250.0 * Math.Sin((2.0 * Math.PI / 24.0) * (hourOfDay - 8.0));

                // 2. Інерційне наближення до цільової точки з мікрошумом датчика (+-0.2..0.5)
                _currentTemp = Math.Round(_currentTemp * 0.7 + targetTemp * 0.3 + (_random.NextDouble() * 0.4 - 0.2), 2);
                _currentHumidity = Math.Round(_currentHumidity * 0.7 + targetHumidity * 0.3 + (_random.NextDouble() * 1.0 - 0.5), 2);
                _currentCo2 = Math.Round(_currentCo2 * 0.7 + targetCo2 * 0.3 + (_random.NextDouble() * 20.0 - 10.0), 2);

                // Вологість ґрунту випаровується повільно
                _currentSoil = Math.Round(_currentSoil - (_random.NextDouble() * 0.15) + (_currentSoil < 48.0 ? 15.0 : 0.0), 2);

                double temp = _currentTemp;
                double humidity = _currentHumidity;
                double co2 = _currentCo2;
                double soilMoisture = _currentSoil;

                // 3. Рідкісні аномалії (імовірність 2%)
                if (enableAnomalies)
                {
                    int anomalyChance = _random.Next(1, 100);
                    if (anomalyChance == 99)
                    {
                        temp = 36.2;
                        logger.LogWarning("[ANOMALY GENERATED] Критичний перегрів: {Temp}°C", temp);
                    }
                    else if (anomalyChance == 1)
                    {
                        co2 = 1380.0;
                        logger.LogWarning("[ANOMALY GENERATED] Критичний рівень CO2: {Co2} ppm", co2);
                    }
                }

                // 4. ML-інференс ризику захворювань
                float risk = mlService.PredictDiseaseRisk(temp, humidity, co2, soilMoisture);

                var rawData = new SensorData
                {
                    GreenhouseId = greenhouse.Id,
                    Temperature = temp,
                    Humidity = humidity,
                    Co2Level = co2,
                    DiseaseRiskScore = Math.Round(risk, 2),
                    Timestamp = DateTime.UtcNow
                };

                // 5. Шифрування та HMAC підпис
                var encryptedPackage = cryptoService.EncryptAndSign(rawData);

                // 6. Верифікація та збереження
                var verifiedData = cryptoService.VerifyAndDecrypt<SensorData>(encryptedPackage);
                verifiedData.Signature = encryptedPackage.HmacSignatureBase64;
                verifiedData.Timestamp = encryptedPackage.TimestampUtc;

                await dbContext.SensorData.AddAsync(verifiedData, stoppingToken);
                await dbContext.SaveChangesAsync(stoppingToken);

                // 7. Перевірка порогів та створення тривог
                await alertService.CheckThresholdsAndCreateAlertsAsync(verifiedData, stoppingToken);

                // 8. Трансляція підписникам
                await telemetryNotifier.BroadcastTelemetryAsync(new
                {
                    verifiedData.Id,
                    verifiedData.GreenhouseId,
                    verifiedData.Temperature,
                    verifiedData.Humidity,
                    verifiedData.Co2Level,
                    verifiedData.DiseaseRiskScore,
                    soilMoisture,
                    verifiedData.Timestamp,
                    verifiedData.Signature
                }, stoppingToken);

                logger.LogInformation("[IoT Telemetry] T: {Temp}°C | H: {Humidity}% | CO2: {Co2} ppm | ML Risk: {Risk}%",
                    temp, humidity, co2, verifiedData.DiseaseRiskScore);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Помилка під час ітерації фонового симулятора.");
            }
        }
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }
}