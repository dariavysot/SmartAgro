namespace SmartAgro.Core.ML;

public interface IDiseasePredictionService
{
    /// <summary>
    /// Обчислює базовий ризик розвитку захворювань у відсотках (0–100%).
    /// Зберігається для зворотної сумісності з існуючим кодом.
    /// </summary>
    float PredictDiseaseRisk(double temperature, double humidity, double co2, double soilMoisture);

    /// <summary>
    /// Виконує деталізовану оцінку 4 факторів ризику (грибок, VPD, CO2, гіпоксія).
    /// </summary>
    DiseaseRiskAssessment PredictMultiFactorRisk(double temperature, double humidity, double co2, double soilMoisture);
}