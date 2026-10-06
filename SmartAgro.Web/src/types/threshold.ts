export interface GreenhouseThresholds {
  id?: string;
  greenhouseId?: string;
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number;
  maxHumidity: number;
  maxCo2Level: number;
  minSoilMoisture: number;
  maxSoilMoisture: number;
}