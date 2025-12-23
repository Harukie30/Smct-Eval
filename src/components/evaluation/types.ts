// Common types
export type ISODateString = string; // e.g. "2number24-number1-number1"

export type ReviewTypeRegular = "" | "Q1" | "Q2" | "Q3" | "Q4";
export type ReviewTypeProbationary = 0 | 3 | 5;

// Main payload
export interface EvaluationPayload {
  hireDate: string;
  category: string;
  rating: number;
  coverageFrom: string;
  coverageTo: string;
  reviewTypeProbationary: ReviewTypeProbationary;
  reviewTypeRegular: ReviewTypeRegular;
  reviewTypeOthersImprovement: false;
  reviewTypeOthersCustom: string;
  priorityArea1: string;
  priorityArea2: string;
  priorityArea3: string;
  remarks: string;
  overallComments: string;
  jobKnowledgeScore1: number;
  jobKnowledgeScore2: number;
  jobKnowledgeScore3: number;
  jobKnowledgeComments1: string;
  jobKnowledgeComments2: string;
  jobKnowledgeComments3: string;
  qualityOfWorkScore1: number;
  qualityOfWorkScore2: number;
  qualityOfWorkScore3: number;
  qualityOfWorkScore4: number;
  qualityOfWorkScore5: number;
  qualityOfWorkComments1: string;
  qualityOfWorkComments2: string;
  qualityOfWorkComments3: string;
  qualityOfWorkComments4: string;
  qualityOfWorkComments5: string;
  adaptabilityScore1: number;
  adaptabilityScore2: number;
  adaptabilityScore3: number;
  adaptabilityComments1: string;
  adaptabilityComments2: string;
  adaptabilityComments3: string;
  teamworkScore1: number;
  teamworkScore2: number;
  teamworkScore3: number;
  teamworkComments1: string;
  teamworkComments2: string;
  teamworkComments3: string;
  reliabilityScore1: number;
  reliabilityScore2: number;
  reliabilityScore3: number;
  reliabilityScore4: number;
  reliabilityComments1: string;
  reliabilityComments2: string;
  reliabilityComments3: string;
  reliabilityComments4: string;
  ethicalScore1: number;
  ethicalScore2: number;
  ethicalScore3: number;
  ethicalScore4: number;
  ethicalExplanation1: string;
  ethicalExplanation2: string;
  ethicalExplanation3: string;
  ethicalExplanation4: string;
  customerServiceScore1: number;
  customerServiceScore2: number;
  customerServiceScore3: number;
  customerServiceScore4: number;
  customerServiceScore5: number;
  customerServiceExplanation1: string;
  customerServiceExplanation2: string;
  customerServiceExplanation3: string;
  customerServiceExplanation4: string;
  customerServiceExplanation5: string;
}
