import fs from "fs";
import path from "path";

const root = path.resolve(".");

const tableTag =
  '<table className="w-full border-collapse border-2 border-gray-400 print-overall-assessment-table">';

const files = [
  {
    file: "src/components/evaluation/ViewResultsModalBranchRankNfile.tsx",
    profile: "branchRankNfile",
    showCS: "Boolean(submission.customer_services?.length)",
    showMS: "false",
    scoringPattern:
      /  \/\/ Use stored rating from backend if available to match evaluation records table[\s\S]*?const finalIsPass = finalRatingRounded >= 3\.0;/,
    fixCustomerService: true,
  },
  {
    file: "src/components/evaluation/ViewResultsModalAreaManager.tsx",
    profile: "areaManager",
    showCS: "false",
    showMS: "Boolean(managerialSkills?.length)",
    scoringPattern:
      /  \/\/ Use stored rating from backend if available to match evaluation records table[\s\S]*?const finalIsPass = finalRatingRounded >= 3\.0;/,
    fixCustomerService: false,
  },
  {
    file: "src/components/evaluation/ViewResultsModalBranchManager.tsx",
    profile: "branchManager",
    showCS: "Boolean(submission.customer_services?.length)",
    showMS: "Boolean(submission.managerial_skills?.length)",
    scoringPattern:
      /  \/\/ Use stored rating from backend if available to match evaluation records table[\s\S]*?const finalIsPass = finalRatingRounded >= 3\.0;/,
    fixCustomerService: false,
  },
];

for (const cfg of files) {
  const full = path.join(root, cfg.file);
  let content = fs.readFileSync(full, "utf8");

  if (!content.includes("computeOverallAssessmentFromSubmission")) {
    content = content.replace(
      'import { getEmployeeBranchCodeDisplay } from "./employeeBranchLabel";',
      'import { getEmployeeBranchCodeDisplay } from "./employeeBranchLabel";\nimport { computeOverallAssessmentFromSubmission } from "@/lib/evaluationOverallScore";\nimport ViewResultsOverallAssessmentTable, { ViewResultsOverallPerformanceSummary } from "./ViewResultsOverallAssessmentTable";'
    );
    content = content.replace(
      'import React, { useState, useRef, useEffect } from "react";',
      'import React, { useState, useRef, useEffect, useMemo } from "react";'
    );
  }

  const scoringBlock = `  const overallAssessment = useMemo(
    () => computeOverallAssessmentFromSubmission(submission, "${cfg.profile}"),
    [submission]
  );

  const finalRatingRounded = overallAssessment.overallWeightedScore;
  const finalPercentage = overallAssessment.overallPercentage;
  const finalIsPass = overallAssessment.isPass;`;

  content = content.replace(cfg.scoringPattern, scoringBlock);

  const idx = content.indexOf(tableTag);
  if (idx === -1) {
    console.log("no table", cfg.file);
    continue;
  }
  const tbodyStart = content.indexOf("<tbody>", idx);
  const tbodyEnd = content.indexOf("</tbody>", tbodyStart);
  if (tbodyStart === -1 || tbodyEnd === -1) {
    console.log("no tbody", cfg.file);
    continue;
  }

  const newTbody = `<tbody>
                              <ViewResultsOverallAssessmentTable
                                overall={overallAssessment}
                                showCustomerService={${cfg.showCS}}
                                showManagerialSkills={${cfg.showMS}}
                              />
                            </tbody>`;

  content = content.slice(0, tbodyStart) + newTbody + content.slice(tbodyEnd + 8);

  const perfMarker = "print-performance-score-wrapper";
  const perfIdx = content.indexOf(perfMarker, idx);
  if (perfIdx !== -1) {
    const divStart = content.lastIndexOf("<div", perfIdx);
    let pos = divStart;
    let depth = 0;
    let endPos = -1;
    while (pos < content.length) {
      if (content.startsWith("<div", pos)) depth++;
      if (content.startsWith("</div>", pos)) {
        depth--;
        if (depth === 0) {
          endPos = pos + 6;
          break;
        }
      }
      pos++;
    }
    if (endPos !== -1) {
      const replacement = `<ViewResultsOverallPerformanceSummary
                          overall={overallAssessment}
                          showPassFailIndicators={showPassFailIndicators}
                        />`;
      content = content.slice(0, divStart) + replacement + content.slice(endPos);
    }
  }

  if (cfg.fixCustomerService) {
    content = content.replace(
      "{evaluationType === 'default' && submission.customer_services && (",
      "{submission.customer_services && ("
    );
  }

  fs.writeFileSync(full, content);
  console.log("patched", cfg.file);
}
