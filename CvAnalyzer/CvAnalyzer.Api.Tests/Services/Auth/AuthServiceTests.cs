using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Auth;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CvAnalyzer.Api.Tests.Services.Auth;

public class AuthServiceTests
{
    private static AuthService CreateSut(AppDbContext db, TimeProvider? timeProvider = null, Microsoft.Extensions.Hosting.IHostEnvironment? environment = null) =>
        new(db, new PasswordHasher<User>(), new PasswordPolicy(), timeProvider ?? TimeProvider.System, environment ?? new FakeHostEnvironment(), NullLogger<AuthService>.Instance);

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

    [Fact]
    public async Task ChangePasswordAsync_CorrectCurrentPassword_UpdatesHashAndAllowsLoginWithNewPassword()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("change@example.com", "OldPassword1");

        await sut.ChangePasswordAsync(user.Id, "OldPassword1", "NewPassword2");

        await Assert.ThrowsAsync<InvalidCredentialsException>(() => sut.LoginAsync("change@example.com", "OldPassword1"));
        var loggedIn = await sut.LoginAsync("change@example.com", "NewPassword2");
        Assert.Equal(user.Id, loggedIn.Id);
    }

    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_ThrowsIncorrectPasswordAndLeavesPasswordUnchanged()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("change2@example.com", "OldPassword1");

        await Assert.ThrowsAsync<IncorrectPasswordException>(
            () => sut.ChangePasswordAsync(user.Id, "WrongPassword9", "NewPassword2"));

        var stillWorks = await sut.LoginAsync("change2@example.com", "OldPassword1");
        Assert.Equal(user.Id, stillWorks.Id);
    }

    [Fact]
    public async Task ChangePasswordAsync_WeakNewPassword_ThrowsWeakPassword()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("change3@example.com", "OldPassword1");

        await Assert.ThrowsAsync<WeakPasswordException>(
            () => sut.ChangePasswordAsync(user.Id, "OldPassword1", "short1"));
    }

    [Fact]
    public async Task RequestPasswordResetAsync_KnownActiveEmail_ReturnsAToken()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        await sut.RegisterAsync("reset@example.com", "Password123");

        var token = await sut.RequestPasswordResetAsync("reset@example.com");

        Assert.NotNull(token);
        Assert.NotEmpty(token!);
    }

    [Fact]
    public async Task RequestPasswordResetAsync_UnknownEmail_ReturnsNullNeverThrows()
    {
        // Enumeration protection lives in AuthController's identical-response behavior, but the
        // service itself must also never behave differently in a way that leaks anything (e.g.
        // throwing for one case and not the other).
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        var token = await sut.RequestPasswordResetAsync("nobody@example.com");

        Assert.Null(token);
    }

    [Fact]
    public async Task RequestPasswordResetAsync_DeactivatedAccount_ReturnsNull()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("deactivated-reset@example.com", "Password123");
        await sut.DeactivateAccountAsync(user.Id, "Password123");

        var token = await sut.RequestPasswordResetAsync("deactivated-reset@example.com");

        Assert.Null(token);
    }

    [Fact]
    public async Task ResetPasswordAsync_ValidToken_ChangesPasswordAndConsumesToken()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("reset2@example.com", "OldPassword1");
        var token = await sut.RequestPasswordResetAsync("reset2@example.com");

        await sut.ResetPasswordAsync(token!, "NewPassword2");

        var loggedIn = await sut.LoginAsync("reset2@example.com", "NewPassword2");
        Assert.Equal(user.Id, loggedIn.Id);

        // Single-use: the same token must not work a second time, even for another new password.
        await Assert.ThrowsAsync<InvalidOrExpiredTokenException>(
            () => sut.ResetPasswordAsync(token!, "AnotherPassword3"));
    }

    [Fact]
    public async Task ResetPasswordAsync_UnknownOrGarbageToken_ThrowsInvalidOrExpiredToken()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        await Assert.ThrowsAsync<InvalidOrExpiredTokenException>(
            () => sut.ResetPasswordAsync("not-a-real-token", "NewPassword2"));
    }

    [Fact]
    public async Task ResetPasswordAsync_ExpiredToken_ThrowsInvalidOrExpiredToken()
    {
        using var db = CreateDbContext();
        var clock = new FakeTimeProvider(DateTimeOffset.UtcNow);
        var sut = CreateSut(db, clock);
        await sut.RegisterAsync("expired@example.com", "OldPassword1");
        var token = await sut.RequestPasswordResetAsync("expired@example.com");

        clock.Set(clock.GetUtcNow().AddHours(2)); // past the 1-hour password-reset token lifetime

        await Assert.ThrowsAsync<InvalidOrExpiredTokenException>(() => sut.ResetPasswordAsync(token!, "NewPassword2"));
    }

    [Fact]
    public async Task ResetPasswordAsync_WeakNewPassword_ThrowsWeakPasswordAndDoesNotConsumeToken()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        await sut.RegisterAsync("weak-reset@example.com", "OldPassword1");
        var token = await sut.RequestPasswordResetAsync("weak-reset@example.com");

        await Assert.ThrowsAsync<WeakPasswordException>(() => sut.ResetPasswordAsync(token!, "short1"));

        // The token must still be usable afterwards with a valid password.
        await sut.ResetPasswordAsync(token!, "ValidPassword2");
    }

    [Fact]
    public async Task ResetPasswordAsync_TokenOnlyAffectsItsOwningUser_NeverAnotherUser()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var userA = await sut.RegisterAsync("victim@example.com", "OriginalPass1");
        await sut.RegisterAsync("other@example.com", "OriginalPass1");
        var tokenForA = await sut.RequestPasswordResetAsync("victim@example.com");

        await sut.ResetPasswordAsync(tokenForA!, "HijackedPass2");

        // Only userA's password changed — the other user's is completely untouched.
        var otherStillWorks = await sut.LoginAsync("other@example.com", "OriginalPass1");
        Assert.NotEqual(userA.Id, otherStillWorks.Id);
        var aChanged = await sut.LoginAsync("victim@example.com", "HijackedPass2");
        Assert.Equal(userA.Id, aChanged.Id);
    }

    [Fact]
    public async Task RequestEmailVerificationAsync_UnverifiedUser_ReturnsToken()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("verify@example.com", "Password123");

        var token = await sut.RequestEmailVerificationAsync(user.Id);

        Assert.NotNull(token);
    }

    [Fact]
    public async Task RequestEmailVerificationAsync_AlreadyVerifiedUser_ReturnsNull()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("verify2@example.com", "Password123");
        var firstToken = await sut.RequestEmailVerificationAsync(user.Id);
        await sut.VerifyEmailAsync(firstToken!);

        var secondToken = await sut.RequestEmailVerificationAsync(user.Id);

        Assert.Null(secondToken);
    }

    [Fact]
    public async Task VerifyEmailAsync_ValidToken_SetsEmailVerifiedAt()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("verify3@example.com", "Password123");
        var token = await sut.RequestEmailVerificationAsync(user.Id);

        await sut.VerifyEmailAsync(token!);

        var reloaded = await sut.GetByIdAsync(user.Id);
        Assert.NotNull(reloaded!.EmailVerifiedAt);
    }

    [Fact]
    public async Task VerifyEmailAsync_InvalidToken_ThrowsInvalidOrExpiredToken()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        await Assert.ThrowsAsync<InvalidOrExpiredTokenException>(() => sut.VerifyEmailAsync("garbage"));
    }

    [Fact]
    public async Task DeactivateAccountAsync_CorrectPassword_SetsInactiveAndBlocksLogin()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("deactivate@example.com", "Password123");

        await sut.DeactivateAccountAsync(user.Id, "Password123");

        await Assert.ThrowsAsync<InvalidCredentialsException>(() => sut.LoginAsync("deactivate@example.com", "Password123"));
        var reloaded = await sut.GetByIdAsync(user.Id);
        Assert.False(reloaded!.IsActive);
    }

    [Fact]
    public async Task DeactivateAccountAsync_WrongPassword_ThrowsIncorrectPasswordAndLeavesAccountActive()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);
        var user = await sut.RegisterAsync("deactivate2@example.com", "Password123");

        await Assert.ThrowsAsync<IncorrectPasswordException>(() => sut.DeactivateAccountAsync(user.Id, "WrongPassword9"));

        var reloaded = await sut.GetByIdAsync(user.Id);
        Assert.True(reloaded!.IsActive);
    }

    [Fact]
    public async Task IssueTokenAsync_DevelopmentEnvironment_DoesNotThrow()
    {
        // Exercises the Development-only dev-token-logging branch without asserting on log
        // content — just confirming it doesn't blow up and still returns the token normally.
        using var db = CreateDbContext();
        var sut = CreateSut(db, environment: new FakeHostEnvironment { EnvironmentName = "Development" });
        var user = await sut.RegisterAsync("dev-log@example.com", "Password123");

        var token = await sut.RequestPasswordResetAsync("dev-log@example.com");

        Assert.NotNull(token);
    }
}
