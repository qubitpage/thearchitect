import { z } from "zod";

export const govLedgerTransactionSchema = z.object({
  jurisdiction: z.string().trim().min(2).max(80),
  institution: z.string().trim().min(2).max(120),
  counterparty: z.string().trim().min(2).max(120),
  amount: z.coerce.number().positive().max(10_000_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  category: z.string().trim().min(2).max(80),
  purpose: z.string().trim().min(8).max(800),
  classification: z.enum(["public", "pseudonymized", "classified"]).default("public"),
});

export const impactLedgerEntrySchema = z.object({
  actorName: z.string().trim().min(2).max(120),
  sector: z.string().trim().min(2).max(80),
  jurisdiction: z.string().trim().min(2).max(80),
  reportingPeriod: z.string().trim().min(4).max(30),
  emissionsTonsCo2e: z.coerce.number().min(0).max(1_000_000_000),
  waterM3: z.coerce.number().min(0).max(1_000_000_000),
  wasteKg: z.coerce.number().min(0).max(1_000_000_000),
  laborIncidents: z.coerce.number().int().min(0).max(1_000_000),
  animalWelfareScore: z.coerce.number().min(0).max(100),
  biodiversityImpact: z.coerce.number().min(-100).max(100),
  supplyChainRisk: z.coerce.number().min(0).max(100),
});

export const dpiInspectionSchema = z.object({
  actor: z.string().trim().min(2).max(120).default("anonymous"),
  direction: z.enum(["ingress", "egress"]).default("ingress"),
  content: z.string().min(1).max(10_000),
});

export const jurisdictionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  governanceModel: z.string().trim().min(2).max(120),
  population: z.coerce.number().int().min(1).max(20_000_000_000),
  status: z.enum(["candidate", "pilot", "active", "paused"]).default("candidate"),
  modules: z
    .array(z.string().trim().min(2).max(80))
    .min(1)
    .max(12)
    .default(["GovLedger", "Impact Ledger", "AI DPI"]),
});

export type GovLedgerTransactionInput = z.infer<typeof govLedgerTransactionSchema>;
export type ImpactLedgerEntryInput = z.infer<typeof impactLedgerEntrySchema>;
export type DpiInspectionInput = z.infer<typeof dpiInspectionSchema>;
export type JurisdictionInput = z.infer<typeof jurisdictionSchema>;