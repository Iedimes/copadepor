import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'copadepor',
  port: 3306
});

const [matches] = await conn.execute(`
  SELECT m.id, m.roundName, m.status, m.homeScore, m.awayScore,
         ht.name AS home, at.name AS away, m.homeTeamId, m.awayTeamId,
         m.homePenaltyScore, m.awayPenaltyScore
  FROM \`Match\` m
  LEFT JOIN Team ht ON m.homeTeamId = ht.id
  LEFT JOIN Team at ON m.awayTeamId = at.id
  WHERE m.roundName LIKE '%1°%' OR m.roundName LIKE '%1 %'
  ORDER BY m.roundOrder, m.matchDate
`);

console.log('Matches found:', matches.length);
for (const m of matches) {
  console.log(`  ${m.home} vs ${m.away} (${m.roundName}) - Status: ${m.status} Score: ${m.homeScore}-${m.awayScore}`);
}

// Get team members for each team
for (const m of matches) {
  if (m.homeTeamId) {
    const [members] = await conn.execute(
      `SELECT id, name FROM TeamMember WHERE teamId = ? AND role = 'PLAYER'`,
      [m.homeTeamId]
    );
    console.log(`  ${m.home} has ${members.length} players`);
  }
  if (m.awayTeamId) {
    const [members] = await conn.execute(
      `SELECT id, name FROM TeamMember WHERE teamId = ? AND role = 'PLAYER'`,
      [m.awayTeamId]
    );
    console.log(`  ${m.away} has ${members.length} players`);
  }
}

await conn.end();
