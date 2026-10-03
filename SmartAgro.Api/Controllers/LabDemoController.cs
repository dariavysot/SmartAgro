using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAgro.Api.DTOs;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;

namespace SmartAgro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LabDemoController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public LabDemoController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    /// <summary>
    /// Перевірка поточної активної СУБД
    /// </summary>
    [HttpGet("current-provider")]
    public IActionResult GetCurrentProvider()
    {
        var provider = _configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSql";
        var dbName = _context.Database.ProviderName;
        return Ok(new
        {
            ConfiguredProvider = provider,
            EfCoreProviderName = dbName
        });
    }

    // ==========================================
    // 1. CREATE: Створення зв'язаних сутностей
    // ==========================================
    [HttpPost("greenhouses")]
    public async Task<IActionResult> CreateGreenhouse([FromBody] CreateGreenhouseDto dto)
    {
        var greenhouse = new Greenhouse
        {
            Name = dto.Name,
            Location = dto.Location
        };

        // Додаємо пов'язаний запис телеметрії
        greenhouse.SensorReadings.Add(new SensorData
        {
            Temperature = dto.InitialTemperature,
            Humidity = dto.InitialHumidity,
            Co2Level = dto.InitialCo2,
            DiseaseRiskScore = 15.5,
            Timestamp = DateTime.UtcNow
        });

        // Додаємо пов'язаний поріг
        greenhouse.Thresholds.Add(new Threshold
        {
            MinTemperature = 18.0,
            MaxTemperature = 30.0,
            MinHumidity = 40.0,
            MaxHumidity = 80.0,
            MaxCo2Level = 1000.0
        });

        // Якщо температура зависока — генеруємо сповіщення (Alert)
        if (dto.InitialTemperature > 30.0)
        {
            greenhouse.Alerts.Add(new Alert
            {
                Message = $"Висока температура під час запуску: {dto.InitialTemperature}°C",
                Severity = "Warning",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.Greenhouses.AddAsync(greenhouse);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGreenhouseById), new { id = greenhouse.Id }, greenhouse);
    }

    // ==========================================
    // 2. READ + LINQ Include: Отримання зв'язків
    // ==========================================
    [HttpGet("greenhouses/{id:guid}")]
    public async Task<IActionResult> GetGreenhouseById(Guid id)
    {
        var greenhouse = await _context.Greenhouses
            .Include(g => g.SensorReadings)
            .Include(g => g.Alerts)
            .Include(g => g.Thresholds)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (greenhouse == null)
            return NotFound("Теплицю не знайдено");

        return Ok(greenhouse);
    }

    // ==========================================
    // 3. LINQ: Фільтрація, Сортування, Проєкція, Агрегація
    // ==========================================
    [HttpGet("analytics/summary")]
    public async Task<IActionResult> GetAnalyticsSummary([FromQuery] double minTempFilter = 0.0)
    {
        // LINQ запит демонструє:
        // 1. Where (фільтрація)
        // 2. OrderByDescending (сортування)
        // 3. Select (проєкція в DTO)
        // 4. Count, Average, Max (агрегація над зв'язаними сутностями)
        var summary = await _context.Greenhouses
            .Where(g => g.SensorReadings.Any(s => s.Temperature >= minTempFilter))
            .OrderByDescending(g => g.SensorReadings.Count)
            .Select(g => new GreenhouseSummaryDto
            {
                Id = g.Id,
                Name = g.Name,
                Location = g.Location,
                TotalReadingsCount = g.SensorReadings.Count,
                AverageTemperature = g.SensorReadings.Any() ? g.SensorReadings.Average(s => s.Temperature) : 0,
                MaxTemperature = g.SensorReadings.Any() ? g.SensorReadings.Max(s => s.Temperature) : 0,
                ActiveAlertsCount = g.Alerts.Count(a => !a.IsResolved)
            })
            .ToListAsync();

        return Ok(summary);
    }

    // ==========================================
    // 4. UPDATE: Оновлення даних
    // ==========================================
    [HttpPut("greenhouses/{id:guid}")]
    public async Task<IActionResult> UpdateGreenhouse(Guid id, [FromBody] UpdateGreenhouseDto dto)
    {
        var greenhouse = await _context.Greenhouses.FindAsync(id);
        if (greenhouse == null)
            return NotFound("Теплицю не знайдено");

        greenhouse.Name = dto.Name;
        greenhouse.Location = dto.Location;

        await _context.SaveChangesAsync();
        return Ok(greenhouse);
    }

    // ==========================================
    // 5. DELETE: Видалення сутності
    // ==========================================
    [HttpDelete("greenhouses/{id:guid}")]
    public async Task<IActionResult> DeleteGreenhouse(Guid id)
    {
        var greenhouse = await _context.Greenhouses.FindAsync(id);
        if (greenhouse == null)
            return NotFound("Теплицю не знайдено");

        _context.Greenhouses.Remove(greenhouse);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}