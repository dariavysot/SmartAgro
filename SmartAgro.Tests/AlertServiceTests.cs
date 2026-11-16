using Microsoft.EntityFrameworkCore;
using SmartAgro.Core.Alerts;
using SmartAgro.Core.Data;
using SmartAgro.Core.Entities;
using Xunit;

namespace SmartAgro.Tests;

public class AlertServiceTests
{
    private AppDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CheckThresholdsAndCreateAlertsAsync_WhenTemperatureExceedsMax_ShouldCreateWarningOrCriticalAlert()
    {
        // Arrange
        using var dbContext = GetInMemoryDbContext();
        var greenhouseId = Guid.NewGuid();

        // Додаємо дефолтні пороги для теплиці
        dbContext.Thresholds.Add(new Threshold
        {
            GreenhouseId = greenhouseId,
            MinTemperature = 18.0,
            MaxTemperature = 32.0,
            MinHumidity = 40.0,
            MaxHumidity = 85.0,
            MaxCo2Level = 1200.0
        });
        await dbContext.SaveChangesAsync();

        var alertService = new AlertService(dbContext);

        // Симулюємо показники сенсорів із критично високою температурою (> 32 + 4.0)
        var sensorData = new SensorData
        {
            GreenhouseId = greenhouseId,
            Temperature = 38.5, // Перевищує MaxTemperature + 4.0 -> має бути Critical
            Humidity = 60.0,
            Co2Level = 800.0,
            DiseaseRiskScore = 10.0
        };

        // Act
        await alertService.CheckThresholdsAndCreateAlertsAsync(sensorData);

        // Assert
        var createdAlerts = await dbContext.Alerts.ToListAsync();
        Assert.Single(createdAlerts);
        Assert.Equal("Critical", createdAlerts[0].Severity);
        Assert.Contains("Температура", createdAlerts[0].Message);
    }

    [Fact]
    public async Task CheckThresholdsAndCreateAlertsAsync_WhenDiseaseRiskHigh_ShouldCreateCriticalAlert()
    {
        // Arrange
        using var dbContext = GetInMemoryDbContext();
        var greenhouseId = Guid.NewGuid();
        var alertService = new AlertService(dbContext);

        // Симулюємо високий показник ризику фітофторозу від ML-моделі (> 75.0%)
        var sensorData = new SensorData
        {
            GreenhouseId = greenhouseId,
            Temperature = 22.0, // Норма
            Humidity = 60.0,    // Норма
            Co2Level = 800.0,   // Норма
            DiseaseRiskScore = 82.5 // Високий ризик (Критично)
        };

        // Act
        await alertService.CheckThresholdsAndCreateAlertsAsync(sensorData);

        // Assert
        var createdAlerts = await dbContext.Alerts.ToListAsync();
        Assert.Single(createdAlerts);
        Assert.Equal("Critical", createdAlerts[0].Severity);
        Assert.Contains("ML", createdAlerts[0].Message);
    }

    [Fact]
    public async Task CheckThresholdsAndCreateAlertsAsync_WhenAllValuesNormal_ShouldNotCreateAlerts()
    {
        // Arrange
        using var dbContext = GetInMemoryDbContext();
        var greenhouseId = Guid.NewGuid();
        var alertService = new AlertService(dbContext);

        var sensorData = new SensorData
        {
            GreenhouseId = greenhouseId,
            Temperature = 24.0, // У межах [18 - 32]
            Humidity = 65.0,    // У межах [40 - 85]
            Co2Level = 900.0,   // Нижче 1200
            DiseaseRiskScore = 20.0 // Нижче 75
        };

        // Act
        await alertService.CheckThresholdsAndCreateAlertsAsync(sensorData);

        // Assert
        var createdAlerts = await dbContext.Alerts.ToListAsync();
        Assert.Empty(createdAlerts);
    }
}