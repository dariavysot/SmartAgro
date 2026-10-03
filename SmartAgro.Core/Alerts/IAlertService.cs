using SmartAgro.Core.Entities;

namespace SmartAgro.Core.Alerts;

public interface IAlertService
{
    /// <summary>
    /// Перевіряє сенсорні показники та розрахований ML-ризик на відповідність пороговим значенням.
    /// У разі перевищення автоматично створює записи в таблиці Alerts.
    /// </summary>
    Task CheckThresholdsAndCreateAlertsAsync(SensorData sensorData, CancellationToken ct = default);
}