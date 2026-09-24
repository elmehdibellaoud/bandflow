import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runRehearsalsTests() {
  console.log('Starting Rehearsals & Inheritance API integration tests...');
  
  const timestamp = Date.now();
  const email1 = `manager.${timestamp}@example.com`;
  const email2 = `member.${timestamp}@example.com`;
  const email3 = `nonmember.${timestamp}@example.com`;
  const password = 'password123';

  // 1. Register users
  console.log('Registering users...');
  const reg1 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password, full_name: 'Band Manager' })
  });
  const data1 = await reg1.json();

  const reg2 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password, full_name: 'Band Member' })
  });
  const data2 = await reg2.json();

  const reg3 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email3, password, full_name: 'Non Member' })
  });
  const data3 = await reg3.json();

  // 2. Log in
  console.log('Logging in...');
  const l1 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password })
  });
  const t1 = (await l1.json()).token;

  const l2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password })
  });
  const t2 = (await l2.json()).token;

  const l3 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email3, password })
  });
  const t3 = (await l3.json()).token;

  // 3. Create band by Manager
  console.log('Creating band...');
  const createBand = await fetch(`${BASE_URL}/bands/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t1}`
    },
    body: JSON.stringify({ name: 'The Practice Band' })
  });
  const band = (await createBand.json()).band;
  const bandId = band.id;

  // 4. Member joins band
  console.log('Member joining band...');
  await fetch(`${BASE_URL}/bands/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t2}`
    },
    body: JSON.stringify({ unique_band_id: band.unique_band_id, instrument: 'Bass' })
  });

  // 5. Add two songs from Manager
  console.log('Adding songs to Song Bank...');
  const song1Res = await fetch(`${BASE_URL}/songs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t1}`
    },
    body: JSON.stringify({ band_id: bandId, title: 'Hotel California', duration: 390 })
  });
  const song1 = (await song1Res.json()).song;

  const song2Res = await fetch(`${BASE_URL}/songs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t1}`
    },
    body: JSON.stringify({ band_id: bandId, title: 'Smoke on the Water', duration: 340 })
  });
  const song2 = (await song2Res.json()).song;

  // 6. Schedule a performance with setlist [Song 1, Song 2]
  console.log('Scheduling performance...');
  const postManagerPerf = await fetch(`${BASE_URL}/performances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t1}`
    },
    body: JSON.stringify({
      band_id: bandId,
      title: 'Grand Vegas Show',
      date_time: '2026-07-04T21:00:00',
      venue: 'Vegas Stadium',
      songs: [song1.id, song2.id]
    })
  });
  const perfId = (await postManagerPerf.json()).performance.id;

  // 7. Test POST /api/rehearsals (Member vs Manager)
  console.log('Testing rehearsal scheduling as Member (should fail)...');
  const postMember = await fetch(`${BASE_URL}/rehearsals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t2}`
    },
    body: JSON.stringify({
      band_id: bandId,
      performance_id: perfId,
      date_time: '2026-07-03T18:00:00',
      location: 'Studio A',
      focus_song_ids: [song1.id]
    })
  });
  assert.strictEqual(postMember.status, 403);

  console.log('Testing rehearsal scheduling as Manager (should succeed)...');
  const postManagerReh = await fetch(`${BASE_URL}/rehearsals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t1}`
    },
    body: JSON.stringify({
      band_id: bandId,
      performance_id: perfId,
      date_time: '2026-07-03T18:00:00',
      location: 'Studio A',
      focus_song_ids: [song1.id] // Mark Song 1 as focus
    })
  });
  assert.strictEqual(postManagerReh.status, 201, `Manager rehearsal creation failed: ${postManagerReh.status}`);
  const rehearsal = (await postManagerReh.json()).rehearsal;
  console.log('Rehearsal scheduled at:', rehearsal.location, 'with ID:', rehearsal.id);

  // 8. Test GET /api/rehearsals
  console.log('Testing GET rehearsals as Manager (should succeed with inherited setlist)...');
  const getManager = await fetch(`${BASE_URL}/rehearsals?band_id=${bandId}`, {
    headers: { 'Authorization': `Bearer ${t1}` }
  });
  assert.strictEqual(getManager.status, 200);
  const rehs = (await getManager.json()).rehearsals;
  assert.strictEqual(rehs.length, 1);
  assert.strictEqual(rehs[0].songs.length, 2, 'Rehearsal should inherit 2 setlist tracks');
  // Check sequence order
  assert.strictEqual(rehs[0].songs[0].id, song1.id);
  assert.strictEqual(rehs[0].songs[0].is_focus, 1, 'Song 1 should be focus song');
  assert.strictEqual(rehs[0].songs[1].id, song2.id);
  assert.strictEqual(rehs[0].songs[1].is_focus, 0, 'Song 2 should NOT be focus song');
  console.log('Rehearsal setlist inheritance and focus song flag verified.');

  console.log('Testing GET rehearsals as Non-member (should fail)...');
  const getNonMember = await fetch(`${BASE_URL}/rehearsals?band_id=${bandId}`, {
    headers: { 'Authorization': `Bearer ${t3}` }
  });
  assert.strictEqual(getNonMember.status, 403, `Non-member should be forbidden from reading rehearsals, got ${getNonMember.status}`);

  // 9. Test PUT /api/rehearsals/:id
  console.log('Testing rehearsal update as Member (should fail)...');
  const putMember = await fetch(`${BASE_URL}/rehearsals/${rehearsal.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t2}`
    },
    body: JSON.stringify({
      performance_id: perfId,
      date_time: '2026-07-03T19:00:00',
      location: 'Studio B',
      focus_song_ids: [song1.id, song2.id] // Mark both as focus
    })
  });
  assert.strictEqual(putMember.status, 403);

  console.log('Testing rehearsal update as Manager (should succeed)...');
  const putManager = await fetch(`${BASE_URL}/rehearsals/${rehearsal.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t1}`
    },
    body: JSON.stringify({
      performance_id: perfId,
      date_time: '2026-07-03T19:00:00',
      location: 'Studio B',
      focus_song_ids: [song1.id, song2.id] // Mark both as focus
    })
  });
  assert.strictEqual(putManager.status, 200, `Manager update failed: ${putManager.status}`);

  // Retrieve again to verify
  const getManagerUpdated = await fetch(`${BASE_URL}/rehearsals?band_id=${bandId}`, {
    headers: { 'Authorization': `Bearer ${t1}` }
  });
  const rehsUpdated = (await getManagerUpdated.json()).rehearsals;
  assert.strictEqual(rehsUpdated[0].location, 'Studio B');
  assert.strictEqual(rehsUpdated[0].songs[0].is_focus, 1, 'Song 1 should be focus');
  assert.strictEqual(rehsUpdated[0].songs[1].is_focus, 1, 'Song 2 should now be focus');
  console.log('Rehearsal updated successfully.');

  // 10. Test DELETE /api/rehearsals/:id
  console.log('Testing rehearsal deletion as Member (should fail)...');
  const delMember = await fetch(`${BASE_URL}/rehearsals/${rehearsal.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${t2}` }
  });
  assert.strictEqual(delMember.status, 403);

  console.log('Testing rehearsal deletion as Manager (should succeed)...');
  const delManager = await fetch(`${BASE_URL}/rehearsals/${rehearsal.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${t1}` }
  });
  assert.strictEqual(delManager.status, 200);

  // Check list is empty now
  const getManagerEmpty = await fetch(`${BASE_URL}/rehearsals?band_id=${bandId}`, {
    headers: { 'Authorization': `Bearer ${t1}` }
  });
  const rehsEmpty = (await getManagerEmpty.json()).rehearsals;
  assert.strictEqual(rehsEmpty.length, 0, 'Rehearsals list should be empty after deletion');
  console.log('Rehearsal deleted successfully.');

  console.log('\n=========================================');
  console.log('  REHEARSALS API TESTS PASSED SUCCESSFULLY! ');
  console.log('=========================================\n');
}

runRehearsalsTests().catch(err => {
  console.error('Rehearsals test run failed:', err);
  process.exit(1);
});
