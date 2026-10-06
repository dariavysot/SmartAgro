using Microsoft.AspNetCore.SignalR;
using SmartAgro.Api.Hubs;
using SmartAgro.Core.Simulator;

namespace SmartAgro.Api.Services;

public sealed class SignalRTelemetryNotifier(IHubContext<TelemetryHub> hubContext) : ITelemetryNotifier
{
    public async Task BroadcastTelemetryAsync(object telemetryPayload, CancellationToken ct = default)
    {
        await hubContext.Clients.All.SendAsync("ReceiveTelemetry", telemetryPayload, ct);
    }
}