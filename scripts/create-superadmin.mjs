/**
 * One-time script to create the first superadmin account.
 * Usage: node scripts/create-superadmin.mjs <username> <password>
 *
 * Requires DATABASE_URL to be set in the environment.
 */
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error("Usage: node scripts/create-superadmin.mjs <username> <password>");
  console.error("Example: node scripts/create-superadmin.mjs admin MyStr0ngP@ss!");
  process.exit(1);
}

if (username.trim().length < 3) {
  console.error("Error: Username must be at least 3 characters.");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Error: Password must be at least 6 characters.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  // Check if any admin already exists
  const { rows: existing } = await pool.query("SELECT id, username FROM admin_users LIMIT 1");
  if (existing.length > 0) {
    console.log(`ℹ️  An admin account already exists (username: "${existing[0].username}").`);
    console.log("   Log in at /admin and use the Admins panel to add more accounts.");
    await pool.end();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at`,
    [username.trim(), passwordHash],
  );

  const admin = rows[0];
  console.log("✅ Superadmin created successfully!");
  console.log(`   ID:       ${admin.id}`);
  console.log(`   Username: ${admin.username}`);
  console.log(`   Created:  ${admin.created_at}`);
  console.log("");
  console.log("👉 Log in at: /admin");
} catch (err) {
  if (err.code === "42P01") {
    console.error("Error: The admin_users table does not exist yet.");
    console.error("Make sure your database migrations have been applied first.");
  } else {
    console.error("Error creating superadmin:", err.message);
  }
  process.exit(1);
} finally {
  await pool.end();
}
