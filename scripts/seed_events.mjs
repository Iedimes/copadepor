import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const matches = await p.match.findMany({
    where: { OR: [{ roundName: { contains: '1°' } }, { roundName: { contains: 'PRIMERA' } }, { roundName: { startsWith: '1' } }] },
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ roundOrder: 'asc' }, { matchDate: 'asc' }]
  });
  console.log(JSON.stringify(matches.map(m => ({
    id: m.id, rn: m.roundName, st: m.status, hs: m.homeScore, as: m.awayScore,
    h: m.homeTeam?.name, a: m.awayTeam?.name, ht: m.homeTeamId, at: m.awayTeamId
  })), null, 2));
  await p.$disconnect();
}

main().catch(e => { console.error(e.message); p.$disconnect(); });
