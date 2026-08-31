using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Admin;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Services.Admin;

public class AdminPaymentServiceTests
{
    private static readonly DateTime Now = new(2026, 8, 31, 12, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static User NewUser(string email) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        PasswordHash = "irrelevant",
        IsActive = true,
        CreatedAt = Now,
        UpdatedAt = Now,
    };

    private static PaymentTransaction NewTransaction(Guid userId, PaymentTransactionStatus status, DateTime createdAt) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        ConversationId = Guid.NewGuid().ToString(),
        Status = status,
        AmountUsd = 10.00m,
        Currency = "USD",
        CreatedAt = createdAt,
    };

    [Fact]
    public async Task ListPaymentsAsync_ReturnsAllTransactions_AcrossAllUsers_NewestFirst()
    {
        using var db = CreateDbContext();
        var userA = NewUser("a@example.com");
        var userB = NewUser("b@example.com");
        db.Users.AddRange(userA, userB);
        db.PaymentTransactions.AddRange(
            NewTransaction(userA.Id, PaymentTransactionStatus.Succeeded, Now.AddMinutes(-2)),
            NewTransaction(userB.Id, PaymentTransactionStatus.Failed, Now.AddMinutes(-1)));
        await db.SaveChangesAsync();

        var sut = new AdminPaymentService(db);
        var result = await sut.ListPaymentsAsync(page: 1, pageSize: 20, status: null, search: null, fromDate: null, toDate: null);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal("b@example.com", result.Items[0].UserEmail);
    }

    [Fact]
    public async Task ListPaymentsAsync_FiltersByStatus()
    {
        using var db = CreateDbContext();
        var user = NewUser("a@example.com");
        db.Users.Add(user);
        db.PaymentTransactions.AddRange(
            NewTransaction(user.Id, PaymentTransactionStatus.Succeeded, Now),
            NewTransaction(user.Id, PaymentTransactionStatus.Failed, Now));
        await db.SaveChangesAsync();

        var sut = new AdminPaymentService(db);
        var result = await sut.ListPaymentsAsync(page: 1, pageSize: 20, status: PaymentTransactionStatus.Failed, search: null, fromDate: null, toDate: null);

        Assert.Single(result.Items);
        Assert.Equal(PaymentTransactionStatus.Failed, result.Items[0].Status);
    }

    [Fact]
    public async Task ListPaymentsAsync_FiltersByUserEmailSearch()
    {
        using var db = CreateDbContext();
        var userA = NewUser("ada@example.com");
        var userB = NewUser("grace@example.com");
        db.Users.AddRange(userA, userB);
        db.PaymentTransactions.AddRange(
            NewTransaction(userA.Id, PaymentTransactionStatus.Succeeded, Now),
            NewTransaction(userB.Id, PaymentTransactionStatus.Succeeded, Now));
        await db.SaveChangesAsync();

        var sut = new AdminPaymentService(db);
        var result = await sut.ListPaymentsAsync(page: 1, pageSize: 20, status: null, search: "ada", fromDate: null, toDate: null);

        Assert.Single(result.Items);
        Assert.Equal("ada@example.com", result.Items[0].UserEmail);
    }

    [Fact]
    public async Task ListPaymentsAsync_FiltersByDateRange()
    {
        using var db = CreateDbContext();
        var user = NewUser("a@example.com");
        db.Users.Add(user);
        db.PaymentTransactions.AddRange(
            NewTransaction(user.Id, PaymentTransactionStatus.Succeeded, Now.AddDays(-10)),
            NewTransaction(user.Id, PaymentTransactionStatus.Succeeded, Now));
        await db.SaveChangesAsync();

        var sut = new AdminPaymentService(db);
        var result = await sut.ListPaymentsAsync(page: 1, pageSize: 20, status: null, search: null, fromDate: Now.AddDays(-1), toDate: null);

        Assert.Single(result.Items);
    }

    [Fact]
    public async Task ListPaymentsAsync_NeverExposesMoreThanTheDefinedProjection_NoRawProviderPayload()
    {
        using var db = CreateDbContext();
        var user = NewUser("a@example.com");
        db.Users.Add(user);
        db.PaymentTransactions.Add(NewTransaction(user.Id, PaymentTransactionStatus.Succeeded, Now));
        await db.SaveChangesAsync();

        var sut = new AdminPaymentService(db);
        var result = await sut.ListPaymentsAsync(page: 1, pageSize: 20, status: null, search: null, fromDate: null, toDate: null);

        var properties = typeof(AdminPaymentListItem).GetProperties().Select(p => p.Name).ToList();
        Assert.DoesNotContain(properties, p => p.Contains("Failure", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(properties, p => p.Contains("Token", StringComparison.OrdinalIgnoreCase));
    }
}
