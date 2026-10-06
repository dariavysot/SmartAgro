import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { TelemetryData } from '../types/telemetry';

const HUB_URL = 'https://localhost:7168/hubs/telemetry';

export const useTelemetryHub = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('smartagro_access_token');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token || '',
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.None) // Приглушуємо системні варнінги перепідключення
      .build();

    connectionRef.current = connection;

    connection.on('ReceiveTelemetry', (data: TelemetryData) => {
      if (isMounted) {
        setTelemetry(data);
      }
    });

    connection.onreconnecting(() => {
      if (isMounted) setIsConnected(false);
    });

    connection.onreconnected(() => {
      if (isMounted) setIsConnected(true);
    });

    connection.onclose(() => {
      if (isMounted) setIsConnected(false);
    });

    const startConnection = async () => {
      try {
        await connection.start();
        if (isMounted) {
          setIsConnected(true);
          setError(null);
        }
      } catch (err: any) {
        // Ігноруємо скасування з'єднання під час демонтажу React StrictMode
        if (isMounted && !err.message?.includes('stopped during negotiation')) {
          setError(err.message || 'Помилка підключення до SignalR');
          setIsConnected(false);
        }
      }
    };

    startConnection();

    return () => {
      isMounted = false;
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      }
    };
  }, []);

  return { telemetry, isConnected, error };
};