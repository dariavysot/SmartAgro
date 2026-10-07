using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SmartAgro.Api.Hubs;
using SmartAgro.Api.Services;
using SmartAgro.Core.Alerts;
using SmartAgro.Core.Data;
using SmartAgro.Core.ML;
using SmartAgro.Core.Security;
using SmartAgro.Core.Simulator;

var builder = WebApplication.CreateBuilder(args);

// 1. Конфігурація бази даних
var dbProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSql";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));

    if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        var sqliteConnection = builder.Configuration.GetConnectionString("Sqlite");
        options.UseSqlite(sqliteConnection, x => x.MigrationsAssembly("SmartAgro.Core"));
    }
    else
    {
        var pgConnection = builder.Configuration.GetConnectionString("PostgreSql");
        options.UseNpgsql(pgConnection, x => x.MigrationsAssembly("SmartAgro.Core"));
    }
});

// 2. Типізована конфігурація JWT (Options Pattern)
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("Секція JwtSettings не знайдена в конфігурації.");

// 3. Конфігурація криптографічного захисту телеметрії (AES-256 + HMAC-SHA256)
builder.Services.Configure<CryptoSettings>(builder.Configuration.GetSection(CryptoSettings.SectionName));

// 4. Реєстрація сервісів безпеки та криптографії в DI
builder.Services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<ITelemetryCryptoService, TelemetryCryptoService>();

// 5. Реєстрація сервісу машинного навчання (ONNX Inference)
builder.Services.AddSingleton<IDiseasePredictionService, DiseasePredictionService>();

// 6. Реєстрація підсистеми тривог (Alerts)
builder.Services.AddScoped<IAlertService, AlertService>();

// 7. SignalR для трансляції телеметрії в реальному часі
builder.Services.AddSignalR();
builder.Services.AddSingleton<ITelemetryNotifier, SignalRTelemetryNotifier>();

// 8. Налаштування CORS для Vite Dev Server
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Необхідно для SignalR WebSocket з'єднання
    });
});

// 9. Фоновий IoT-симулятор (IHostedService / BackgroundService)
builder.Services.AddHostedService<GreenhouseSimulatorService>();

// 10. Налаштування JWT Bearer автентифікації
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
        ClockSkew = TimeSpan.Zero
    };

    // Передача JWT через query string для SignalR WebSockets
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();

// 11. Налаштування Swagger з підтримкою Bearer-токена
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SmartAgro API",
        Version = "v1",
        Description = "API для інтелектуального моніторингу та прогнозування стану теплиці"
    });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Введіть токен у форматі: Bearer {ваш_токен}"
    };

    options.AddSecurityDefinition("Bearer", securityScheme);

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Важливо: UseCors викликається ПЕРЕД UseAuthentication та UseAuthorization
app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Мапінг SignalR Хабу
app.MapHub<TelemetryHub>("/hubs/telemetry");

app.Run();