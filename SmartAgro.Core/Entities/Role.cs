namespace SmartAgro.Core.Entities;

public enum UserRole
{
    Admin,
    Operator
}

public class Role
{
    public int Id { get; set; }
    public UserRole Name { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
}