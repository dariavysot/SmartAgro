using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAgro.Core.Alerts;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;
using SmartAgro.Core.ML;
using SmartAgro.Core.Security;
using SmartAgro.Core.Telemetry;

namespace SmartAgro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Загальний доступ вимагає валідного JWT Bearer токена
public sealed class TelemetryController(
    AppDbContext dbContext,
    ITelemetryCryptoService cryptoService,
    IDiseasePredictionService mlService,
    IAlertService alertService,
    ILogger<TelemetryController> logger) : ControllerBase
{
    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(idClaim, out var userId) ? userId : Guid.Empty;
    }

    /// <summary>
    /// Перевірка чи має поточний користувач доступ до зазначеної теплиці (Admin або безпосередній власник)
    /// </summary>
    private async Task<bool> UserHasAccessToGreenhouseAsync(Guid greenhouseId, CancellationToken ct)
    {
        if (User.IsInRole("Admin"))
            return true;

        var userId = GetCurrentUserId();
        return await dbContext.Greenhouses
            .AsNoTracking()
            .AnyAsync(g => g.Id == greenhouseId && g.UserId == userId, ct);
    }

    /// <summary>
    /// Отримує останній зріз телеметрії для обраної теплиці (перевірка ізоляції: чужа теплиця -> 403 Forbidden).
    /// </summary>
    [HttpGet("latest/{greenhouseId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLatestTelemetry(Guid greenhouseId, CancellationToken ct)
    {
        var greenhouseExists = await dbContext.Greenhouses.AnyAsync(g => g.Id == greenhouseId, ct);
        if (!greenhouseExists)
        {
            return NotFound(new { message = $"Теплицю з Id '{greenhouseId}' не знайдено." });
        }

        // Захист від несанкціонованого доступу до чужих показників сенсорів
        if (!await UserHasAccessToGreenhouseAsync(greenhouseId, ct))
        {
            return Forbid();
        }

        var latest = await dbContext.SensorData
            .AsNoTracking()
            .Where(s => s.GreenhouseId == greenhouseId)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync(ct);

        if (latest == null)
        {
            return NotFound(new { message = "Дані телеметрії для цієї теплиці ще не зареєстровані." });
        }

        return Ok(latest);
    }

    /// <summary>
    /// Отримує історію показників сенсорів (до 200 записів) з перевіркою прав доступу.
    /// </summary>
    [HttpGet("history/{greenhouseId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHistory(Guid greenhouseId, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var greenhouseExists = await dbContext.Greenhouses.AnyAsync(g => g.Id == greenhouseId, ct);
        if (!greenhouseExists)
        {
            return NotFound(new { message = $"Теплицю з Id '{greenhouseId}' не знайдено." });
        }

        if (!await UserHasAccessToGreenhouseAsync(greenhouseId, ct))
        {
            return Forbid();
        }

        int safeLimit = Math.Clamp(limit, 1, 200);

        var history = await dbContext.SensorData
            .AsNoTracking()
            .Where(s => s.GreenhouseId == greenhouseId)
            .OrderByDescending(s => s.Timestamp)
            .Take(safeLimit)
            .ToListAsync(ct);

        return Ok(history);
    }

    /// <summary>
    /// Захищений шлюз прийому телеметрії (доступ за політикою RequireAdminOnly).
    /// Верифікує HMAC-SHA256, розшифровує AES-256 та розраховує ризики ML.
    /// </summary>
    [HttpPost("secure-ingest")]
    [Authorize(Policy = "RequireAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> IngestEncryptedTelemetry([FromBody] EncryptedTelemetryPackage package, CancellationToken ct)
    {
        try
        {
            // 1. Дешифрування та верифікація цифрового підпису цілісності HMAC-SHA256
            var sensorData = cryptoService.VerifyAndDecrypt<SensorData>(package);
            sensorData.Signature = package.HmacSignatureBase64;
            sensorData.Timestamp = package.TimestampUtc;

            // 2. Якщо оцінка ризику хвороб відсутня, запускаємо локальний ML-висновок
            if (sensorData.DiseaseRiskScore <= 0.0)
            {
                sensorData.DiseaseRiskScore = Math.Round(
                    mlService.PredictDiseaseRisk(sensorData.Temperature, sensorData.Humidity, sensorData.Co2Level, 60.0), 2);
            }

            // 3. Збереження телеметрії в базу даних
            await dbContext.SensorData.AddAsync(sensorData, ct);
            await dbContext.SaveChangesAsync(ct);

            // 4. Перевірка допустимих меж та фіксація сповіщень
            await alertService.CheckThresholdsAndCreateAlertsAsync(sensorData, ct);

            return Ok(new
            {
                message = "Телеметрію успішно перевірено, розшифровано та збережено.",
                recordId = sensorData.Id,
                diseaseRiskScore = sensorData.DiseaseRiskScore
            });
        }
        catch (CryptographicException ex)
        {
            logger.LogWarning(ex, "[SECURITY ALERT] Спроба передачі сфальсифікованого або пошкодженого пакета телеметрії!");
            return BadRequest(new { error = "Помилка автентичності даних: недійсний цифровий підпис HMAC." });
        }
    }

    /// <summary>
    /// Отримує розширений аналіз ризиків хвороб за даними ML для дозволеної теплиці.
    /// </summary>
    [HttpGet("risk-breakdown/{greenhouseId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDetailedRiskBreakdown(Guid greenhouseId, CancellationToken ct)
    {
        var greenhouseExists = await dbContext.Greenhouses.AnyAsync(g => g.Id == greenhouseId, ct);
        if (!greenhouseExists)
        {
            return NotFound(new { message = $"Теплицю з Id '{greenhouseId}' не знайдено." });
        }

        if (!await UserHasAccessToGreenhouseAsync(greenhouseId, ct))
        {
            return Forbid();
        }

        var latest = await dbContext.SensorData
            .AsNoTracking()
            .Where(s => s.GreenhouseId == greenhouseId)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync(ct);

        if (latest == null)
        {
            return NotFound(new { message = "Дані для аналізу відсутні." });
        }

        var assessment = mlService.PredictMultiFactorRisk(
            latest.Temperature,
            latest.Humidity,
            latest.Co2Level,
            60.0
        );

        return Ok(assessment);
    }
}