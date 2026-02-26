import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "returns_staff_session";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "returns-dev-secret-change-in-production");

export type StaffPayload = { userId: string; role: "admin" | "csr" | "store_manager"; branch_id: string | null };

export async function createStaffSession(payload: StaffPayload): Promise<void> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
}

export async function getStaffSession(): Promise<StaffPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as string,
      role: payload.role as "admin" | "csr" | "store_manager",
      branch_id: (payload.branch_id as string) || null,
    };
  } catch {
    return null;
  }
}

export async function clearStaffSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
