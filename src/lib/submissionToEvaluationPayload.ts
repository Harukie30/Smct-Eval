import { EvaluationPayload } from "@/components/evaluation/types";

type ScoreItem = {
  question_number?: number;
  questionNumber?: number;
  q?: number;
  score?: number;
  value?: number;
  comment?: string;
  comments?: string;
  explanation?: string;
};

const JOB_TARGET_BY_QUESTION: Record<
  number,
  { score: keyof EvaluationPayload; comment: keyof EvaluationPayload }
> = {
  6: {
    score: "jobTargetMotorcyclesScore",
    comment: "jobTargetMotorcyclesComment",
  },
  7: {
    score: "jobTargetAppliancesScore",
    comment: "jobTargetAppliancesComment",
  },
  8: { score: "jobTargetCarsScore", comment: "jobTargetCarsComment" },
  9: {
    score: "jobTargetTriWheelersScore",
    comment: "jobTargetTriWheelersComment",
  },
  10: {
    score: "jobTargetCollectionScore",
    comment: "jobTargetCollectionComment",
  },
  11: {
    score: "jobTargetSparepartsLubricantsScore",
    comment: "jobTargetSparepartsLubricantsComment",
  },
  12: {
    score: "jobTargetShopIncomeScore",
    comment: "jobTargetShopIncomeComment",
  },
};

function getQuestionNumber(item: ScoreItem): number {
  return Number(item.question_number ?? item.questionNumber ?? item.q ?? 0);
}

function getScore(item: ScoreItem): number {
  return Number(item.score ?? item.value ?? 0);
}

function getText(
  item: ScoreItem,
  preferExplanation = false
): string {
  if (preferExplanation) {
    return String(
      item.explanation ?? item.comment ?? item.comments ?? ""
    );
  }
  return String(item.comment ?? item.comments ?? item.explanation ?? "");
}

function mapScoreCommentItems(
  items: ScoreItem[] | null | undefined,
  prefix: string,
  useExplanation = false
): Partial<EvaluationPayload> {
  const result: Record<string, string | number> = {};
  if (!Array.isArray(items)) return result;

  const suffix = useExplanation ? "Explanation" : "Comments";

  for (const item of items) {
    const q = getQuestionNumber(item);
    if (!q) continue;
    result[`${prefix}Score${q}`] = getScore(item);
    result[`${prefix}${suffix}${q}`] = getText(item, useExplanation);
  }

  return result as Partial<EvaluationPayload>;
}

function mapQualityOfWorks(
  items: ScoreItem[] | null | undefined
): Partial<EvaluationPayload> {
  const result: Record<string, string | number> = {};
  if (!Array.isArray(items)) return result;

  for (const item of items) {
    const q = getQuestionNumber(item);
    if (!q) continue;

    const score = getScore(item);
    const comment = getText(item);

    if (q >= 6 && q <= 12) {
      const jobTarget = JOB_TARGET_BY_QUESTION[q];
      if (jobTarget) {
        result[jobTarget.score] = score;
        result[jobTarget.comment] = comment;
      }
      result[`qualityOfWorkScore${q}`] = score;
      result[`qualityOfWorkComments${q}`] = comment;
      continue;
    }

    result[`qualityOfWorkScore${q}`] = score;
    result[`qualityOfWorkComments${q}`] = comment;
  }

  return result as Partial<EvaluationPayload>;
}

function pickKnownFields(source: Record<string, unknown>): Partial<EvaluationPayload> {
  if (!source || typeof source !== "object") return {};

  const payload: Record<string, unknown> = {};

  const assign = (targetKey: string, ...keys: string[]) => {
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== "") {
        payload[targetKey] = value;
        return;
      }
    }
  };

  assign("hireDate", "hireDate", "hire_date");
  assign("rating", "rating", "performanceScore", "performance_score");
  assign("coverageFrom", "coverageFrom", "coverage_from");
  assign("coverageTo", "coverageTo", "coverage_to");
  assign(
    "reviewTypeProbationary",
    "reviewTypeProbationary",
    "review_type_probationary"
  );
  assign("reviewTypeRegular", "reviewTypeRegular", "review_type_regular");
  assign(
    "reviewTypeOthersImprovement",
    "reviewTypeOthersImprovement",
    "review_type_others_improvement"
  );
  assign(
    "reviewTypeOthersCustom",
    "reviewTypeOthersCustom",
    "review_type_others_custom"
  );
  assign("priorityArea1", "priorityArea1", "priority_area_1");
  assign("priorityArea2", "priorityArea2", "priority_area_2");
  assign("priorityArea3", "priorityArea3", "priority_area_3");
  assign("remarks", "remarks", "overallComments", "overall_comments");
  assign("created_at", "created_at");

  return payload as Partial<EvaluationPayload>;
}

export function submissionToEvaluationPayload(
  submission: Record<string, unknown> | null | undefined
): Partial<EvaluationPayload> {
  if (!submission) return {};

  const evaluationData =
    (submission.evaluationData as Record<string, unknown> | undefined) ??
    (submission.evaluation_data as Record<string, unknown> | undefined) ??
    {};

  const base = {
    ...pickKnownFields(evaluationData),
    ...pickKnownFields(submission),
  };

  return {
    ...base,
    ...mapScoreCommentItems(
      (submission.job_knowledge as ScoreItem[] | undefined) ??
        (evaluationData.job_knowledge as ScoreItem[] | undefined),
      "jobKnowledge"
    ),
    ...mapQualityOfWorks(
      (submission.quality_of_works as ScoreItem[] | undefined) ??
        (submission.qualityOfWorks as ScoreItem[] | undefined) ??
        (evaluationData.quality_of_works as ScoreItem[] | undefined)
    ),
    ...mapScoreCommentItems(
      (submission.adaptabilities as ScoreItem[] | undefined) ??
        (submission.adaptability as ScoreItem[] | undefined) ??
        (evaluationData.adaptabilities as ScoreItem[] | undefined),
      "adaptability"
    ),
    ...mapScoreCommentItems(
      (submission.teamworks as ScoreItem[] | undefined) ??
        (submission.teamwork as ScoreItem[] | undefined) ??
        (evaluationData.teamworks as ScoreItem[] | undefined),
      "teamwork"
    ),
    ...mapScoreCommentItems(
      (submission.reliabilities as ScoreItem[] | undefined) ??
        (submission.reliability as ScoreItem[] | undefined) ??
        (evaluationData.reliabilities as ScoreItem[] | undefined),
      "reliability"
    ),
    ...mapScoreCommentItems(
      (submission.ethicals as ScoreItem[] | undefined) ??
        (submission.ethical as ScoreItem[] | undefined) ??
        (evaluationData.ethicals as ScoreItem[] | undefined),
      "ethical",
      true
    ),
    ...mapScoreCommentItems(
      (submission.customer_services as ScoreItem[] | undefined) ??
        (submission.customerServices as ScoreItem[] | undefined) ??
        (evaluationData.customer_services as ScoreItem[] | undefined),
      "customerService",
      true
    ),
    ...mapScoreCommentItems(
      (submission.managerial_skills as ScoreItem[] | undefined) ??
        (submission.managerialSkills as ScoreItem[] | undefined) ??
        (evaluationData.managerial_skills as ScoreItem[] | undefined),
      "managerialSkills",
      true
    ),
  };
}
