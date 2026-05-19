/**
 * GovOS Module — Digital Identity & Government Services
 *
 * Provides:
 * - Digital identity registration with verification lifecycle
 * - Government service catalog management
 * - Service request submission and processing
 * - Cross-jurisdiction identity lookup
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes } from "@/lib/core/event-bus";
import { eq, desc, count as drizzleCount, and } from "drizzle-orm";
import { createHash } from "crypto";

// ─── Digital Identity ───────────────────────────────────────

export async function registerIdentity(input: {
  jurisdictionId?: string;
  displayName: string;
  identifier: string; // raw ID — hashed before storage
  identityType: "citizen" | "business" | "organization";
}) {
  const identifierHash = createHash("sha256")
    .update(input.identifier)
    .digest("hex");

  const [identity] = await db
    .insert(schema.digitalIdentities)
    .values({
      jurisdictionId: input.jurisdictionId,
      displayName: input.displayName,
      identifierHash,
      identityType: input.identityType,
    })
    .returning();

  await emit({
    eventType: EventTypes.GOVOS_IDENTITY_REGISTERED,
    sourceModule: "govos",
    payload: {
      identityId: identity.id,
      identityType: input.identityType,
      displayName: input.displayName,
    },
  });

  return identity;
}

export async function verifyIdentity(
  id: string,
  verifiedBy: string,
) {
  const [updated] = await db
    .update(schema.digitalIdentities)
    .set({
      verificationStatus: "verified",
      verifiedAt: new Date(),
      verifiedBy,
      updatedAt: new Date(),
    })
    .where(eq(schema.digitalIdentities.id, id))
    .returning();

  if (updated) {
    await emit({
      eventType: EventTypes.GOVOS_IDENTITY_VERIFIED,
      sourceModule: "govos",
      payload: { identityId: id, verifiedBy },
    });
  }

  return updated ?? null;
}

export async function getIdentityById(id: string) {
  const [identity] = await db
    .select()
    .from(schema.digitalIdentities)
    .where(eq(schema.digitalIdentities.id, id))
    .limit(1);
  return identity ?? null;
}

export async function listIdentities(opts?: {
  jurisdictionId?: string;
  status?: string;
  type?: string;
  limit?: number;
}) {
  const limit = opts?.limit ?? 50;

  let query = db.select().from(schema.digitalIdentities);

  // Apply filters via chaining
  const conditions = [];
  if (opts?.jurisdictionId) {
    conditions.push(eq(schema.digitalIdentities.jurisdictionId, opts.jurisdictionId));
  }
  if (opts?.status) {
    conditions.push(eq(schema.digitalIdentities.verificationStatus, opts.status as "unverified" | "pending" | "verified" | "suspended" | "revoked"));
  }
  if (opts?.type) {
    conditions.push(eq(schema.digitalIdentities.identityType, opts.type));
  }

  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(schema.digitalIdentities.createdAt)).limit(limit);
  }

  return query.orderBy(desc(schema.digitalIdentities.createdAt)).limit(limit);
}

// ─── Government Services ────────────────────────────────────

export async function createService(input: {
  jurisdictionId?: string;
  name: string;
  category: string;
  description: string;
  requiredDocuments?: string[];
  estimatedDays?: number;
  fee?: number;
  feeCurrency?: string;
}) {
  const [service] = await db
    .insert(schema.govServices)
    .values({
      jurisdictionId: input.jurisdictionId,
      name: input.name,
      category: input.category,
      description: input.description,
      requiredDocuments: input.requiredDocuments ?? [],
      estimatedDays: input.estimatedDays ?? 30,
      fee: input.fee ?? 0,
      feeCurrency: input.feeCurrency ?? "USD",
    })
    .returning();

  await emit({
    eventType: EventTypes.GOVOS_SERVICE_CREATED,
    sourceModule: "govos",
    payload: {
      serviceId: service.id,
      name: service.name,
      category: service.category,
    },
  });

  return service;
}

export async function listServices(opts?: {
  jurisdictionId?: string;
  category?: string;
  limit?: number;
}) {
  const limit = opts?.limit ?? 50;
  const conditions = [];

  if (opts?.jurisdictionId) {
    conditions.push(eq(schema.govServices.jurisdictionId, opts.jurisdictionId));
  }
  if (opts?.category) {
    conditions.push(eq(schema.govServices.category, opts.category));
  }

  let q = db.select().from(schema.govServices).where(eq(schema.govServices.isActive, true));
  if (conditions.length > 0) {
    q = db.select().from(schema.govServices).where(and(eq(schema.govServices.isActive, true), ...conditions));
  }

  return q.orderBy(desc(schema.govServices.createdAt)).limit(limit);
}

export async function getServiceById(id: string) {
  const [svc] = await db
    .select()
    .from(schema.govServices)
    .where(eq(schema.govServices.id, id))
    .limit(1);
  return svc ?? null;
}

// ─── Service Requests ───────────────────────────────────────

export async function submitServiceRequest(input: {
  serviceId: string;
  identityId: string;
  submittedDocuments?: string[];
  notes?: string;
}) {
  const [request] = await db
    .insert(schema.serviceRequests)
    .values({
      serviceId: input.serviceId,
      identityId: input.identityId,
      submittedDocuments: input.submittedDocuments ?? [],
      notes: input.notes,
    })
    .returning();

  await emit({
    eventType: EventTypes.GOVOS_REQUEST_SUBMITTED,
    sourceModule: "govos",
    payload: {
      requestId: request.id,
      serviceId: input.serviceId,
      identityId: input.identityId,
    },
  });

  return request;
}

export async function processServiceRequest(
  id: string,
  action: "approved" | "rejected" | "completed",
  processedBy: string,
) {
  const [updated] = await db
    .update(schema.serviceRequests)
    .set({
      status: action,
      processedBy,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.serviceRequests.id, id))
    .returning();

  if (updated) {
    await emit({
      eventType: EventTypes.GOVOS_REQUEST_PROCESSED,
      sourceModule: "govos",
      payload: { requestId: id, action, processedBy },
    });
  }

  return updated ?? null;
}

export async function listServiceRequests(opts?: {
  serviceId?: string;
  identityId?: string;
  status?: string;
  limit?: number;
}) {
  const limit = opts?.limit ?? 50;
  const conditions = [];

  if (opts?.serviceId) {
    conditions.push(eq(schema.serviceRequests.serviceId, opts.serviceId));
  }
  if (opts?.identityId) {
    conditions.push(eq(schema.serviceRequests.identityId, opts.identityId));
  }
  if (opts?.status) {
    conditions.push(eq(schema.serviceRequests.status, opts.status as "submitted" | "processing" | "approved" | "rejected" | "completed"));
  }

  let q = db.select().from(schema.serviceRequests);
  if (conditions.length > 0) {
    q = q.where(and(...conditions)) as typeof q;
  }

  return q.orderBy(desc(schema.serviceRequests.createdAt)).limit(limit);
}

// ─── Metrics ────────────────────────────────────────────────

export async function getGovOSMetrics(jurisdictionId?: string) {
  const identityCond = jurisdictionId
    ? eq(schema.digitalIdentities.jurisdictionId, jurisdictionId)
    : undefined;
  const serviceCond = jurisdictionId
    ? eq(schema.govServices.jurisdictionId, jurisdictionId)
    : undefined;

  const [identityCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.digitalIdentities)
    .where(identityCond);

  const [verifiedCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.digitalIdentities)
    .where(identityCond ? and(identityCond, eq(schema.digitalIdentities.verificationStatus, "verified")) : eq(schema.digitalIdentities.verificationStatus, "verified"));

  const [serviceCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.govServices)
    .where(serviceCond ? and(serviceCond, eq(schema.govServices.isActive, true)) : eq(schema.govServices.isActive, true));

  const [requestCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.serviceRequests);

  const [pendingRequests] = await db
    .select({ count: drizzleCount() })
    .from(schema.serviceRequests)
    .where(eq(schema.serviceRequests.status, "submitted"));

  return {
    totalIdentities: identityCount?.count ?? 0,
    verifiedIdentities: verifiedCount?.count ?? 0,
    activeServices: serviceCount?.count ?? 0,
    totalRequests: requestCount?.count ?? 0,
    pendingRequests: pendingRequests?.count ?? 0,
  };
}
