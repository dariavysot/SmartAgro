namespace SmartAgro.Core.Simulator;

public interface ITelemetryNotifier
{
    Task BroadcastTelemetryAsync(object telemetryPayload, CancellationToken ct = default);
}