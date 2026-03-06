const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const result = await pool.query("SELECT id, name, email, role, skills FROM \"user\" WHERE email = 'admin@penerbitan.com'");
        console.log('=== Database User Check ===');
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('User found:', JSON.stringify(user, null, 2));
            console.log('Role:', user.role);
            console.log('Role type:', typeof user.role);
            console.log('Is admin?:', user.role === 'admin');
        } else {
            console.log('User NOT FOUND!');
        }
    } catch (e) {
        console.error('DB Error:', e.message);
    }
    await pool.end();
}
main();
