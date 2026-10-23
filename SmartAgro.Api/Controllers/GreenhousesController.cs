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
[Authorize] // Загальний доступ вимагає валідного JWT-токена
public class GreenhousesController(AppDbContext dbContext) : ControllerBase
{
    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(idClaim, out var userId) ? userId : Guid.Empty;
    }

    /// <summary>
    /// GET /api/greenhouses
    /// Основний REST ендпоінт. Отримує список теплиць із підтримкою пошуку, фільтрації та сортування.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetGreenhouses(
        [FromQuery] string? search,
        [FromQuery] string? location,
        [FromQuery] string? sortBy = "name",
        [FromQuery] bool isDescending = false,
        CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var query = dbContext.Greenhouses
            .AsNoTracking()
            .Include(g => g.User)
            .AsQueryable();

        // Ізоляція ресурсів: звичайний користувач бачить тільки свої теплиці
        if (!isAdmin)
        {
            query = query.Where(g => g.UserId == userId);
        }

        // Пошук за назвою або сектором
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(g => g.Name.ToLower().Contains(searchLower)
                                  || g.Location.ToLower().Contains(searchLower));
        }

        // Точна фільтрація за локацією
        if (!string.IsNullOrWhiteSpace(location))
        {
            query = query.Where(g => g.Location == location.Trim());
        }

        // Динамічне сортування
        query = (sortBy?.ToLower()) switch
        {
            "location" => isDescending ? query.OrderByDescending(g => g.Location) : query.OrderBy(g => g.Location),
            "readings" => isDescending ? query.OrderByDescending(g => g.SensorReadings.Count) : query.OrderBy(g => g.SensorReadings.Count),
            _ => isDescending ? query.OrderByDescending(g => g.Name) : query.OrderBy(g => g.Name)
        };

        var result = await query
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

        return Ok(result);
    }

    /// <summary>
    /// GET /api/greenhouses/all
    /// Псевдонім для зворотної сумісності з попередніми версіями клієнта
    /// </summary>
    [HttpGet("all")]
    [Authorize(Policy = "RequireAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public Task<IActionResult> GetAllGreenhousesLegacy(CancellationToken ct) =>
        GetGreenhouses(null, null, "name", false, ct);

    /// <summary>
    /// GET /api/greenhouses/my
    /// Псевдонім для отримання списку тільки власних теплиць
    /// </summary>
    [HttpGet("my")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public Task<IActionResult> GetMyGreenhousesLegacy(CancellationToken ct) =>
        GetGreenhouses(null, null, "name", false, ct);

    /// <summary>
    /// GET /api/greenhouses/{id}
    /// Отримати детальну інформацію про теплицю (захист від доступу до чужих об'єктів -> 403 Forbidden)
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGreenhouseById(Guid id, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var greenhouse = await dbContext.Greenhouses
            .AsNoTracking()
            .Include(g => g.User)
            .Where(g => g.Id == id)
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
            .FirstOrDefaultAsync(ct);

        if (greenhouse == null)
            return NotFound(new { message = $"Теплицю з Id '{id}' не знайдено." });

        // Перевірка прав власності: користувач не може переглядати чужу теплицю
        if (!isAdmin && greenhouse.OwnerId != userId)
            return Forbid();

        return Ok(greenhouse);
    }

    /// <summary>
    /// POST /api/greenhouses
    /// Створити новий тепличний сектор (Доступ за політикою RequireAdminOnly)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireAdminOnly")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateGreenhouse([FromBody] CreateGreenhouseDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var targetUser = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == dto.UserId, ct);

        if (targetUser == null)
            return BadRequest(new { message = "Вказаного користувача-власника не знайдено в системі." });

        var greenhouse = new Greenhouse
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Location = dto.Location.Trim(),
            UserId = dto.UserId
        };

        await dbContext.Greenhouses.AddAsync(greenhouse, ct);

        // Ініціалізація стандартних безпечних порогів мікроклімату
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

        var responseDto = new
        {
            greenhouse.Id,
            greenhouse.Name,
            greenhouse.Location,
            greenhouse.UserId,
            OwnerUsername = targetUser.Username,
            OwnerEmail = targetUser.Email,
            ReadingsCount = 0
        };

        return CreatedAtAction(nameof(GetGreenhouseById), new { id = greenhouse.Id }, responseDto);
    }

    /// <summary>
    /// PUT /api/greenhouses/{id}
    /// Оновити назву, сектор або власника теплиці (Доступ за політикою RequireAdminOnly)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateGreenhouse(Guid id, [FromBody] UpdateGreenhouseDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (greenhouse == null)
            return NotFound(new { message = $"Теплицю з Id '{id}' не знайдено." });

        if (!string.IsNullOrWhiteSpace(dto.Name))
            greenhouse.Name = dto.Name.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Location))
            greenhouse.Location = dto.Location.Trim();

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
    /// DELETE /api/greenhouses/{id}
    /// Демонтувати теплицю та всі пов'язані ресурси (Доступ за політикою RequireAdminOnly)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireAdminOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteGreenhouse(Guid id, CancellationToken ct)
    {
        var greenhouse = await dbContext.Greenhouses
            .Include(g => g.SensorReadings)
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        if (greenhouse == null)
            return NotFound(new { message = $"Теплицю з Id '{id}' не знайдено." });

        var thresholds = await dbContext.Thresholds.Where(t => t.GreenhouseId == id).ToListAsync(ct);
        if (thresholds.Count > 0)
            dbContext.Thresholds.RemoveRange(thresholds);

        var alerts = await dbContext.Alerts.Where(a => a.GreenhouseId == id).ToListAsync(ct);
        if (alerts.Count > 0)
            dbContext.Alerts.RemoveRange(alerts);

        dbContext.Greenhouses.Remove(greenhouse);
        await dbContext.SaveChangesAsync(ct);

        return NoContent();
    }

    /// <summary>
    /// GET /api/greenhouses/users-list
    /// Отримати список клієнтів (Доступ за політикою RequireAdminOnly)
    /// </summary>
    [HttpGet("users-list")]
    [Authorize(Policy = "RequireAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsersForAssignment(CancellationToken ct)
    {
        var users = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Role != null && u.Role.Name != UserRole.Admin)
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
}