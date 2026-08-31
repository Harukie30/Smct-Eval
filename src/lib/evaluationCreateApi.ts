import { api } from "./api";
import type { EvaluationPayload } from "@/components/evaluation/types";

/**
 * Direct create-evaluation POSTs. Kept outside the large `apiService` object so
 * Turbopack HMR cannot leave submit callers with a stale object missing methods.
 */
export async function postHoRankNFile(
  employeeId: number | string,
  submission: EvaluationPayload
): Promise<unknown> {
  const response = await api.post(`/HoRankNFile/${employeeId}`, submission);
  return response.data;
}

export async function postHoBasic(
  employeeId: number | string,
  submission: EvaluationPayload
): Promise<unknown> {
  const response = await api.post(`/HoBasic/${employeeId}`, submission);
  return response.data;
}

export async function postBranchRankNFile(
  employeeId: number | string,
  submission: EvaluationPayload
): Promise<unknown> {
  const response = await api.post(`/BranchRankNFile/${employeeId}`, submission);
  return response.data;
}

export async function postBranchBasic(
  employeeId: number | string,
  submission: EvaluationPayload
): Promise<unknown> {
  const response = await api.post(`/BranchBasic/${employeeId}`, submission);
  return response.data;
}

export async function postBranchBasicAreaManager(
  employeeId: number | string,
  submission: EvaluationPayload
): Promise<unknown> {
  const response = await api.post(
    `/BranchBasicAreaManager/${employeeId}`,
    submission
  );
  return response.data;
}

export async function createSubmission(
  employeeId: number | string,
  submission: EvaluationPayload
): Promise<unknown> {
  const response = await api.post(`/submit/${employeeId}`, submission);
  return response.data;
}
