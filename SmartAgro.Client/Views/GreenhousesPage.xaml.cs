using SmartAgro.Client.ViewModels;

namespace SmartAgro.Client.Views;

public partial class GreenhousesPage : ContentPage
{
    private readonly GreenhousesViewModel _viewModel;

    public GreenhousesPage(GreenhousesViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = _viewModel = viewModel;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await _viewModel.LoadGreenhousesCommand.ExecuteAsync(null);
    }
}