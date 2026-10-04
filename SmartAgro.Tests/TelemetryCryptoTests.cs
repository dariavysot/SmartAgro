using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using SmartAgro.Core.Entities;
using SmartAgro.Core.Security;
using SmartAgro.Core.Telemetry;
using Xunit;

namespace SmartAgro.Tests;

public class TelemetryCryptoTests
{
    private readonly TelemetryCryptoService _cryptoService;

    public TelemetryCryptoTests()
    {
        // Тестові валідні 256-бітний AES та 512-бітний HMAC ключі
        var options = Options.Create(new CryptoSettings
        {
            AesKeyBase64 = "k7P3mQ2x1A4bC6dE8fG0hI2jK4lM6nO8pQ0rStUvWxY=",
            HmacKeyBase64 = "dGhpcy1pcy1hLXNlY3VyZS02NC1ieXRlLWtleS1mb3ItaG1hYy1zaGEyNTYtc2lnbmluZy1zbWFydGFncm8tcHJvamVjdC1rZXk="
        });

        _cryptoService = new TelemetryCryptoService(options);
    }

    [Fact]
    public void EncryptAndSign_ShouldProduceValidEncryptedPackage()
    {
        // Arrange
        var testData = new SensorData
        {
            GreenhouseId = Guid.NewGuid(),
            Temperature = 24.5,
            Humidity = 65.2,
            Co2Level = 850.0,
            DiseaseRiskScore = 15.4
        };

        // Act
        var package = _cryptoService.EncryptAndSign(testData);

        // Assert
        Assert.NotNull(package);
        Assert.False(string.IsNullOrWhiteSpace(package.CiphertextBase64));
        Assert.False(string.IsNullOrWhiteSpace(package.IvBase64));
        Assert.False(string.IsNullOrWhiteSpace(package.HmacSignatureBase64));

        // Переконуємося, що відкритий текст не протікає в шифротекст
        Assert.DoesNotContain("24.5", package.CiphertextBase64);
    }

    [Fact]
    public void VerifyAndDecrypt_WithValidPackage_ShouldRestoreOriginalData()
    {
        // Arrange
        var originalData = new SensorData
        {
            GreenhouseId = Guid.NewGuid(),
            Temperature = 27.8,
            Humidity = 78.4,
            Co2Level = 920.0,
            DiseaseRiskScore = 42.1
        };

        var package = _cryptoService.EncryptAndSign(originalData);

        // Act
        var decrypted = _cryptoService.VerifyAndDecrypt<SensorData>(package);

        // Assert
        Assert.NotNull(decrypted);
        Assert.Equal(originalData.GreenhouseId, decrypted.GreenhouseId);
        Assert.Equal(originalData.Temperature, decrypted.Temperature);
        Assert.Equal(originalData.Humidity, decrypted.Humidity);
        Assert.Equal(originalData.Co2Level, decrypted.Co2Level);
        Assert.Equal(originalData.DiseaseRiskScore, decrypted.DiseaseRiskScore);
    }

    [Fact]
    public void VerifyAndDecrypt_WhenTamperedCiphertext_ShouldThrowCryptographicException()
    {
        // Arrange
        var originalData = new SensorData
        {
            GreenhouseId = Guid.NewGuid(),
            Temperature = 22.0,
            Humidity = 50.0
        };

        var package = _cryptoService.EncryptAndSign(originalData);

        // Імітуємо підміну або пошкодження шифротексту зловмисником у каналі зв'язку
        byte[] rawCipher = Convert.FromBase64String(package.CiphertextBase64);
        rawCipher[0] ^= 0xFF; // Інвертуємо перший байт
        var tamperedCiphertext = Convert.ToBase64String(rawCipher);

        var tamperedPackage = package with { CiphertextBase64 = tamperedCiphertext };

        // Act & Assert: перевірка, що HMAC-підпис відхиляє пакет з винятком CryptographicException
        Assert.Throws<CryptographicException>(() =>
        {
            _cryptoService.VerifyAndDecrypt<SensorData>(tamperedPackage);
        });
    }

    [Fact]
    public void VerifyAndDecrypt_WhenTamperedTimestamp_ShouldThrowCryptographicException()
    {
        // Arrange
        var originalData = new SensorData { GreenhouseId = Guid.NewGuid(), Temperature = 21.0 };
        var package = _cryptoService.EncryptAndSign(originalData);

        // Імітуємо модифікацію мітки часу (Replay-атака або зсув таймстампу)
        var tamperedPackage = package with { TimestampUtc = package.TimestampUtc.AddMinutes(-10) };

        // Act & Assert
        Assert.Throws<CryptographicException>(() =>
        {
            _cryptoService.VerifyAndDecrypt<SensorData>(tamperedPackage);
        });
    }
}