import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

const JWT_ALGORITHMS: jwt.Algorithm[] = ["HS256"];

export interface JwtAuthPayload {
  userId: string;
  email: string;
  role: Role;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET not configured");
  }
  return secret;
}

export function getJwtExpiresIn(): string | number {
  const raw = process.env.JWT_EXPIRES_IN?.trim();
  if (!raw) return "7d";
  // Allow numeric seconds or standard vercel/ms-style strings (e.g. 7d, 12h)
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^\d+[smhd]$/i.test(raw)) return raw;
  return "7d";
}

export function signAuthToken(payload: JwtAuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: getJwtExpiresIn() as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string): JwtAuthPayload {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: JWT_ALGORITHMS,
  });
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid token payload");
  }
  const { userId, email, role } = decoded as JwtAuthPayload;
  if (!userId || !email || !role) {
    throw new Error("Invalid token payload");
  }
  return { userId, email, role };
}
