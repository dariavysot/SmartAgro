namespace SmartAgro.Core.Entities;

public class SensorData
{
    public long Id { get; set; }
    public Guid GreenhouseId { get; set; }
    public Greenhouse? Greenhouse { get; set; }

    public double Temperature { get; set; }
    public double Humidity { get; set; }
    public double Co2Level { get; set; }

    // Результат інференсу ML-моделі (0.0 - 100.0%)
    public double DiseaseRiskScore { get; set; }

    // HMAC підпис пакета для перевірки цілісності телеметрії
    public string? Signature { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}