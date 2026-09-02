using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAnalyzer.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCareerAssistantResults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CareerAssistantResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CvId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ResultJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CareerAssistantResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CareerAssistantResults_Cvs_CvId",
                        column: x => x.CvId,
                        principalTable: "Cvs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CareerAssistantResults_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CareerAssistantResults_CvId",
                table: "CareerAssistantResults",
                column: "CvId");

            migrationBuilder.CreateIndex(
                name: "IX_CareerAssistantResults_UserId_CvId_Type_CreatedAt",
                table: "CareerAssistantResults",
                columns: new[] { "UserId", "CvId", "Type", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CareerAssistantResults");
        }
    }
}
