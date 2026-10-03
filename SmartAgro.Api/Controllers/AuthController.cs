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
    /// Реєстрація нового користувача (за замовчуванням створюється як Operator).
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken ct)
    {
        // 1. Перевіряємо унікальність email
        bool emailExists = await context.Users.AnyAsync(u => u.Email == dto.Email, ct);
        if (emailExists)
            return BadRequest(new { Message = "Користувач із такою електронною поштою вже зареєстрований." });

        // 2. Хешуємо пароль за стандартом PBKDF2 з унікальною сіллю
        var (hash, salt) = passwordHasher.HashPassword(dto.Password);

        // 3. Перетворюємо переданий рядок ролі в enum UserRole
        if (!Enum.TryParse<UserRole>(dto.Role, true, out var requestedRole))
        {
            requestedRole = UserRole.Operator;
        }

        // 4. Шукаємо відповідний запис сутності Role у базі даних
        var roleEntity = await context.Roles.FirstOrDefaultAsync(r => r.Name == requestedRole, ct);
        if (roleEntity == null)
        {
            roleEntity = new Role { Name = requestedRole };
            await context.Roles.AddAsync(roleEntity, ct);
            await context.SaveChangesAsync(ct);
        }

        // 5. Створюємо сутність User з прив'язкою до знайденої Role
        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = hash,
            Salt = salt,
            RoleId = roleEntity.Id,
            Role = roleEntity,
            CreatedAt = DateTime.UtcNow
        };

        // 6. Генеруємо початкову пару токенів
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
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        // Обов'язково завантажуємо зв'язану роль через Include, щоб мати доступ до user.Role.Name
        var user = await context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == dto.Email, ct);

        if (user == null)
            return Unauthorized(new { Message = "Неправильний email або пароль." });

        // Перевіряємо введений пароль за допомогою PBKDF2 та збереженої солі
        bool isPasswordValid = passwordHasher.VerifyPassword(dto.Password, user.PasswordHash, user.Salt);
        if (!isPasswordValid)
            return Unauthorized(new { Message = "Неправильний email або пароль." });

        // Генеруємо нові токени
        var (accessToken, expiration) = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();

        // Оновлюємо Refresh токен у базі
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await context.SaveChangesAsync(ct);

        string roleString = user.Role != null ? user.Role.Name.ToString() : UserRole.Operator.ToString();

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
    /// Ендпоінт, доступний для будь-якого автентифікованого користувача (і Admin, і Operator).
    /// </summary>
    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpGet("me")]
    public IActionResult GetCurrentUserProfile()
    {
        var username = User.Identity?.Name;
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        return Ok(new
        {
            Message = "Доступ надано!",
            Username = username,
            Role = role
        });
    }

    /// <summary>
    /// Ендпоінт, доступний ВИКЛЮЧНО для ролі Admin.
    /// </summary>
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    [HttpGet("admin-only")]
    public IActionResult AdminOnlyAction()
    {
        return Ok(new
        {
            Message = "Вітаємо в панелі адміністратора! Доступ підтверджено роллю Admin."
        });
    }
}