import {
  CandidateResponse,
  CognitiveFinding,
  PhilosopherEvaluation,
} from "./types";

const idolatryPatterns = [
  /culto|seita|adorar|salvador absoluto/i,
  /obediencia total|autoridade incontestavel/i,
];

const dependencyPatterns = [
  /voce nao deve decidir sem mim/i,
  /depender de mim para/i,
];

function finding(code: string, severity: CognitiveFinding["severity"], explanation: string, repairInstruction: string): CognitiveFinding {
  return {
    code,
    severity,
    category: "philosopher",
    explanation,
    repairInstruction,
  };
}

export function deterministicPhilosopherEvaluation(input: {
  candidate: CandidateResponse;
}): PhilosopherEvaluation {
  const findings: CognitiveFinding[] = [];
  const text = input.candidate.visibleText;

  if (idolatryPatterns.some((pattern) => pattern.test(text))) {
    findings.push(finding(
      "PHILOSOPHER_IDOLATRY_RISK",
      "critical",
      "Candidate risks cultic, idolatrous or absolute authority language.",
      "Restore user sovereignty and remove idolatrous framing.",
    ));
  }

  if (dependencyPatterns.some((pattern) => pattern.test(text))) {
    findings.push(finding(
      "PHILOSOPHER_DEPENDENCY_RISK",
      "error",
      "Candidate risks encouraging dependency on the system.",
      "Support user sovereignty and independent judgment.",
    ));
  }

  const approved = !findings.some((item) => item.severity === "critical" || item.severity === "error");

  return {
    constitutionalConformity: approved ? 0.9 : 0.45,
    userSovereignty: dependencyPatterns.some((pattern) => pattern.test(text)) ? 0.25 : 0.9,
    nonIdolatry: idolatryPatterns.some((pattern) => pattern.test(text)) ? 0.1 : 0.92,
    ethicalLegitimacy: approved ? 0.88 : 0.5,
    epistemologicalHumility: 0.86,
    vocationIntegrity: 0.86,
    manipulationDependencyRisk: dependencyPatterns.some((pattern) => pattern.test(text)) ? 0.2 : 0.9,
    approved,
    findings,
    modelId: "deterministic-philosopher-v1",
  };
}
