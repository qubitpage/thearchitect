export function createId(prefix: string) {
  const random = crypto.randomUUID().split("-")[0];
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}