using SmartAgro.Core.Entities;

namespace SmartAgro.Core.Security;

public interface ITokenService
{
    (string Token, DateTime Expiration) GenerateAccessToken(User user);
    string GenerateRefreshToken();
}