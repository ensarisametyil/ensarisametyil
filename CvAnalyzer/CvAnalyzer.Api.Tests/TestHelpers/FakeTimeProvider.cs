namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>A TimeProvider whose "now" is set explicitly — for tests that need to control calendar-month period boundaries.</summary>
public class FakeTimeProvider : TimeProvider
{
    private DateTimeOffset _utcNow;

    public FakeTimeProvider(DateTimeOffset utcNow)
    {
        _utcNow = utcNow;
    }

    public override DateTimeOffset GetUtcNow() => _utcNow;

    public void Set(DateTimeOffset utcNow) => _utcNow = utcNow;
}
