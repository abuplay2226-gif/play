export function isBilliardDevice(type?: string | null): boolean {
  if (!type) return false;
  const t = type.trim().toLowerCase();
  return t.includes("بلياردو") || t.includes("billiard") || t.includes("pool");
}