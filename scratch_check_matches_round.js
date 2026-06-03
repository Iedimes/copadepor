const { PrismaClient } = require('./src/lib/generated');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: { tournamentId: 'cmoa7jkju00018ln0j219o42z', roundName: '8' },
    select: { id: true, categoryId: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } }
  });
  console.log(JSON.stringify(matches, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
