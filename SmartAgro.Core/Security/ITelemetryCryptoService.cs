using SmartAgro.Core.Telemetry;

namespace SmartAgro.Core.Security;

public interface ITelemetryCryptoService
{
    /// <summary>
    /// Серіалізує об'єкт у JSON, шифрує за допомогою AES-256-CBC з динамічним IV та накладає підпис HMAC-SHA256.
    /// </summary>
    EncryptedTelemetryPackage EncryptAndSign<T>(T payload);

    /// <summary>
    /// Валідує підпис цілісності HMAC-SHA256 (constant-time) та розшифровує корисне навантаження.
    /// Викидає CryptographicException при спробі компрометації чи спотворенні даних.
    /// </summary>
    T VerifyAndDecrypt<T>(EncryptedTelemetryPackage package);
}