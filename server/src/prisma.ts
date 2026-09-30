import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = (process.env.NODE_ENV !== 'production' || process.env.DATABASE_URL)
  ? (globalThis.prismaGlobal ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    }))
  : (null as unknown as PrismaClient);

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
