namespace SmartAgro.Core.Entities;

public class Greenhouse
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;

    // Власник теплиці
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public ICollection<SensorData> SensorReadings { get; set; } = new List<SensorData>();
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
    public ICollection<Threshold> Thresholds { get; set; } = new List<Threshold>();
}