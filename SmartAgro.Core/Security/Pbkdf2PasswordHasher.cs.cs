using System.Security.Cryptography;

namespace SmartAgro.Core.Security;

public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;       // 128 біт солі
    private const int HashSize = 32;       // 256 біт підсумкового хешу
    private const int Iterations = 100_000; // Кількість ітерацій розтягування ключа
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public (string Hash, string Salt) HashPassword(string password)
    {
        // 1. Генеруємо криптографічно стійку випадкову сіль
        byte[] saltBytes = RandomNumberGenerator.GetBytes(SaltSize);

        // 2. Обчислюємо PBKDF2 хеш на основі пароля, солі та 100 000 ітерацій
        byte[] hashBytes = Rfc2898DeriveBytes.Pbkdf2(
            password,
            saltBytes,
            Iterations,
            Algorithm,
            HashSize);

        // 3. Зберігаємо бінарні масиви як зрозумілі рядки Base64
        return (Convert.ToBase64String(hashBytes), Convert.ToBase64String(saltBytes));
    }

    public bool VerifyPassword(string password, string hash, string salt)
    {
        byte[] saltBytes = Convert.FromBase64String(salt);
        byte[] expectedHashBytes = Convert.FromBase64String(hash);

        // Обчислюємо хеш для введеного пароля з тією ж сіллю
        byte[] actualHashBytes = Rfc2898DeriveBytes.Pbkdf2(
            password,
            saltBytes,
            Iterations,
            Algorithm,
            HashSize);

        // FixedTimeEquals захищає від "атак за часом" (Timing Attacks),
        // порівнюючи всі байти з однаковою швидкістю
        return CryptographicOperations.FixedTimeEquals(actualHashBytes, expectedHashBytes);
    }
}