namespace SmartAgro.Core.ML;

public interface IDiseasePredictionService
{
    /// <summary>
    /// Обчислює ризик розвитку захворювань (фітофтороз/борошниста роса) у відсотках (0–100%).
    /// </summary>
    /// <param name="temperature">Температура повітря (°C)</param>
    /// <param name="humidity">Відносна вологість повітря (%)</param>
    /// <param name="co2">Концентрація CO2 (ppm)</param>
    /// <param name="soilMoisture">Вологість ґрунту (%)</param>
    /// <returns>Оцінка ризику від 0.0 до 100.0</returns>
    float PredictDiseaseRisk(double temperature, double humidity, double co2, double soilMoisture);
}