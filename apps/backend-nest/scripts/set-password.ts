import * as argon2 from 'argon2';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { users } from '../src/database/schema';

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Использование: npx tsx scripts/set-password.ts <email> <password>');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const existing = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!existing.length) {
    console.error(`Пользователь с email "${email}" не найден в БД`);
    await pool.end();
    process.exit(1);
  }

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await db
    .update(users)
    .set({ passwordHash: hash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.email, email.toLowerCase()));

  console.log(`✅ Пароль для пользователя "${email}" (id: ${existing[0].id}) установлен`);
  await pool.end();
}

main().catch((err) => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
