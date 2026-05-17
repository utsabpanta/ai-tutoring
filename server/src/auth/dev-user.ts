import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { users, type User } from "../db/schema.ts";
import { env, gradeBands, type GradeBand } from "../env.ts";

const VALID_BANDS = new Set<GradeBand>(gradeBands);

function isGradeBand(s: string): s is GradeBand {
  return VALID_BANDS.has(s as GradeBand);
}

export function ensureDevUser(): User {
  const existing = db.select().from(users).where(eq(users.id, env.DEV_USER_ID)).get();
  if (existing) return existing;

  const created: User = {
    id: env.DEV_USER_ID,
    username: env.DEV_USER_ID,
    passwordHash: null,
    gradeBand: env.DEV_USER_GRADE_BAND,
    timezone: env.DEV_USER_TIMEZONE,
    createdAt: new Date(),
  };
  db.insert(users).values(created).run();
  return created;
}

export function resolveUser(headers: Headers): User {
  const user = ensureDevUser();
  const headerBand = headers.get("x-grade-band");
  if (headerBand && isGradeBand(headerBand) && headerBand !== user.gradeBand) {
    db.update(users).set({ gradeBand: headerBand }).where(eq(users.id, user.id)).run();
    return { ...user, gradeBand: headerBand };
  }
  return user;
}
