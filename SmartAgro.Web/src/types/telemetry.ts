export interface RiskBreakdown {
  fungalDiseaseRisk: number;
  vpdStressRisk: number;
  co2InefficiencyRisk: number;
  rootHypoxiaRisk: number;
  overallRiskScore?: number;
}

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
  riskBreakdown?: RiskBreakdown;
}

export type MetricStatus = 'normal' | 'warning' | 'critical';