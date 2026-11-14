using SmartAgro.Client.Views;

namespace SmartAgro.Client;

public partial class AppShell : Shell
{
    public AppShell()
    {
        InitializeComponent();

        Routing.RegisterRoute(nameof(GreenhouseDetailPage), typeof(GreenhouseDetailPage));
    }
}