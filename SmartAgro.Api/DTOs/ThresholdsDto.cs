namespace SmartAgro.Api.DTOs;

public class ThresholdsDto
{
    public double MinTemperature { get; set; } = 18.0;
    public double MaxTemperature { get; set; } = 28.0;
    public double MinHumidity { get; set; } = 50.0;
    public double MaxHumidity { get; set; } = 80.0;
    public double MaxCo2Level { get; set; } = 1000.0;
    public double MinSoilMoisture { get; set; } = 45.0;
    public double MaxSoilMoisture { get; set; } = 75.0;
}