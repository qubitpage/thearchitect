import { z } from "zod";

export const enterpriseRegistrationSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().min(3).max(100),
  contactEmail: z.string().email(),
  industry: z.string().min(2).max(60),
  compliancePack: z.enum(["general", "hipaa", "soc2", "finance"]),
  tier: z.enum(["pilot", "starter", "professional", "enterprise"]),
});

export const enterpriseInspectionSchema = z.object({
  content: z.string().min(1).max(10_000),
  actor: z.string().min(1).max(100),
  direction: z.enum(["ingress", "egress"]),
  declaredIntent: z.string().max(100).optional(),
});

export const agentTaskSchema = z.object({
  type: z.enum([
    "analyze_spending",
    "compliance_check",
    "risk_assessment",
    "document_review",
    "anomaly_detection",
    "policy_recommendation",
  ]),
  input: z.string().min(1).max(50_000),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type EnterpriseRegistrationInput = z.infer<typeof enterpriseRegistrationSchema>;
export type EnterpriseInspectionInput = z.infer<typeof enterpriseInspectionSchema>;
export type AgentTaskInput = z.infer<typeof agentTaskSchema>;
