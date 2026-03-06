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
    console.log('=== TEST NEW NIP FORMAT ===');

    // Payload with new codes: Source '1' (Umum), Format '3' (Keduanya)
    const payload = JSON.stringify({
        ddcCode: '370',
        date: '2026-04-20',
        sourceCode: '1',
        formatCode: '3',
        title: 'Buku Pendidikan Digital'
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
        if (res.status === 201) {
            const json = JSON.parse(res.body);
            console.log('Visual NIP:', json.visualFormat);
            console.log('Barcode:', json.barcode);
            console.log('Title:', json.title);

            // Verify Format: 370 - 202604 - 1 - XXX - 3
            // 370 (DDC)
            // 202604 (YYYYMM)
            // 1 (Source)
            // XXX (Serial, e.g. 001)
            // 3 (Format)
            const expectedPattern = /^370 - 202604 - 1 - \d{3} - 3$/;
            if (expectedPattern.test(json.visualFormat)) {
                console.log('✅ Visual Format MATCHES user requirement!');
            } else {
                console.log('❌ Visual Format INVALID:', json.visualFormat);
            }

            const barcodePattern = /^3702026041\d{3}3$/;
            if (barcodePattern.test(json.barcode)) {
                console.log('✅ Barcode Format MATCHES user requirement!');
            } else {
                console.log('❌ Barcode Format INVALID:', json.barcode);
            }

        } else {
            console.log('❌ Failed:', res.body);
        }

    } catch (e) {
        console.error('Request failed:', e.message);
    }
}

main();
