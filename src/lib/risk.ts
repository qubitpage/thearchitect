import type { GovLedgerTransactionInput, ImpactLedgerEntryInput } from "@/lib/validation";

export function scoreGovLedgerTransaction(input: GovLedgerTransactionInput) {
  const flags: string[] = [];
  let riskScore = 0;

  if (input.amount >= 1_000_000) {
    riskScore += 25;
    flags.push("high value contract");
  }

  if (input.classification === "classified") {
    riskScore += 35;
    flags.push("classified spending requires delayed disclosure audit");
  }

  if (/single source|sole source|urgent|emergency/i.test(input.purpose)) {
    riskScore += 20;
    flags.push("non-competitive or emergency wording");
  }

  if (/defense|security|intelligence|surveillance/i.test(`${input.category} ${input.purpose}`)) {
    riskScore += 20;
    flags.push("national security exception review");
  }

  return { riskScore: Math.min(100, riskScore), flags };
}

export function scoreImpactEntry(input: ImpactLedgerEntryInput) {
  const flags: string[] = [];
  let riskScore = 0;

  if (input.emissionsTonsCo2e > 100_000) {
    riskScore += 25;
    flags.push("high emissions exposure");
  }

  if (input.waterM3 > 1_000_000) {
    riskScore += 15;
    flags.push("high water dependency");
  }

  if (input.laborIncidents > 0) {
    riskScore += Math.min(25, input.laborIncidents * 5);
    flags.push("reported labor incidents");
  }

  if (input.animalWelfareScore < 60) {
    riskScore += 15;
    flags.push("animal welfare below compact threshold");
  }

  if (input.biodiversityImpact < -20) {
    riskScore += 15;
    flags.push("negative biodiversity impact");
  }

  if (input.supplyChainRisk > 70) {
    riskScore += 20;
    flags.push("high supply-chain risk");
  }

  return { riskScore: Math.min(100, riskScore), flags };
}