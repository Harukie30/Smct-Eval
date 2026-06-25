"use client";

import {
  type OverallAssessmentScores,
  type SectionScoreResult,
  getSectionRatingClass,
} from "@/lib/evaluationOverallScore";

function CriteriaRow({ label, section }: { label: string; section: SectionScoreResult }) {
  return (
    <tr>
      <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
        {label}
      </td>
      <td className="border-2 border-gray-400 px-4 py-3 text-center">
        <div className="flex items-center justify-center space-x-1">
          <span
            className={`px-2 py-1 rounded text-sm font-bold screen-rating-badge ${getSectionRatingClass(
              section.ratingLabel
            )}`}
          >
            {section.ratingLabel}
          </span>
          <span className="print-rating-text">{section.ratingLabel}</span>
        </div>
      </td>
      <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
        {section.average.toFixed(2)}
      </td>
      <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
        {section.weightPercent}
      </td>
      <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
        {section.weighted.toFixed(2)}
      </td>
    </tr>
  );
}

interface ViewResultsOverallAssessmentTableProps {
  overall: OverallAssessmentScores;
  showCustomerService?: boolean;
  showManagerialSkills?: boolean;
}

export default function ViewResultsOverallAssessmentTable({
  overall,
  showCustomerService = false,
  showManagerialSkills = false,
}: ViewResultsOverallAssessmentTableProps) {
  return (
    <>
      <CriteriaRow label="Job Knowledge" section={overall.jobKnowledge} />
      <CriteriaRow label="Quality of Work" section={overall.qualityOfWork} />
      <CriteriaRow label="Adaptability" section={overall.adaptability} />
      <CriteriaRow label="Teamwork" section={overall.teamwork} />
      <CriteriaRow label="Reliability" section={overall.reliability} />
      <CriteriaRow label="Ethical & Professional Behavior" section={overall.ethical} />
      {showCustomerService && overall.customerService ? (
        <CriteriaRow label="Customer Service" section={overall.customerService} />
      ) : null}
      {showManagerialSkills && overall.managerialSkills ? (
        <CriteriaRow
          label="Managerial Skills"
          section={overall.managerialSkills}
        />
      ) : null}
      <tr className="bg-gray-100">
        <td className="border-2 border-gray-400 px-4 py-3 text-sm font-bold text-gray-700">
          Overall Performance Rating
        </td>
        <td
          colSpan={2}
          className="border-2 border-gray-400 px-4 py-3 text-center"
        ></td>
        <td className="border-2 border-gray-400 px-4 py-3 text-center"></td>
        <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-lg">
          {overall.overallWeightedScore.toFixed(2)}
        </td>
      </tr>
    </>
  );
}

export function ViewResultsOverallPerformanceSummary({
  overall,
  showPassFailIndicators,
}: {
  overall: OverallAssessmentScores;
  showPassFailIndicators: boolean;
}) {
  return (
    <div className="mt-6 flex justify-center items-center space-x-8 print-performance-score-wrapper">
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-700">
          {overall.overallPercentage.toFixed(2)}%
        </div>
        <div className="text-base text-gray-500 mt-1">Performance Score</div>
      </div>
      {showPassFailIndicators ? (
        <div
          className={`px-8 py-4 rounded-lg font-bold text-white text-xl ${
            overall.isPass ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {overall.isPass ? "PASS" : "FAIL"}
        </div>
      ) : null}
    </div>
  );
}
