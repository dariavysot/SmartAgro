export interface TelemetryData {
  id: string;
  greenhouseId: string;
  temperature: number;
  humidity: number;
  co2Level: number;
  soilMoisture: number;
  diseaseRiskScore: number;
  timestamp: string;
  signature?: string;
}

export type MetricStatus = 'normal' | 'warning' | 'critical';