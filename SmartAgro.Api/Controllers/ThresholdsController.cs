using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAgro.Api.DTOs;

namespace SmartAgro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Потрібен валідний JWT Bearer токен
public class ThresholdsController : ControllerBase
{
    // Тимчасове потокобезпечне in-memory сховище (або інжектуйте ваш DbContext)
    private static ThresholdsDto _currentThresholds = new();
    private static readonly object _lock = new();

    /// <summary>
    /// Отримання поточних меж теплиці (доступно Operator та Admin)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ThresholdsDto), StatusCodes.Status200OK)]
    public IActionResult GetThresholds()
    {
        lock (_lock)
        {
            return Ok(_currentThresholds);
        }
    }

    /// <summary>
    /// Оновлення конфігурації меж (тільки для ролі Admin)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ThresholdsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult UpdateThresholds([FromBody] ThresholdsDto dto)
    {
        if (dto.MinTemperature >= dto.MaxTemperature)
            return BadRequest(new { message = "Мінімальна температура не може бути вищою за максимальну" });

        if (dto.MinHumidity >= dto.MaxHumidity)
            return BadRequest(new { message = "Мінімальна вологість не може бути вищою за максимальну" });

        lock (_lock)
        {
            _currentThresholds = dto;
        }

        return Ok(_currentThresholds);
    }
}