export const PRIORITY_AREA_MIN_CHARS = 20;

export type PriorityAreaFields = {
  priorityArea1?: string | null;
  priorityArea2?: string | null;
  priorityArea3?: string | null;
};

export type PriorityAreaFieldErrors = {
  priorityArea1: boolean;
  priorityArea2: boolean;
  priorityArea3: boolean;
};

/** Each of the 3 priority areas must have at least PRIORITY_AREA_MIN_CHARS. */
export function getPriorityAreaFieldErrors(
  data: PriorityAreaFields
): PriorityAreaFieldErrors {
  return {
    priorityArea1:
      (data.priorityArea1 || "").trim().length < PRIORITY_AREA_MIN_CHARS,
    priorityArea2:
      (data.priorityArea2 || "").trim().length < PRIORITY_AREA_MIN_CHARS,
    priorityArea3:
      (data.priorityArea3 || "").trim().length < PRIORITY_AREA_MIN_CHARS,
  };
}

export function hasAnyPriorityAreaError(
  errors: PriorityAreaFieldErrors
): boolean {
  return (
    errors.priorityArea1 || errors.priorityArea2 || errors.priorityArea3
  );
}

export const PRIORITY_AREAS_VALIDATION_MESSAGE = `Please enter at least ${PRIORITY_AREA_MIN_CHARS} characters in each of the 3 priority areas.`;

export const PRIORITY_AREA_INPUT_PLACEHOLDER = `Enter priority area (min. ${PRIORITY_AREA_MIN_CHARS} characters)`;
