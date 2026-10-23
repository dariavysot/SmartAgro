using System.ComponentModel.DataAnnotations;
using SmartAgro.Core.Entities;

namespace SmartAgro.Api.DTOs;

public record UserListItemDto(
    Guid Id,
    string Username,
    string Email,
    string Role,
    DateTime CreatedAt,
    int AssignedGreenhousesCount
);

public record CreateUserRequestDto(
    [Required, MinLength(3)] string Username,
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    [Required] string Role
);

public record UpdateUserRequestDto(
    [Required, MinLength(3)] string Username,
    [Required, EmailAddress] string Email,
    [Required] string Role,
    string? NewPassword
);