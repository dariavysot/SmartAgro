using Microsoft.EntityFrameworkCore;
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
    ILogger<GreenhouseSimulatorService> logger) : BackgroundService
{
    private readonly Random _random = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("IoT симулятор теплиць запущено (Real-time streaming enabled).");

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(4));

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var alertService = scope.ServiceProvider.GetRequiredService<IAlertService>();

                var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(stoppingToken);
                if (greenhouse == null)
                {
                    greenhouse = new Greenhouse
                    {
                        Id = Guid.NewGuid(),
                        Name = "Головна Теплиця (Smart Unit 1)",
                        Location = "Сектор А"
                    };
                    await dbContext.Greenhouses.AddAsync(greenhouse, stoppingToken);
                    await dbContext.SaveChangesAsync(stoppingToken);
                }

                // 1. Моделювання фізичних параметрів
                double temp = Math.Round(22.0 + 8.0 * Math.Sin(DateTime.UtcNow.Minute) + (_random.NextDouble() * 2 - 1), 2);
                double humidity = Math.Round(65.0 + 15.0 * Math.Cos(DateTime.UtcNow.Minute) + (_random.NextDouble() * 4 - 2), 2);
                double co2 = Math.Round(750.0 + (_random.NextDouble() * 300 - 150), 2);
                double soilMoisture = Math.Round(60.0 + (_random.NextDouble() * 10 - 5), 2);

                // Аномалії для тестування
                int anomalyCheck = _random.Next(1, 100);
                if (anomalyCheck > 90)
                {
                    temp = 36.5;
                    logger.LogWarning("[ANOMALY GENERATED] Критичний стрибок температури: {Temp}°C", temp);
                }
                else if (anomalyCheck < 10)
                {
                    co2 = 1450.0;
                    logger.LogWarning("[ANOMALY GENERATED] Критична концентрація CO2: {Co2} ppm", co2);
                }

                // 2. ML-інференс ризику захворювань
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

                // 3. Шифрування та підпис пакета
                var encryptedPackage = cryptoService.EncryptAndSign(rawData);

                // 4. Верифікація та дешифрування
                var verifiedData = cryptoService.VerifyAndDecrypt<SensorData>(encryptedPackage);
                verifiedData.Signature = encryptedPackage.HmacSignatureBase64;
                verifiedData.Timestamp = encryptedPackage.TimestampUtc;

                // 5. Запис у базу даних
                await dbContext.SensorData.AddAsync(verifiedData, stoppingToken);
                await dbContext.SaveChangesAsync(stoppingToken);

                // 6. Перевірка порогів та створення тривог
                await alertService.CheckThresholdsAndCreateAlertsAsync(verifiedData, stoppingToken);

                // 7. Трансляція підписникам через нотифікатор
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

                logger.LogInformation("[IoT Telemetry -> Live Stream] T: {Temp}°C | H: {Humidity}% | CO2: {Co2} ppm | Risk: {Risk}%",
                    temp, humidity, co2, verifiedData.DiseaseRiskScore);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Помилка під час ітерації фонового симулятора.");
            }
        }
    }
}