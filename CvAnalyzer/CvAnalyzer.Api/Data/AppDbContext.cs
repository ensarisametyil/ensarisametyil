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

    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    public DbSet<AnalysisUsage> AnalysisUsages => Set<AnalysisUsage>();

    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

    public DbSet<UserToken> UserTokens => Set<UserToken>();

    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();

    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    public DbSet<CareerAssistantResult> CareerAssistantResults => Set<CareerAssistantResult>();

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
            entity.Property(u => u.IsActive).HasDefaultValue(true);
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(20).HasDefaultValue(UserRole.User).IsRequired();
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(u => u.UpdatedAt).HasDefaultValueSql("now()");
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
                  .IsRequired()
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(c => c.UserId);
        });

        modelBuilder.Entity<Analysis>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.OverallScore);
            entity.ToTable(t => t.HasCheckConstraint("CK_Analysis_OverallScore_Range", "\"OverallScore\" BETWEEN 0 AND 100"));

            entity.Property(a => a.Summary).IsRequired();
            entity.Property(a => a.Experience).IsRequired();
            entity.Property(a => a.Education).IsRequired();

            foreach (var propertyName in new[] { nameof(Analysis.Strengths), nameof(Analysis.Weaknesses), nameof(Analysis.Skills), nameof(Analysis.MissingKeywords), nameof(Analysis.Recommendations) })
            {
                entity.Property<List<string>>(propertyName)
                      .HasColumnType("jsonb")
                      .HasConversion(
                          v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                          v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new())
                      .Metadata.SetValueComparer(stringListComparer);
            }

            entity.Property(a => a.RawAiResponse).HasColumnType("jsonb");
            entity.Property(a => a.CreatedAt).HasDefaultValueSql("now()");

            entity.HasOne(a => a.Cv)
                  .WithMany(c => c.Analyses)
                  .HasForeignKey(a => a.CvId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Denormalized owner reference (see Analysis.UserId doc comment). The CvId cascade
            // above already guarantees an Analysis row never outlives its Cv/User, so this FK
            // only needs to enforce referential integrity, not a second cascade path.
            entity.HasOne(a => a.User)
                  .WithMany(u => u.Analyses)
                  .HasForeignKey(a => a.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => a.CvId);
            entity.HasIndex(a => a.UserId);
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Plan).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(s => s.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(s => s.StartDate).IsRequired();
            entity.Property(s => s.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(s => s.UpdatedAt).HasDefaultValueSql("now()");
            entity.Property(s => s.Provider).HasMaxLength(50);
            entity.Property(s => s.ProviderCustomerId).HasMaxLength(255);
            entity.Property(s => s.ProviderSubscriptionId).HasMaxLength(255);

            // No other path cascades a Subscription when its User is deleted, so this one must.
            entity.HasOne(s => s.User)
                  .WithMany(u => u.Subscriptions)
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // The exact lookup SubscriptionService.GetEffectivePlanAsync performs.
            entity.HasIndex(s => new { s.UserId, s.Status });

            // Idempotency at the DB level: two webhook/callback events for the same Iyzico
            // subscription can never create two Subscription rows. Nulls (Free users, or any
            // Subscription row created before a provider id was known) don't collide with each
            // other under a unique index — only two equal non-null values would.
            entity.HasIndex(s => s.ProviderSubscriptionId).IsUnique();
        });

        modelBuilder.Entity<AnalysisUsage>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.PeriodStart).IsRequired();
            entity.Property(u => u.PeriodEnd).IsRequired();
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("now()");

            // No other path cascades an AnalysisUsage when its User is deleted, so this one must
            // (unlike Analysis.User, which can be Restrict because the CvId cascade already
            // covers it — AnalysisUsage has no such alternate path).
            entity.HasOne(u => u.User)
                  .WithMany(usr => usr.AnalysisUsages)
                  .HasForeignKey(u => u.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // SetNull (not Cascade): if the underlying Analysis is later deleted (e.g. the user
            // deletes that CV), the billing fact "a credit was spent this period" must survive —
            // otherwise deleting a CV would silently refund a used credit.
            entity.HasOne(u => u.Analysis)
                  .WithMany()
                  .HasForeignKey(u => u.AnalysisId)
                  .OnDelete(DeleteBehavior.SetNull);

            // The exact lookup AnalysisQuotaService's usage count performs.
            entity.HasIndex(u => new { u.UserId, u.PeriodStart });
        });

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.ConversationId).IsRequired().HasMaxLength(100);
            entity.Property(t => t.CheckoutToken).HasMaxLength(255);
            entity.Property(t => t.ProviderSubscriptionReferenceCode).HasMaxLength(255);
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(t => t.FailureReason).HasMaxLength(500);
            entity.Property(t => t.CreatedAt).HasDefaultValueSql("now()");

            // No other path cascades a PaymentTransaction when its User is deleted, so this one must.
            entity.HasOne(t => t.User)
                  .WithMany(u => u.PaymentTransactions)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Idempotency anchors: our own correlation id is always unique; the checkout token
            // and provider subscription reference code are unique whenever Iyzico has assigned
            // one (null before that point — nulls never collide with each other).
            entity.HasIndex(t => t.ConversationId).IsUnique();
            entity.HasIndex(t => t.CheckoutToken).IsUnique();
            entity.HasIndex(t => t.ProviderSubscriptionReferenceCode).IsUnique();
            entity.HasIndex(t => t.UserId);
        });

        modelBuilder.Entity<UserToken>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Purpose).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            entity.Property(t => t.ExpiresAt).IsRequired();
            entity.Property(t => t.CreatedAt).HasDefaultValueSql("now()");

            // No other path cascades a UserToken when its User is deleted, so this one must.
            entity.HasOne(t => t.User)
                  .WithMany(u => u.Tokens)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // A given token value must resolve to at most one row (collision would otherwise let
            // one token redeem a different user's reset/verification request).
            entity.HasIndex(t => t.TokenHash).IsUnique();
            // The lookup ResetPasswordAsync/VerifyEmailAsync perform for "the caller's newest
            // still-valid token of this purpose" when generating a fresh one supersedes an older one.
            entity.HasIndex(t => new { t.UserId, t.Purpose });
        });

        modelBuilder.Entity<ContactMessage>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Name).IsRequired().HasMaxLength(200);
            entity.Property(m => m.Email).IsRequired().HasMaxLength(255);
            entity.Property(m => m.Subject).IsRequired().HasMaxLength(200);
            entity.Property(m => m.Message).IsRequired().HasMaxLength(4000);
            entity.Property(m => m.CreatedAt).HasDefaultValueSql("now()");

            // Optional link to an authenticated sender — a deleted/deactivated user's past contact
            // messages are still a real support record, so this must not cascade-delete them.
            entity.HasOne(m => m.User)
                  .WithMany()
                  .HasForeignKey(m => m.UserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Action).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(l => l.Details).HasMaxLength(500);
            entity.Property(l => l.CreatedAt).HasDefaultValueSql("now()");

            // The admin who performed the action must always be resolvable, but a log row must
            // survive that admin account later being deleted (unlikely, but the audit trail is
            // the one thing that must never silently disappear) — so Restrict, not Cascade.
            entity.HasOne(l => l.AdminUser)
                  .WithMany()
                  .HasForeignKey(l => l.AdminUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // No FK/navigation to the target user on purpose: the audit row must remain a
            // complete historical record even after the target user is deleted, and nothing here
            // needs to navigate from User -> AdminAuditLog.
            entity.HasIndex(l => l.TargetUserId);
            entity.HasIndex(l => l.CreatedAt);
        });

        modelBuilder.Entity<CareerAssistantResult>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Type).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(r => r.ResultJson).IsRequired().HasColumnType("jsonb");
            entity.Property(r => r.CreatedAt).HasDefaultValueSql("now()");

            // Same cascade shape as Analysis: deleting a Cv (or its owning User) must not leave
            // orphaned career-assistant results behind.
            entity.HasOne(r => r.Cv)
                  .WithMany()
                  .HasForeignKey(r => r.CvId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                  .WithMany()
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // The exact lookup a "history for this CV/feature" query performs.
            entity.HasIndex(r => new { r.UserId, r.CvId, r.Type, r.CreatedAt });
        });
    }
}
