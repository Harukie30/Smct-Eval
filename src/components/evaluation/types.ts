export type EvaluationData = {
  // Step 1: Employee Information
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  branch: string;
  role: string;
  hireDate: string;
  supervisor: string;
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
  jobKnowledgeScore1: string;
  jobKnowledgeScore2: string;
  jobKnowledgeScore3: string;
  jobKnowledgeComments1: string;
  jobKnowledgeComments2: string;
  jobKnowledgeComments3: string;
  
  // Quality of Work Evaluation
  qualityOfWorkScore1: string;
  qualityOfWorkScore2: string;
  qualityOfWorkScore3: string;
  qualityOfWorkScore4: string;
  qualityOfWorkScore5: string;
  qualityOfWorkComments1: string;
  qualityOfWorkComments2: string;
  qualityOfWorkComments3: string;
  qualityOfWorkComments4: string;
  qualityOfWorkComments5: string;
  
  // Adaptability Evaluation
  adaptabilityScore1: string;
  adaptabilityScore2: string;
  adaptabilityScore3: string;
  adaptabilityComments1: string;
  adaptabilityComments2: string;
  adaptabilityComments3: string;
  
  // Step 2: Communication Skills
  communication: number;
  communicationComments: string;
  
  // Teamwork Evaluation
  teamworkScore1: string;
  teamworkScore2: string;
  teamworkScore3: string;
  teamworkComments1: string;
  teamworkComments2: string;
  teamworkComments3: string;
  
  // Reliability Evaluation
  reliabilityScore1: string;
  reliabilityScore2: string;
  reliabilityScore3: string;
  reliabilityScore4: string;
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
  ethicalScore1: string;
  ethicalScore2: string;
  ethicalScore3: string;
  ethicalScore4: string;
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
  customerServiceScore1: string;
  customerServiceScore2: string;
  customerServiceScore3: string;
  customerServiceScore4: string;
  customerServiceScore5: string;
  customerServiceExplanation1: string;
  customerServiceExplanation2: string;
  customerServiceExplanation3: string;
  customerServiceExplanation4: string;
  customerServiceExplanation5: string;
  customerServiceComments: string;

// Step 7: Overall Rating & Comments
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
