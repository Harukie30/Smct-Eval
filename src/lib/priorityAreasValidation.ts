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

export type PriorityAreaValidationResult = {
  fieldErrors: PriorityAreaFieldErrors;
  /** True when at least one area has min. 20 characters. */
  isValid: boolean;
  /** True when validation failed and no field has partial input to highlight. */
  showGeneralError: boolean;
};

function getTrimmedLength(value?: string | null): number {
  return (value || "").trim().length;
}

function fieldHasInput(value?: string | null): boolean {
  return getTrimmedLength(value) > 0;
}

/** At least one priority area must reach the minimum character count. */
export function hasValidPriorityArea(data: PriorityAreaFields): boolean {
  return (
    getTrimmedLength(data.priorityArea1) >= PRIORITY_AREA_MIN_CHARS ||
    getTrimmedLength(data.priorityArea2) >= PRIORITY_AREA_MIN_CHARS ||
    getTrimmedLength(data.priorityArea3) >= PRIORITY_AREA_MIN_CHARS
  );
}

/**
 * Per-field errors only when the user typed in that area but it is still under
 * 20 characters, and no other area yet satisfies the minimum.
 */
export function getPriorityAreaFieldErrors(
  data: PriorityAreaFields
): PriorityAreaFieldErrors {
  if (hasValidPriorityArea(data)) {
    return {
      priorityArea1: false,
      priorityArea2: false,
      priorityArea3: false,
    };
  }

  const isTooShort = (value?: string | null) =>
    fieldHasInput(value) &&
    getTrimmedLength(value) < PRIORITY_AREA_MIN_CHARS;

  return {
    priorityArea1: isTooShort(data.priorityArea1),
    priorityArea2: isTooShort(data.priorityArea2),
    priorityArea3: isTooShort(data.priorityArea3),
  };
}

export function hasAnyPriorityAreaError(
  errors: PriorityAreaFieldErrors
): boolean {
  return (
    errors.priorityArea1 || errors.priorityArea2 || errors.priorityArea3
  );
}

export function getPriorityAreaValidationResult(
  data: PriorityAreaFields
): PriorityAreaValidationResult {
  const fieldErrors = getPriorityAreaFieldErrors(data);
  const isValid = hasValidPriorityArea(data);

  return {
    fieldErrors,
    isValid,
    showGeneralError: !isValid && !hasAnyPriorityAreaError(fieldErrors),
  };
}

export const PRIORITY_AREAS_VALIDATION_MESSAGE = `Please enter at least ${PRIORITY_AREA_MIN_CHARS} characters in at least one priority area.`;

export const PRIORITY_AREA_FIELD_ERROR_MESSAGE = `Enter at least ${PRIORITY_AREA_MIN_CHARS} characters in this area.`;

export const PRIORITY_AREA_INPUT_PLACEHOLDER = `Enter priority area (at least one with min. ${PRIORITY_AREA_MIN_CHARS} characters)`;
