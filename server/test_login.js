const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function main() {
    console.log('=== ADMIN ROLE AUDIT ===\n');

    // Step 1: Login
    const loginData = JSON.stringify({ email: 'admin@penerbitan.com', password: 'password123' });
    const loginRes = await request({
        hostname: 'localhost', port: 5000,
        path: '/api/auth/sign-in/email',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, loginData);

    console.log('1. LOGIN:', loginRes.status === 200 ? '✅ OK' : '❌ FAIL (' + loginRes.status + ')');
    const loginBody = JSON.parse(loginRes.body);
    console.log('   Response user:', JSON.stringify(loginBody.user, null, 2));
    console.log('   Role in login response:', loginBody.user?.role || '❌ MISSING');

    const cookies = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

    // Step 2: Get Session
    const sessionRes = await request({
        hostname: 'localhost', port: 5000,
        path: '/api/auth/get-session',
        method: 'GET',
        headers: { 'Cookie': cookies }
    });

    console.log('\n2. GET SESSION:', sessionRes.status === 200 ? '✅ OK' : '❌ FAIL (' + sessionRes.status + ')');
    const sessionBody = JSON.parse(sessionRes.body);
    console.log('   Session user:', JSON.stringify(sessionBody.user, null, 2));
    console.log('   Role in session:', sessionBody.user?.role || '❌ MISSING');
    console.log('   isAdmin?:', sessionBody.user?.role === 'admin' ? '✅ YES' : '❌ NO');

    // Step 3: Test protected endpoint
    const projRes = await request({
        hostname: 'localhost', port: 5000,
        path: '/api/projects',
        method: 'GET',
        headers: { 'Cookie': cookies }
    });
    console.log('\n3. GET PROJECTS:', projRes.status === 200 ? '✅ OK' : '❌ FAIL (' + projRes.status + ')');

    const notifRes = await request({
        hostname: 'localhost', port: 5000,
        path: '/api/notifications',
        method: 'GET',
        headers: { 'Cookie': cookies }
    });
    console.log('4. GET NOTIFICATIONS:', notifRes.status === 200 ? '✅ OK' : '❌ FAIL (' + notifRes.status + ')');

    console.log('\n=== AUDIT COMPLETE ===');
}

main().catch(console.error);
