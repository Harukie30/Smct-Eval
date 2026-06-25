import {
  getRatingColorForLabel,
  getRatingLabel,
} from "@/components/evaluation/ViewResultsModalUtils";

export type EvaluationOverallProfile =
  | "branchRankNfile"
  | "branchManager"
  | "areaManager";

export type SectionScoreResult = {
  average: number;
  weight: number;
  weightPercent: string;
  weighted: number;
  ratingLabel: string;
};

export type OverallAssessmentScores = {
  jobKnowledge: SectionScoreResult;
  qualityOfWork: SectionScoreResult;
  adaptability: SectionScoreResult;
  teamwork: SectionScoreResult;
  reliability: SectionScoreResult;
  ethical: SectionScoreResult;
  customerService?: SectionScoreResult;
  managerialSkills?: SectionScoreResult;
  overallWeightedScore: number;
  overallPercentage: number;
  isPass: boolean;
};

type WeightProfile = {
  jobKnowledge: number;
  qualityOfWork: number;
  adaptability: number;
  teamwork: number;
  reliability: number;
  ethical: number;
  customerService?: number;
  managerialSkills?: number;
};

const WEIGHT_PROFILES: Record<EvaluationOverallProfile, WeightProfile> = {
  branchRankNfile: {
    jobKnowledge: 0.2,
    qualityOfWork: 0.2,
    adaptability: 0.1,
    teamwork: 0.1,
    reliability: 0.05,
    ethical: 0.05,
    customerService: 0.3,
  },
  branchManager: {
    jobKnowledge: 0.15,
    qualityOfWork: 0.15,
    adaptability: 0.1,
    teamwork: 0.1,
    reliability: 0.05,
    ethical: 0.05,
    customerService: 0.25,
    managerialSkills: 0.15,
  },
  areaManager: {
    jobKnowledge: 0.22,
    qualityOfWork: 0.3,
    adaptability: 0.03,
    teamwork: 0.1,
    reliability: 0.1,
    ethical: 0.03,
    managerialSkills: 0.22,
  },
};

