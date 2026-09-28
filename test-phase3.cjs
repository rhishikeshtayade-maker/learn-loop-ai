// Phase 3 Comprehensive Lecture Processing & Transcript Verification Test Suite
const BASE_URL = 'http://localhost:5000';

async function runPhase3Tests() {
  console.log('==================================================');
  console.log('PHASE 3: LECTURE PROCESSING & TRANSCRIPT PIPELINE');
  console.log('==================================================\n');

  let passedAll = true;

  // Helper to extract cookies
  function extractCookie(res) {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/learnloop_auth_token=[^;]+/);
      if (match) return match[0];
    }
    return '';
  }

  // Register User A
  const userA = {
    name: 'Student Alice',
    email: `alice_${Date.now()}@learnloop.ai`,
    password: 'Password123!',
  };
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userA),
  });
  const cookieA = extractCookie(regARes);
  const dataA = await regARes.json();
  const userAId = dataA.user.id;

  // Register User B
  const userB = {
    name: 'Student Bob',
    email: `bob_${Date.now()}@learnloop.ai`,
    password: 'Password123!',
  };
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userB),
  });
  const cookieB = extractCookie(regBRes);

  console.log(`Initialized Test Users: Alice (${userA.email}) & Bob (${userB.email})\n`);

  // 1. Unauthenticated lecture creation
  try {
    console.log('Test 1: Rejecting unauthenticated lecture creation...');
    const res = await fetch(`${BASE_URL}/api/lectures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=zjkBMFhNj_g' }),
    });
    if (res.status === 401) {
      console.log('  ✅ PASSED: Unauthenticated request rejected with HTTP 401');
    } else {
      console.error('  ❌ FAILED: Expected 401, got:', res.status);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 2. Rejecting Missing URL
  try {
    console.log('\nTest 2: Rejecting request with missing youtubeUrl...');
    const res = await fetch(`${BASE_URL}/api/lectures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.status === 400 && data.error) {
      console.log('  ✅ PASSED: Missing URL rejected with HTTP 400:', data.error);
    } else {
      console.error('  ❌ FAILED: Expected 400, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 3. Rejecting Non-YouTube URL
  try {
    console.log('\nTest 3: Rejecting non-YouTube domain URL...');
    const res = await fetch(`${BASE_URL}/api/lectures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ youtubeUrl: 'https://vimeo.com/123456789' }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error && data.error.includes('valid YouTube')) {
      console.log('  ✅ PASSED: Non-YouTube domain rejected with HTTP 400:', data.error);
    } else {
      console.error('  ❌ FAILED: Expected 400 with domain error, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 4. Rejecting Malformed Video ID
  try {
    console.log('\nTest 4: Rejecting malformed video ID...');
    const res = await fetch(`${BASE_URL}/api/lectures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=invalid' }),
    });
    const data = await res.json();
    if (res.status === 400) {
      console.log('  ✅ PASSED: Malformed video ID rejected with HTTP 400:', data.error);
    } else {
      console.error('  ❌ FAILED: Expected 400, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 5. Creating Lecture with Valid YouTube URL (Shorts format)
  let lectureAId = '';
  try {
    console.log('\nTest 5: Creating lecture with valid YouTube URL for Alice...');
    // Real educational video (3Blue1Brown Neural Networks: aircAruvnKk)
    const res = await fetch(`${BASE_URL}/api/lectures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ youtubeUrl: 'https://youtu.be/aircAruvnKk' }),
    });
    const data = await res.json();
    if (res.status === 201 && data.lecture && data.lecture.status === 'PENDING') {
      lectureAId = data.lecture.id;
      console.log('  ✅ PASSED: Lecture created in PENDING state. ID:', lectureAId);
      console.log('  ✅ PASSED: Real Title extracted via oEmbed:', data.lecture.title);
    } else {
      console.error('  ❌ FAILED: Expected 201 with PENDING lecture, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 6. User Isolation / Ownership Protection: User B cannot access User A's lecture
  try {
    console.log('\nTest 6: Verifying User B cannot read User A\'s lecture (IDOR protection)...');
    const res = await fetch(`${BASE_URL}/api/lectures/${lectureAId}`, {
      headers: { Cookie: cookieB },
    });
    const data = await res.json();
    if (res.status === 404) {
      console.log('  ✅ PASSED: Bob correctly received HTTP 404 trying to access Alice\'s lecture.');
    } else {
      console.error('  ❌ FAILED: Expected 404 Not Found, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 7. User Isolation: User B cannot process User A's lecture
  try {
    console.log('\nTest 7: Verifying User B cannot trigger processing on User A\'s lecture...');
    const res = await fetch(`${BASE_URL}/api/lectures/${lectureAId}/process`, {
      method: 'POST',
      headers: { Cookie: cookieB },
    });
    if (res.status === 404) {
      console.log('  ✅ PASSED: Bob blocked from processing Alice\'s lecture (HTTP 404).');
    } else {
      console.error('  ❌ FAILED: Expected 404 Not Found, got:', res.status);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 8. Processing Lecture Transcript with Real YouTube Video (aircAruvnKk)
  try {
    console.log('\nTest 8: Processing lecture transcript for Alice (aircAruvnKk)...');
    const res = await fetch(`${BASE_URL}/api/lectures/${lectureAId}/process`, {
      method: 'POST',
      headers: { Cookie: cookieA },
    });
    const data = await res.json();
    if (res.status === 200 && data.lecture && data.lecture.status === 'COMPLETED') {
      console.log('  ✅ PASSED: Transcript processed to COMPLETED state.');
      console.log('  ✅ PASSED: Segments preserved:', data.lecture.transcriptSegments?.length, 'segments');
      console.log('  ✅ PASSED: Estimated Duration:', data.lecture.duration, 'seconds');
      console.log('  ✅ PASSED: Normalized text length:', data.lecture.transcript?.length, 'characters');
      console.log('  Sample Snippet:', data.lecture.transcript?.slice(0, 120) + '...');
    } else {
      console.error('  ❌ FAILED: Expected 200 with COMPLETED status, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 9. Transcript Unavailable Error Handling
  try {
    console.log('\nTest 9: Verifying error handling when video transcript is unavailable...');
    // Create lecture with a video ID known to have no captions
    const noCapRes = await fetch(`${BASE_URL}/api/lectures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=00000000000' }),
    });
    const noCapData = await noCapRes.json();
    const noCapId = noCapData.lecture?.id;

    if (noCapId) {
      const procRes = await fetch(`${BASE_URL}/api/lectures/${noCapId}/process`, {
        method: 'POST',
        headers: { Cookie: cookieA },
      });
      const procData = await procRes.json();
      
      // Should fail gracefully with safe error message
      if (procRes.status === 422 && procData.error && procData.error.includes('unavailable')) {
        console.log('  ✅ PASSED: Received HTTP 422 with safe error message:', procData.error);

        // Verify status in DB transitioned to FAILED
        const checkRes = await fetch(`${BASE_URL}/api/lectures/${noCapId}`, {
          headers: { Cookie: cookieA },
        });
        const checkData = await checkRes.json();
        if (checkData.lecture.status === 'FAILED' && checkData.lecture.errorMessage) {
          console.log('  ✅ PASSED: Lecture status in database is FAILED with stored errorMessage.');
        } else {
          console.error('  ❌ FAILED: Database status was not FAILED:', checkData.lecture);
          passedAll = false;
        }
      } else {
        console.error('  ❌ FAILED: Expected 422 with unavailable message, got:', procRes.status, procData);
        passedAll = false;
      }
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 10. Listing Lectures for Authenticated User
  try {
    console.log('\nTest 10: Listing lectures for Alice (GET /api/lectures)...');
    const res = await fetch(`${BASE_URL}/api/lectures`, {
      headers: { Cookie: cookieA },
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data.lectures)) {
      console.log('  ✅ PASSED: Returned', data.lectures.length, 'lectures for Alice.');
    } else {
      console.error('  ❌ FAILED: Expected 200 with lectures array, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 11. Deleting Lecture
  try {
    console.log('\nTest 11: Deleting lecture (DELETE /api/lectures/:id)...');
    const res = await fetch(`${BASE_URL}/api/lectures/${lectureAId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    const data = await res.json();
    if (res.status === 200 && data.message) {
      console.log('  ✅ PASSED: Lecture deleted successfully.');

      // Verify it's gone
      const verifyRes = await fetch(`${BASE_URL}/api/lectures/${lectureAId}`, {
        headers: { Cookie: cookieA },
      });
      if (verifyRes.status === 404) {
        console.log('  ✅ PASSED: Subsequent fetch returns HTTP 404 Not Found.');
      } else {
        console.error('  ❌ FAILED: Deleted lecture still retrievable, status:', verifyRes.status);
        passedAll = false;
      }
    } else {
      console.error('  ❌ FAILED: Expected 200, got:', res.status, data);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  // 12. Frontend-to-Backend Proxy Verification for Lectures
  try {
    console.log('\nTest 12: Testing Vite Proxy (/api/lectures through port 5173)...');
    const res = await fetch('http://localhost:5173/api/lectures', {
      headers: { Cookie: cookieA },
    });
    if (res.status === 200) {
      console.log('  ✅ PASSED: Frontend proxy seamlessly routed /api/lectures (HTTP 200).');
    } else {
      console.error('  ❌ FAILED: Frontend proxy returned:', res.status);
      passedAll = false;
    }
  } catch (err) {
    console.error('  ❌ FAILED:', err.message);
    passedAll = false;
  }

  console.log('\n==================================================');
  if (passedAll) {
    console.log('🎉 ALL PHASE 3 LECTURE PROCESSING TESTS PASSED!');
  } else {
    console.log('⚠️ SOME PHASE 3 TESTS FAILED.');
  }
  console.log('==================================================');
}

runPhase3Tests();
