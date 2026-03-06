const http = require('http');
require('dotenv').config({ path: './server/.env' });

// First login as admin to get session cookie
async function request(options, data, cookie) {
    return new Promise((resolve, reject) => {
        if (cookie) options.headers = { ...options.headers, Cookie: cookie };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({
                status: res.statusCode,
                body,
                headers: res.headers
            }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function main() {
    console.log('=== TEST ADMIN USER MANAGEMENT ===\n');

    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginPayload = JSON.stringify({ email: 'admin@penerbitan.com', password: 'password123' });
    const loginRes = await request({
        hostname: 'localhost', port: 5000, path: '/api/auth/sign-in/email',
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginPayload.length }
    }, loginPayload);

    console.log('Login status:', loginRes.status);
    const cookies = loginRes.headers['set-cookie'];
    const sessionCookie = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
    console.log('Cookie:', sessionCookie ? '✅ Got session cookie' : '❌ No cookie');

    // 2. GET /api/admin/users
    console.log('\n2. GET /api/admin/users...');
    const usersRes = await request({
        hostname: 'localhost', port: 5000, path: '/api/admin/users',
        method: 'GET', headers: { 'Content-Type': 'application/json' }
    }, null, sessionCookie);

    console.log('Status:', usersRes.status);
    if (usersRes.status === 200) {
        const users = JSON.parse(usersRes.body);
        console.log(`✅ Found ${users.length} user(s):`);
        users.forEach(u => console.log(`   - ${u.name} (${u.email}) role=${u.role} status=${u.status}`));
    } else {
        console.log('❌ Failed:', usersRes.body);
    }

    // 3. GET without auth should fail
    console.log('\n3. GET /api/admin/users WITHOUT auth...');
    const noAuthRes = await request({
        hostname: 'localhost', port: 5000, path: '/api/admin/users',
        method: 'GET', headers: { 'Content-Type': 'application/json' }
    });
    console.log('Status:', noAuthRes.status, noAuthRes.status === 401 ? '✅ Correctly rejected' : '❌ Should be 401');

    console.log('\n=== TESTS COMPLETE ===');
}

main().catch(console.error);
