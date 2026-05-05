import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const deleted = await prisma.match.deleteMany({
    where: {
      phaseName: '2° Fase'
    }
  })
  console.log(`Eliminados ${deleted.count} partidos de la 2° Fase.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
