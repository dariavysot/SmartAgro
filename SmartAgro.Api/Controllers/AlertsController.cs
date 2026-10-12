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
    /// Повертає повну незмінну історію тривог із назвами теплиць (для сторінки журналу).
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetAllAlertsHistory([FromQuery] Guid? greenhouseId, CancellationToken ct)
    {
        var query = dbContext.Alerts
            .AsNoTracking()
            .Include(a => a.Greenhouse)
            .AsQueryable();

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
    public async Task<IActionResult> GetActiveAlerts(CancellationToken ct)
    {
        var alerts = await dbContext.Alerts
            .AsNoTracking()
            .Include(a => a.Greenhouse)
            .Where(a => !a.IsResolved)
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
    public async Task<IActionResult> ResolveAlert(long id, CancellationToken ct)
    {
        var alert = await dbContext.Alerts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (alert == null)
        {
            return NotFound(new { message = $"Тривогу з Id {id} не знайдено." });
        }

        alert.IsResolved = true;
        await dbContext.SaveChangesAsync(ct);

        return Ok(new { message = $"Тривогу #{id} позначено як вирішену.", alertId = alert.Id });
    }
}