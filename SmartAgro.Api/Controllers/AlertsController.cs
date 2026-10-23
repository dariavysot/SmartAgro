using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAgro.Core.Data;

namespace SmartAgro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AlertsController(AppDbContext dbContext) : ControllerBase
{
    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(idClaim, out var userId) ? userId : Guid.Empty;
    }

    /// <summary>
    /// Повертає повну незмінну історію тривог із назвами теплиць (для сторінки журналу).
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAllAlertsHistory([FromQuery] Guid? greenhouseId, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        // Якщо вказано конкретну теплицю — перевіряємо право доступу користувача до неї
        if (greenhouseId.HasValue && greenhouseId.Value != Guid.Empty && !isAdmin)
        {
            var ownsGreenhouse = await dbContext.Greenhouses
                .AsNoTracking()
                .AnyAsync(g => g.Id == greenhouseId.Value && g.UserId == userId, ct);

            if (!ownsGreenhouse)
            {
                return Forbid();
            }
        }

        var query = dbContext.Alerts
            .AsNoTracking()
            .Include(a => a.Greenhouse)
            .AsQueryable();

        // Ізоляція ресурсів: звичайний користувач бачить сповіщення лише своїх комплексів
        if (!isAdmin)
        {
            query = query.Where(a => a.Greenhouse != null && a.Greenhouse.UserId == userId);
        }

        if (greenhouseId.HasValue && greenhouseId.Value != Guid.Empty)
        {
            query = query.Where(a => a.GreenhouseId == greenhouseId.Value);
        }

        var alerts = await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.GreenhouseId,
                GreenhouseName = a.Greenhouse != null ? a.Greenhouse.Name : "Невідомий сектор",
                a.Message,
                a.Severity,
                a.IsResolved,
                a.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(alerts);
    }

    /// <summary>
    /// Повертає список невирішених (активних) тривог.
    /// </summary>
    [HttpGet("active")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetActiveAlerts(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var query = dbContext.Alerts
            .AsNoTracking()
            .Include(a => a.Greenhouse)
            .Where(a => !a.IsResolved)
            .AsQueryable();

        // Звичайний користувач бачить лише активні інциденти власних комплексів
        if (!isAdmin)
        {
            query = query.Where(a => a.Greenhouse != null && a.Greenhouse.UserId == userId);
        }

        var alerts = await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.GreenhouseId,
                GreenhouseName = a.Greenhouse != null ? a.Greenhouse.Name : "Невідомий сектор",
                a.Message,
                a.Severity,
                a.IsResolved,
                a.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(alerts);
    }

    /// <summary>
    /// Позначає тривогу як вирішену (без видалення самого запису).
    /// </summary>
    [HttpPost("{id:long}/resolve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResolveAlert(long id, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var alert = await dbContext.Alerts
            .Include(a => a.Greenhouse)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (alert == null)
        {
            return NotFound(new { message = $"Тривогу з Id {id} не знайдено." });
        }

        // Захист від маніпуляцій чужими даними: закривати інцидент дозволено лише адміну або власнику теплиці
        if (!isAdmin && alert.Greenhouse?.UserId != userId)
        {
            return Forbid();
        }

        alert.IsResolved = true;
        await dbContext.SaveChangesAsync(ct);

        return Ok(new { message = $"Тривогу #{id} позначено як вирішену.", alertId = alert.Id });
    }
}