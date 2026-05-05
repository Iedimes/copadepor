const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const deleted = await prisma.match.deleteMany({
    where: {
      phaseName: {
        in: ['2° Fase', 'Segunda Fase']
      }
    }
  })
  console.log(`Eliminados ${deleted.count} partidos de la segunda fase.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
