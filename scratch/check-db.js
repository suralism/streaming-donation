const { createClient } = require('@libsql/client');
require('dotenv').config();

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url) {
    console.error("TURSO_DATABASE_URL is not configured.");
    return;
  }
  
  console.log("Connecting to:", url);
  const db = createClient({ url, authToken });
  
  try {
    const result = await db.execute('SELECT * FROM transactions ORDER BY createdAt DESC LIMIT 5');
    console.log("Latest Transactions:");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error("Error running query:", err);
  }
}

run();
