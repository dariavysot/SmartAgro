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
            .Where(u => u.Role != null && u.Role.Name != UserRole.Admin) // Звертаємось до u.Role.Name
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                Role = u.Role != null ? u.Role.Name.ToString() : "User"
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
        var targetUser = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == dto.UserId, ct);

        if (targetUser == null)
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

        // Повертаємо чистий об'єкт без циклічних зв'язків
        return Ok(new
        {
            greenhouse.Id,
            greenhouse.Name,
            greenhouse.Location,
            greenhouse.UserId,
            OwnerUsername = targetUser.Username,
            OwnerEmail = targetUser.Email
        });
    }

    /// <summary>
    /// Оновити параметри теплиці (Тільки для Admin)
    /// </summary>
    /// <summary>
    /// Оновити параметри теплиці та за потреби змінити власника (Тільки для Admin)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateGreenhouse(Guid id, [FromBody] UpdateGreenhouseDto dto, CancellationToken ct)
    {
        var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (greenhouse == null)
            return NotFound(new { message = "Теплицю не знайдено." });

        if (!string.IsNullOrWhiteSpace(dto.Name))
            greenhouse.Name = dto.Name.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Location))
            greenhouse.Location = dto.Location.Trim();

        // Якщо передано нового власника і він відрізняється від поточного
        if (dto.UserId.HasValue && dto.UserId.Value != Guid.Empty && dto.UserId.Value != greenhouse.UserId)
        {
            var userExists = await dbContext.Users.AnyAsync(u => u.Id == dto.UserId.Value, ct);
            if (!userExists)
                return BadRequest(new { message = "Вказаного користувача не існує." });

            greenhouse.UserId = dto.UserId.Value;
        }

        await dbContext.SaveChangesAsync(ct);

        return Ok(new
        {
            greenhouse.Id,
            greenhouse.Name,
            greenhouse.Location,
            greenhouse.UserId
        });
    }

    /// <summary>
    /// Видалити теплицю з комплексу (Тільки для Admin)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteGreenhouse(Guid id, CancellationToken ct)
    {
        var greenhouse = await dbContext.Greenhouses
            .Include(g => g.SensorReadings)
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        if (greenhouse == null)
            return NotFound(new { message = "Теплицю не знайдено." });

        // Очищаємо зв'язані пороги та сповіщення, якщо вони є в контексті
        var thresholds = await dbContext.Thresholds.Where(t => t.GreenhouseId == id).ToListAsync(ct);
        if (thresholds.Count > 0)
            dbContext.Thresholds.RemoveRange(thresholds);

        var alerts = await dbContext.Alerts.Where(a => a.GreenhouseId == id).ToListAsync(ct);
        if (alerts.Count > 0)
            dbContext.Alerts.RemoveRange(alerts);

        // Видаляємо саму теплицю (разом із SensorReadings через навігаційну властивість)
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