export type EvaluationData = {
  // Step 1: Employee Information
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  branch: string;
  role: string;
  supervisor: string;
  hireDate?: string;
  coverageFrom: string;
  coverageTo: string;
  others: string;
  
  // Review Type
  reviewTypeProbationary3: boolean;
  reviewTypeProbationary5: boolean;
  reviewTypeRegularQ1: boolean;
  reviewTypeRegularQ2: boolean;
  reviewTypeRegularQ3: boolean;
  reviewTypeRegularQ4: boolean;
  reviewTypeOthersImprovement: boolean;
  reviewTypeOthersCustom: string;
  
  // Job Knowledge Evaluation
  jobKnowledgeScore1: number;
  jobKnowledgeScore2: number;
  jobKnowledgeScore3: number;
  jobKnowledgeComments1: string;
  jobKnowledgeComments2: string;
  jobKnowledgeComments3: string;
  
  // Quality of Work Evaluation
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
  
  // Adaptability Evaluation
  adaptabilityScore1: number;
  adaptabilityScore2: number;
  adaptabilityScore3: number;
  adaptabilityComments1: string;
  adaptabilityComments2: string;
  adaptabilityComments3: string;
  
  // Step 2: Communication Skills
  communication: number;
  communicationComments: string;
  
  // Teamwork Evaluation
  teamworkScore1: number;
  teamworkScore2: number;
  teamworkScore3: number;
  teamworkComments1: string;
  teamworkComments2: string;
  teamworkComments3: string;
  
  // Reliability Evaluation
  reliabilityScore1: number;
  reliabilityScore2: number;
  reliabilityScore3: number;
  reliabilityScore4: number;
  reliabilityComments1: string;
  reliabilityComments2: string;
  reliabilityComments3: string;
  reliabilityComments4: string;
  
  // Step 3: Teamwork & Collaboration (Legacy)
  teamwork: number;
  teamworkComments: string;
  
  // Step 4: Problem Solving
  problemSolving: number;
  problemSolvingComments: string;
  
  // Step 5: Leadership
  leadership: number;
  leadershipComments: string;
  
  // Step 6: Ethical & Professional Behavior
  ethicalScore1: number;
  ethicalScore2: number;
  ethicalScore3: number;
  ethicalScore4: number;
  ethicalRating1: string;
  ethicalRating2: string;
  ethicalRating3: string;
  ethicalRating4: string;
  ethicalExplanation1: string;
  ethicalExplanation2: string;
  ethicalExplanation3: string;
  ethicalExplanation4: string;
  ethicalComments: string;

// Step 7: Customer Service
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
  customerServiceComments: string;

// Step 8: Managerial Skills
  managerialSkillsScore1: number;
  managerialSkillsScore2: number;
  managerialSkillsScore3: number;
  managerialSkillsScore4: number;
  managerialSkillsScore5: number;
  managerialSkillsScore6: number;
  managerialSkillsExplanation1: string;
  managerialSkillsExplanation2: string;
  managerialSkillsExplanation3: string;
  managerialSkillsExplanation4: string;
  managerialSkillsExplanation5: string;
  managerialSkillsExplanation6: string;
  managerialSkillsComments: string;

// Step 9: Overall Rating & Comments
  overallRating: string;
  overallComments: string;
  recommendations: string;
  
  // Priority Areas for Improvement
  priorityArea1: string;
  priorityArea2: string;
  priorityArea3: string;
  
  // Remarks
  remarks: string;
  
  // Acknowledgement
  employeeSignature: string;
  employeeSignatureDate: string;
  evaluatorSignature: string;
  evaluatorSignatureDate: string;
  evaluatorSignatureImage: string;
  
  // Approval Status
  evaluatorApproved?: boolean;
  evaluatorApprovedAt?: string;
};
