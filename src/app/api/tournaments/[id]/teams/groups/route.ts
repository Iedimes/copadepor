import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { numGroups, seedTeamIds } = await request.json()

    if (!numGroups || numGroups < 1) {
      return NextResponse.json({ error: 'Número de grupos inválido' }, { status: 400 })
    }

    const allTournamentTeams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: params.id },
    })

    if (allTournamentTeams.length < numGroups) {
      return NextResponse.json({ error: 'No hay suficientes equipos para esa cantidad de grupos' }, { status: 400 })
    }

    // Prepare groups
    const groups: string[] = []
    for (let i = 0; i < numGroups; i++) {
      groups.push(String.fromCharCode(65 + i)) // A, B, C...
    }

    // Separate seeds and others
    const seeds = allTournamentTeams.filter(tt => seedTeamIds.includes(tt.teamId))
    const others = allTournamentTeams.filter(tt => !seedTeamIds.includes(tt.teamId))

    // Shuffle others
    const shuffledOthers = [...others].sort(() => Math.random() - 0.5)

    // Transaction to update groups
    await prisma.$transaction(async (tx) => {
      // Clear existing groups first? Or just overwrite?
      // User says "realiza el sorteo", so we overwrite.
      
      // Assign seeds (round robin to groups)
      for (let i = 0; i < seeds.length; i++) {
        const groupIndex = i % numGroups
        await tx.$executeRawUnsafe(
          'UPDATE TournamentTeam SET groupName = ? WHERE id = ?',
          groups[groupIndex],
          seeds[i].id
        )
      }

      // Assign others
      let currentGroupIdx = seeds.length % numGroups
      for (const tt of shuffledOthers) {
        await tx.$executeRawUnsafe(
          'UPDATE TournamentTeam SET groupName = ? WHERE id = ?',
          groups[currentGroupIdx],
          tt.id
        )
        currentGroupIdx = (currentGroupIdx + 1) % numGroups
      }
    })

    return NextResponse.json({ message: 'Sorteo de grupos realizado con éxito' })
  } catch (error) {
    console.error('Group draw error:', error)
    return NextResponse.json({ error: 'Error al realizar el sorteo: ' + (error as Error).message }, { status: 500 })
  }
}
