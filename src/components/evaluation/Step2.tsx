"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { EvaluationPayload } from "./types";
import { User, useAuth } from "@/contexts/UserContext";
import { isNumberObject } from "node:util/types";

interface Step2Props {
  data: EvaluationPayload;
  updateDataAction: (updates: Partial<EvaluationPayload>) => void;
  employee?: User | null;
  evaluationType?: 'rankNfile' | 'basic' | 'default'; // Optional: evaluation type to determine HO context
}

// Score Dropdown Component
function ScoreDropdown({
  value,
  onValueChange,
  placeholder = "Select Score",
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const getScoreColor = (score: string) => {
    switch (score) {
      case "5":
        return "text-green-700 bg-green-100";
      case "4":
        return "text-blue-700 bg-blue-100";
      case "3":
        return "text-yellow-700 bg-yellow-100";
      case "2":
        return "text-orange-700 bg-orange-100";
      case "1":
        return "text-red-700 bg-red-100";
      default:
        return "text-gray-500 bg-gray-100";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`w-15 px-1 py-2 text-lg font-bold border-2 border-yellow-400 rounded-md bg-yellow-100 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm min-h-[40px]
           justify-between inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none
            disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer hover:scale-110 transition-transform duration-200 ${getScoreColor(
          value
        )}`}
      >
        {value || ""}
        <ChevronDownIcon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32 min-w-[128px] bg-white border-2 border-yellow-400">
        <DropdownMenuItem
          onClick={() => onValueChange("1")}
          className="text-lg font-bold text-red-700 hover:bg-red-50 py-2 text-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200"
        >
          1
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange("2")}
          className="text-lg font-bold text-orange-700 hover:bg-orange-50 py-2 text-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200"
        >
          2
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange("3")}
          className="text-lg font-bold text-yellow-700 hover:bg-yellow-50 py-2 text-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200"
        >
          3
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange("4")}
          className="text-lg font-bold text-blue-700 hover:bg-blue-50 py-2 text-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200"
        >
          4
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange("5")}
          className="text-lg font-bold text-green-700 hover:bg-green-50 py-2 text-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200"
        >
          5
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Step2({ data, updateDataAction, employee, evaluationType }: Step2Props) {
  const { user } = useAuth();
  
  // Check if employee being evaluated is HO (Head Office)
  // This determines the evaluationType based on the employee being evaluated, not the evaluator
  const isEmployeeHO = () => {
    const isHoBranchObj = (branchObj: unknown): boolean => {
      if (!branchObj || typeof branchObj !== "object") return false;
      const b = branchObj as any;
      const branchName = String(b.branch_name ?? b.name ?? "").toUpperCase().trim();
      const branchCode = String(b.branch_code ?? b.code ?? b.acronym ?? "").toUpperCase().trim();
      return (
        branchName === "HO" ||
        branchCode === "HO" ||
        branchCode === "126" ||
        branchName === "HEAD OFFICE" ||
        branchCode === "HEAD OFFICE" ||
        branchName.includes("HEAD OFFICE") ||
        branchCode.includes("HEAD OFFICE")
      );
    };

    // 1) Prefer direct `employee.branch` object/value
    const branchVal = (employee as any)?.branch;
    if (branchVal !== undefined && branchVal !== null && branchVal !== "") {
      if (isHoBranchObj(branchVal)) return true;
      const s = String(branchVal).toUpperCase().trim();
      return s === "HO" || s === "126" || s === "HEAD OFFICE" || s.includes("HEAD OFFICE");
    }

    // 2) Scan `employee.branches` for an HO entry
    const branchesVal = (employee as any)?.branches;
    if (Array.isArray(branchesVal)) {
      return branchesVal.some((b: any) => isHoBranchObj(b));
    }
    if (branchesVal && typeof branchesVal === "object") {
      return isHoBranchObj(branchesVal);
    }

    // 3) Legacy: branch_id / branchId
    const branchIdOrValue = (employee as any)?.branch_id ?? (employee as any)?.branchId;
    if (branchIdOrValue !== undefined && branchIdOrValue !== null && branchIdOrValue !== "") {
      const s = String(branchIdOrValue).toUpperCase().trim();
      return (
        s === "HO" ||
        s === "126" ||
        s === "HEAD OFFICE" ||
        s.includes("HEAD OFFICE")
      );
    }

    // 4) Final fallback: evaluationType implies HO route
    return evaluationType === "rankNfile" || evaluationType === "basic";
  };

  // Determine if this is an HO evaluation based on employee's branch
  // If evaluationType is 'rankNfile' or 'basic', it's definitely an HO evaluation
  const isHO = isEmployeeHO();
  
  // Debug: Log to verify evaluationType is being passed
  // console.log('Step2 - evaluationType:', evaluationType, 'isHO:', isHO);
  
  // Calculate average score for Quality of Work
  const calculateAverageScore = () => {
    const scores = [
      data.qualityOfWorkScore1,
      data.qualityOfWorkScore2,
      data.qualityOfWorkScore3,
      data.qualityOfWorkScore4,
      // Only include score5 if not HO
      ...(isHO ? [] : [data.qualityOfWorkScore5]),
    ]
      .filter((score) => score && score !== 0)
      .map((score) => parseInt(String(score)));

    if (scores.length === 0) return "0.00";
    return (
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    ).toFixed(2);
  };

  const averageScore = calculateAverageScore();
  const averageScoreNumber = parseFloat(averageScore);

  const getAverageScoreColor = (score: number) => {
    if (score >= 4.5) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 3.5) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 2.5) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (score >= 1.5) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getAverageScoreLabel = (score: number) => {
    if (score >= 4.5) return "Outstanding";
    if (score >= 3.5) return "Exceeds Expectation";
    if (score >= 2.5) return "Meets Expectations";
    if (score >= 1.5) return "Needs Improvement";
    return "Unsatisfactory";
  };

  return (
    <div className="space-y-6">
      {/* II. QUALITY OF WORK Section */}
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              II. QUALITY OF WORK
            </h3>
            <p className="text-sm text-gray-600">
              Accuracy and precision in completing tasks. Attention to detail.
              Consistency in delivering high-quality results. Timely completion
              of tasks and projects. Effective use of resources. Ability to meet
              deadlines.
            </p>
          </div>

          {/* Quality of Work Reset Button */}
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateDataAction({
                  qualityOfWorkScore1: 0,
                  qualityOfWorkScore2: 0,
                  qualityOfWorkScore3: 0,
                  qualityOfWorkScore4: 0,
                  qualityOfWorkScore5: 0,
                  qualityOfWorkScore6: 0,
                });
              }}
              className="text-xs px-3 py-1 h-7 bg-blue-500 text-white border-gray-300 hover:text-white hover:bg-blue-700 cursor-pointer hover:scale-110 transition-transform duration-200 "
            >
              Clear Quality of Work Scores
            </Button>
          </div>

          {/* Evaluation Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-16"></th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 w-1/4">
                    Behavioral Indicators
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 w-1/5">
                    Example
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900 w-32 bg-yellow-200">
                    SCORE
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">
                    Rating
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 w-1/4">
                  Explanation (Required)
                  </th>
                </tr>
              </thead>
              <tbody>

                {/* Row 1: Meets Standards and Requirements */}
                <tr>
                  <td className="border border-gray-300 font-bold text-center px-4 py-3 text-sm text-black">
                    Meets Standards and Requirements
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Ensures work is accurate and meets or exceeds established
                    standards
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Complies with industry regulations and project
                    specifications; delivers reliable, high-quality work, and
                    accurate work.
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <ScoreDropdown
                      value={String(data.qualityOfWorkScore1)}
                      onValueChange={(value) =>
                        updateDataAction({ qualityOfWorkScore1: Number(value) })
                      }
                      placeholder="-- Select --"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div
                      className={`px-2 py-1 rounded-md text-sm font-bold ${
                        data.qualityOfWorkScore1 === 5
                          ? "bg-green-100 text-green-800"
                          : data.qualityOfWorkScore1 === 4
                          ? "bg-blue-100 text-blue-800"
                          : data.qualityOfWorkScore1 === 3
                          ? "bg-yellow-100 text-yellow-800"
                          : data.qualityOfWorkScore1 === 2
                          ? "bg-orange-100 text-orange-800"
                          : data.qualityOfWorkScore1 === 1
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {data.qualityOfWorkScore1 === 5
                        ? "Outstanding"
                        : data.qualityOfWorkScore1 === 4
                        ? "Exceeds Expectation"
                        : data.qualityOfWorkScore1 === 3
                        ? "Meets Expectations"
                        : data.qualityOfWorkScore1 === 2
                        ? "Needs Improvement"
                        : data.qualityOfWorkScore1 === 1
                        ? "Unsatisfactory"
                        : "Not Rated"}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <textarea
                      value={data.qualityOfWorkComments1 || ""}
                      onChange={(e) =>
                        updateDataAction({
                          qualityOfWorkComments1: e.target.value,
                        })
                      }
                      placeholder="Enter comments about this competency..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </td>
                </tr>

                {/* Row 2: Timeliness (L.E.A.D.E.R.) */}
                <tr>
                  <td className="border border-gray-300 font-bold text-center px-4 py-3 text-sm text-black">
                    Timeliness (L.E.A.D.E.R.)
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Completes tasks and projects within specified deadlines
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Submits work on time without compromising quality.
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <ScoreDropdown
                      value={String(data.qualityOfWorkScore2)}
                      onValueChange={(value) =>
                        updateDataAction({
                          qualityOfWorkScore2: Number(value),
                        })
                      }
                      placeholder="-- Select --"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div
                      className={`px-2 py-1 rounded-md text-sm font-bold ${
                        data.qualityOfWorkScore2 === 5
                          ? "bg-green-100 text-green-800"
                          : data.qualityOfWorkScore2 === 4
                          ? "bg-blue-100 text-blue-800"
                          : data.qualityOfWorkScore2 === 3
                          ? "bg-yellow-100 text-yellow-800"
                          : data.qualityOfWorkScore2 === 2
                          ? "bg-orange-100 text-orange-800"
                          : data.qualityOfWorkScore2 === 1
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {data.qualityOfWorkScore2 === 5
                        ? "Outstanding"
                        : data.qualityOfWorkScore2 === 4
                        ? "Exceeds Expectation"
                        : data.qualityOfWorkScore2 === 3
                        ? "Meets Expectations"
                        : data.qualityOfWorkScore2 === 2
                        ? "Needs Improvement"
                        : data.qualityOfWorkScore2 === 1
                        ? "Unsatisfactory"
                        : "Not Rated"}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <textarea
                      value={data.qualityOfWorkComments2 || ""}
                      onChange={(e) =>
                        updateDataAction({
                          qualityOfWorkComments2: e.target.value,
                        })
                      }
                      placeholder="Enter comments about this competency..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </td>
                </tr>

                {/* Row 3: Work Output Volume (L.E.A.D.E.R.) */}
                <tr>
                  <td className="border border-gray-300 font-bold text-center px-4 py-3 text-sm text-black">
                    Work Output Volume (L.E.A.D.E.R.)
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Produces a high volume of quality work within a given time
                    frame
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Handles a substantial workload without sacrificing quality.
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <ScoreDropdown
                      value={String(data.qualityOfWorkScore3)}
                      onValueChange={(value) =>
                        updateDataAction({ qualityOfWorkScore3: Number(value) })
                      }
                      placeholder="-- Select --"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div
                      className={`px-2 py-1 rounded-md text-sm font-bold ${
                        data.qualityOfWorkScore3 === 5
                          ? "bg-green-100 text-green-800"
                          : data.qualityOfWorkScore3 === 4
                          ? "bg-blue-100 text-blue-800"
                          : data.qualityOfWorkScore3 === 3
                          ? "bg-yellow-100 text-yellow-800"
                          : data.qualityOfWorkScore3 === 2
                          ? "bg-orange-100 text-orange-800"
                          : data.qualityOfWorkScore3 === 1
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {data.qualityOfWorkScore3 === 5
                        ? "Outstanding"
                        : data.qualityOfWorkScore3 === 4
                        ? "Exceeds Expectation"
                        : data.qualityOfWorkScore3 === 3
                        ? "Meets Expectations"
                        : data.qualityOfWorkScore3 === 2
                        ? "Needs Improvement"
                        : data.qualityOfWorkScore3 === 1
                        ? "Unsatisfactory"
                        : "Not Rated"}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <textarea
                      value={data.qualityOfWorkComments3 || ""}
                      onChange={(e) =>
                        updateDataAction({
                          qualityOfWorkComments3: e.target.value,
                        })
                      }
                      placeholder="Enter comments about this competency..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </td>
                </tr>

                {/* Row 4: Consistency in Performance (L.E.A.D.E.R.) */}
                <tr>
                  <td className="border border-gray-300 font-bold text-center px-4 py-3 text-sm text-black">
                    Consistency in Performance (L.E.A.D.E.R.)
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Maintains a consistent level of productivity over time
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Meets productivity expectations reliably, without
                    significant fluctuations.
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <ScoreDropdown
                      value={String(data.qualityOfWorkScore4)}
                      onValueChange={(value) =>
                        updateDataAction({ qualityOfWorkScore4: Number(value) })
                      }
                      placeholder="-- Select --"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div
                      className={`px-2 py-1 rounded-md text-sm font-bold ${
                        data.qualityOfWorkScore4 === 5
                          ? "bg-green-100 text-green-800"
                          : data.qualityOfWorkScore4 === 4
                          ? "bg-blue-100 text-blue-800"
                          : data.qualityOfWorkScore4 === 3
                          ? "bg-yellow-100 text-yellow-800"
                          : data.qualityOfWorkScore4 === 2
                          ? "bg-orange-100 text-orange-800"
                          : data.qualityOfWorkScore4 === 1
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {data.qualityOfWorkScore4 === 5
                        ? "Outstanding"
                        : data.qualityOfWorkScore4 === 4
                        ? "Exceeds Expectation"
                        : data.qualityOfWorkScore4 === 3
                        ? "Meets Expectations"
                        : data.qualityOfWorkScore4 === 2
                        ? "Needs Improvement"
                        : data.qualityOfWorkScore4 === 1
                        ? "Unsatisfactory"
                        : "Not Rated"}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <textarea
                      value={data.qualityOfWorkComments4 || ""}
                      onChange={(e) =>
                        updateDataAction({
                          qualityOfWorkComments4: e.target.value,
                        })
                      }
                      placeholder="Enter comments about this competency..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </td>
                </tr>

                {/* Row 5: Job Targets - Hidden/Disabled for HO evaluators */}
                {!isHO && (
                  <tr>
                    <td className="border border-gray-300 font-bold text-center px-4 py-3 text-sm text-black">
                      Job Targets
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                      Achieves targets set for their respective position (Sales /
                      CCR / Mechanic / etc.)
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                      Consistently hits monthly targets assigned to their role.
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <ScoreDropdown
                        value={String(data.qualityOfWorkScore5)}
                        onValueChange={(value) =>
                          updateDataAction({ qualityOfWorkScore5: Number(value) })
                        }
                        placeholder="-- Select --"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <div
                        className={`px-2 py-1 rounded-md text-sm font-bold ${
                          data.qualityOfWorkScore5 === 5
                            ? "bg-green-100 text-green-800"
                            : data.qualityOfWorkScore5 === 4
                            ? "bg-blue-100 text-blue-800"
                            : data.qualityOfWorkScore5 === 3
                            ? "bg-yellow-100 text-yellow-800"
                            : data.qualityOfWorkScore5 === 2
                            ? "bg-orange-100 text-orange-800"
                            : data.qualityOfWorkScore5 === 1
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {data.qualityOfWorkScore5 === 5
                          ? "Outstanding"
                          : data.qualityOfWorkScore5 === 4
                          ? "Exceeds Expectation"
                          : data.qualityOfWorkScore5 === 3
                          ? "Meets Expectations"
                          : data.qualityOfWorkScore5 === 2
                          ? "Needs Improvement"
                          : data.qualityOfWorkScore5 === 1
                          ? "Unsatisfactory"
                          : "Not Rated"}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <textarea
                        value={data.qualityOfWorkComments5 || ""}
                        onChange={(e) =>
                          updateDataAction({
                            qualityOfWorkComments5: e.target.value,
                          })
                        }
                        placeholder="Enter comments about this competency..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      
    </div>
  );
}
