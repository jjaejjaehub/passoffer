import "dotenv/config";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../src/db/schema";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const email = "jjaejjaehub@gmail.com";
  const testPw = "qwer1234";

  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (rows.length === 0) {
      console.log("RESULT: 계정 없음 (no such user)");
    } else {
      const u = rows[0]!;
      const ok = await compare(testPw, u.passwordHash);
      console.log("RESULT: 계정 존재");
      console.log("  id:", u.id);
      console.log("  email:", u.email);
      console.log("  name:", u.name);
      console.log("  isActive:", u.isActive);
      console.log("  passwordHash prefix:", u.passwordHash.slice(0, 7));
      console.log("  qwer1234 match:", ok);
    }
    const total = await db.select().from(users);
    console.log("\n전체 사용자:", total.length, "명");
    for (const u of total)
      console.log("  -", u.email, "(active:", u.isActive, ")");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
