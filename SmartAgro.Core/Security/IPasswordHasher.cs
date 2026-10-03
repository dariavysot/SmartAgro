namespace SmartAgro.Core.Security;

/// <summary>
/// Контракт для криптографічного хешування та перевірки паролів.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>
    /// Генерує випадкову сіль та повертає обчислений хеш пароля.
    /// </summary>
    (string Hash, string Salt) HashPassword(string password);

    /// <summary>
    /// Звіряє введений пароль зі збереженим хешем та сіллю.
    /// </summary>
    bool VerifyPassword(string password, string hash, string salt);
}