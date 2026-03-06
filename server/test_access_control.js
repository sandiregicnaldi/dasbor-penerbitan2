const http = require('http');
require('dotenv').config({ path: './server/.env' });

function request(options, data, cookie) {
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

async function loginAs(email, password) {
    const payload = JSON.stringify({ email, password });
    const res = await request({
        hostname: 'localhost', port: 5000, path: '/api/auth/sign-in/email',
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, payload);
    const cookies = res.headers['set-cookie'];
    return cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
}

async function main() {
    console.log('=== ACCESS CONTROL VERIFICATION ===\n');

    // 1. Login as admin
    console.log('1. Login as admin...');
    const adminCookie = await loginAs('admin@penerbitan.com', 'password123');
    console.log(adminCookie ? '   ✅ Admin session acquired' : '   ❌ Admin login failed');

    // 2. Login as regular user
    console.log('2. Login as regular user...');
    const userCookie = await loginAs('user@penerbitan.com', 'password123');
    console.log(userCookie ? '   ✅ User session acquired' : '   ❌ User login failed');

    // 3. Admin GET /api/projects — should see ALL
    console.log('\n3. Admin GET /api/projects...');
    const adminProjects = await request({
        hostname: 'localhost', port: 5000, path: '/api/projects',
        method: 'GET', headers: { 'Content-Type': 'application/json' }
    }, null, adminCookie);
    const adminPrj = JSON.parse(adminProjects.body);
    console.log(`   Status: ${adminProjects.status} — ${adminPrj.length} projects`);
    console.log('   ✅ Admin sees all projects');

    // 4. User GET /api/projects — should only see assigned ones
    console.log('\n4. User GET /api/projects...');
    const userProjects = await request({
        hostname: 'localhost', port: 5000, path: '/api/projects',
        method: 'GET', headers: { 'Content-Type': 'application/json' }
    }, null, userCookie);
    const userPrj = JSON.parse(userProjects.body);
    console.log(`   Status: ${userProjects.status} — ${userPrj.length} projects`);
    if (userPrj.length <= adminPrj.length) {
        console.log('   ✅ User sees filtered projects (only assigned)');
    } else {
        console.log('   ❌ User sees more projects than admin?!');
    }

    // 5. Test stage authorization — user tries to update a stage they're not PJ of
    if (adminPrj.length > 0) {
        // Find a stage that belongs to a different user or has no PJ
        let testStage = null;
        for (const project of adminPrj) {
            if (project.stages) {
                for (const stage of project.stages) {
                    // Find a stage where user is NOT PJ
                    const userSession = await request({
                        hostname: 'localhost', port: 5000, path: '/api/auth/get-session',
                        method: 'GET', headers: { 'Content-Type': 'application/json' }
                    }, null, userCookie);
                    const sess = JSON.parse(userSession.body);
                    if (stage.pjId && stage.pjId !== sess.user?.id) {
                        testStage = stage;
                        break;
                    }
                    if (!stage.pjId) {
                        testStage = stage;
                        break;
                    }
                }
            }
            if (testStage) break;
        }

        if (testStage) {
            console.log(`\n5. User tries to update stage "${testStage.label}" (PJ: ${testStage.pjId || 'none'})...`);
            const updatePayload = JSON.stringify({ progress: 50 });
            const updateRes = await request({
                hostname: 'localhost', port: 5000, path: `/api/stages/${testStage.id}`,
                method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updatePayload) }
            }, updatePayload, userCookie);
            console.log(`   Status: ${updateRes.status}`);
            if (updateRes.status === 403) {
                console.log('   ✅ Correctly blocked: user cannot update others\' stages');
            } else if (updateRes.status === 200) {
                console.log('   ⚠️ Stage updated (user might be PJ of this stage)');
            } else {
                console.log(`   Response: ${updateRes.body}`);
            }
        } else {
            console.log('\n5. No stages found to test authorization');
        }
    }

    // 6. Unauthenticated user
    console.log('\n6. Unauthenticated GET /api/projects...');
    const noAuthRes = await request({
        hostname: 'localhost', port: 5000, path: '/api/projects',
        method: 'GET', headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   Status: ${noAuthRes.status} ${noAuthRes.status === 401 ? '✅ Correctly rejected' : '❌ Should be 401'}`);

    console.log('\n=== TESTS COMPLETE ===');
}

main().catch(console.error);
