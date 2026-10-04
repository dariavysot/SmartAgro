import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Генерація агрономічного синтетичного датасету мікроклімату теплиці
np.random.seed(42)
n_samples = 5000

temperatures = np.random.uniform(15.0, 38.0, n_samples)      # °C
humidity = np.random.uniform(30.0, 98.0, n_samples)          # %
co2 = np.random.uniform(350.0, 1500.0, n_samples)            # ppm
soil_moisture = np.random.uniform(20.0, 90.0, n_samples)     # %

# Агрономічна залежність спалаху фітофторозу/борошнистої роси
risk_score = (
    0.50 * np.maximum(0.0, (humidity - 50.0) / 45.0) +
    0.30 * np.exp(-((temperatures - 22.0) ** 2) / 30.0) +
    0.20 * np.maximum(0.0, (soil_moisture - 40.0) / 50.0)
)
risk_score = np.clip(risk_score * 100.0 + np.random.normal(0.0, 2.5, n_samples), 0.0, 100.0)

X = np.column_stack([temperatures, humidity, co2, soil_moisture]).astype(np.float32)
y = risk_score.astype(np.float32)

# Навчання регресійної моделі
model = RandomForestRegressor(n_estimators=35, max_depth=6, random_state=42)
model.fit(X, y)

# Експорт у формат ONNX
initial_type = [('float_input', FloatTensorType([None, 4]))]
onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=15)

with open("greenhouse_risk.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("[OK] Модель успішно навчена та збережена у greenhouse_risk.onnx")