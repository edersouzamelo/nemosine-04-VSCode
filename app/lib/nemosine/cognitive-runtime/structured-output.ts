import {
  StructuredStage,
  StructuredStageFailureDiagnostic,
  StructuredProviderSafeErrorCode,
} from "./types";

type ClassifyInput = {
  stage: StructuredStage;
  schemaIdentifier: string;
  retryAttempted?: boolean;
  retryFailed?: boolean;
};

type RetryInput<T> = ClassifyInput & {
  execute: (attempt: 0 | 1) => Promise<T>;
};

export class StructuredStageError extends Error {
  diagnostic: StructuredStageFailureDiagnostic;
  cause?: unknown;

  constructor(message: string, diagnostic: StructuredStageFailureDiagnostic, cause?: unknown) {
    super(message);
    this.name = "StructuredStageError";
    this.diagnostic = diagnostic;
    this.cause = cause;
  }
}

function stringField(error: unknown, key: string) {
  if (!error || typeof error !== "object" || !(key in error)) return null;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberField(error: unknown, key: string) {
  if (!error || typeof error !== "object" || !(key in error)) return null;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nestedNumberField(error: unknown, objectKey: string, key: string) {
  if (!error || typeof error !== "object" || !(objectKey in error)) return null;
  const nested = (error as Record<string, unknown>)[objectKey];
  return numberField(nested, key);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

function errorClass(error: unknown) {
  if (error instanceof StructuredStageError) return "StructuredStageError";
  if (!error || typeof error !== "object") return "UnknownError";
  return stringField(error, "name")
    || (error as { constructor?: { name?: string } }).constructor?.name
    || "UnknownError";
}

function httpStatus(error: unknown) {
  return numberField(error, "statusCode")
    ?? numberField(error, "status")
    ?? nestedNumberField(error, "response", "status")
    ?? null;
}

function sdkErrorName(error: unknown) {
  if (!error || typeof error !== "object") return null;
  return stringField(error, "name")
    || (error as { constructor?: { name?: string } }).constructor?.name
    || null;
}

function providerErrorCode(error: unknown) {
  return stringField(error, "code")
    || stringField(error, "type")
    || stringField(error, "finishReason")
    || null;
}

function messageMatches(error: unknown, pattern: RegExp) {
  return pattern.test([
    errorMessage(error),
    providerErrorCode(error) || "",
    errorClass(error),
    sdkErrorName(error) || "",
  ].join("\n"));
}

function isProviderInvalidSchema(error: unknown, status: number | null) {
  if (status !== 400) return false;
  return messageMatches(
    error,
    /invalid[_ -]?schema|json[_ -]?schema|response_format|schema|additionalproperties|required|strict|unsupported/i,
  );
}

function isProviderRefusal(error: unknown) {
  return messageMatches(error, /refusal|content[_ -]?filter|finishReason[=: ]content-filter/i);
}

function isTimeout(error: unknown) {
  return messageMatches(error, /timeout|timed out|abort/i);
}

function isLocalValidation(error: unknown) {
  return messageMatches(error, /ZodError|TypeValidationError|validation/i);
}

function isStructuredParseFailure(error: unknown) {
  return messageMatches(error, /JSONParseError|NoObjectGeneratedError|NoOutputGeneratedError|parse|object generated|does not match schema/i);
}

function classifySafeCode(error: unknown, status: number | null): {
  safeErrorCode: StructuredProviderSafeErrorCode;
  retryable: boolean;
  providerRequestRejected: boolean;
} {
  if (isProviderInvalidSchema(error, status)) {
    return {
      safeErrorCode: "INVALID_PROVIDER_SCHEMA",
      retryable: false,
      providerRequestRejected: true,
    };
  }
  if (isTimeout(error)) {
    return {
      safeErrorCode: "PROVIDER_TIMEOUT",
      retryable: true,
      providerRequestRejected: false,
    };
  }
  if (isProviderRefusal(error)) {
    return {
      safeErrorCode: "PROVIDER_REFUSAL",
      retryable: false,
      providerRequestRejected: false,
    };
  }
  if (status !== null) {
    return {
      safeErrorCode: "PROVIDER_HTTP_ERROR",
      retryable: status === 408 || status === 409 || status === 429 || status >= 500,
      providerRequestRejected: status >= 400 && status < 500,
    };
  }
  if (isLocalValidation(error)) {
    return {
      safeErrorCode: "LOCAL_SCHEMA_VALIDATION_ERROR",
      retryable: true,
      providerRequestRejected: false,
    };
  }
  if (isStructuredParseFailure(error)) {
    return {
      safeErrorCode: "STRUCTURED_OUTPUT_PARSE_ERROR",
      retryable: true,
      providerRequestRejected: false,
    };
  }
  if (sdkErrorName(error)) {
    return {
      safeErrorCode: "SDK_ERROR",
      retryable: false,
      providerRequestRejected: false,
    };
  }
  return {
    safeErrorCode: "UNKNOWN_STRUCTURED_ERROR",
    retryable: false,
    providerRequestRejected: false,
  };
}

export function classifyStructuredStageFailure(
  error: unknown,
  input: ClassifyInput,
): StructuredStageFailureDiagnostic {
  if (error instanceof StructuredStageError) {
    return {
      ...error.diagnostic,
      retryAttempted: input.retryAttempted ?? error.diagnostic.retryAttempted,
      retryFailed: input.retryFailed ?? error.diagnostic.retryFailed,
    };
  }

  const status = httpStatus(error);
  const classified = classifySafeCode(error, status);
  return {
    stage: input.stage,
    errorClass: errorClass(error).slice(0, 120),
    safeErrorCode: classified.safeErrorCode,
    httpStatus: status,
    sdkErrorName: sdkErrorName(error)?.slice(0, 120) || null,
    schemaIdentifier: input.schemaIdentifier.slice(0, 120),
    retryable: classified.retryable,
    timestamp: new Date().toISOString(),
    providerRequestRejected: classified.providerRequestRejected,
    retryAttempted: input.retryAttempted ?? false,
    retryFailed: input.retryFailed ?? false,
  };
}

function shouldRepairRetry(diagnostic: StructuredStageFailureDiagnostic) {
  return diagnostic.retryable
    && (
      diagnostic.safeErrorCode === "STRUCTURED_OUTPUT_PARSE_ERROR"
      || diagnostic.safeErrorCode === "LOCAL_SCHEMA_VALIDATION_ERROR"
    );
}

export async function runStructuredStageWithRetry<T>(input: RetryInput<T>): Promise<T> {
  let retryAttempted = false;

  try {
    return await input.execute(0);
  } catch (error) {
    const diagnostic = classifyStructuredStageFailure(error, {
      stage: input.stage,
      schemaIdentifier: input.schemaIdentifier,
      retryAttempted: false,
      retryFailed: false,
    });
    if (!shouldRepairRetry(diagnostic)) {
      throw new StructuredStageError(`${input.stage} structured output failed`, diagnostic, error);
    }
    retryAttempted = true;
  }

  try {
    return await input.execute(1);
  } catch (error) {
    const diagnostic = classifyStructuredStageFailure(error, {
      stage: input.stage,
      schemaIdentifier: input.schemaIdentifier,
      retryAttempted,
      retryFailed: true,
    });
    throw new StructuredStageError(`${input.stage} structured output retry failed`, diagnostic, error);
  }
}

export function structuredFailureDetail(diagnostic: StructuredStageFailureDiagnostic) {
  return {
    stage: diagnostic.stage,
    errorClass: diagnostic.errorClass,
    safeErrorCode: diagnostic.safeErrorCode,
    httpStatus: diagnostic.httpStatus,
    sdkErrorName: diagnostic.sdkErrorName,
    schemaIdentifier: diagnostic.schemaIdentifier,
    retryable: diagnostic.retryable,
    timestamp: diagnostic.timestamp,
    providerRequestRejected: diagnostic.providerRequestRejected,
    retryAttempted: diagnostic.retryAttempted,
    retryFailed: diagnostic.retryFailed,
  };
}
