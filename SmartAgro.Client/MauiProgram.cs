using Microsoft.Extensions.Logging;
using SmartAgro.Client.Services;
using SmartAgro.Client.ViewModels;
using SmartAgro.Client.Views;

namespace SmartAgro.Client;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

#if DEBUG
        builder.Logging.AddDebug();
#endif

        // 1. Сервіси
        builder.Services.AddSingleton<IApiService, ApiService>();

        // 2. ViewModels
        builder.Services.AddTransient<LoginViewModel>();
        builder.Services.AddTransient<GreenhousesViewModel>();
        builder.Services.AddTransient<GreenhouseDetailViewModel>();

        // 3. Views (Сторінки)
        builder.Services.AddTransient<LoginPage>();
        builder.Services.AddTransient<GreenhousesPage>();
        builder.Services.AddTransient<GreenhouseDetailPage>();

        return builder.Build();
    }
}