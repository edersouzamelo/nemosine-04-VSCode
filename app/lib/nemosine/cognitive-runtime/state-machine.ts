import {
  CognitiveRuntimeError,
  CognitiveState,
  StateTransitionRecord,
} from "./types";

const allowedTransitions: Record<CognitiveState, CognitiveState[]> = {
  RECEIVED: ["AUTHORIZED", "FAILED_SAFE"],
  AUTHORIZED: ["CONTEXT_ASSEMBLED", "FAILED_SAFE"],
  CONTEXT_ASSEMBLED: ["MODULES_SELECTED", "FAILED_SAFE"],
  MODULES_SELECTED: ["CANDIDATE_GENERATED", "FAILED_SAFE"],
  CANDIDATE_GENERATED: ["CLAIMS_EXTRACTED", "FAILED_SAFE"],
  CLAIMS_EXTRACTED: ["SCIENTIST_EVALUATED", "FAILED_SAFE"],
  SCIENTIST_EVALUATED: ["VIGIA_SCORED", "FAILED_SAFE"],
  VIGIA_SCORED: ["OCV_RETRY_REQUESTED", "OCV_CONVERGED", "REJECTED", "FAILED_SAFE"],
  OCV_RETRY_REQUESTED: ["CANDIDATE_GENERATED", "FAILED_SAFE"],
  OCV_CONVERGED: ["PHILOSOPHER_EVALUATED", "FAILED_SAFE"],
  PHILOSOPHER_EVALUATED: ["PROMOTION_EVALUATED", "FAILED_SAFE"],
  PROMOTION_EVALUATED: ["PROMOTED", "REJECTED", "OCV_RETRY_REQUESTED", "FAILED_SAFE"],
  PROMOTED: ["FINAL_ANSWER_SELECTED", "FAILED_SAFE"],
  FINAL_ANSWER_SELECTED: ["DELIVERY_PERSISTED", "SIDE_EFFECTS_SKIPPED", "FAILED_SAFE"],
  DELIVERY_PERSISTED: ["SIDE_EFFECTS_COMMITTED", "SIDE_EFFECTS_SKIPPED", "SIDE_EFFECTS_BLOCKED", "SIDE_EFFECTS_FAILED", "DELIVERED", "FAILED_SAFE"],
  SIDE_EFFECTS_COMMITTED: ["DELIVERED", "FAILED_SAFE"],
  SIDE_EFFECTS_SKIPPED: ["DELIVERED", "FAILED_SAFE"],
  SIDE_EFFECTS_BLOCKED: ["DELIVERED", "FAILED_SAFE"],
  SIDE_EFFECTS_FAILED: ["DELIVERED", "FAILED_SAFE"],
  REJECTED: ["FINAL_ANSWER_SELECTED", "FAILED_SAFE"],
  FAILED_SAFE: ["FINAL_ANSWER_SELECTED"],
  DELIVERED: [],
};

export class CognitiveStateMachine {
  private currentState: CognitiveState;
  private readonly trace: StateTransitionRecord[] = [];
  private lastTransitionAt = Date.now();

  constructor(initialState: CognitiveState = "RECEIVED") {
    this.currentState = initialState;
  }

  get current() {
    return this.currentState;
  }

  get transitions() {
    return [...this.trace];
  }

  canTransition(to: CognitiveState) {
    return allowedTransitions[this.currentState].includes(to);
  }

  transition(to: CognitiveState, note?: string) {
    const now = Date.now();
    const allowed = this.canTransition(to);
    const record: StateTransitionRecord = {
      from: this.currentState,
      to,
      at: new Date(now).toISOString(),
      allowed,
      latencyMs: now - this.lastTransitionAt,
      note,
    };
    this.trace.push(record);
    this.lastTransitionAt = now;

    if (!allowed) {
      throw new CognitiveRuntimeError(
        "ILLEGAL_STATE_TRANSITION",
        `Illegal cognitive runtime transition from ${this.currentState} to ${to}.`,
        { safeMessage: "A execucao cognitiva encontrou uma transicao interna invalida." },
      );
    }

    this.currentState = to;
  }
}

export function getAllowedTransitions() {
  return Object.fromEntries(
    Object.entries(allowedTransitions).map(([state, transitions]) => [state, [...transitions]]),
  ) as Record<CognitiveState, CognitiveState[]>;
}
