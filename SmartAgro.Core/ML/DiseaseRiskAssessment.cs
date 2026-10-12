namespace SmartAgro.Core.ML;

/// <summary>
/// Результат багатофакторної оцінки ризиків мікроклімату теплиці.
/// </summary>
public sealed class DiseaseRiskAssessment
{
    /// <summary>
    /// Інтегральний ризик грибкових уражень (фітофтороз, борошниста роса), 0–100%.
    /// </summary>
    public float FungalDiseaseRisk { get; init; }

    /// <summary>
    /// Стрес транспірації (дефіцит тиску водяної пари — VPD), 0–100%.
    /// </summary>
    public float VpdStressRisk { get; init; }

    /// <summary>
    /// Стрес неефективності або надлишку концентрації CO2, 0–100%.
    /// </summary>
    public float Co2InefficiencyRisk { get; init; }

    /// <summary>
    /// Ризик гіпоксії кореневої системи (заболочування/кисневе голодування), 0–100%.
    /// </summary>
    public float RootHypoxiaRisk { get; init; }

    /// <summary>
    /// Загальний максимальний індекс загрози для відображення в головному бейджі.
    /// </summary>
    public float OverallRiskScore => MathF.Max(FungalDiseaseRisk, MathF.Max(VpdStressRisk, MathF.Max(Co2InefficiencyRisk, RootHypoxiaRisk)));
}