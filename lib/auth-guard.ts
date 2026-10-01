import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type UserRole = "ADMIN" | "CASHIER" | "STAFF" | "CUSTOMER";

export interface SessionPayload {
  userId?: string;
  email?: string;
  phone?: string;
  name: string;
  role: UserRole;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET || "playstation-lounge-ultra-secure-secret-key-2026";
const COOKIE_NAME = "play_session";

function sign(value: string): string {
  const signature = createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
  return `${value}.${signature}`;
}

function verify(signedValue: string): string | null {
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);

  const expectedSignature = createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  return value;
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (!rawCookie) return null;

  const verifiedJson = verify(rawCookie);
  if (!verifiedJson) return null;

  try {
    return JSON.parse(verifiedJson) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUserOrRedirect(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function assertAuthorized(allowedRoles: UserRole[]): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("غير مصرح لك بتنفيذ هذا الإجراء.");
  }
  return user;
}

export async function setSignedSessionCookie(payload: SessionPayload, remember = false): Promise<void> {
  const cookieStore = await cookies();
  const serialized = JSON.stringify(payload);
  const signed = sign(serialized);

  // إذا تم اختيار "تذكرني"، تظل الجلسة صالحة لمدة 30 يوماً، وإلا تنتهي خلال 12 ساعة
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;

  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}