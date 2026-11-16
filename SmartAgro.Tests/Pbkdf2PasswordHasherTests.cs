using SmartAgro.Core.Security;
using Xunit;

namespace SmartAgro.Tests;

public class Pbkdf2PasswordHasherTests
{
    private readonly Pbkdf2PasswordHasher _passwordHasher = new();

    [Fact]
    public void HashPassword_ShouldReturnValidHashString()
    {
        // Arrange
        var password = "SecureAgroPassword123!";

        // Act
        var hash = _passwordHasher.HashPassword(password);

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(hash));
        Assert.NotEqual(password, hash);
    }

    [Fact]
    public void VerifyPassword_WithCorrectPassword_ShouldReturnTrue()
    {
        // Arrange
        var password = "MySecretPassword!";
        var hash = _passwordHasher.HashPassword(password);

        // Act
        var isValid = _passwordHasher.VerifyPassword(password, hash);

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void VerifyPassword_WithIncorrectPassword_ShouldReturnFalse()
    {
        // Arrange
        var password = "CorrectPassword";
        var hash = _passwordHasher.HashPassword(password);

        // Act
        var isValid = _passwordHasher.VerifyPassword("WrongPassword", hash);

        // Assert
        Assert.False(isValid);
    }
}