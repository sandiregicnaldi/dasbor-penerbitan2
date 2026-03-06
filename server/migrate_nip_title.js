const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('Adding title column to nip_records...');
        await pool.query(`
            ALTER TABLE nip_records 
            ADD COLUMN IF NOT EXISTS title TEXT;
        `);
        console.log('✅ Column added successfully or already exists.');
    } catch (e) {
        console.error('Migration Error:', e.message);
    }
    await pool.end();
}
main();
