namespace SmartAgro.Api.DTOs;

public class CreateGreenhouseDto
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid UserId { get; set; } // Обов'язкова прив'язка до клієнта адміністратором

    // Початкові межі/значення за замовчуванням (опціонально)
    public double InitialTemperature { get; set; } = 22.0;
    public double InitialHumidity { get; set; } = 65.0;
    public double InitialCo2 { get; set; } = 600.0;
}

public class UpdateGreenhouseDto
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
}

/// <summary>
/// DTO для LINQ-проєкції, агрегації статистики та аналітики дашборду
/// </summary>
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