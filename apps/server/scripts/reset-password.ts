import "dotenv/config";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../src/db/schema";

async function main() {
  const email = "jjaejjaehub@gmail.com";
  const newPw = "qwer1234";

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    const passwordHash = await hash(newPw, 10);
    const updated = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, email))
      .returning({ id: users.id, email: users.email });

    if (updated.length === 0) {
      console.log("FAIL: 해당 이메일 사용자 없음");
      process.exit(1);
    }
    console.log("OK: 비밀번호 리셋 완료");
    console.log("  user:", updated[0]);
    console.log("  새 비밀번호:", newPw);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
