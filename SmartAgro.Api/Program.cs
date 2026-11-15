using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
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

// --- 0. ВАЛІДАЦІЯ КОНФІГУРАЦІЇ ПРИ СТАРТІ (Fail Fast) ---
var jwtSecret = builder.Configuration["JwtSettings:SecretKey"];
var aesKey = builder.Configuration["CryptoSettings:AesKeyBase64"];
var hmacKey = builder.Configuration["CryptoSettings:HmacKeyBase64"];
var dbConnection = builder.Configuration["ConnectionStrings:PostgreSql"];
var dbProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSql";

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("Критична помилка конфігурації: відсутній JwtSettings:SecretKey!");
}
if (string.IsNullOrWhiteSpace(aesKey))
{
    throw new InvalidOperationException("Критична помилка конфігурації: відсутній CryptoSettings:AesKeyBase64!");
}
if (string.IsNullOrWhiteSpace(hmacKey))
{
    throw new InvalidOperationException("Критична помилка конфігурації: відсутній CryptoSettings:HmacKeyBase64!");
}
if (dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(dbConnection))
{
    throw new InvalidOperationException("Критична помилка конфігурації: відсутній ConnectionStrings:PostgreSql!");
}

// 1. Конфігурація незалежності від СУБД (PostgreSQL / SQLite)
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
        options.UseNpgsql(pgConnection, x =>
        {
            x.MigrationsAssembly("SmartAgro.Core");
            // Додаємо політику повторних спроб при тимчасових обривах з'єднання чи перезапуску БД (коди типу 57P01)
            x.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorCodesToAdd: null);
        });
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

// 10. Налаштування Rate Limiting (Захист від брутфорсу та DoS)
builder.Services.AddRateLimiter(options =>
{
    // Загальна політика (60 запитів на хвилину)
    options.AddFixedWindowLimiter("fixed", opt =>
    {
        opt.PermitLimit = 60;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 2;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    // Сувора політика для логіну/реєстрації (5 спроб на хвилину)
    options.AddFixedWindowLimiter("auth-policy", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/problem+json";

        var problemDetails = new
        {
            type = "https://tools.ietf.org/html/rfc6585#section-4",
            title = "Перевищено ліміт запитів",
            status = 429,
            detail = "Забагато запитів з вашої IP-адреси. Спробуйте пізніше."
        };

        await context.HttpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
    };
});

// 11. Налаштування JWT Bearer автентифікації та обробки 401/403 статусів
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
        },
        OnChallenge = async context =>
        {
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

// 12. Налаштування Policy-Based Authorization
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdminOnly", policy =>
        policy.RequireRole("Admin"));

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

// 13. Swagger UI з підтримкою Bearer
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
        Description = "Вставте лише JWT Access Token (Swagger автоматично підставить 'Bearer ')",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = "Bearer"
        }
    };

    options.AddSecurityDefinition("Bearer", securityScheme);

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            securityScheme,
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 14. Глобальна обробка винятків без витоку стек-трейсу клієнту
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

// Підключення мідлвару обмеження кількості запитів
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Мапінг SignalR Хабу
app.MapHub<TelemetryHub>("/hubs/telemetry");

app.Run();