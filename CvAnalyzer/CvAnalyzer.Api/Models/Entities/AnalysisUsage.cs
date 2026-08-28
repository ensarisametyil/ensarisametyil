namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// One row per consumed analysis credit — a ledger, not a counter, so "usage this month" is
/// always just a COUNT query (e.g. "2026-08 usage = 2") and stays auditable. AnalysisId is
/// nullable and set-null-on-delete: if the underlying Analysis is later deleted (e.g. the user
/// deletes that CV), the billing fact that a credit was spent in that period must NOT disappear
/// with it — otherwise deleting a CV would silently refund a used credit.
/// </summary>
public class AnalysisUsage
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid? AnalysisId { get; set; }

    /// <summary>Start of the calendar-month billing period this usage counts against (UTC, inclusive).</summary>
    public DateTime PeriodStart { get; set; }

    /// <summary>Start of the next period (UTC, exclusive upper bound).</summary>
    public DateTime PeriodEnd { get; set; }

    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;

    public Analysis? Analysis { get; set; }
}
