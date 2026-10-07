using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAgro.Api.DTOs;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;

namespace SmartAgro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GreenhousesController(AppDbContext dbContext) : ControllerBase
{
    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(idClaim, out var userId) ? userId : Guid.Empty;
    }

    /// <summary>
    /// Отримати теплиці поточного автентифікованого користувача
    /// </summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyGreenhouses(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
            return Unauthorized();

        var greenhouses = await dbContext.Greenhouses
            .AsNoTracking()
            .Where(g => g.UserId == userId)
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Location,
                ReadingsCount = g.SensorReadings.Count
            })
            .ToListAsync(ct);

        return Ok(greenhouses);
    }

    /// <summary>
    /// Отримати всі теплиці системи (Тільки для Admin)
    /// </summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllGreenhouses(CancellationToken ct)
    {
        var greenhouses = await dbContext.Greenhouses
            .AsNoTracking()
            .Include(g => g.User)
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Location,
                OwnerId = g.UserId,
                OwnerUsername = g.User != null ? g.User.Username : "Невідомо",
                OwnerEmail = g.User != null ? g.User.Email : "Невідомо",
                ReadingsCount = g.SensorReadings.Count
            })
            .ToListAsync(ct);

        return Ok(greenhouses);
    }

    /// <summary>
    /// Отримати список зареєстрованих клієнтів для прив'язки теплиці (Тільки для Admin)
    /// </summary>
    [HttpGet("users-list")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUsersForAssignment(CancellationToken ct)
    {
        var users = await dbContext.Users
            .AsNoTracking()
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.Role
            })
            .ToListAsync(ct);

        return Ok(users);
    }

    /// <summary>
    /// Створити та налаштувати нову теплицю і закріпити її за клієнтом (Тільки для Admin)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateGreenhouse([FromBody] CreateGreenhouseDto dto, CancellationToken ct)
    {
        var targetUserExists = await dbContext.Users.AnyAsync(u => u.Id == dto.UserId, ct);
        if (!targetUserExists)
        {
            return BadRequest(new { message = "Вказаного користувача не знайдено в системі." });
        }

        var greenhouse = new Greenhouse
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Location = dto.Location,
            UserId = dto.UserId
        };

        await dbContext.Greenhouses.AddAsync(greenhouse, ct);

        // Початкові межі (Thresholds)
        var defaultThresholds = new Threshold
        {
            GreenhouseId = greenhouse.Id,
            MinTemperature = 18.0,
            MaxTemperature = 28.0,
            MinHumidity = 50.0,
            MaxHumidity = 75.0,
            MaxCo2Level = 1000.0
        };
        await dbContext.Thresholds.AddAsync(defaultThresholds, ct);

        await dbContext.SaveChangesAsync(ct);

        return Ok(greenhouse);
    }

    /// <summary>
    /// Оновити параметри теплиці (Тільки для Admin)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateGreenhouse(Guid id, [FromBody] UpdateGreenhouseDto dto, CancellationToken ct)
    {
        var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (greenhouse == null)
            return NotFound(new { message = "Теплицю не знайдено." });

        greenhouse.Name = dto.Name;
        greenhouse.Location = dto.Location;

        await dbContext.SaveChangesAsync(ct);
        return Ok(greenhouse);
    }

    /// <summary>
    /// Видалити теплицю з комплексу (Тільки для Admin)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteGreenhouse(Guid id, CancellationToken ct)
    {
        var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (greenhouse == null)
            return NotFound(new { message = "Теплицю не знайдено." });

        dbContext.Greenhouses.Remove(greenhouse);
        await dbContext.SaveChangesAsync(ct);

        return NoContent();
    }

    /// <summary>
    /// Отримати зведену статистику (GreenhouseSummaryDto) для аналітики
    /// </summary>
    [HttpGet("summary/{id:guid}")]
    public async Task<IActionResult> GetSummary(Guid id, CancellationToken ct)
    {
        var summary = await dbContext.Greenhouses
            .AsNoTracking()
            .Where(g => g.Id == id)
            .Select(g => new GreenhouseSummaryDto
            {
                Id = g.Id,
                Name = g.Name,
                Location = g.Location,
                TotalReadingsCount = g.SensorReadings.Count,
                AverageTemperature = g.SensorReadings.Any() ? Math.Round(g.SensorReadings.Average(r => r.Temperature), 2) : 0,
                MaxTemperature = g.SensorReadings.Any() ? Math.Round(g.SensorReadings.Max(r => r.Temperature), 2) : 0,
                ActiveAlertsCount = dbContext.Alerts.Count(a => a.GreenhouseId == g.Id && !a.IsResolved)
            })
            .FirstOrDefaultAsync(ct);

        if (summary == null)
            return NotFound(new { message = "Теплицю не знайдено." });

        return Ok(summary);
    }
}