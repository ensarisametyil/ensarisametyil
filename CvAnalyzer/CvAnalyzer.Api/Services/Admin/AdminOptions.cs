namespace CvAnalyzer.Api.Services.Admin;

/// <summary>
/// Bound from the "Admin" configuration section. The only thing here is how the very first Admin
/// gets created — there is deliberately no public/self-service "become admin" endpoint anywhere
/// in this app (see docs/admin-panel.md), so an operator configures the email of an already
/// -registered account here and the app promotes it to Admin at startup (see
/// AdminBootstrap.SeedAsync in Program.cs). Every Admin after that is created by an existing
/// Admin using the role-change action, not through this setting.
/// </summary>
public class AdminOptions
{
    public const string SectionName = "Admin";

    /// <summary>
    /// Email of the account to promote to Admin at startup, if it exists and isn't already Admin.
    /// Never a secret — just an identifier — but still only ever set via configuration/environment
    /// variable, never hard-coded, matching every other environment-specific value in this app.
    /// </summary>
    public string? BootstrapEmail { get; set; }
}
