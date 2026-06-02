const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url) {
    console.error("TURSO_DATABASE_URL is not configured.");
  } else {
    console.log("Connecting to:", url);
    const db = createClient({ url, authToken });
    
    try {
      // 1. Delete all transactions
      const resTx = await db.execute('DELETE FROM transactions');
      console.log("Cleared transactions table from Turso. Rows affected:", resTx.rowsAffected);
      
      // 2. Delete all withdrawals
      const resWdr = await db.execute('DELETE FROM withdrawals');
      console.log("Cleared withdrawals table from Turso. Rows affected:", resWdr.rowsAffected);
      
      // 3. Reset balances
      const resUser = await db.execute('UPDATE users SET coin_balance = 0');
      console.log("Reset user coin balances on Turso. Rows affected:", resUser.rowsAffected);
    } catch (err) {
      console.error("Error clearing Turso DB:", err);
    }
  }

  // 4. Clear local fallback transaction files
  const DB_DIR = path.join(__dirname, '..', 'data');
  const filesToClear = [
    path.join(DB_DIR, 'transactions.json'),
    path.join(DB_DIR, 'transactions.json.bak')
  ];

  for (const file of filesToClear) {
    try {
      if (fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([], null, 2));
        console.log("Cleared local transactions file:", path.basename(file));
      }
    } catch (e) {
      console.error(`Error clearing file ${file}:`, e);
    }
  }
  
  console.log("Database clear completed successfully! ✨");
}

run();
