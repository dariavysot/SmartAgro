namespace SmartAgro.Core.Entities;

public class Alert
{
    public long Id { get; set; }
    public Guid GreenhouseId { get; set; }
    public Greenhouse? Greenhouse { get; set; }

    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "Warning"; // Warning, Critical
    public bool IsResolved { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}