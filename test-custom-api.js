// Test script to check custom game API endpoints
const API_BASE = 'http://localhost:3000';

async function testCustomGameFlow() {
  console.log('Testing custom game API flow...\n');

  try {
    // 1. Create a custom game
    console.log('1. Creating custom game...');
    const createResponse = await fetch(`${API_BASE}/api/custom/lettered`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phrase: 'TEST PHRASE FOR API',
        gridLetters: ['T', 'E', 'S', 'T', 'P', 'H', 'R', 'A', 'S', 'E', 'F', 'O', 'R', 'A', 'P', 'I'],
        gridSize: 4,
      }),
    });

    if (!createResponse.ok) {
      console.error('Failed to create game:', await createResponse.text());
      return;
    }

    const createData = await createResponse.json();
    const gameId = createData.gameId;
    console.log('Game created with ID:', gameId);

    // 2. Submit a score
    console.log('\n2. Submitting score...');
    const scoreResponse = await fetch(`${API_BASE}/api/custom/lettered/${gameId}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score: 4500,
        timeElapsed: 120,
        moves: 15,
      }),
    });

    if (!scoreResponse.ok) {
      console.error('Failed to submit score:', await scoreResponse.text());
      return;
    }

    const scoreData = await scoreResponse.json();
    console.log('Score submitted:', scoreData);

    // 3. Get postgame stats
    console.log('\n3. Getting postgame stats...');
    const postgameResponse = await fetch(`${API_BASE}/api/custom/lettered/${gameId}/postgame`);

    if (!postgameResponse.ok) {
      console.error('Failed to get postgame stats:', await postgameResponse.text());
      return;
    }

    const postgameData = await postgameResponse.json();
    console.log('Postgame stats:', JSON.stringify(postgameData, null, 2));

    // 4. Get leaderboard
    console.log('\n4. Getting leaderboard...');
    const leaderboardResponse = await fetch(`${API_BASE}/api/custom/lettered/${gameId}/leaderboard`);

    if (!leaderboardResponse.ok) {
      console.error('Failed to get leaderboard:', await leaderboardResponse.text());
      return;
    }

    const leaderboardData = await leaderboardResponse.json();
    console.log('Leaderboard:', JSON.stringify(leaderboardData, null, 2));

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testCustomGameFlow();