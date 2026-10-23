using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SmartAgro.Api.Hubs;
using SmartAgro.Api.Services;
using SmartAgro.Core.Alerts;
using SmartAgro.Core.Data;
using SmartAgro.Core.ML;
using SmartAgro.Core.Security;
using SmartAgro.Core.Simulator;

var builder = WebApplication.CreateBuilder(args);

// 1. Конфігурація незалежності від СУБД (PostgreSQL / SQLite)
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
              .AllowCredentials();
    });
});

// 9. Фоновий IoT-симулятор
builder.Services.AddHostedService<GreenhouseSimulatorService>();

// 10. Налаштування JWT Bearer автентифікації та обробки 401/403 статусів
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
        ClockSkew = TimeSpan.Zero,
        NameClaimType = ClaimTypes.NameIdentifier,
        RoleClaimType = ClaimTypes.Role
    };

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
        },
        OnChallenge = async context =>
        {
            // Перехоплення 401 Unauthorized для формування стандартизованої відповіді
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/problem+json";

            var errorResponse = new
            {
                type = "https://tools.ietf.org/html/rfc7235#section-3.1",
                title = "Неавторизований доступ",
                status = 401,
                detail = "Для доступу до ресурсу потрібен дійсний JWT Bearer токен."
            };

            await context.Response.WriteAsJsonAsync(errorResponse);
        },
        OnForbidden = async context =>
        {
            // Перехоплення 403 Forbidden при нестачі прав/ролей
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/problem+json";

            var errorResponse = new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.5.3",
                title = "Доступ заборонено",
                status = 403,
                detail = "У вас недостатньо прав або ваша роль не відповідає вимогам ресурсу."
            };

            await context.Response.WriteAsJsonAsync(errorResponse);
        }
    };
});

// 11. Налаштування Policy-Based Authorization (Вимога 10)
builder.Services.AddAuthorization(options =>
{
    // Політика виключно для адміністратора
    options.AddPolicy("RequireAdminOnly", policy =>
        policy.RequireRole("Admin"));

    // Політика керування об'єктами: адміністратор або користувач із правом CanManageGreenhouses
    options.AddPolicy("CanManageGreenhouses", policy =>
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("Admin") ||
            ctx.User.HasClaim(c => c.Type == "Permission" && c.Value == "CanManageGreenhouses")));
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();

// 12. Swagger UI з підтримкою Bearer
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SmartAgro API",
        Version = "v1",
        Description = "API для інтелектуального моніторингу та управління теплицями (Lab 2 & Lab 3)"
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
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 13. Глобальна обробка винятків без витоку стек-трейсу клієнту (Вимога 21)
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var exceptionHandlerPathFeature = context.Features.Get<IExceptionHandlerPathFeature>();
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        if (exceptionHandlerPathFeature?.Error != null)
        {
            logger.LogError(exceptionHandlerPathFeature.Error, "Неперехоплена помилка сервера на маршруті {Path}", context.Request.Path);
        }

        var problemDetails = new
        {
            type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
            title = "Внутрішня помилка сервера",
            status = 500,
            detail = "Виникла непередбачена помилка. Спробуйте пізніше або зверніться до адміністратора."
        };

        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});

// Ініціалізація схеми БД
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.EnsureCreated();
        logger.LogInformation("Базу даних ({Provider}) успішно перевірено та ініціалізовано.", dbProvider);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Помилка під час ініціалізації бази даних ({Provider})", dbProvider);
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TelemetryHub>("/hubs/telemetry");

app.Run();