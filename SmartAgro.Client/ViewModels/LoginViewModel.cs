using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartAgro.Client.Services;

namespace SmartAgro.Client.ViewModels;

public partial class LoginViewModel : BaseViewModel
{
    private readonly IApiService _apiService;

    [ObservableProperty]
    public partial string Email { get; set; } = "admin@smartagro.ua";

    [ObservableProperty]
    public partial string Password { get; set; } = "Super_strong123!";

    [ObservableProperty]
    public partial string ErrorMessage { get; set; } = string.Empty;

    public LoginViewModel(IApiService apiService)
    {
        _apiService = apiService;
        Title = "Вхід до SmartAgro";
    }

    [RelayCommand]
    private async Task LoginAsync()
    {
        if (IsBusy) return;

        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "Введіть email та пароль.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = string.Empty;

            bool success = await _apiService.LoginAsync(Email.Trim(), Password);
            if (success)
            {
                // Перехід до головного списку теплиць
                await Shell.Current.GoToAsync("//GreenhousesPage");
            }
            else
            {
                ErrorMessage = "Невірний email або пароль.";
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Помилка з'єднання: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }
}