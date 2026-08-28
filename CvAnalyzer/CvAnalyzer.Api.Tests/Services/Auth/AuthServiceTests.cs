using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Services.Auth;

public class AuthServiceTests
{
    private static AuthService CreateSut(AppDbContext db) =>
        new(db, new PasswordHasher<User>(), new PasswordPolicy());

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task RegisterAsync_ValidInput_CreatesUserWithHashedPassword()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        var user = await sut.RegisterAsync("New.User@Example.com", "Password123");

        Assert.Equal("new.user@example.com", user.Email); // normalized: trimmed + lowercased
        Assert.NotEqual("Password123", user.PasswordHash);
        Assert.NotEmpty(user.PasswordHash);
        Assert.Single(db.Users);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsEmailAlreadyRegistered()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        await sut.RegisterAsync("dup@example.com", "Password123");

        // Different casing/whitespace — normalization must still catch the duplicate.
        await Assert.ThrowsAsync<EmailAlreadyRegisteredException>(
            () => sut.RegisterAsync("  Dup@Example.com  ", "AnotherPass1"));

        Assert.Single(db.Users);
    }

    [Theory]
    [InlineData("short1")] // too short
    [InlineData("alllettersnoDigits")] // no digit
    [InlineData("12345678")] // no letter
    public async Task RegisterAsync_WeakPassword_ThrowsWeakPassword(string weakPassword)
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        await Assert.ThrowsAsync<WeakPasswordException>(() => sut.RegisterAsync("weak@example.com", weakPassword));
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task LoginAsync_CorrectPassword_ReturnsUser()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        await sut.RegisterAsync("login@example.com", "Password123");

        var user = await sut.LoginAsync("login@example.com", "Password123");

        Assert.Equal("login@example.com", user.Email);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsInvalidCredentials()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        await sut.RegisterAsync("login2@example.com", "Password123");

        await Assert.ThrowsAsync<InvalidCredentialsException>(
            () => sut.LoginAsync("login2@example.com", "WrongPassword1"));
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ThrowsInvalidCredentials()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        await Assert.ThrowsAsync<InvalidCredentialsException>(
            () => sut.LoginAsync("nobody@example.com", "Password123"));
    }

    [Fact]
    public async Task LoginAsync_UnknownEmailAndWrongPassword_ThrowSameExceptionType()
    {
        // Both failure modes must be indistinguishable to the caller (no user-enumeration signal).
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        await sut.RegisterAsync("real@example.com", "Password123");

        var unknownEmailEx = await Record.ExceptionAsync(() => sut.LoginAsync("unknown@example.com", "Password123"));
        var wrongPasswordEx = await Record.ExceptionAsync(() => sut.LoginAsync("real@example.com", "WrongPassword9"));

        Assert.IsType<InvalidCredentialsException>(unknownEmailEx);
        Assert.IsType<InvalidCredentialsException>(wrongPasswordEx);
        Assert.Equal(unknownEmailEx!.Message, wrongPasswordEx!.Message);
    }
}
