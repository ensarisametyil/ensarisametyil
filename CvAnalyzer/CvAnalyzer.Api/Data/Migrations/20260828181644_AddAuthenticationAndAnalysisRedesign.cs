using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAnalyzer.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthenticationAndAnalysisRedesign : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cvs_Users_UserId",
                table: "Cvs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Analysis_Score_Range",
                table: "Analyses");

            migrationBuilder.RenameColumn(
                name: "Suggestions",
                table: "Analyses",
                newName: "Strengths");

            migrationBuilder.RenameColumn(
                name: "Score",
                table: "Analyses",
                newName: "OverallScore");

            migrationBuilder.RenameColumn(
                name: "MissingSkills",
                table: "Analyses",
                newName: "Skills");

            migrationBuilder.RenameColumn(
                name: "JobMatches",
                table: "Analyses",
                newName: "Recommendations");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Cvs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Education",
                table: "Analyses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Experience",
                table: "Analyses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MissingKeywords",
                table: "Analyses",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "Analyses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Analyses",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Analyses_UserId",
                table: "Analyses",
                column: "UserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Analysis_OverallScore_Range",
                table: "Analyses",
                sql: "\"OverallScore\" BETWEEN 0 AND 100");

            migrationBuilder.AddForeignKey(
                name: "FK_Analyses_Users_UserId",
                table: "Analyses",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Cvs_Users_UserId",
                table: "Cvs",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Analyses_Users_UserId",
                table: "Analyses");

            migrationBuilder.DropForeignKey(
                name: "FK_Cvs_Users_UserId",
                table: "Cvs");

            migrationBuilder.DropIndex(
                name: "IX_Analyses_UserId",
                table: "Analyses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Analysis_OverallScore_Range",
                table: "Analyses");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Education",
                table: "Analyses");

            migrationBuilder.DropColumn(
                name: "Experience",
                table: "Analyses");

            migrationBuilder.DropColumn(
                name: "MissingKeywords",
                table: "Analyses");

            migrationBuilder.DropColumn(
                name: "Summary",
                table: "Analyses");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Analyses");

            migrationBuilder.RenameColumn(
                name: "Strengths",
                table: "Analyses",
                newName: "Suggestions");

            migrationBuilder.RenameColumn(
                name: "Skills",
                table: "Analyses",
                newName: "MissingSkills");

            migrationBuilder.RenameColumn(
                name: "Recommendations",
                table: "Analyses",
                newName: "JobMatches");

            migrationBuilder.RenameColumn(
                name: "OverallScore",
                table: "Analyses",
                newName: "Score");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Cvs",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Analysis_Score_Range",
                table: "Analyses",
                sql: "\"Score\" BETWEEN 0 AND 100");

            migrationBuilder.AddForeignKey(
                name: "FK_Cvs_Users_UserId",
                table: "Cvs",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
