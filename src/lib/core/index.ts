// Core barrel exports
export { emit, subscribe, EventTypes } from "./event-bus";
export { appendAuditEvent, verifyAuditChain, getAuditChain, getAuditCount } from "./audit";
export { inspect, getPolicyPack, getAllPolicyPacks } from "./dpi-engine";
export {
  authorize,
  extractRole,
  hasPermission,
  authenticateEnterprise,
  authorizeDual,
  getAllRoles,
  type Role,
  type Permission,
} from "./rbac";
