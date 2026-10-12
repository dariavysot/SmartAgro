using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace SmartAgro.Core.ML;

public sealed class DiseasePredictionService : IDiseasePredictionService, IDisposable
{
    private readonly InferenceSession _session;

    public DiseasePredictionService()
    {
        var modelPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "greenhouse_risk.onnx");

        if (!File.Exists(modelPath))
        {
            modelPath = Path.Combine(Directory.GetCurrentDirectory(), "greenhouse_risk.onnx");
        }

        if (!File.Exists(modelPath))
        {
            throw new FileNotFoundException($"ONNX model file not found at path: {modelPath}");
        }

        var sessionOptions = new SessionOptions();
        _session = new InferenceSession(modelPath, sessionOptions);
    }

    public float PredictDiseaseRisk(double temperature, double humidity, double co2, double soilMoisture)
    {
        // Викликаємо повний розрахунок і повертаємо перший елемент (базова формула грибка)
        var assessment = PredictMultiFactorRisk(temperature, humidity, co2, soilMoisture);
        return assessment.FungalDiseaseRisk;
    }

    public DiseaseRiskAssessment PredictMultiFactorRisk(double temperature, double humidity, double co2, double soilMoisture)
    {
        // 1. Формуємо одновимірний масив ознак [1, 4]
        var inputValues = new float[]
        {
            (float)temperature,
            (float)humidity,
            (float)co2,
            (float)soilMoisture
        };

        var dimensions = new int[] { 1, 4 };
        var tensor = new DenseTensor<float>(inputValues, dimensions);

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("float_input", tensor)
        };

        // 2. Інференс ONNX моделі
        using var results = _session.Run(inputs);

        // 3. Зчитуємо вихідний вектор розмірністю [1, 4]
        var outputTensor = results.First().AsTensor<float>();
        var outputValues = outputTensor.ToArray();

        // Індекси відповідають колонкам у train_multi_risk_model.py
        float fungalRisk = Math.Clamp(outputValues.Length > 0 ? outputValues[0] : 0.0f, 0.0f, 100.0f);
        float vpdRisk = Math.Clamp(outputValues.Length > 1 ? outputValues[1] : 0.0f, 0.0f, 100.0f);
        float co2Risk = Math.Clamp(outputValues.Length > 2 ? outputValues[2] : 0.0f, 0.0f, 100.0f);
        float hypoxiaRisk = Math.Clamp(outputValues.Length > 3 ? outputValues[3] : 0.0f, 0.0f, 100.0f);

        return new DiseaseRiskAssessment
        {
            FungalDiseaseRisk = MathF.Round(fungalRisk, 2),
            VpdStressRisk = MathF.Round(vpdRisk, 2),
            Co2InefficiencyRisk = MathF.Round(co2Risk, 2),
            RootHypoxiaRisk = MathF.Round(hypoxiaRisk, 2)
        };
    }

    public void Dispose()
    {
        _session.Dispose();
    }
}