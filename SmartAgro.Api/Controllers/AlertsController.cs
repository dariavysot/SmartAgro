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
    /// <summary>
    /// Повертає список невирішених (активних) тривог.
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveAlerts(CancellationToken ct)
    {
        var alerts = await dbContext.Alerts
            .AsNoTracking()
            .Where(a => !a.IsResolved)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

        return Ok(alerts);
    }

    /// <summary>
    /// Повертає історію тривог для конкретної теплиці.
    /// </summary>
    [HttpGet("greenhouse/{greenhouseId:guid}")]
    public async Task<IActionResult> GetAlertsByGreenhouse(Guid greenhouseId, [FromQuery] bool? unresolvedOnly, CancellationToken ct)
    {
        var query = dbContext.Alerts
            .AsNoTracking()
            .Where(a => a.GreenhouseId == greenhouseId);

        if (unresolvedOnly == true)
        {
            query = query.Where(a => !a.IsResolved);
        }

        var alerts = await query.OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        return Ok(alerts);
    }

    /// <summary>
    /// Позначає тривогу як вирішену агрономом.
    /// </summary>
    [HttpPost("{id:long}/resolve")]
    public async Task<IActionResult> ResolveAlert(long id, CancellationToken ct)
    {
        var alert = await dbContext.Alerts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (alert == null)
        {
            return NotFound(new { message = $"Тривогу з Id {id} не знайдено." });
        }

        alert.IsResolved = true;
        await dbContext.SaveChangesAsync(ct);

        return Ok(new { message = $"Тривогу #{id} успішно закрито.", alertId = alert.Id });
    }
}