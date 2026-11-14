using SmartAgro.Client.ViewModels;

namespace SmartAgro.Client.Views;

public partial class GreenhouseDetailPage : ContentPage
{
    public GreenhouseDetailPage(GreenhouseDetailViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}