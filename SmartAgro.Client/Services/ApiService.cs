using System.Net.Http.Headers;
using System.Net.Http.Json;
using SmartAgro.Client.Models;

namespace SmartAgro.Client.Services;

public interface IApiService
{
    bool IsAuthenticated { get; }
    string? CurrentUserRole { get; }
    Guid? CurrentUserId { get; }
    Task<bool> LoginAsync(string email, string password);
    Task<List<GreenhouseItem>> GetGreenhousesAsync();
    Task<GreenhouseItem?> GetGreenhouseByIdAsync(Guid id);
    Task<bool> CreateGreenhouseAsync(CreateGreenhouseModel model);
    Task<bool> UpdateGreenhouseAsync(Guid id, UpdateGreenhouseModel model);
    Task<bool> DeleteGreenhouseAsync(Guid id);
    void Logout();
}

public class ApiService : IApiService
{
    private readonly HttpClient _httpClient;
    private string? _accessToken;
    public bool IsAuthenticated => !string.IsNullOrEmpty(_accessToken);
    public string? CurrentUserRole { get; private set; }
    public Guid? CurrentUserId { get; private set; }

    public ApiService()
    {
        // 10.0.2.2 для Android емулятора, localhost для Windows
        string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
            ? "http://10.0.2.2:5168"
            : "http://localhost:5168";

        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true
        };

        _httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri(baseUrl)
        };
    }

    public async Task<bool> LoginAsync(string email, string password)
    {
        var response = await _httpClient.PostAsJsonAsync("/api/Auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        if (!response.IsSuccessStatusCode)
            return false;

        var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
        if (result == null || string.IsNullOrEmpty(result.AccessToken))
            return false;

        _accessToken = result.AccessToken;
        CurrentUserRole = result.Role;
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

        // Отримання userId з /api/Auth/me
        var meResponse = await _httpClient.GetAsync("/api/Auth/me");
        if (meResponse.IsSuccessStatusCode)
        {
            var meData = await meResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
            if (meData != null && meData.TryGetValue("userId", out var idObj) && Guid.TryParse(idObj.ToString(), out var parsedId))
            {
                CurrentUserId = parsedId;
            }
        }

        return true;
    }

    public async Task<List<GreenhouseItem>> GetGreenhousesAsync()
    {
        var response = await _httpClient.GetAsync("/api/Greenhouses");
        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadFromJsonAsync<List<GreenhouseItem>>() ?? [];
        }
        return [];
    }

    public async Task<GreenhouseItem?> GetGreenhouseByIdAsync(Guid id)
    {
        var response = await _httpClient.GetAsync($"/api/Greenhouses/{id}");
        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadFromJsonAsync<GreenhouseItem>();
        }
        return null;
    }

    public async Task<bool> CreateGreenhouseAsync(CreateGreenhouseModel model)
    {
        var response = await _httpClient.PostAsJsonAsync("/api/Greenhouses", model);
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> UpdateGreenhouseAsync(Guid id, UpdateGreenhouseModel model)
    {
        var response = await _httpClient.PutAsJsonAsync($"/api/Greenhouses/{id}", model);
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> DeleteGreenhouseAsync(Guid id)
    {
        try
        {
            var response = await _httpClient.DeleteAsync($"/api/Greenhouses/{id}");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public void Logout()
    {
        _accessToken = null;
        CurrentUserRole = null;
        CurrentUserId = null;
        _httpClient.DefaultRequestHeaders.Authorization = null;
    }
}