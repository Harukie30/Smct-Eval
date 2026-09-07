import { api } from "./api";
import type { EvaluationPayload } from "@/components/evaluation/types";

/**
 * Compatibility exports for evaluation create POSTs.
 * Kept so Turbopack HMR can still resolve `@/lib/evaluationCreateApi`
 * if a stale `index.tsx` import remains after switching back to `apiService`.
 */
export async function postHoRankNFile(
  employeeId: number | string,
  submission: EvaluationPayload
) {
  const response = await api.post(`/HoRankNFile/${employeeId}`, submission);
  return response.data;
}

export async function postHoBasic(
  employeeId: number | string,
  submission: EvaluationPayload
) {
  const response = await api.post(`/HoBasic/${employeeId}`, submission);
  return response.data;
}

export async function postBranchRankNFile(
  employeeId: number | string,
  submission: EvaluationPayload
) {
  const response = await api.post(`/BranchRankNFile/${employeeId}`, submission);
  return response.data;
}

export async function postBranchBasic(
  employeeId: number | string,
  submission: EvaluationPayload
) {
  const response = await api.post(`/BranchBasic/${employeeId}`, submission);
  return response.data;
}

export async function postBranchBasicAreaManager(
  employeeId: number | string,
  submission: EvaluationPayload
) {
  const response = await api.post(
    `/BranchBasicAreaManager/${employeeId}`,
    submission
  );
  return response.data;
}

export async function createSubmission(
  employeeId: number | string,
  submission: EvaluationPayload
) {
  const response = await api.post(`/submit/${employeeId}`, submission);
  return response.data;
}
