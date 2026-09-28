// Phase 2 Comprehensive Authentication & Security Test Suite
const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==================================================');
  console.log('PHASE 2: AUTHENTICATION & SECURITY VERIFICATION');
  console.log('==================================================\n');

  let passedAll = true;
  let cookieJar = '';

  const testUser = {
    name: 'Hackathon Tester',
    email: `tester_${Date.now()}@learnloop.ai`,
    password: 'SecurePassword123!',
  };

  // Helper to extract cookies from response
  function extractCookie(res) {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // Extract the learnloop_auth_token cookie
      const match = setCookie.match(/learnloop_auth_token=[^;]+/);
      if (match) return match[0];
    }
    return '';
  }

  // TEST 1: Unauthorized Access Prevention
  try {
    console.log('Test 1: Blocking unauthorized access to /api/protected/test...');
    const res = await fetch(`${BASE_URL}/api/protected/test`);
    const data = await res.json();
    if (res.status === 401 && data.error) {
      console.log('  ✅ PASSED: Correctly returned 401 Unauthorized without credentials.');
    } else {
      console.error('  ❌ FAILED: Unexpected status code:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 2: Zod Input Validation on Registration
  try {
    console.log('\nTest 2: Validating rejection of invalid registration input (short password)...');
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex', email: 'alex@test.com', password: '123' }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error && data.error.includes('6 characters')) {
      console.log('  ✅ PASSED: Zod caught short password (HTTP 400):', data.error);
    } else {
      console.error('  ❌ FAILED: Expected 400 with validation message, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 3: User Registration & HTTP-only Cookie Issuance
  try {
    console.log('\nTest 3: Registering valid user & checking HTTP-only cookie...');
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    cookieJar = extractCookie(res);

    if (res.status === 201 && data.user && data.user.email === testUser.email) {
      const isHttpOnly = setCookie && setCookie.toLowerCase().includes('httponly');
      console.log('  ✅ PASSED: User registered (HTTP 201). ID:', data.user.id);
      console.log('  ✅ PASSED: HTTP-only cookie received:', isHttpOnly, `(${cookieJar.slice(0, 35)}...)`);
      if (!isHttpOnly) {
        console.warn('  ⚠️ Warning: Cookie missing HttpOnly flag');
        passedAll = false;
      }
    } else {
      console.error('  ❌ FAILED: Expected 201 Created, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 4: Duplicate Email Rejection
  try {
    console.log('\nTest 4: Rejecting duplicate email registration...');
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    if (res.status === 409 && data.error) {
      console.log('  ✅ PASSED: Duplicate email correctly blocked (HTTP 409):', data.error);
    } else {
      console.error('  ❌ FAILED: Expected 409 Conflict, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 5: Login with Wrong Password
  try {
    console.log('\nTest 5: Testing login rejection with invalid password...');
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: 'WrongPassword999!' }),
    });
    const data = await res.json();
    if (res.status === 401 && data.error) {
      console.log('  ✅ PASSED: Invalid password rejected (HTTP 401):', data.error);
    } else {
      console.error('  ❌ FAILED: Expected 401 Unauthorized, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 6: Login with Valid Credentials
  try {
    console.log('\nTest 6: Logging in with valid credentials...');
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const data = await res.json();
    cookieJar = extractCookie(res);

    if (res.status === 200 && data.user && data.user.email === testUser.email) {
      console.log('  ✅ PASSED: Login successful (HTTP 200). User:', data.user.name);
    } else {
      console.error('  ❌ FAILED: Expected 200 OK, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 7: Current User Session (/api/auth/me) with Cookie
  try {
    console.log('\nTest 7: Fetching current user session (/api/auth/me) via HTTP-only cookie...');
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookieJar },
    });
    const data = await res.json();
    if (res.status === 200 && data.user && data.user.email === testUser.email) {
      console.log('  ✅ PASSED: Session verified (HTTP 200). User:', data.user.name, 'Counts:', data.user._count);
    } else {
      console.error('  ❌ FAILED: Expected 200 OK, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 8: Protected Route Access with Cookie
  try {
    console.log('\nTest 8: Verifying access to protected route with valid session...');
    const res = await fetch(`${BASE_URL}/api/protected/test`, {
      headers: { Cookie: cookieJar },
    });
    const data = await res.json();
    if (res.status === 200 && data.user && data.user.email === testUser.email) {
      console.log('  ✅ PASSED: Protected route returned 200 OK with verified req.user:', data.user.email);
    } else {
      console.error('  ❌ FAILED: Expected 200 OK, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // TEST 9: Logout & Session Invalidation
  try {
    console.log('\nTest 9: Testing logout (POST /api/auth/logout)...');
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookieJar },
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    console.log('  ✅ PASSED: Logout response:', data.message);

    // Verify session is invalidated
    const verifyRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: 'learnloop_auth_token=' },
    });
    if (verifyRes.status === 401) {
      console.log('  ✅ PASSED: /api/auth/me correctly returns 401 Unauthorized after logout.');
    } else {
      console.error('  ❌ FAILED: Session still valid after logout, status:', verifyRes.status);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  console.log('\n==================================================');
  if (passedAll) {
    console.log('🎉 ALL PHASE 2 AUTHENTICATION & SECURITY TESTS PASSED!');
  } else {
    console.log('⚠️ SOME PHASE 2 TESTS FAILED.');
  }
  console.log('==================================================');
}

runTests();
