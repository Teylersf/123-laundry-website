// Single shared Prisma client. In Next.js dev mode, hot-reload would
// otherwise instantiate a new client on every request and exhaust the
// connection pool, so we cache it on globalThis.
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.prismaClient ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = db;
}
