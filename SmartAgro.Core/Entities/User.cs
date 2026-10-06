namespace SmartAgro.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Salt { get; set; } = string.Empty;

    public int RoleId { get; set; }
    public Role? Role { get; set; }

    // Для Refresh-токенів
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Зв'язок з теплицями власника
    public ICollection<Greenhouse> Greenhouses { get; set; } = new List<Greenhouse>();
}