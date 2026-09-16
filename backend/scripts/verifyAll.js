import { fork } from 'child_process';

const testEnv = {
  ...process.env,
  PORT: '5001',
  DATABASE_URL: 'postgresql://localhost:5432/asian_crackers_test',
  DATABASE_SSL: 'false',
  ADMIN_USERNAME: 'asianadmin',
  ADMIN_PASSWORD_HASH: '$2a$10$5rQkfw1kRy4JwjMoVjdqjOOGZaqp7T4ARlhPlWmxkO9Ha15xVoQiu',
  JWT_SECRET: 'super_secret_test_jwt_2026',
};

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, '../server.js');

console.log('Starting Asian Crackers Server for verification...');
const child = fork(serverPath, [], { cwd: path.resolve(__dirname, '..'), env: testEnv });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  await wait(1800);
  const baseUrl = 'http://localhost:5001';

  try {
    console.log('\n--- Test 1: Health Check ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    console.log('Status:', healthRes.status, healthJson);
    if (!healthJson.success || healthJson.status !== 'ok') throw new Error('Health check failed');

    console.log('\n--- Test 2: Static Files (index.html & admin.html) ---');
    const indexRes = await fetch(`${baseUrl}/index.html`);
    const indexHtml = await indexRes.text();
    console.log('index.html loaded:', indexRes.status, 'contains catalog container:', indexHtml.includes('id="catalog-container"'));
    if (!indexHtml.includes('id="catalog-container"')) throw new Error('index.html missing catalog container');

    const adminRes = await fetch(`${baseUrl}/admin.html`);
    const adminHtml = await adminRes.text();
    console.log('admin.html loaded:', adminRes.status, 'contains admin container:', adminHtml.includes('id="admin-catalog-container"'));
    if (!adminHtml.includes('id="admin-catalog-container"')) throw new Error('admin.html missing admin container');

    console.log('\n--- Test 3: GET /api/products ---');
    const prodRes = await fetch(`${baseUrl}/api/products`);
    const prodJson = await prodRes.json();
    console.log('Categories count:', prodJson.length);
    const totalItems = prodJson.reduce((acc, cat) => acc + cat.items.length, 0);
    console.log('Total items in database:', totalItems);
    if (prodJson.length !== 19 || totalItems !== 129) {
      throw new Error(`Catalog count mismatch! Categories: ${prodJson.length}, Items: ${totalItems}`);
    }

    console.log('\n--- Test 4: GET /api/products/1 ---');
    const p1Res = await fetch(`${baseUrl}/api/products/1`);
    const p1Data = await p1Res.json();
    console.log('Product #1:', p1Data.product.name, 'Price: ₹' + p1Data.product.price);
    if (p1Data.product.id !== '1') throw new Error('Failed to fetch product 1');

    console.log('\n--- Test 5: Admin Login Validation ---');
    // Bad credentials
    const badLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'asianadmin', password: 'wrong_password' })
    });
    console.log('Invalid login rejected with status:', badLogin.status);
    if (badLogin.status !== 401) throw new Error('Expected 401 for bad password');

    // Good credentials
    const goodLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'asianadmin', password: 'Asian@2026' })
    });
    const goodLoginJson = await goodLogin.json();
    console.log('Valid login status:', goodLogin.status, 'Token issued:', !!goodLoginJson.token);
    if (goodLogin.status !== 200 || !goodLoginJson.token) throw new Error('Login failed for valid credentials');

    const token = goodLoginJson.token;

    console.log('\n--- Test 6: GET /api/admin/me Authentication Check ---');
    // Without token
    const meUnauth = await fetch(`${baseUrl}/api/admin/me`);
    console.log('Unauthenticated /me status (expect 401):', meUnauth.status);
    if (meUnauth.status !== 401) throw new Error('Expected 401 for unauthenticated /me');

    // With token
    const meAuth = await fetch(`${baseUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meAuthJson = await meAuth.json();
    console.log('Authenticated /me status (expect 200):', meAuth.status, 'User:', meAuthJson.user?.username);
    if (meAuth.status !== 200 || meAuthJson.user?.username !== 'asianadmin') throw new Error('Authenticated /me failed');

    console.log('\n--- Test 7: Protected PUT /api/products/:id ---');
    // Unauthenticated PUT
    const unauthPut = await fetch(`${baseUrl}/api/products/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 15.00 })
    });
    console.log('Unauthenticated PUT status (expect 401):', unauthPut.status);
    if (unauthPut.status !== 401) throw new Error('Expected 401 for unauthenticated PUT');

    // Authenticated PUT
    const authPut = await fetch(`${baseUrl}/api/products/1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ price: 15.00, name: '2 3/4" KURUVI (NEW RATE)' })
    });
    const authPutJson = await authPut.json();
    console.log('Authenticated PUT status:', authPut.status, 'Updated price:', authPutJson.product?.price);
    if (authPut.status !== 200 || authPutJson.product?.price !== 15.00) throw new Error('Product update failed');

    // Confirm update in database
    const verifyUpdated = await (await fetch(`${baseUrl}/api/products/1`)).json();
    console.log('Database persistent check: price is ₹' + verifyUpdated.product?.price);
    if (verifyUpdated.product?.price !== 15.00) throw new Error('Product update did not persist in database');

    // Reset product 1 to original
    await fetch(`${baseUrl}/api/products/1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ price: 8.00, name: '2 3/4" KURUVI' })
    });
    console.log('Reset product #1 back to original ₹8.00');

    console.log('\n--- Test 8: WhatsApp Bill Endpoint Preservation ---');
    const waTest = await fetch(`${baseUrl}/api/send-whatsapp-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const waJson = await waTest.json();
    console.log('WhatsApp bill without payload status (expect 400):', waTest.status, waJson.error);
    if (waTest.status !== 400) throw new Error('Expected 400 for empty WhatsApp bill payload');

    console.log('\n=============================================');
    console.log('🎉 ALL 8 INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('=============================================\n');
    child.kill();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    child.kill();
    process.exit(1);
  }
}

runTests();
