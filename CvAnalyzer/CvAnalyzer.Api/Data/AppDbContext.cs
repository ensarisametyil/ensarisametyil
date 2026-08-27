using System.Text.Json;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace CvAnalyzer.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Cv> Cvs => Set<Cv>();

    public DbSet<Analysis> Analyses => Set<Analysis>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var stringListComparer = new ValueComparer<List<string>>(
            (a, b) => (a ?? new()).SequenceEqual(b ?? new()),
            v => v.Aggregate(0, (hash, s) => HashCode.Combine(hash, s.GetHashCode())),
            v => v.ToList());

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.FullName).HasMaxLength(255);
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Cv>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.FileName).IsRequired().HasMaxLength(255);
            entity.Property(c => c.FilePath).IsRequired();
            entity.Property(c => c.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(c => c.UploadedAt).HasDefaultValueSql("now()");

            entity.HasOne(c => c.User)
                  .WithMany(u => u.Cvs)
                  .HasForeignKey(c => c.UserId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(c => c.UserId);
        });

        modelBuilder.Entity<Analysis>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Score);
            entity.ToTable(t => t.HasCheckConstraint("CK_Analysis_Score_Range", "\"Score\" BETWEEN 0 AND 100"));

            entity.Property(a => a.MissingSkills)
                  .HasColumnType("jsonb")
                  .HasConversion(
                      v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                      v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                  .Metadata.SetValueComparer(stringListComparer);

            entity.Property(a => a.Weaknesses)
                  .HasColumnType("jsonb")
                  .HasConversion(
                      v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                      v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                  .Metadata.SetValueComparer(stringListComparer);

            entity.Property(a => a.Suggestions)
                  .HasColumnType("jsonb")
                  .HasConversion(
                      v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                      v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                  .Metadata.SetValueComparer(stringListComparer);

            entity.Property(a => a.JobMatches)
                  .HasColumnType("jsonb")
                  .HasConversion(
                      v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                      v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                  .Metadata.SetValueComparer(stringListComparer);

            entity.Property(a => a.RawAiResponse).HasColumnType("jsonb");
            entity.Property(a => a.CreatedAt).HasDefaultValueSql("now()");

            entity.HasOne(a => a.Cv)
                  .WithMany(c => c.Analyses)
                  .HasForeignKey(a => a.CvId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(a => a.CvId);
        });
    }
}
