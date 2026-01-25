import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { conflict, unauthorized } from "../lib/errors";
import { signToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import type { LoginInput, SignupInput } from "../validators/auth";

export interface PublicUser {
  id: string;
  email: string;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export async function signup({
  email,
  password,
}: SignupInput): Promise<AuthResult> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) throw conflict("An account with this email already exists");

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    });

  const user = created!;
  const token = signToken({ sub: user.id, email: user.email });
  return { user, token };
}

export async function login({
  email,
  password,
}: LoginInput): Promise<AuthResult> {
  const found = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!found) throw unauthorized("Invalid email or password");

  const ok = await verifyPassword(password, found.passwordHash);
  if (!ok) throw unauthorized("Invalid email or password");

  const token = signToken({ sub: found.id, email: found.email });
  return {
    user: { id: found.id, email: found.email, createdAt: found.createdAt },
    token,
  };
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const found = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, createdAt: true },
  });
  return found ?? null;
}
