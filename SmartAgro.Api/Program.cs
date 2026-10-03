using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SmartAgro.Core.Data;
using SmartAgro.Core.Security;

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

// 3. Реєстрація сервісів безпеки в DI
builder.Services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();

// 4. Налаштування JWT Bearer автентифікації
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
        ClockSkew = TimeSpan.Zero // Без 5-хвилинного буфера за замовчуванням
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 5. Налаштування Swagger з підтримкою Bearer-токена
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

    // Додаємо глобальну вимогу безпеки без застарілих типів посилань
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

// Важливо: автентифікація ПЕРЕД авторизацією
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();