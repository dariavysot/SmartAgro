namespace SmartAgro.Core.Telemetry;

/// <summary>
/// Захищений пакет телеметрії, що передається через відкриті або незахищені мережеві канали (Data in Transit).
/// Містить зашифровані корисні дані, вектор ініціалізації та криптографічний підпис цілісності.
/// </summary>
public sealed record EncryptedTelemetryPackage(
    string CiphertextBase64,
    string IvBase64,
    string HmacSignatureBase64,
    DateTime TimestampUtc
);