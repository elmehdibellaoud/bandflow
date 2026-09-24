import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('Starting Phase 6+ Refactor API integration tests...');
  
  const timestamp = Date.now();
  const email1 = `manager.${timestamp}@example.com`;
  const email2 = `musician.${timestamp}@example.com`;
  const password = 'password123';

  // 1. Register Manager
  const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password, full_name: 'Alex Manager' })
  });
  assert.strictEqual(reg1Res.status, 201);
  const reg1Data = await reg1Res.json();
  const managerId = reg1Data.user.id;
  console.log('Manager registered.');

  // 2. Register Musician
  const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password, full_name: 'Eddie Guitarist' })
  });
  assert.strictEqual(reg2Res.status, 201);
  const reg2Data = await reg2Res.json();
  const musicianId = reg2Data.user.id;
  console.log('Musician registered.');

  // 3. Logins
  const log1 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password })
  });
  const { token: managerToken } = await log1.json();

  const log2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password })
  });
  const { token: musicianToken } = await log2.json();
  console.log('Logins authenticated.');

  // 4. Create Band (seeds default roles: Vocalist, Guitarist, Bassist, Drummer, Keyboardist)
  console.log('Testing Band creation & dynamic roles seeding...');
  const createRes = await fetch(`${BASE_URL}/bands/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: JSON.stringify({ name: 'Metallica Reborn' })
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  const bandId = createData.band.id;
  const uniqueBandId = createData.band.unique_band_id;
  console.log('Band created. ID:', uniqueBandId);

  // 5. Fetch Band Roles (Manager)
  console.log('Verifying default seeded roles...');
  const rolesRes = await fetch(`${BASE_URL}/bands/${bandId}/roles`, {
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  assert.strictEqual(rolesRes.status, 200);
  const rolesData = await rolesRes.json();
  const roles = rolesData.roles;
  assert.strictEqual(roles.length, 5, 'Should have exactly 5 default seeded roles');
  const roleNames = roles.map(r => r.role_name);
  assert.ok(roleNames.includes('Vocalist'));
  assert.ok(roleNames.includes('Guitarist'));
  assert.ok(roleNames.includes('Bassist'));
  assert.ok(roleNames.includes('Drummer'));
  assert.ok(roleNames.includes('Keyboardist'));
  console.log('Verified seeded roles list:', roleNames.join(', '));

  // Find the 'Guitarist' role ID
  const guitaristRole = roles.find(r => r.role_name === 'Guitarist');
  assert.ok(guitaristRole);

  // 6. Verify Band ID (Public/Musician)
  console.log('Testing band ID verify endpoint...');
  const verifyRes = await fetch(`${BASE_URL}/bands/verify/${uniqueBandId}`, {
    headers: { 'Authorization': `Bearer ${musicianToken}` }
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.valid, true);
  assert.strictEqual(verifyData.band.name, 'Metallica Reborn');
  assert.strictEqual(verifyData.band.roles.length, 5);
  console.log('Band ID verified successfully.');

  // 7. Join Band (Musician links to 'Guitarist' role_id)
  console.log('Testing join band with dynamic role ID...');
  const joinRes = await fetch(`${BASE_URL}/bands/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${musicianToken}`
    },
    body: JSON.stringify({ unique_band_id: uniqueBandId, role_id: guitaristRole.id })
  });
  assert.strictEqual(joinRes.status, 200);
  const joinData = await joinRes.json();
  assert.strictEqual(joinData.band.instrument, 'Guitarist');
  console.log('Musician joined band successfully as Guitarist.');

  // 8. Custom Band Role CRUD (Manager Only)
  console.log('Testing custom role CRUD (Manager Only)...');
  const addRoleRes = await fetch(`${BASE_URL}/bands/${bandId}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: JSON.stringify({ role_name: 'Accordionist' })
  });
  assert.strictEqual(addRoleRes.status, 201);
  const addRoleData = await addRoleRes.json();
  const accordionistRoleId = addRoleData.role.id;
  console.log('Custom role "Accordionist" added successfully.');

  // Block Musician from adding a role
  const blockAddRoleRes = await fetch(`${BASE_URL}/bands/${bandId}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${musicianToken}`
    },
    body: JSON.stringify({ role_name: 'Trumpeteer' })
  });
  assert.strictEqual(blockAddRoleRes.status, 403, 'Musician must be blocked from adding roles');
  console.log('Musician role CRUD addition block verified (403).');

  // Delete Custom Role (Manager)
  const delRoleRes = await fetch(`${BASE_URL}/bands/${bandId}/roles/${accordionistRoleId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  assert.strictEqual(delRoleRes.status, 200);
  console.log('Custom role deleted successfully.');

  // 9. Add Songs to Song Bank
  console.log('Adding songs to band Song Bank...');
  const addSongRes = await fetch(`${BASE_URL}/songs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      band_id: bandId,
      title: 'Enter Sandman',
      song_key: 'Em',
      tempo: 120,
      duration: 330,
      reference_link: 'http://youtube.com/sandman'
    })
  });
  assert.strictEqual(addSongRes.status, 201);
  const songData = await addSongRes.json();
  const songId = songData.song.id;
  console.log('Song added successfully. ID:', songId);

  // 10. Schedule Performance with Roster Matrix
  console.log('Testing scheduling performance with roster matrix...');
  const dateStr = new Date(Date.now() + 86400000).toISOString().slice(0, 16); // tomorrow
  const createPerfRes = await fetch(`${BASE_URL}/performances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      band_id: bandId,
      title: 'Live at Wembley',
      date_time: dateStr,
      venue: 'Wembley Stadium',
      songs: [
        {
          id: songId,
          performing_members: [managerId, musicianId] // Both are playing on this song
        }
      ]
    })
  });
  assert.strictEqual(createPerfRes.status, 201);
  console.log('Performance scheduled successfully.');

  // 11. Fetch Performances & Verify Roster Mappings
  console.log('Verifying parsed performing rosters...');
  const getPerfRes = await fetch(`${BASE_URL}/performances?band_id=${bandId}`, {
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  assert.strictEqual(getPerfRes.status, 200);
  const getPerfData = await getPerfRes.json();
  const performances = getPerfData.performances;
  assert.strictEqual(performances.length, 1);
  const setlistSong = performances[0].songs[0];
  assert.strictEqual(setlistSong.id, songId);
  assert.strictEqual(setlistSong.performing_members.length, 2);
  assert.ok(setlistSong.performing_members.includes(managerId));
  assert.ok(setlistSong.performing_members.includes(musicianId));
  console.log('Verified performing members array:', setlistSong.performing_members);

  console.log('\n======================================================');
  console.log('  ALL SCHEMA REFACTOR & PLANNER TEST ASSERTIONS PASSED!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
