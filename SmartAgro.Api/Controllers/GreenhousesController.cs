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
                OwnerUsername = g.User != null ? g.User.Username : "Невідомо",
                OwnerEmail = g.User != null ? g.User.Email : "Невідомо"
            })
            .ToListAsync(ct);

        return Ok(greenhouses);
    }

    /// <summary>
    /// Додати нову теплицю для поточного користувача
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateGreenhouse([FromBody] CreateGreenhouseDto dto, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
            return Unauthorized();

        var greenhouse = new Greenhouse
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Location = dto.Location,
            UserId = userId
        };

        await dbContext.Greenhouses.AddAsync(greenhouse, ct);
        await dbContext.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetMyGreenhouses), new { id = greenhouse.Id }, greenhouse);
    }
}