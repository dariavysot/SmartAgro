using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartAgro.Client.Models;
using SmartAgro.Client.Services;

namespace SmartAgro.Client.ViewModels;

public partial class GreenhousesViewModel : BaseViewModel
{
    private readonly IApiService _apiService;

    public ObservableCollection<GreenhouseItem> Greenhouses { get; } = [];

    [ObservableProperty]
    public partial bool IsRefreshing { get; set; }

    public GreenhousesViewModel(IApiService apiService)
    {
        _apiService = apiService;
        Title = "Тепличні комплекси";
    }

    [RelayCommand]
    public async Task LoadGreenhousesAsync()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;
            var items = await _apiService.GetGreenhousesAsync();
            Greenhouses.Clear();
            foreach (var item in items)
            {
                Greenhouses.Add(item);
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlert("Помилка", $"Не вдалося завантажити теплиці: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
            IsRefreshing = false;
        }
    }

    [RelayCommand]
    private async Task GoToDetailAsync(GreenhouseItem? item)
    {
        if (item == null) return;

        if (_apiService.CurrentUserRole != "Admin")
        {
            await Shell.Current.DisplayAlert("Доступ обмежено", "Редагування теплиць доступне лише адміністраторам.", "OK");
            return;
        }

        await Shell.Current.GoToAsync($"GreenhouseDetailPage?id={item.Id}");
    }

    [RelayCommand]
    private async Task CreateNewAsync()
    {
        if (_apiService.CurrentUserRole != "Admin")
        {
            await Shell.Current.DisplayAlert("Доступ обмежено", "Створення нових теплиць доступне лише адміністраторам.", "OK");
            return;
        }

        await Shell.Current.GoToAsync("GreenhouseDetailPage");
    }

    [RelayCommand]
    private async Task DeleteAsync(GreenhouseItem? item)
    {
        if (item == null) return;

        if (_apiService.CurrentUserRole != "Admin")
        {
            await Shell.Current.DisplayAlert("Доступ обмежено", "Видалення теплиць доступне лише адміністраторам.", "OK");
            return;
        }

        bool confirm = await Shell.Current.DisplayAlert("Видалення", $"Видалити теплицю «{item.Name}»?", "Так", "Ні");
        if (!confirm) return;

        bool deleted = await _apiService.DeleteGreenhouseAsync(item.Id);
        if (deleted)
        {
            Greenhouses.Remove(item);
        }
        else
        {
            await Shell.Current.DisplayAlert("Помилка", "Не вдалося видалити об'єкт.", "OK");
        }
    }

    [RelayCommand]
    private async Task LogoutAsync()
    {
        bool confirm = await Shell.Current.DisplayAlert("Вихід", "Ви дійсно бажаєте вийти з облікового запису?", "Так", "Ні");
        if (!confirm) return;

        _apiService.Logout();

        // Очищаємо список в пам'яті
        Greenhouses.Clear();

        await Shell.Current.GoToAsync("//LoginPage");
    }


}