const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        // Fix admin role
        const result = await pool.query(
            `UPDATE "user" SET role = 'admin', skills = '["Admin", "QC"]'::jsonb WHERE email = 'admin@penerbitan.com' RETURNING id, name, email, role, skills`
        );
        if (result.rows.length > 0) {
            console.log('✅ Admin role FIXED:');
            console.log(JSON.stringify(result.rows[0], null, 2));
        } else {
            console.log('❌ User not found!');
        }
    } catch (e) {
        console.error('DB Error:', e.message);
    }
    await pool.end();
}
main();
