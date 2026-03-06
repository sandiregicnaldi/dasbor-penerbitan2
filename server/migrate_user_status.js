const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('Adding status column to user table...');
        await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`);
        console.log('✅ Column added.');

        // Set existing users to active so they are not locked out
        const result = await pool.query(`UPDATE "user" SET status = 'active' WHERE status IS NULL OR status = 'pending' RETURNING id, name, email, role, status;`);
        console.log(`✅ Updated ${result.rowCount} existing user(s) to active:`, result.rows);
    } catch (e) {
        console.error('Migration Error:', e.message);
    }
    await pool.end();
}
main();
