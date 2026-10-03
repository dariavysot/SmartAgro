namespace SmartAgro.Api.DTOs;

public class CreateGreenhouseDto
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public double InitialTemperature { get; set; }
    public double InitialHumidity { get; set; }
    public double InitialCo2 { get; set; }
}

public class UpdateGreenhouseDto
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
}

// DTO для демонстрації LINQ-проєкції (Select) та агрегації
public class GreenhouseSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public int TotalReadingsCount { get; set; }
    public double AverageTemperature { get; set; }
    public double MaxTemperature { get; set; }
    public int ActiveAlertsCount { get; set; }
}