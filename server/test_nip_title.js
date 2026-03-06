const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function main() {
    console.log('=== TEST NIP GENERATE WITH TITLE ===');

    // Payload with title
    const payload = JSON.stringify({
        ddcCode: '005',
        date: '2026-03-15',
        sourceCode: 'K1',
        formatCode: 'E',
        title: 'Buku Test Judul Baru'
    });

    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/nip/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        }, payload);

        console.log('Status:', res.status);
        console.log('Response:', res.body);

        if (res.status === 201) {
            const json = JSON.parse(res.body);
            if (json.title === 'Buku Test Judul Baru') {
                console.log('✅ Title saved correctly!');
            } else {
                console.log('❌ Title MISMATCH:', json.title);
            }
        } else {
            console.log('❌ Failed to generate NIP');
        }

    } catch (e) {
        console.error('Request failed:', e.message);
    }
}

main();