function getFlatField(submission: Record<string, unknown>, key: string): number {
  const evaluationData =
    (submission.evaluationData as Record<string, unknown> | undefined) ??
    (submission.evaluation_data as Record<string, unknown> | undefined);
  const raw = submission[key] ?? evaluationData?.[key];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function averagePositive(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function averageRelation(
  items: Array<{ score?: number; value?: number }> | null | undefined
): number {
  if (!Array.isArray(items)) return 0;
  return averagePositive(
    items.map((item) => Number(item?.score ?? item?.value ?? 0))
  );
}

function qualityOfWorkBranchRankNfile(submission: Record<string, unknown>): number {
  const items = (submission.quality_of_works as Array<{ question_number?: number; score?: number }> | undefined) ?? [];
  const fromArray = items
    .filter((item) => {
      const questionNumber = Number(item?.question_number ?? 0);
      return questionNumber >= 1 && questionNumber <= 5;
    })
    .map((item) => Number(item?.score ?? 0));

  const fromFlat = [1, 2, 3, 4, 5].map((index) =>
    getFlatField(submission, `qualityOfWorkScore${index}`)
  );

  const combined =
    fromArray.filter((score) => score > 0).length > 0
      ? fromArray
      : fromFlat;

  return averagePositive(combined);
}

function qualityOfWorkWithJobTargets(submission: Record<string, unknown>): number {
  const items = (submission.quality_of_works as Array<{ question_number?: number; score?: number }> | undefined) ?? [];

  const baseFromArray = items
    .filter((item) => {
      const questionNumber = Number(item?.question_number ?? 0);
      return questionNumber >= 1 && questionNumber <= 4;
    })
    .map((item) => Number(item?.score ?? 0));

  const baseFromFlat = [1, 2, 3, 4].map((index) =>
    getFlatField(submission, `qualityOfWorkScore${index}`)
  );

  const base =
    baseFromArray.filter((score) => score > 0).length > 0
      ? baseFromArray
      : baseFromFlat;

  const jobTargetFlatKeys = [
    "jobTargetMotorcyclesScore",
    "jobTargetAppliancesScore",
    "jobTargetCarsScore",
    "jobTargetTriWheelersScore",
    "jobTargetCollectionScore",
    "jobTargetSparepartsLubricantsScore",
    "jobTargetShopIncomeScore",
  ];

  const jobTargetsFromFlat = jobTargetFlatKeys.map((key) =>
    getFlatField(submission, key)
  );

  const jobTargetsFromArray = items
    .filter((item) => {
      const questionNumber = Number(item?.question_number ?? 0);
      return questionNumber >= 6 && questionNumber <= 12;
    })
    .map((item) => Number(item?.score ?? 0));

  const jobTargetsFromQoWFlat = [6, 7, 8, 9, 10, 11, 12].map((index) =>
    getFlatField(submission, `qualityOfWorkScore${index}`)
  );

  const jobTargets =
    jobTargetsFromFlat.filter((score) => score > 0).length > 0
      ? jobTargetsFromFlat
      : jobTargetsFromArray.filter((score) => score > 0).length > 0
        ? jobTargetsFromArray
        : jobTargetsFromQoWFlat;

  return averagePositive([...base, ...jobTargets].filter((score) => score > 0));
}

function buildSection(average: number, weight: number): SectionScoreResult {
  const roundedAverage = Number(average.toFixed(2));
  const weighted = Number((roundedAverage * weight).toFixed(2));
  return {
    average: roundedAverage,
    weight,
    weightPercent: `${Math.round(weight * 100)}%`,
    weighted,
    ratingLabel: getRatingLabel(roundedAverage),
  };
}

export function computeOverallAssessmentFromSubmission(
  submission: Record<string, unknown> | null | undefined,
  profile: EvaluationOverallProfile
): OverallAssessmentScores {
  const weights = WEIGHT_PROFILES[profile];
  const sub = submission ?? {};

  const jobKnowledgeAverage = averageRelation(
    sub.job_knowledge as Array<{ score?: number }> | undefined
  );

  const qualityOfWorkAverage =
    profile === "branchRankNfile"
      ? qualityOfWorkBranchRankNfile(sub)
      : qualityOfWorkWithJobTargets(sub);

  const adaptabilityAverage = averageRelation(
    sub.adaptabilities as Array<{ score?: number }> | undefined ??
      (sub.adaptability as Array<{ score?: number }> | undefined)
  );

  const teamworkAverage = averageRelation(
    sub.teamworks as Array<{ score?: number }> | undefined ??
      (sub.teamwork as Array<{ score?: number }> | undefined)
  );

  const reliabilityAverage = averageRelation(
    sub.reliabilities as Array<{ score?: number }> | undefined ??
      (sub.reliability as Array<{ score?: number }> | undefined)
  );

  const ethicalAverage = averageRelation(
    sub.ethicals as Array<{ score?: number }> | undefined ??
      (sub.ethical as Array<{ score?: number }> | undefined)
  );

  const customerServiceAverage =
    weights.customerService != null
      ? averageRelation(
          sub.customer_services as Array<{ score?: number }> | undefined ??
            (sub.customerServices as Array<{ score?: number }> | undefined)
        )
      : 0;

  const managerialSkillsAverage =
    weights.managerialSkills != null
      ? averageRelation(
          sub.managerial_skills as Array<{ score?: number }> | undefined ??
            (sub.managerialSkills as Array<{ score?: number }> | undefined)
        )
      : 0;

  const jobKnowledge = buildSection(jobKnowledgeAverage, weights.jobKnowledge);
  const qualityOfWork = buildSection(qualityOfWorkAverage, weights.qualityOfWork);
  const adaptability = buildSection(adaptabilityAverage, weights.adaptability);
  const teamwork = buildSection(teamworkAverage, weights.teamwork);
  const reliability = buildSection(reliabilityAverage, weights.reliability);
  const ethical = buildSection(ethicalAverage, weights.ethical);

  const customerService =
    weights.customerService != null
      ? buildSection(customerServiceAverage, weights.customerService)
      : undefined;

  const managerialSkills =
    weights.managerialSkills != null
      ? buildSection(managerialSkillsAverage, weights.managerialSkills)
      : undefined;

  const overallWeightedScore = Number(
    (
      jobKnowledge.weighted +
      qualityOfWork.weighted +
      adaptability.weighted +
      teamwork.weighted +
      reliability.weighted +
      ethical.weighted +
      (customerService?.weighted ?? 0) +
      (managerialSkills?.weighted ?? 0)
    ).toFixed(2)
  );

  const overallPercentage = Number(
    ((overallWeightedScore / 5) * 100).toFixed(2)
  );

  return {
    jobKnowledge,
    qualityOfWork,
    adaptability,
    teamwork,
    reliability,
    ethical,
    customerService,
    managerialSkills,
    overallWeightedScore,
    overallPercentage,
    isPass: overallWeightedScore >= 3.0,
  };
}

export function getSectionRatingClass(label: string): string {
  return getRatingColorForLabel(label);
}
