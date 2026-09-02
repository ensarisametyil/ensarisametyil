using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.CareerAssistant;

namespace CvAnalyzer.Api.Services.AI.CareerAssistant;

/// <summary>
/// Computes CVora AI's composite "CVora Score" — deliberately a pure, deterministic function,
/// never a second AI call: every input it needs (the base CV analysis, and optionally the
/// latest ATS analysis) is already on file by the time a user asks for this score, so computing
/// it costs nothing in AI usage and the same inputs always produce the same output (see
/// CvoraScoreResult's doc comment). Every weight/threshold below is a named constant — nothing
/// is an inline "magic number" — specifically so this stays easy to review, tune, and unit test
/// (see CvoraScoreCalculatorTests.cs for concrete input -> output examples).
///
/// Each component is an honest, simple proxy rather than a pretend-scientific formula:
/// - contentQuality reuses the base analysis's own overallScore verbatim — it is already the
///   single richest quality signal available, re-deriving it from scratch would be strictly less
///   informed.
/// - skills/experience/structure/readability are derived from what CvAnalysisResult actually
///   contains (skill count, presence/length of the experience summary, how many of the standard
///   sections are populated, and how many weaknesses were flagged) — see each private method's
///   comment for exactly how.
/// - atsCompatibility, when available, is the user's own most recent ATS analysis score verbatim.
/// </summary>
public static class CvoraScoreCalculator
{
    // ---------- Weights (sum to 1.0 in each set) ----------

    private const double ContentQualityWeightNoAts = 0.35;
    private const double SkillsWeightNoAts = 0.20;
    private const double ExperienceWeightNoAts = 0.20;
    private const double StructureWeightNoAts = 0.125;
    private const double ReadabilityWeightNoAts = 0.125;

    private const double ContentQualityWeightWithAts = 0.25;
    private const double SkillsWeightWithAts = 0.15;
    private const double ExperienceWeightWithAts = 0.15;
    private const double StructureWeightWithAts = 0.10;
    private const double ReadabilityWeightWithAts = 0.10;
    private const double AtsWeightWithAts = 0.25;

    // ---------- Component-derivation thresholds ----------

    /// <summary>Distinct skills at/above which the skills component reaches its maximum — a longer skills list beyond this stops adding value to the score.</summary>
    private const int TargetSkillCount = 10;

    /// <summary>Minimum character length for the AI-produced experience summary to count as "substantive" (full score) rather than "present but thin".</summary>
    private const int SubstantiveExperienceMinLength = 60;

    /// <summary>Experience component score when the summary is present but shorter than <see cref="SubstantiveExperienceMinLength"/>.</summary>
    private const int PartialExperienceScore = 60;

    /// <summary>Points subtracted from a perfect readability score per flagged weakness.</summary>
    private const int ReadabilityPenaltyPerWeakness = 10;

    private const int MinScore = 0;
    private const int MaxScore = 100;

    public static CvoraScoreResult Calculate(Guid analysisId, CvAnalysisResult baseAnalysis, Guid? atsAnalysisId, AtsAnalysisResult? atsAnalysis)
    {
        var contentQuality = Clamp(baseAnalysis.OverallScore);
        var skills = ScoreSkills(baseAnalysis);
        var experience = ScoreExperience(baseAnalysis);
        var structure = ScoreStructure(baseAnalysis);
        var readability = ScoreReadability(baseAnalysis);

        int cvoraScore;
        int? atsCompatibility;

        if (atsAnalysis is not null)
        {
            atsCompatibility = Clamp(atsAnalysis.AtsScore);
            cvoraScore = Clamp((int)Math.Round(
                (contentQuality * ContentQualityWeightWithAts) +
                (skills * SkillsWeightWithAts) +
                (experience * ExperienceWeightWithAts) +
                (structure * StructureWeightWithAts) +
                (readability * ReadabilityWeightWithAts) +
                (atsCompatibility.Value * AtsWeightWithAts)));
        }
        else
        {
            atsCompatibility = null;
            cvoraScore = Clamp((int)Math.Round(
                (contentQuality * ContentQualityWeightNoAts) +
                (skills * SkillsWeightNoAts) +
                (experience * ExperienceWeightNoAts) +
                (structure * StructureWeightNoAts) +
                (readability * ReadabilityWeightNoAts)));
        }

        return new CvoraScoreResult
        {
            CvoraScore = cvoraScore,
            Components = new CvoraScoreComponents
            {
                ContentQuality = contentQuality,
                Skills = skills,
                Experience = experience,
                Structure = structure,
                Readability = readability,
                AtsCompatibility = atsCompatibility,
            },
            BasedOnAnalysisId = analysisId,
            BasedOnAtsAnalysisId = atsAnalysisId,
        };
    }

    /// <summary>Scales linearly with distinct skill count up to <see cref="TargetSkillCount"/>, capped at 100 beyond that — a CV listing many relevant skills scores higher, with diminishing returns.</summary>
    private static int ScoreSkills(CvAnalysisResult analysis) =>
        Clamp((int)Math.Round(Math.Min(analysis.Skills.Count, TargetSkillCount) * (MaxScore / (double)TargetSkillCount)));

    /// <summary>Full score for a substantive experience summary, a partial score for a present-but-thin one, zero when the CV states none at all.</summary>
    private static int ScoreExperience(CvAnalysisResult analysis)
    {
        if (string.IsNullOrWhiteSpace(analysis.Experience))
        {
            return MinScore;
        }

        return analysis.Experience.Length >= SubstantiveExperienceMinLength ? MaxScore : PartialExperienceScore;
    }

    /// <summary>Percentage of the standard CV sections (summary, experience, education, skills) that are actually populated.</summary>
    private static int ScoreStructure(CvAnalysisResult analysis)
    {
        var sections = new[]
        {
            !string.IsNullOrWhiteSpace(analysis.Summary),
            !string.IsNullOrWhiteSpace(analysis.Experience),
            !string.IsNullOrWhiteSpace(analysis.Education),
            analysis.Skills.Count > 0,
        };

        return Clamp((int)Math.Round(sections.Count(present => present) / (double)sections.Length * MaxScore));
    }

    /// <summary>Starts at a perfect score and loses points per flagged weakness — a CV with fewer noted issues reads more cleanly.</summary>
    private static int ScoreReadability(CvAnalysisResult analysis) =>
        Clamp(MaxScore - (analysis.Weaknesses.Count * ReadabilityPenaltyPerWeakness));

    private static int Clamp(int value) => Math.Clamp(value, MinScore, MaxScore);
}
