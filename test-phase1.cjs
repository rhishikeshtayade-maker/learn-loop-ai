// Phase 1 Verification Script
async function verifyPhase1() {
  console.log('==================================================');
  console.log('PHASE 1 VERIFICATION & HEALTH AUDIT');
  console.log('==================================================\n');

  let passed = true;

  // 1. Direct Backend Verification
  try {
    const res = await fetch('http://localhost:5000/api/health');
    const data = await res.json();
    console.log('✅ 1. Express Direct (/api/health):');
    console.log('   Status Code:', res.status);
    console.log('   Service:', data.service);
    console.log('   Database:', data.database);
    console.log('   User Count in DB:', data.stats.users);
    console.log('   Timestamp:', data.timestamp);
  } catch (err) {
    console.error('❌ 1. Express Direct FAILED:', err.message);
    passed = false;
  }

  console.log('');

  // 2. Vite Frontend Serving Verification
  try {
    const res = await fetch('http://localhost:5173');
    const html = await res.text();
    const hasRoot = html.includes('id="root"');
    console.log('✅ 2. Vite Frontend Server (http://localhost:5173):');
    console.log('   Status Code:', res.status);
    console.log('   HTML Payload Size:', html.length, 'bytes');
    console.log('   Contains React Mount Root (#root):', hasRoot);
    if (!hasRoot) passed = false;
  } catch (err) {
    console.error('❌ 2. Vite Frontend FAILED:', err.message);
    passed = false;
  }

  console.log('');

  // 3. Frontend-to-Backend Proxy Verification (Client accessing backend via Vite proxy)
  try {
    const res = await fetch('http://localhost:5173/api/health');
    const data = await res.json();
    console.log('✅ 3. Frontend Proxy to Express Backend (http://localhost:5173/api/health):');
    console.log('   Status Code:', res.status);
    console.log('   Proxied Database Status:', data.database);
    console.log('   Full Proxy Response:', JSON.stringify(data));
  } catch (err) {
    console.error('❌ 3. Frontend Proxy FAILED:', err.message);
    passed = false;
  }

  console.log('\n==================================================');
  if (passed) {
    console.log('🎉 PHASE 1 VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL');
  } else {
    console.log('⚠️ PHASE 1 VERIFICATION: ONE OR MORE CHECKS FAILED');
  }
  console.log('==================================================');
}

verifyPhase1();
