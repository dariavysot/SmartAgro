import numpy as np
from sklearn.ensemble import RandomForestRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# 1. Фіксація генератора випадкових чисел і налаштування вибірки
np.random.seed(42)
n_samples = 5000

# Вхідні діапазони показників мікроклімату теплиці
temperatures = np.random.uniform(15.0, 38.0, n_samples)      # °C
humidity = np.random.uniform(30.0, 98.0, n_samples)          # %
co2 = np.random.uniform(350.0, 1500.0, n_samples)            # ppm
soil_moisture = np.random.uniform(20.0, 90.0, n_samples)     # %

# --- 2. Розрахунок факторів ризику (Target Variables) ---

# [Фактор 1]: Базова агрономічна залежність спалаху фітофторозу/борошнистої роси (без змін)
fungal_risk = (
    0.50 * np.maximum(0.0, (humidity - 50.0) / 45.0) +
    0.30 * np.exp(-((temperatures - 22.0) ** 2) / 30.0) +
    0.20 * np.maximum(0.0, (soil_moisture - 40.0) / 50.0)
)
fungal_risk = np.clip(fungal_risk * 100.0 + np.random.normal(0.0, 2.5, n_samples), 0.0, 100.0)

# [Фактор 2]: Транспіраційний стрес (VPD — Vapor Pressure Deficit)
# Обчислення насиченого тиску пари (VPsat, kPa) за формулою Тетенса
vp_sat = 0.61078 * np.exp((17.27 * temperatures) / (temperatures + 237.3))
vp_act = vp_sat * (humidity / 100.0)
vpd = vp_sat - vp_act

# Оптимальний VPD становить 0.8–1.2 kPa; вихід за межі створює стрес транспірації
vpd_stress = np.where(
    vpd < 0.8,
    np.maximum(0.0, (0.8 - vpd) / 0.5),
    np.maximum(0.0, (vpd - 1.2) / 1.0)
)
vpd_risk = np.clip(vpd_stress * 100.0 + np.random.normal(0.0, 2.0, n_samples), 0.0, 100.0)

# [Фактор 3]: Стрес неефективності або надлишку CO2 (дефіцит <600 ppm або токсичність >1100 ppm)
co2_stress = np.where(
    co2 < 600.0,
    np.maximum(0.0, (600.0 - co2) / 250.0),
    np.maximum(0.0, (co2 - 1100.0) / 450.0)
)
co2_risk = np.clip(co2_stress * 100.0 + np.random.normal(0.0, 2.0, n_samples), 0.0, 100.0)

# [Фактор 4]: Гіпоксія кореневої зони (застій вологи при високих температурах субстрату)
hypoxia_stress = np.maximum(0.0, (soil_moisture - 70.0) / 20.0) * (1.0 + np.maximum(0.0, (temperatures - 24.0) / 14.0))
hypoxia_risk = np.clip(hypoxia_stress * 100.0 + np.random.normal(0.0, 2.0, n_samples), 0.0, 100.0)

# 3. Формування матриць ознак X та цільових значень y
X = np.column_stack([temperatures, humidity, co2, soil_moisture]).astype(np.float32)
# y містить 4 вектори цілей: Fungal, VPD, CO2, Hypoxia
y = np.column_stack([fungal_risk, vpd_risk, co2_risk, hypoxia_risk]).astype(np.float32)

# 4. Навчання регресійної моделі випадкового лісу (Multi-output)
model = RandomForestRegressor(
    n_estimators=35,
    max_depth=6,
    random_state=42,
    n_jobs=-1
)
model.fit(X, y)

# 5. Експорт у формат ONNX
# Вхідний тензор: [None, 4], Вихідний тензор: [None, 4]
initial_type = [('float_input', FloatTensorType([None, 4]))]
onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=15)

model_filename = "greenhouse_risk.onnx"
with open(model_filename, "wb") as f:
    f.write(onnx_model.SerializeToString())

print(f"[OK] Модель успішно навчена та збережена у файл {model_filename}")
print("Структура вихідного вектора прогнозу:")
print("  [0] -> FungalDiseaseRisk (%) — базова формула")
print("  [1] -> VpdStressRisk (%)")
print("  [2] -> Co2InefficiencyRisk (%)")
print("  [3] -> RootHypoxiaRisk (%)")