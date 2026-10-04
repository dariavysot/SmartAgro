namespace SmartAgro.Core.Security;

public sealed class CryptoSettings
{
    public const string SectionName = "CryptoSettings";

    public string AesKeyBase64 { get; set; } = string.Empty;
    public string HmacKeyBase64 { get; set; } = string.Empty;
}