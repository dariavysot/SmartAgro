using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartAgro.Core.Alerts;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;
using SmartAgro.Core.ML;
using SmartAgro.Core.Security;
using SmartAgro.Core.Telemetry;

namespace SmartAgro.Core.Simulator;

public sealed class GreenhouseSimulatorService(
    IServiceScopeFactory scopeFactory,
    IDiseasePredictionService mlService,
    ITelemetryCryptoService cryptoService,
    ILogger<GreenhouseSimulatorService> logger) : BackgroundService
{
    private readonly Random _random = new();
    private double _timeStep = 0.0;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(">>> IoT Greenhouse Simulator запущено. Інтервал опитування: 4 секунди.");

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(4));

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ProcessSimulationTickAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Помилка під час ітерації IoT-симулятора.");
            }
        }

        logger.LogInformation(">>> IoT Greenhouse Simulator зупинено.");
    }

    private async Task ProcessSimulationTickAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var alertService = scope.ServiceProvider.GetRequiredService<IAlertService>();

        // Отримуємо першу теплицю або створюємо демонстраційну
        var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(ct);
        if (greenhouse == null)
        {
            greenhouse = new Greenhouse { Name = "Основна смарт-теплиця №1", Location = "Сектор А" };
            await dbContext.Greenhouses.AddAsync(greenhouse, ct);
            await dbContext.SaveChangesAsync(ct);
        }

        // 1. Моделювання фізичних коливань мікроклімату
        _timeStep += 0.15;
        double sinWave = Math.Sin(_timeStep);

        double temp = 26.0 + sinWave * 6.0 + (_random.NextDouble() - 0.5) * 1.5;         // 18 - 34 °C
        double hum = 65.0 - sinWave * 20.0 + (_random.NextDouble() - 0.5) * 4.0;         // 40 - 95 %
        double co2 = 800.0 + sinWave * 350.0 + (_random.NextDouble() - 0.5) * 50.0;      // 400 - 1400 ppm
        double simulatedSoilMoisture = 55.0 + Math.Cos(_timeStep) * 20.0;                 // 30 - 80 % для ML-моделі

        // 2. Імітація випадкових аномалій (ймовірність ~10%)
        bool isAnomaly = _random.Next(0, 10) == 0;
        if (isAnomaly)
        {
            int anomalyType = _random.Next(0, 3);
            if (anomalyType == 0)
            {
                temp = 36.5; // Перегрів
                logger.LogWarning("[ANOMALY GENERATED] Критичний стрибок температури: {Temp}°C", temp);
            }
            else if (anomalyType == 1)
            {
                hum = 95.5; // Підвищена вологість
                logger.LogWarning("[ANOMALY GENERATED] Критичний рівень вологості: {Hum}%", hum);
            }
            else
            {
                co2 = 1450.0; // Критичний рівень CO2
                logger.LogWarning("[ANOMALY GENERATED] Критична концентрація CO2: {Co2} ppm", co2);
            }
        }

        // 3. Збагачення ML-інференсом (ONNX Model)
        float diseaseRisk = mlService.PredictDiseaseRisk(temp, hum, co2, simulatedSoilMoisture);

        // 4. Формування базової моделі SensorData
        var rawTelemetry = new SensorData
        {
            GreenhouseId = greenhouse.Id,
            Temperature = Math.Round(temp, 2),
            Humidity = Math.Round(hum, 2),
            Co2Level = Math.Round(co2, 2),
            DiseaseRiskScore = Math.Round(diseaseRisk, 2),
            Timestamp = DateTime.UtcNow
        };

        // 5. Криптографічний захист передачі (Data in Transit): AES-256 + HMAC-SHA256
        EncryptedTelemetryPackage encryptedPackage = cryptoService.EncryptAndSign(rawTelemetry);

        // 6. Імітація прийому на сервері: перевірка цілісності та розшифрування
        SensorData validatedData = cryptoService.VerifyAndDecrypt<SensorData>(encryptedPackage);

        // Зберігаємо підпис для аудиту цілісності
        validatedData.Signature = encryptedPackage.HmacSignatureBase64;

        // 7. Збереження в базу даних
        await dbContext.SensorData.AddAsync(validatedData, ct);
        await dbContext.SaveChangesAsync(ct);

        logger.LogInformation(
            "[IoT Telemetry] T: {Temp}°C | H: {Hum}% | CO2: {Co2} ppm | Risk: {Risk}% (Захищено AES-256 + HMAC)",
            validatedData.Temperature, validatedData.Humidity, validatedData.Co2Level, validatedData.DiseaseRiskScore);

        // 8. Перевірка порогів та автоматичне створення Alerts
        await alertService.CheckThresholdsAndCreateAlertsAsync(validatedData, ct);
    }
}