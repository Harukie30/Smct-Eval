// src/lib/quarterlyReviewUtils.ts

import { EvaluationRecord } from './evaluationRecordsService';
import { getAllEvaluationRecords } from './evaluationRecordsService';
import { getEvaluationResults } from './evaluationStorage';

export interface QuarterlyReviewStatus {
  q1: boolean; // true if Q1 review exists for the year
  q2: boolean; // true if Q2 review exists for the year
  q3: boolean; // true if Q3 review exists for the year
  q4: boolean; // true if Q4 review exists for the year
}

/**
 * Get the current year
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Get quarter from date string
 */
export const getQuarterFromDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    
    if (month >= 1 && month <= 3) return `Q1 ${year}`;
    if (month >= 4 && month <= 6) return `Q2 ${year}`;
    if (month >= 7 && month <= 9) return `Q3 ${year}`;
    if (month >= 10 && month <= 12) return `Q4 ${year}`;
    
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * Check which quarterly reviews already exist for an employee in a given year
 */
export const getQuarterlyReviewStatus = async (
  employeeId: number, 
  year: number = getCurrentYear()
): Promise<QuarterlyReviewStatus> => {
  try {
    console.log(`Checking quarterly reviews for employee ${employeeId}, year: ${year}`);
    
    const status: QuarterlyReviewStatus = {
      q1: false,
      q2: false,
      q3: false,
      q4: false
    };
    
    // Helper function to check records and update status
    const checkRecords = (records: any[]) => {
      records.forEach((record: any) => {
        // Check the evaluation data for the selected review type
        const evaluationData = record.evaluationData || record;
        
        // Check if this is a regular quarterly review (not probationary or other)
        const isRegularReview = evaluationData.reviewTypeRegularQ1 || 
                               evaluationData.reviewTypeRegularQ2 || 
                               evaluationData.reviewTypeRegularQ3 || 
                               evaluationData.reviewTypeRegularQ4;
        
        if (isRegularReview) {
          // For regular quarterly reviews, check if the evaluation is for the target year
          // We can determine this from the coverage period or submission date
          const recordYear = new Date(record.submittedAt).getFullYear();
          const isTargetYear = recordYear === year || recordYear === year - 1; // Allow current year or previous year
          
          console.log(`Record: ${record.employeeName}, Submitted: ${record.submittedAt}, Year: ${recordYear}, Target: ${year}, IsTarget: ${isTargetYear}`);
          console.log(`Q1: ${evaluationData.reviewTypeRegularQ1}, Q2: ${evaluationData.reviewTypeRegularQ2}, Q3: ${evaluationData.reviewTypeRegularQ3}, Q4: ${evaluationData.reviewTypeRegularQ4}`);
          
          if (isTargetYear) {
            if (evaluationData.reviewTypeRegularQ1) {
              status.q1 = true;
              console.log('Setting Q1 to true');
            }
            if (evaluationData.reviewTypeRegularQ2) {
              status.q2 = true;
              console.log('Setting Q2 to true');
            }
            if (evaluationData.reviewTypeRegularQ3) {
              status.q3 = true;
              console.log('Setting Q3 to true');
            }
            if (evaluationData.reviewTypeRegularQ4) {
              status.q4 = true;
              console.log('Setting Q4 to true');
            }
          }
        }
      });
    };
    
    // Check static submissions data
    const staticRecords = await getAllEvaluationRecords();
    const staticEmployeeRecords = staticRecords.filter(record => record.employeeId === employeeId);
    checkRecords(staticEmployeeRecords);
    
    // Check localStorage data (new evaluations)
    const localStorageRecords = getEvaluationResults();
    const localStorageEmployeeRecords = localStorageRecords.filter(record => record.employeeId === employeeId);
    console.log(`Found ${localStorageEmployeeRecords.length} localStorage records for employee ${employeeId}`);
    checkRecords(localStorageEmployeeRecords);
    
    console.log(`Final status for employee ${employeeId}:`, status);
    return status;
  } catch (error) {
    console.error('Error checking quarterly review status:', error);
    // Return all false if there's an error
    return {
      q1: false,
      q2: false,
      q3: false,
      q4: false
    };
  }
};

/**
 * Check if a specific quarter review exists for an employee
 */
export const hasQuarterlyReview = async (
  employeeId: number,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  year: number = getCurrentYear()
): Promise<boolean> => {
  const status = await getQuarterlyReviewStatus(employeeId, year);
  return status[quarter.toLowerCase() as keyof QuarterlyReviewStatus];
};

/**
 * Get the quarter number from a quarter string (e.g., "Q1 2024" -> 1)
 */
export const getQuarterNumber = (quarterString: string): number => {
  if (quarterString.includes('Q1')) return 1;
  if (quarterString.includes('Q2')) return 2;
  if (quarterString.includes('Q3')) return 3;
  if (quarterString.includes('Q4')) return 4;
  return 0;
};

/**
 * Get available quarters for an employee (quarters that don't have reviews yet)
 */
export const getAvailableQuarters = async (
  employeeId: number,
  year: number = getCurrentYear()
): Promise<Array<'Q1' | 'Q2' | 'Q3' | 'Q4'>> => {
  const status = await getQuarterlyReviewStatus(employeeId, year);
  const available: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = [];
  
  if (!status.q1) available.push('Q1');
  if (!status.q2) available.push('Q2');
  if (!status.q3) available.push('Q3');
  if (!status.q4) available.push('Q4');
  
  return available;
};
