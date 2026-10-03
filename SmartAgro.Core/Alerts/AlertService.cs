using Microsoft.EntityFrameworkCore;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;

namespace SmartAgro.Core.Alerts;

public sealed class AlertService(AppDbContext dbContext) : IAlertService
{
    public async Task CheckThresholdsAndCreateAlertsAsync(SensorData sensorData, CancellationToken ct = default)
    {
        // 1. Отримуємо пороги для поточної теплиці
        var threshold = await dbContext.Thresholds
            .FirstOrDefaultAsync(t => t.GreenhouseId == sensorData.GreenhouseId, ct);

        double minTemp = threshold?.MinTemperature ?? 18.0;
        double maxTemp = threshold?.MaxTemperature ?? 32.0;
        double minHum = threshold?.MinHumidity ?? 40.0;
        double maxHum = threshold?.MaxHumidity ?? 85.0;
        double maxCo2 = threshold?.MaxCo2Level ?? 1200.0;

        var alertsToCreate = new List<Alert>();

        // Перевірка температури
        if (sensorData.Temperature < minTemp || sensorData.Temperature > maxTemp)
        {
            alertsToCreate.Add(new Alert
            {
                GreenhouseId = sensorData.GreenhouseId,
                Severity = sensorData.Temperature > maxTemp + 4.0 || sensorData.Temperature < minTemp - 4.0 ? "Critical" : "Warning",
                Message = $"Температура {sensorData.Temperature:F1}°C вийшла за безпечні межі [{minTemp:F1} - {maxTemp:F1}°C]",
                CreatedAt = DateTime.UtcNow,
                IsResolved = false
            });
        }

        // Перевірка вологості повітря
        if (sensorData.Humidity < minHum || sensorData.Humidity > maxHum)
        {
            alertsToCreate.Add(new Alert
            {
                GreenhouseId = sensorData.GreenhouseId,
                Severity = sensorData.Humidity > 90.0 ? "Critical" : "Warning",
                Message = $"Вологість повітря {sensorData.Humidity:F1}% поза нормою [{minHum:F1} - {maxHum:F1}%]",
                CreatedAt = DateTime.UtcNow,
                IsResolved = false
            });
        }

        // Перевірка рівня CO2
        if (sensorData.Co2Level > maxCo2)
        {
            alertsToCreate.Add(new Alert
            {
                GreenhouseId = sensorData.GreenhouseId,
                Severity = sensorData.Co2Level > maxCo2 + 300.0 ? "Critical" : "Warning",
                Message = $"Рівень CO2 {sensorData.Co2Level:F0} ppm перевищує критичну норму {maxCo2:F0} ppm",
                CreatedAt = DateTime.UtcNow,
                IsResolved = false
            });
        }

        // 2. Перевірка ML DiseaseRiskScore > 75% (Вимога Спринту 2)
        if (sensorData.DiseaseRiskScore > 75.0)
        {
            alertsToCreate.Add(new Alert
            {
                GreenhouseId = sensorData.GreenhouseId,
                Severity = "Critical",
                Message = $"КРИТИЧНО (ML): Високий ризик розвитку фітофторозу/захворювання: {sensorData.DiseaseRiskScore:F1}%!",
                CreatedAt = DateTime.UtcNow,
                IsResolved = false
            });
        }

        if (alertsToCreate.Count > 0)
        {
            await dbContext.Alerts.AddRangeAsync(alertsToCreate, ct);
            await dbContext.SaveChangesAsync(ct);
        }
    }
}