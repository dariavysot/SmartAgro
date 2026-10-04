using Microsoft.AspNetCore.SignalR;

namespace SmartAgro.Api.Hubs;

public sealed class TelemetryHub : Hub
{
    /// <summary>
    /// Клієнт приєднується до групи конкретної теплиці для отримання її оновлень.
    /// </summary>
    public async Task JoinGreenhouse(string greenhouseId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, greenhouseId);
    }

    /// <summary>
    /// Клієнт відписується від теплиці.
    /// </summary>
    public async Task LeaveGreenhouse(string greenhouseId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, greenhouseId);
    }
}