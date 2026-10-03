using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SmartAgro.Core.Telemetry;

namespace SmartAgro.Core.Security;

public sealed class TelemetryCryptoService : ITelemetryCryptoService
{
    private readonly byte[] _aesKey;
    private readonly byte[] _hmacKey;

    public TelemetryCryptoService(IOptions<CryptoSettings> cryptoOptions)
    {
        var settings = cryptoOptions.Value;

        if (string.IsNullOrWhiteSpace(settings.AesKeyBase64) || string.IsNullOrWhiteSpace(settings.HmacKeyBase64))
        {
            throw new InvalidOperationException("CryptoSettings: ключі AES та HMAC повинні бути налаштовані.");
        }

        _aesKey = Convert.FromBase64String(settings.AesKeyBase64);
        _hmacKey = Convert.FromBase64String(settings.HmacKeyBase64);

        if (_aesKey.Length != 32)
        {
            throw new ArgumentException("AES-256 ключ повинен мати довжину рівно 256 біт (32 байти).");
        }
    }

    public EncryptedTelemetryPackage EncryptAndSign<T>(T payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var plainBytes = Encoding.UTF8.GetBytes(json);
        var timestamp = DateTime.UtcNow;

        // 1. Генерація динамічного випадкового вектора ініціалізації (IV) 16 байт
        byte[] iv = RandomNumberGenerator.GetBytes(16);
        byte[] ciphertext;

        // 2. Симетричне шифрування AES-256-CBC
        using (var aes = Aes.Create())
        {
            aes.Key = _aesKey;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var encryptor = aes.CreateEncryptor();
            ciphertext = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        }

        // 3. Формування підпису цілісності та автентичності HMAC-SHA256 від (IV + Ciphertext + Timestamp)
        byte[] signature = ComputeHmac(iv, ciphertext, timestamp);

        return new EncryptedTelemetryPackage(
            Convert.ToBase64String(ciphertext),
            Convert.ToBase64String(iv),
            Convert.ToBase64String(signature),
            timestamp
        );
    }

    public T VerifyAndDecrypt<T>(EncryptedTelemetryPackage package)
    {
        byte[] ciphertext = Convert.FromBase64String(package.CiphertextBase64);
        byte[] iv = Convert.FromBase64String(package.IvBase64);
        byte[] receivedSignature = Convert.FromBase64String(package.HmacSignatureBase64);

        // 1. Обчислюємо очікуваний HMAC
        byte[] expectedSignature = ComputeHmac(iv, ciphertext, package.TimestampUtc);

        // 2. Перевірка підпису із захистом від атак за часом виконання (Constant-time comparison)
        if (!CryptographicOperations.FixedTimeEquals(receivedSignature, expectedSignature))
        {
            throw new CryptographicException("КРИТИЧНО: Порушення цілісності або підробка пакета телеметрії (HMAC не збігається)!");
        }

        // 3. Розшифрування AES-256-CBC
        byte[] decryptedBytes;
        using (var aes = Aes.Create())
        {
            aes.Key = _aesKey;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var decryptor = aes.CreateDecryptor();
            decryptedBytes = decryptor.TransformFinalBlock(ciphertext, 0, ciphertext.Length);
        }

        var json = Encoding.UTF8.GetString(decryptedBytes);
        var result = JsonSerializer.Deserialize<T>(json);

        return result ?? throw new JsonException("Помилка десеріалізації розшифрованого вмісту.");
    }

    private byte[] ComputeHmac(byte[] iv, byte[] ciphertext, DateTime timestamp)
    {
        var timestampBytes = Encoding.UTF8.GetBytes(timestamp.ToString("O"));

        using var hmac = new HMACSHA256(_hmacKey);
        using var ms = new MemoryStream();
        ms.Write(iv, 0, iv.Length);
        ms.Write(ciphertext, 0, ciphertext.Length);
        ms.Write(timestampBytes, 0, timestampBytes.Length);

        return hmac.ComputeHash(ms.ToArray());
    }
}