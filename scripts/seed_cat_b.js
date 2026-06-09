const { PrismaClient } = require('../src/lib/generated');
const p = new PrismaClient();

const CATEGORY_ID = 'cmq6l633u0073z593beat3r00';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) { const b = [...a]; for (let i = b.length-1; i > 0; i--) { const j = rand(0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }

function ev(matchId, teamId, type, playerId, minute, timeType, detail, assistId) {
  return { matchId, teamId, type, playerId: playerId || null, minute: minute ?? null, timeType: timeType || null, detail: detail || '', assistId: assistId || null };
}

async function getTeamPlayers(teamId) {
  const members = await p.teamMember.findMany({ where: { teamId, role: 'PLAYER' } });
  const tps = await p.teamPlayer.findMany({ where: { teamId }, include: { player: { include: { user: true } } } });
  const tpMapped = tps.map(tp => ({ id: tp.id, name: tp.player.user.name }));
  return [...members, ...tpMapped];
}

const homeSlots = [
  {x:7,y:50},{x:22,y:85},{x:24,y:35},{x:24,y:65},
  {x:40,y:78},{x:44,y:38},{x:44,y:62},{x:40,y:22},
  {x:60,y:50},{x:74,y:35},{x:74,y:65}
];
const awaySlots = homeSlots.map(s => ({ x: Math.round(100 - s.x), y: s.y }));

async function main() {
  const matches = await p.match.findMany({
    where: {
      categoryId: CATEGORY_ID,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: [{ roundOrder: 'asc' }, { matchDate: 'asc' }]
  });

  // Filter out placeholder teams "op"
  const realMatches = matches.filter(m =>
    m.homeTeam?.name !== 'op' && m.awayTeam?.name !== 'op'
  );

  console.log(`Found ${realMatches.length} real matches (filtered out ${matches.length - realMatches.length} with placeholders)`);

  // Pre-fetch all team players
  const teamIds = [...new Set(realMatches.flatMap(m => [m.homeTeamId, m.awayTeamId]))];
  const teamPlayers = {};
  for (const tid of teamIds) {
    teamPlayers[tid] = await getTeamPlayers(tid);
    const team = realMatches.find(m => m.homeTeamId === tid || m.awayTeamId === tid);
    console.log(`  ${team?.homeTeam?.name || team?.awayTeam?.name}: ${teamPlayers[tid].length} players`);
  }

  let total = 0;
  for (const match of realMatches) {
    const hp = teamPlayers[match.homeTeamId] || [];
    const ap = teamPlayers[match.awayTeamId] || [];
    if (hp.length < 2 || ap.length < 2) {
      console.log(`Skip ${match.homeTeam?.name} vs ${match.awayTeam?.name} (hp=${hp.length}, ap=${ap.length})`);
      continue;
    }

    await p.$executeRaw`DELETE FROM MatchEvent WHERE matchId = ${match.id}`;

    const totalGoals = rand(1, 8);
    const finalHs = Math.min(rand(0, totalGoals), 5);
    const finalAs = Math.min(totalGoals - finalHs, 5);

    const homeSt = shuffle(hp).slice(0, Math.min(11, hp.length));
    const awaySt = shuffle(ap).slice(0, Math.min(11, ap.length));
    const homeBn = hp.filter(p => !homeSt.find(s => s.id === p.id));
    const awayBn = ap.filter(p => !awaySt.find(s => s.id === p.id));

    const data = [];

    // LINEUP
    homeSt.forEach((pl, i) => {
      data.push(ev(match.id, match.homeTeamId, 'LINEUP', pl.id, null, null,
        JSON.stringify({ x: +(homeSlots[i].x + (Math.random()*6-3)).toFixed(1), y: +(homeSlots[i].y + (Math.random()*6-3)).toFixed(1) })));
    });
    awaySt.forEach((pl, i) => {
      data.push(ev(match.id, match.awayTeamId, 'LINEUP', pl.id, null, null,
        JSON.stringify({ x: +(awaySlots[i].x + (Math.random()*6-3)).toFixed(1), y: +(awaySlots[i].y + (Math.random()*6-3)).toFixed(1) })));
    });

    // GOALS
    const usedH = new Set(), usedA = new Set();
    for (let g = 0; g < finalHs; g++) {
      const s = pick(hp.filter(p => !usedH.has(p.id)) || hp);
      if (s) { usedH.add(s.id); data.push(ev(match.id, match.homeTeamId, 'GOAL', s.id, rand(5, 90), pick(['1°','1°','1°','2°','2°']), 'Jugada')); }
    }
    for (let g = 0; g < finalAs; g++) {
      const s = pick(ap.filter(p => !usedA.has(p.id)) || ap);
      if (s) { usedA.add(s.id); data.push(ev(match.id, match.awayTeamId, 'GOAL', s.id, rand(5, 90), pick(['1°','1°','1°','2°','2°']), 'Jugada')); }
    }

    // YELLOW CARDS
    for (let y = 0; y < rand(0, 3); y++) data.push(ev(match.id, match.homeTeamId, 'YELLOW_CARD', pick(hp).id, rand(10, 85), pick(['1°','2°']), ''));
    for (let y = 0; y < rand(0, 3); y++) data.push(ev(match.id, match.awayTeamId, 'YELLOW_CARD', pick(ap).id, rand(10, 85), pick(['1°','2°']), ''));

    // FOULS
    for (let y = 0; y < rand(2, 6); y++) data.push(ev(match.id, match.homeTeamId, 'FOUL', pick(hp).id, rand(5, 90), pick(['1°','1°','2°','2°']), ''));
    for (let y = 0; y < rand(2, 6); y++) data.push(ev(match.id, match.awayTeamId, 'FOUL', pick(ap).id, rand(5, 90), pick(['1°','1°','2°','2°']), ''));

    // SUBSTITUTIONS
    const nSubsH = Math.min(rand(0, 3), homeBn.length, homeSt.length);
    for (let s = 0; s < nSubsH; s++) {
      data.push(ev(match.id, match.homeTeamId, 'SUBSTITUTION', homeBn[s].id, rand(50, 80), '2°', '', homeSt[s].id));
    }
    const nSubsA = Math.min(rand(0, 3), awayBn.length, awaySt.length);
    for (let s = 0; s < nSubsA; s++) {
      data.push(ev(match.id, match.awayTeamId, 'SUBSTITUTION', awayBn[s].id, rand(50, 80), '2°', '', awaySt[s].id));
    }

    if (data.length > 0) await p.matchEvent.createMany({ data });

    await p.match.update({ where: { id: match.id }, data: { homeScore: finalHs, awayScore: finalAs, status: 'COMPLETED' } });

    total += data.length;
    console.log(`${String(match.roundName).padStart(2)} ${match.homeTeam?.name} ${finalHs}-${finalAs} ${match.awayTeam?.name} (${data.length} ev)`);
  }

  console.log(`\nDone! ${total} events across ${realMatches.length} matches`);
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
