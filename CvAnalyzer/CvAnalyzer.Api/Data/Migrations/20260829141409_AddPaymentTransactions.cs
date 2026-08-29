using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAnalyzer.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PaymentTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CheckoutToken = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ProviderSubscriptionReferenceCode = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentTransactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_ProviderSubscriptionId",
                table: "Subscriptions",
                column: "ProviderSubscriptionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_CheckoutToken",
                table: "PaymentTransactions",
                column: "CheckoutToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_ConversationId",
                table: "PaymentTransactions",
                column: "ConversationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_ProviderSubscriptionReferenceCode",
                table: "PaymentTransactions",
                column: "ProviderSubscriptionReferenceCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_UserId",
                table: "PaymentTransactions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_Subscriptions_ProviderSubscriptionId",
                table: "Subscriptions");
        }
    }
}
