import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "returns_customer_session";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "returns-dev-secret-change-in-production");
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createCustomerSession(phone: string): Promise<void> {
  const token = await new SignJWT({ phone })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getCustomerSession(): Promise<{ phone: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const phone = payload.phone as string;
    if (!phone) return null;
    return { phone };
  } catch {
    return null;
  }
}

export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
