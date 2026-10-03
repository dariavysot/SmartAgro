using Microsoft.EntityFrameworkCore;
using SmartAgro.Core.Entities;

namespace SmartAgro.Core.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Greenhouse> Greenhouses => Set<Greenhouse>();
    public DbSet<SensorData> SensorData => Set<SensorData>();
    public DbSet<Threshold> Thresholds => Set<Threshold>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Початкові ролі
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = UserRole.Admin },
            new Role { Id = 2, Name = UserRole.Operator }
        );

        // Індекси для швидкого пошуку телеметрії за датою
        modelBuilder.Entity<SensorData>()
            .HasIndex(s => new { s.GreenhouseId, s.Timestamp });
    }
}