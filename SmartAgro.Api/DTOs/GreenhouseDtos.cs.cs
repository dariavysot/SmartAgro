using System.ComponentModel.DataAnnotations;

namespace SmartAgro.Api.DTOs;

public class CreateGreenhouseDto
{
    [Required(ErrorMessage = "Назва теплиці є обов'язковою.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Назва теплиці має містити від 2 до 100 символів.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Локація/сектор є обов'язковою.")]
    [StringLength(150, ErrorMessage = "Локація не може перевищувати 150 символів.")]
    public string Location { get; set; } = string.Empty;

    [Required(ErrorMessage = "Обов'язково вкажіть ID клієнта-власника.")]
    public Guid UserId { get; set; }

    // Валідація фізично можливих діапазонів значень для теплиці
    [Range(-20.0, 60.0, ErrorMessage = "Початкова температура має бути в межах від -20°C до 60°C.")]
    public double InitialTemperature { get; set; } = 22.0;

    [Range(0.0, 100.0, ErrorMessage = "Початкова вологість має бути в межах від 0% до 100%.")]
    public double InitialHumidity { get; set; } = 65.0;

    [Range(200.0, 5000.0, ErrorMessage = "Рівень CO2 має бути в межах від 200 до 5000 ppm.")]
    public double InitialCo2 { get; set; } = 600.0;
}

public class UpdateGreenhouseDto
{
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Назва теплиці має містити від 2 до 100 символів.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(150, ErrorMessage = "Локація не може перевищувати 150 символів.")]
    public string Location { get; set; } = string.Empty;

    public Guid? UserId { get; set; }
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