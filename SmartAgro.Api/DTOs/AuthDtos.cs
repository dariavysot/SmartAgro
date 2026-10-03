using System.ComponentModel.DataAnnotations;

namespace SmartAgro.Api.DTOs;

/// <summary>
/// Дані, які клієнт надсилає для створення нового облікового запису.
/// </summary>
public sealed record RegisterDto(
    [Required(ErrorMessage = "Ім'я користувача є обов'язковим")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Ім'я повинно містити від 3 до 50 символів")]
    string Username,

    [Required(ErrorMessage = "Електронна пошта є обов'язковою")]
    [EmailAddress(ErrorMessage = "Некоректний формат email")]
    string Email,

    [Required(ErrorMessage = "Пароль є обов'язковим")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Пароль повинен бути не менше 6 символів")]
    string Password,

    // Роль користувача (наприклад, "Operator" або "Admin"). За замовчуванням реєструємо як оператора
    string Role = "Operator"
);

/// <summary>
/// Дані для входу в систему.
/// </summary>
public sealed record LoginDto(
    [Required(ErrorMessage = "Вкажіть email")]
    [EmailAddress]
    string Email,

    [Required(ErrorMessage = "Вкажіть пароль")]
    string Password
);

/// <summary>
/// Захищена відповідь сервера після успішного входу або оновлення токенів.
/// </summary>
public sealed record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiration,
    string Username,
    string Email,
    string Role
);

/// <summary>
/// Запит на оновлення пари токенів, коли закінчився термін дії AccessToken.
/// </summary>
public sealed record RefreshTokenRequestDto(
    [Required]
    string AccessToken,

    [Required]
    string RefreshToken
);