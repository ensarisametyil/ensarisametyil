using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAnalyzer.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentTransactionAmount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AmountUsd",
                table: "PaymentTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "PaymentTransactions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AmountUsd",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "PaymentTransactions");
        }
    }
}
