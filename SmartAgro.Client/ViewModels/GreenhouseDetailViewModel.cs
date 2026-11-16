using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartAgro.Client.Models;
using SmartAgro.Client.Services;

namespace SmartAgro.Client.ViewModels;

[QueryProperty(nameof(GreenhouseId), "id")]
public partial class GreenhouseDetailViewModel : BaseViewModel
{
    private readonly IApiService _apiService;

    [ObservableProperty]
    public partial string? GreenhouseId { get; set; }

    [ObservableProperty]
    public partial string Name { get; set; } = string.Empty;

    [ObservableProperty]
    public partial string Location { get; set; } = string.Empty;

    [ObservableProperty]
    public partial bool IsEditMode { get; set; }

    // Кнопка видалення видима тільки під час редагування і лише для адміністратора
    public bool CanDelete => IsEditMode && _apiService.CurrentUserRole == "Admin";

    public GreenhouseDetailViewModel(IApiService apiService)
    {
        _apiService = apiService;
        Title = "Нова теплиця";
    }

    async partial void OnGreenhouseIdChanged(string? value)
    {
        if (!string.IsNullOrEmpty(value) && Guid.TryParse(value, out var id))
        {
            IsEditMode = true;
            Title = "Редагування теплиці";
            OnPropertyChanged(nameof(CanDelete));
            await LoadDetailsAsync(id);
        }
        else
        {
            IsEditMode = false;
            Title = "Створення теплиці";
            Name = string.Empty;
            Location = string.Empty;
            IsBusy = false;
            OnPropertyChanged(nameof(CanDelete));
        }
    }

    private async Task LoadDetailsAsync(Guid id)
    {
        try
        {
            IsBusy = true;
            var item = await _apiService.GetGreenhouseByIdAsync(id);
            if (item != null)
            {
                Name = item.Name;
                Location = item.Location;
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Помилка", $"Не вдалося отримати дані: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private async Task SaveAsync()
    {
        if (IsBusy) return;

        if (string.IsNullOrWhiteSpace(Name) || string.IsNullOrWhiteSpace(Location))
        {
            await Shell.Current.DisplayAlertAsync("Помилка валідації", "Назва та локація є обов'язковими.", "OK");
            return;
        }

        try
        {
            IsBusy = true;
            bool isSuccess;

            if (IsEditMode && Guid.TryParse(GreenhouseId, out var id))
            {
                isSuccess = await _apiService.UpdateGreenhouseAsync(id, new UpdateGreenhouseModel
                {
                    Name = Name.Trim(),
                    Location = Location.Trim()
                });
            }
            else
            {
                var currentUserId = _apiService.CurrentUserId ?? Guid.Empty;
                isSuccess = await _apiService.CreateGreenhouseAsync(new CreateGreenhouseModel
                {
                    Name = Name.Trim(),
                    Location = Location.Trim(),
                    UserId = currentUserId,
                    InitialTemperature = 22.0,
                    InitialHumidity = 65.0,
                    InitialCo2 = 600.0
                });
            }

            if (isSuccess)
            {
                await Shell.Current.GoToAsync("..");
            }
            else
            {
                await Shell.Current.DisplayAlertAsync("Помилка", "Сервер відхилив запит на збереження.", "OK");
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Помилка", $"Виникла помилка: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private async Task DeleteAsync()
    {
        if (_apiService.CurrentUserRole != "Admin")
        {
            await Shell.Current.DisplayAlertAsync("Доступ обмежено", "Видаляти теплиці може лише адміністратор.", "OK");
            return;
        }

        if (!Guid.TryParse(GreenhouseId, out var id)) return;

        bool confirm = await Shell.Current.DisplayAlertAsync("Підтвердження", $"Ви дійсно бажаєте видалити теплицю «{Name}»?", "Видалити", "Скасувати");
        if (!confirm) return;

        try
        {
            IsBusy = true;
            bool success = await _apiService.DeleteGreenhouseAsync(id);
            if (success)
            {
                await Shell.Current.DisplayAlertAsync("Успіх", "Теплицю успішно видалено.", "OK");
                await Shell.Current.GoToAsync("..");
            }
            else
            {
                await Shell.Current.DisplayAlertAsync("Помилка", "Сервер відхилив видалення теплиці.", "OK");
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Помилка", $"Помилка видалення: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }
}