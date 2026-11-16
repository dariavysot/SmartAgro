using System.Security.Claims;
using Microsoft.Extensions.Options;
using SmartAgro.Core.Entities;
using SmartAgro.Core.Security;
using Xunit;

namespace SmartAgro.Tests;

public class TokenServiceTests
{
    private readonly TokenService _tokenService;
    private readonly JwtSettings _jwtSettings;

    public TokenServiceTests()
    {
        _jwtSettings = new JwtSettings
        {
            SecretKey = "SmartAgro_Super_Secret_Key_For_Jwt_Security_2026!#",
            Issuer = "SmartAgroApi",
            Audience = "SmartAgroClient",
            AccessTokenExpirationMinutes = 15
        };

        var options = Options.Create(_jwtSettings);
        _tokenService = new TokenService(options);
    }

    [Fact]
    public void GenerateAccessToken_ShouldReturnValidTokenAndExpiration()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "test_agro_user",
            Email = "user@smartagro.com",
            Role = new Role { Id = 2, Name = UserRole.User }
        };

        // Act
        var (token, expiration) = _tokenService.GenerateAccessToken(user);

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.True(expiration > DateTime.UtcNow);
    }

    [Fact]
    public void GenerateRefreshToken_ShouldReturnRandomBase64String()
    {
        // Act
        var refreshToken1 = _tokenService.GenerateRefreshToken();
        var refreshToken2 = _tokenService.GenerateRefreshToken();

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(refreshToken1));
        Assert.False(string.IsNullOrWhiteSpace(refreshToken2));
        Assert.NotEqual(refreshToken1, refreshToken2); // Мають бути унікальними
    }

    [Fact]
    public void GetPrincipalFromExpiredToken_WithInvalidToken_ShouldReturnNull()
    {
        // Arrange
        var invalidToken = "invalid.jwt.token.string";

        // Act
        var principal = _tokenService.GetPrincipalFromExpiredToken(invalidToken);

        // Assert
        Assert.Null(principal);
    }
}