using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAgro.Core.Alerts;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;
using SmartAgro.Core.ML;
using SmartAgro.Core.Security;
using SmartAgro.Core.Telemetry;
using System.Security.Cryptography;

namespace SmartAgro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Доступ тільки для автентифікованих користувачів
public sealed class TelemetryController(
    AppDbContext dbContext,
    ITelemetryCryptoService cryptoService,
    IDiseasePredictionService mlService,
    IAlertService alertService,
    ILogger<TelemetryController> logger) : ControllerBase
{
    /// <summary>
    /// Отримує останній зріз телеметрії для обраної теплиці.
    /// </summary>
    [HttpGet("latest/{greenhouseId:guid}")]
    public async Task<IActionResult> GetLatestTelemetry(Guid greenhouseId, CancellationToken ct)
    {
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
    /// Отримує історію показників сенсорів (до 100 останніх записів).
    /// </summary>
    [HttpGet("history/{greenhouseId:guid}")]
    public async Task<IActionResult> GetHistory(Guid greenhouseId, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
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
    /// Захищений шлюз прийому телеметрії: верифікує HMAC-SHA256, розшифровує AES-256 та запускає перевірку ML.
    /// </summary>
    [HttpPost("secure-ingest")]
    public async Task<IActionResult> IngestEncryptedTelemetry([FromBody] EncryptedTelemetryPackage package, CancellationToken ct)
    {
        try
        {
            // 1. Дешифрування та верифікація цілісності (кидає CryptographicException при зміні хоч 1 байта)
            var sensorData = cryptoService.VerifyAndDecrypt<SensorData>(package);
            sensorData.Signature = package.HmacSignatureBase64;
            sensorData.Timestamp = package.TimestampUtc;

            // 2. Якщо ML-оцінка не була проведена на стороні сенсора, рахуємо її тут
            if (sensorData.DiseaseRiskScore <= 0.0)
            {
                sensorData.DiseaseRiskScore = Math.Round(
                    mlService.PredictDiseaseRisk(sensorData.Temperature, sensorData.Humidity, sensorData.Co2Level, 60.0), 2);
            }

            // 3. Збереження в базу
            await dbContext.SensorData.AddAsync(sensorData, ct);
            await dbContext.SaveChangesAsync(ct);

            // 4. Перевірка порогів та створення тривог у разі небезпеки
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
}