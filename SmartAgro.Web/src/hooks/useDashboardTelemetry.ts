import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useGreenhouse } from '../context/GreenhouseContext';
import { useTelemetryHub } from '../hooks/useTelemetryHub';
import type { ChartPoint } from '../components/dashboard/TelemetryChart';
import type { AlertItem } from '../components/dashboard/AlertsPanel';
import type { GlobalAlertItem } from '../components/layout/Navbar';
import type { RiskBreakdown } from '../types/telemetry';
import type { GreenhouseThresholds } from '../types/threshold';

export interface TelemetryRecord {
  id: string;
  greenhouseId: string;
  temperature: number;
  humidity: number;
  co2Level: number;
  diseaseRiskScore: number;
  soilMoisture?: number;
  signature?: string;
  timestamp: string;
  riskBreakdown?: RiskBreakdown;
}

export interface BackendAlert {
  id: number;
  greenhouseId: string;
  greenhouseName: string;
  message: string;
  severity: string;
  isResolved: boolean;
  createdAt: string;
}

const defaultThresholds: GreenhouseThresholds = {
  minTemperature: 18.0,
  maxTemperature: 28.0,
  minHumidity: 50.0,
  maxHumidity: 80.0,
  maxCo2Level: 1000.0,
  minSoilMoisture: 45.0,
  maxSoilMoisture: 75.0,
};

export function useDashboardTelemetry(chartRange: '20' | '1h' | '24h', activeTab: string) {
  const { selectedGreenhouse } = useGreenhouse();
  const { telemetry: liveTelemetry, isConnected } = useTelemetryHub();

  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [allGlobalAlerts, setAllGlobalAlerts] = useState<GlobalAlertItem[]>([]);
  const [greenhouseAlerts, setGreenhouseAlerts] = useState<AlertItem[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<TelemetryRecord | null>(null);
  const [thresholds, setThresholds] = useState<GreenhouseThresholds>(defaultThresholds);

  // Завантаження активних сповіщень
  const fetchActiveAlerts = useCallback(async () => {
    try {
      const res = await apiClient.get<BackendAlert[]>('/Alerts/active');
      
      const globalMapped = res.data.map((a) => ({
        id: a.id,
        greenhouseId: a.greenhouseId,
        greenhouseName: a.greenhouseName,
        message: a.message,
        severity: a.severity,
        timestamp: a.createdAt,
      }));
      setAllGlobalAlerts(globalMapped);

      const filtered = res.data
        .filter((a) => !selectedGreenhouse?.id || a.greenhouseId === selectedGreenhouse.id)
        .map((a) => ({
          id: a.id,
          message: a.message,
          type: a.severity,
          timestamp: a.createdAt,
          greenhouseName: a.greenhouseName,
        }));
      setGreenhouseAlerts(filtered);
    } catch (err) {
      console.error('Помилка завантаження активних тривог:', err);
    }
  }, [selectedGreenhouse?.id]);

  // Завантаження телеметрії з урахуванням діапазону
  useEffect(() => {
    fetchActiveAlerts();

    if (!selectedGreenhouse?.id) {
      setHistory([]);
      setCurrentSnapshot(null);
      setThresholds(defaultThresholds);
      return;
    }

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        let limit = 20;
        if (chartRange === '1h') limit = 60;
        if (chartRange === '24h') limit = 288;

        const [latestRes, historyRes, thresholdsRes] = await Promise.allSettled([
          apiClient.get<TelemetryRecord>(`/Telemetry/latest/${selectedGreenhouse.id}`),
          apiClient.get<TelemetryRecord[]>(`/Telemetry/history/${selectedGreenhouse.id}?limit=${limit}`),
          apiClient.get<GreenhouseThresholds>(`/Thresholds/${selectedGreenhouse.id}`),
        ]);

        if (!isMounted) return;

        if (latestRes.status === 'fulfilled' && latestRes.value.data) {
          setCurrentSnapshot(latestRes.value.data);
        } else {
          setCurrentSnapshot(null);
        }

        if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data)) {
          const points: ChartPoint[] = [...historyRes.value.data].reverse().map((item) => {
            const dateObj = new Date(item.timestamp);
            const timeLabel = chartRange === '24h' 
              ? `${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return {
              time: timeLabel,
              temperature: item.temperature,
              humidity: item.humidity,
              co2: item.co2Level,
            };
          });
          setHistory(points);
        } else {
          setHistory([]);
        }

        if (thresholdsRes.status === 'fulfilled' && thresholdsRes.value.data) {
          const t = thresholdsRes.value.data;
          setThresholds({
            minTemperature: t.minTemperature ?? defaultThresholds.minTemperature,
            maxTemperature: t.maxTemperature ?? defaultThresholds.maxTemperature,
            minHumidity: t.minHumidity ?? defaultThresholds.minHumidity,
            maxHumidity: t.maxHumidity ?? defaultThresholds.maxHumidity,
            maxCo2Level: t.maxCo2Level ?? defaultThresholds.maxCo2Level,
            minSoilMoisture: t.minSoilMoisture ?? defaultThresholds.minSoilMoisture,
            maxSoilMoisture: t.maxSoilMoisture ?? defaultThresholds.maxSoilMoisture,
          });
        }
      } catch (err) {
        console.error('Не вдалося завантажити початкову телеметрію:', err);
      }
    };

    loadInitialData();
    const interval = setInterval(fetchActiveAlerts, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedGreenhouse?.id, chartRange, fetchActiveAlerts, activeTab]);

  // Обробка живого потоку SignalR
  useEffect(() => {
    if (!liveTelemetry) return;

    if (selectedGreenhouse && liveTelemetry.greenhouseId && liveTelemetry.greenhouseId !== selectedGreenhouse.id) {
      return;
    }

    setCurrentSnapshot({
      id: liveTelemetry.id || '',
      greenhouseId: liveTelemetry.greenhouseId,
      temperature: liveTelemetry.temperature,
      humidity: liveTelemetry.humidity,
      co2Level: liveTelemetry.co2Level,
      diseaseRiskScore: liveTelemetry.diseaseRiskScore,
      soilMoisture: liveTelemetry.soilMoisture ?? 62.0,
      signature: liveTelemetry.signature,
      timestamp: liveTelemetry.timestamp || new Date().toISOString(),
      riskBreakdown: liveTelemetry.riskBreakdown,
    });

    if (chartRange === '20') {
      const timeLabel = new Date(liveTelemetry.timestamp || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setHistory((prev) => {
        const updated = [
          ...prev,
          {
            time: timeLabel,
            temperature: liveTelemetry.temperature,
            humidity: liveTelemetry.humidity,
            co2: liveTelemetry.co2Level,
          },
        ];
        return updated.slice(-20);
      });
    }

    if (
      liveTelemetry.temperature > thresholds.maxTemperature ||
      liveTelemetry.temperature < thresholds.minTemperature ||
      liveTelemetry.humidity > thresholds.maxHumidity ||
      liveTelemetry.humidity < thresholds.minHumidity ||
      liveTelemetry.co2Level > thresholds.maxCo2Level
    ) {
      fetchActiveAlerts();
    }
  }, [liveTelemetry, selectedGreenhouse, thresholds, chartRange, fetchActiveAlerts]);

  return {
    history,
    allGlobalAlerts,
    setAllGlobalAlerts,
    greenhouseAlerts,
    setGreenhouseAlerts,
    currentSnapshot,
    thresholds,
    isConnected,
    fetchActiveAlerts,
  };
}