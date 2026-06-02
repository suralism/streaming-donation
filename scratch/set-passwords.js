const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url) {
    console.error("❌ ERROR: TURSO_DATABASE_URL is not configured.");
    return;
  }
  
  console.log("🔌 Connecting to Turso Database to migrate passwords...");
  const db = createClient({ url, authToken });
  
  try {
    // Select all users that do not have a password hash
    const result = await db.execute('SELECT id, username, display_name, password_hash FROM users');
    const users = result.rows;
    console.log(`📋 Total users found in DB: ${users.length}`);

    const usersToMigrate = users.filter(u => !u.password_hash);
    console.log(`🔍 Users needing password migration: ${usersToMigrate.length}`);

    if (usersToMigrate.length === 0) {
      console.log("✅ No users require password migration.");
      return;
    }

    // Default password is '123456'
    const defaultPassword = '123456';
    const hash = await bcrypt.hash(defaultPassword, 10);
    console.log(`🔐 Hashed default password '${defaultPassword}' successfully.`);

    for (const user of usersToMigrate) {
      console.log(`⚙️ Migrating user: ${user.username} (${user.id})...`);
      await db.execute({
        sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
        args: [hash, user.id]
      });
      console.log(`   └─ ✅ Password set successfully for @${user.username}`);
    }

    console.log("🎉 Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed with error:", err);
  }
}

run();
