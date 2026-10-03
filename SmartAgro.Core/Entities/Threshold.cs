namespace SmartAgro.Core.Entities;

public class Threshold
{
    public int Id { get; set; }
    public Guid GreenhouseId { get; set; }
    public Greenhouse? Greenhouse { get; set; }

    public double MinTemperature { get; set; } = 18.0;
    public double MaxTemperature { get; set; } = 32.0;

    public double MinHumidity { get; set; } = 40.0;
    public double MaxHumidity { get; set; } = 85.0;

    public double MaxCo2Level { get; set; } = 1200.0;
}