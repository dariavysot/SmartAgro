using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAgro.Api.DTOs;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;
using SmartAgro.Core.Security;

namespace SmartAgro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AppDbContext context,
    IPasswordHasher passwordHasher,
    ITokenService tokenService) : ControllerBase
{
    /// <summary>
    /// Реєстрація нового користувача (за замовчуванням створюється як User для запобігання підвищення привілеїв).
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // 1. Перевірка унікальності email (case-insensitive)
        bool emailExists = await context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower(), ct);
        if (emailExists)
            return BadRequest(new { Message = "Користувач із такою електронною поштою вже зареєстрований." });

        // 2. Хешування пароля за стандартом PBKDF2 з криптографічною сіллю
        var (hash, salt) = passwordHasher.HashPassword(dto.Password);

        // 3. Захист від Privilege Escalation:
        // Якщо це перший користувач у системі — призначаємо Admin, інакше звичайного User (або перевіряємо передану роль)
        bool anyAdminExists = await context.Users.AnyAsync(u => u.Role != null && u.Role.Name == UserRole.Admin, ct);
        UserRole targetRole = !anyAdminExists ? UserRole.Admin : UserRole.User;

        // Якщо вказана роль і дозволено призначення (наприклад, для тестових стендів або розробки)
        if (Enum.TryParse<UserRole>(dto.Role, true, out var requestedRole) && !anyAdminExists)
        {
            targetRole = requestedRole;
        }

        // 4. Пошук чи створення сутності Role
        var roleEntity = await context.Roles.FirstOrDefaultAsync(r => r.Name == targetRole, ct);
        if (roleEntity == null)
        {
            roleEntity = new Role { Name = targetRole };
            await context.Roles.AddAsync(roleEntity, ct);
            await context.SaveChangesAsync(ct);
        }

        // 5. Створення User (паролі та хеші в DTO не повертаються)
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = dto.Username.Trim(),
            Email = dto.Email.Trim().ToLower(),
            PasswordHash = hash,
            Salt = salt,
            RoleId = roleEntity.Id,
            Role = roleEntity,
            CreatedAt = DateTime.UtcNow
        };

        // 6. Генерація JWT пари токенів
        var (accessToken, expiration) = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await context.Users.AddAsync(user, ct);
        await context.SaveChangesAsync(ct);

        return Ok(new AuthResponseDto(
            accessToken,
            refreshToken,
            expiration,
            user.Username,
            user.Email,
            user.Role.Name.ToString()
        ));
    }

    /// <summary>
    /// Вхід користувача в систему та видача нової пари JWT токенів.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower(), ct);

        // Перевірка існування користувача та валідності хешу пароля
        if (user == null || !passwordHasher.VerifyPassword(dto.Password, user.PasswordHash, user.Salt))
            return Unauthorized(new { Message = "Неправильний email або пароль." });

        var (accessToken, expiration) = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await context.SaveChangesAsync(ct);

        string roleString = user.Role != null ? user.Role.Name.ToString() : UserRole.User.ToString();

        return Ok(new AuthResponseDto(
            accessToken,
            refreshToken,
            expiration,
            user.Username,
            user.Email,
            roleString
        ));
    }

    /// <summary>
    /// Отримання профілю поточного користувача через Claims токена.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult GetCurrentUserProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        return Ok(new
        {
            Message = "Доступ надано!",
            UserId = userId,
            Username = User.Identity?.Name,
            Email = email,
            Role = role
        });
    }

    /// <summary>
    /// Ендпоінт, захищений політикою Policy-Based Authorization.
    /// </summary>
    [Authorize(Policy = "RequireAdminOnly")]
    [HttpGet("admin-only")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult AdminOnlyAction()
    {
        return Ok(new
        {
            Message = "Вітаємо в панелі адміністратора! Доступ підтверджено політикою RequireAdminOnly."
        });
    }

    /// <summary>
    /// Оновлення пари Access/Refresh токенів (ротація токенів).
    /// </summary>
    [HttpPost("refresh-token")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var principal = tokenService.GetPrincipalFromExpiredToken(dto.AccessToken);
        if (principal == null)
            return BadRequest(new { Message = "Невалідний access-токен." });

        var emailClaim = principal.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(emailClaim))
            return BadRequest(new { Message = "Токен не містить обов'язкових даних." });

        var user = await context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == emailClaim.ToLower(), ct);

        if (user == null ||
            user.RefreshToken != dto.RefreshToken ||
            user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return Unauthorized(new { Message = "Недійсний або прострочений refresh-токен." });
        }

        var (newAccessToken, expiration) = tokenService.GenerateAccessToken(user);
        var newRefreshToken = tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await context.SaveChangesAsync(ct);

        return Ok(new AuthResponseDto(
            newAccessToken,
            newRefreshToken,
            expiration,
            user.Username,
            user.Email,
            user.Role?.Name.ToString() ?? UserRole.User.ToString()
        ));
    }

    /// <summary>
    /// Анулювання Refresh-токена (вихід із системи).
    /// </summary>
    [HttpPost("revoke-token")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequestDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await context.Users.FirstOrDefaultAsync(u => u.RefreshToken == dto.RefreshToken, ct);
        if (user == null)
            return NotFound(new { Message = "Токен не знайдено або він уже відкликаний." });

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;

        await context.SaveChangesAsync(ct);

        return Ok(new { Message = "Refresh-токен успішно відкликано." });
    }
}