using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Admin;

public class AdminPaymentService : IAdminPaymentService
{
    private readonly AppDbContext _db;

    public AdminPaymentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResultDto<AdminPaymentListItem>> ListPaymentsAsync(
        int page, int pageSize, PaymentTransactionStatus? status, string? search, DateTime? fromDate, DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var query = _db.PaymentTransactions.AsQueryable();

        if (status is not null)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLowerInvariant();
            query = query.Where(t => t.User.Email.Contains(normalizedSearch));
        }

        if (fromDate is not null)
        {
            query = query.Where(t => t.CreatedAt >= fromDate.Value);
        }

        if (toDate is not null)
        {
            query = query.Where(t => t.CreatedAt <= toDate.Value);
        }

        query = query.OrderByDescending(t => t.CreatedAt);
        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new AdminPaymentListItem(
                t.Id, t.UserId, t.User.Email, t.Status,
                t.AmountUsd, t.Currency, t.ProviderSubscriptionReferenceCode, t.CreatedAt, t.ProcessedAt))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<AdminPaymentListItem>(items, page, pageSize, totalCount);
    }
}
