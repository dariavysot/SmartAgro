using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using SmartAgro.Core.Data;
using System.IO;

namespace SmartAgro.Api;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        var dbProvider = configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSql";
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

        if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            var connectionString = configuration.GetConnectionString("Sqlite");
            optionsBuilder.UseSqlite(connectionString, b => b.MigrationsAssembly("SmartAgro.Core"));
        }
        else
        {
            var connectionString = configuration.GetConnectionString("PostgreSql");
            optionsBuilder.UseNpgsql(connectionString, b => b.MigrationsAssembly("SmartAgro.Core"));
        }

        return new AppDbContext(optionsBuilder.Options);
    }
}