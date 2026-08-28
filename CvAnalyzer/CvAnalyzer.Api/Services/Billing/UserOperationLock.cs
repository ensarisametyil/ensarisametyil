using System.Collections.Concurrent;

namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Per-user mutual exclusion backed by an in-process <see cref="SemaphoreSlim"/> keyed by user
/// id. Must be registered as a singleton — a per-request instance would defeat the purpose,
/// since each request would get its own, unshared semaphore.
///
/// IMPORTANT SCALING CAVEAT (documented in full in docs/monetization.md): this lock is
/// process-local. It correctly serializes concurrent requests for the same user against a
/// single API instance (this project's current deployment shape), but provides NO protection
/// once the API runs as more than one instance behind a load balancer — a request for the same
/// user could land on a different process and race past this lock entirely. If/when this app is
/// horizontally scaled, replace this with a distributed mechanism (a Postgres advisory lock via
/// `pg_advisory_xact_lock`, or a Redis-backed lock) — the <see cref="IUserOperationLock"/>
/// interface is the seam for that swap; nothing above it (AnalysisQuotaService, CvController)
/// would need to change.
/// </summary>
public sealed class UserOperationLock : IUserOperationLock
{
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _semaphores = new();

    public async Task<IDisposable> AcquireAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var semaphore = _semaphores.GetOrAdd(userId, static _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        return new Releaser(semaphore);
    }

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;
        private int _released;

        public Releaser(SemaphoreSlim semaphore)
        {
            _semaphore = semaphore;
        }

        public void Dispose()
        {
            // Guards against a double-release (e.g. Dispose called twice) corrupting the
            // semaphore's count, which would let more than one caller through at once.
            if (Interlocked.Exchange(ref _released, 1) == 0)
            {
                _semaphore.Release();
            }
        }
    }
}
