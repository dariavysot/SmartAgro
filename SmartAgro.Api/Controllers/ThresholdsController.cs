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
[Authorize] // Загальний доступ вимагає валідного JWT Bearer токена
public class ThresholdsController(AppDbContext dbContext) : ControllerBase
{
    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(idClaim, out var userId) ? userId : Guid.Empty;
    }

    /// <summary>
    /// Отримання порогових значень конкретної теплиці (User може бачити лише власні, Admin — будь-які).
    /// </summary>
    [HttpGet("{greenhouseId:guid}")]
    [ProducesResponseType(typeof(Threshold), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetThresholdsByGreenhouse(Guid greenhouseId, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var greenhouse = await dbContext.Greenhouses
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == greenhouseId, ct);

        if (greenhouse == null)
            return NotFound(new { message = $"Теплицю з Id '{greenhouseId}' не знайдено." });

        // Ізоляція ресурсів: заборона перегляду налаштувань чужого комплексу
        if (!isAdmin && greenhouse.UserId != userId)
            return Forbid();

        var thresholds = await dbContext.Thresholds
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.GreenhouseId == greenhouseId, ct);

        if (thresholds == null)
            return NotFound(new { message = "Порогові значення для цієї теплиці ще не налаштовані." });

        return Ok(thresholds);
    }

    /// <summary>
    /// Оновлення або встановлення меж мікроклімату теплиці (Доступ за політикою RequireAdminOnly).
    /// </summary>
    [HttpPost("{greenhouseId:guid}")]
    [Authorize(Policy = "RequireAdminOnly")]
    [ProducesResponseType(typeof(Threshold), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateThresholds(Guid greenhouseId, [FromBody] ThresholdsDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Бізнес-валідація логічних меж діапазонів
        if (dto.MinTemperature >= dto.MaxTemperature)
            return BadRequest(new { message = "Мінімальна температура не може бути більшою або рівною максимальній." });

        if (dto.MinHumidity >= dto.MaxHumidity)
            return BadRequest(new { message = "Мінімальна вологість не може бути більшою або рівною максимальній." });

        var greenhouse = await dbContext.Greenhouses.FirstOrDefaultAsync(g => g.Id == greenhouseId, ct);
        if (greenhouse == null)
            return NotFound(new { message = $"Теплицю з Id '{greenhouseId}' не знайдено." });

        var threshold = await dbContext.Thresholds.FirstOrDefaultAsync(t => t.GreenhouseId == greenhouseId, ct);

        if (threshold == null)
        {
            threshold = new Threshold
            {
                GreenhouseId = greenhouseId,
                MinTemperature = dto.MinTemperature,
                MaxTemperature = dto.MaxTemperature,
                MinHumidity = dto.MinHumidity,
                MaxHumidity = dto.MaxHumidity,
                MaxCo2Level = dto.MaxCo2Level
            };
            await dbContext.Thresholds.AddAsync(threshold, ct);
        }
        else
        {
            threshold.MinTemperature = dto.MinTemperature;
            threshold.MaxTemperature = dto.MaxTemperature;
            threshold.MinHumidity = dto.MinHumidity;
            threshold.MaxHumidity = dto.MaxHumidity;
            threshold.MaxCo2Level = dto.MaxCo2Level;
        }

        await dbContext.SaveChangesAsync(ct);

        return Ok(threshold);
    }
}