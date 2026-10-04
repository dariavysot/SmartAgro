using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace SmartAgro.Core.ML;

public sealed class DiseasePredictionService : IDiseasePredictionService, IDisposable
{
    private readonly InferenceSession _session;

    public DiseasePredictionService()
    {
        // Шукаємо файл моделі у вихідній директорії білда застосунку
        var modelPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "greenhouse_risk.onnx");

        if (!File.Exists(modelPath))
        {
            // Резервний пошук, якщо запущено з іншого робочого каталогу
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
        // 1. Формуємо одновимірний масив ознак [1, 4]
        var inputValues = new float[]
        {
            (float)temperature,
            (float)humidity,
            (float)co2,
            (float)soilMoisture
        };

        // 2. Створюємо тензор для ONNX Runtime
        var dimensions = new int[] { 1, 4 };
        var tensor = new DenseTensor<float>(inputValues, dimensions);

        // 3. Підготовка вхідного параметра з ім'ям 'float_input' (як задано в skl2onnx)
        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("float_input", tensor)
        };

        // 4. Виконання інференсу моделі
        using var results = _session.Run(inputs);

        // 5. Отримання результату передбачення
        var outputTensor = results.First().AsTensor<float>();
        float predictedRisk = outputTensor.First();

        // Обмежуємо діапазон значеннями від 0.0 до 100.0%
        return Math.Clamp(predictedRisk, 0.0f, 100.0f);
    }

    public void Dispose()
    {
        _session.Dispose();
    }
}