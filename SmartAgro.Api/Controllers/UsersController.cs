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
[Authorize(Policy = "RequireAdminOnly")] // Доступ виключно для ролі Admin
public class UsersController(
    AppDbContext context,
    IPasswordHasher passwordHasher) : ControllerBase
{
    /// <summary>
    /// Отримання повного списку співробітників господарства
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<UserListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllUsers(CancellationToken ct)
    {
        var users = await context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.Greenhouses)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new UserListItemDto(
                u.Id,
                u.Username,
                u.Email,
                u.Role != null ? u.Role.Name.ToString() : UserRole.User.ToString(),
                u.CreatedAt,
                u.Greenhouses.Count
            ))
            .ToListAsync(ct);

        return Ok(users);
    }

    /// <summary>
    /// Створення нового користувача або оператора адміністратором
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        bool emailExists = await context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower(), ct);
        if (emailExists)
            return BadRequest(new { message = "Користувач із цією адресою вже існує." });

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var targetRole))
            return BadRequest(new { message = "Вказано некоректну роль (допустимі: Admin, User)." });

        var roleEntity = await context.Roles.FirstOrDefaultAsync(r => r.Name == targetRole, ct);
        if (roleEntity == null)
        {
            roleEntity = new Role { Name = targetRole };
            await context.Roles.AddAsync(roleEntity, ct);
            await context.SaveChangesAsync(ct);
        }

        var (hash, salt) = passwordHasher.HashPassword(dto.Password);

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Username = dto.Username.Trim(),
            Email = dto.Email.Trim().ToLower(),
            PasswordHash = hash,
            Salt = salt,
            RoleId = roleEntity.Id,
            CreatedAt = DateTime.UtcNow
        };

        await context.Users.AddAsync(newUser, ct);
        await context.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAllUsers), new { id = newUser.Id }, new { message = "Користувача створено успішно!" });
    }

    /// <summary>
    /// Оновлення даних користувача (ім'я, email, роль, скидання пароля)
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequestDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null)
            return NotFound(new { message = "Користувача не знайдено." });

        bool emailConflict = await context.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == dto.Email.ToLower(), ct);
        if (emailConflict)
            return BadRequest(new { message = "Вказаний email вже зайнятий іншим користувачем." });

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var targetRole))
            return BadRequest(new { message = "Некоректна роль користувача." });

        var roleEntity = await context.Roles.FirstOrDefaultAsync(r => r.Name == targetRole, ct);
        if (roleEntity != null)
        {
            user.RoleId = roleEntity.Id;
            user.Role = roleEntity;
        }

        user.Username = dto.Username.Trim();
        user.Email = dto.Email.Trim().ToLower();

        // Опціональне скидання пароля адміном
        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            if (dto.NewPassword.Length < 6)
                return BadRequest(new { message = "Новий пароль повинен містити не менше 6 символів." });

            var (hash, salt) = passwordHasher.HashPassword(dto.NewPassword);
            user.PasswordHash = hash;
            user.Salt = salt;
        }

        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Дані облікового запису успішно оновлено." });
    }

    /// <summary>
    /// Видалення облікового запису (захист від видалення останнього адміністратора)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var user = await context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null)
            return NotFound(new { message = "Користувача не знайдено." });

        if (user.Role?.Name == UserRole.Admin)
        {
            int adminCount = await context.Users.CountAsync(u => u.Role != null && u.Role.Name == UserRole.Admin, ct);
            if (adminCount <= 1)
                return BadRequest(new { message = "Неможливо видалити єдиного адміністратора в системі." });
        }

        context.Users.Remove(user);
        await context.SaveChangesAsync(ct);

        return Ok(new { message = "Користувача успішно видалено." });
    }
}