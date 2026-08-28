using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAnalyzer.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlansSubscriptionsAndUsage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnalysisUsages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AnalysisId = table.Column<Guid>(type: "uuid", nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalysisUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnalysisUsages_Analyses_AnalysisId",
                        column: x => x.AnalysisId,
                        principalTable: "Analyses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AnalysisUsages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Plan = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    Provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ProviderCustomerId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ProviderSubscriptionId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Subscriptions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisUsages_AnalysisId",
                table: "AnalysisUsages",
                column: "AnalysisId");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisUsages_UserId_PeriodStart",
                table: "AnalysisUsages",
                columns: new[] { "UserId", "PeriodStart" });

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_UserId_Status",
                table: "Subscriptions",
                columns: new[] { "UserId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnalysisUsages");

            migrationBuilder.DropTable(
                name: "Subscriptions");
        }
    }
}
