namespace SmartAgro.Client.Models;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class GreenhouseItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public int ReadingsCount { get; set; }
}

public class CreateGreenhouseModel
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public double InitialTemperature { get; set; } = 22.0;
    public double InitialHumidity { get; set; } = 65.0;
    public double InitialCo2 { get; set; } = 600.0;
}

public class UpdateGreenhouseModel
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
}