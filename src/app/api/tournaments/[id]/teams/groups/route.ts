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

    const { numGroups, seedTeamIds, continueFromId, categoryId } = await request.json()

    if (numGroups === undefined || numGroups === null || numGroups < 0) {
      return NextResponse.json({ error: 'Número de grupos inválido' }, { status: 400 })
    }

    // numGroups === 0 means "remove all groups"
    if (numGroups === 0) {
      await prisma.$transaction(async (tx) => {
        // Clear groupNames on teams
        const teamClearWhere: any = { tournamentId: params.id }
        if (categoryId) {
          teamClearWhere.categoryId = categoryId
        }
        await tx.tournamentTeam.updateMany({
          where: teamClearWhere,
          data: { groupName: null }
        })

        // Find phases starting with "Grupo "
        const groupPhases = await tx.phase.findMany({
          where: {
            tournamentId: params.id,
            name: { startsWith: 'Grupo ' },
            ...(categoryId ? { categoryId } : {})
          }
        })
        const groupPhaseIds = groupPhases.map(p => p.id)
        const groupPhaseNames = groupPhases.map(p => p.name)

        if (groupPhaseIds.length > 0) {
          // Delete matches associated with these phases
          await tx.match.deleteMany({
            where: {
              tournamentId: params.id,
              OR: [
                { phaseId: { in: groupPhaseIds } },
                { phaseName: { in: groupPhaseNames } }
              ]
            }
          })

          // Delete the phases themselves
          await tx.phase.deleteMany({
            where: {
              id: { in: groupPhaseIds }
            }
          })
        }
      })
      return NextResponse.json({ message: 'Grupos eliminados correctamente' })
    }

    const tournamentTeamWhere: any = { tournamentId: params.id }
    if (categoryId) {
      tournamentTeamWhere.categoryId = categoryId
    }
    const allTournamentTeams = await prisma.tournamentTeam.findMany({
      where: tournamentTeamWhere,
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

    // Map to collect which teams (by teamId) go to which group letter
    const groupTeams: Record<string, string[]> = {}
    for (let i = 0; i < numGroups; i++) {
      groupTeams[groups[i]] = []
    }

    // Assign seeds (round robin to groups)
    for (let i = 0; i < seeds.length; i++) {
      const groupIndex = i % numGroups
      groupTeams[groups[groupIndex]].push(seeds[i].teamId)
    }

    // Assign others
    let currentGroupIdx = seeds.length % numGroups
    for (const tt of shuffledOthers) {
      groupTeams[groups[currentGroupIdx]].push(tt.teamId)
      currentGroupIdx = (currentGroupIdx + 1) % numGroups
    }

    // Transaction to update groups and phases
    await prisma.$transaction(async (tx) => {
      // 1. Assign groupName to each team in DB
      for (const groupLetter of groups) {
        const teamIds = groupTeams[groupLetter]
        if (teamIds.length > 0) {
          const teamUpdateWhere: any = {
            tournamentId: params.id,
            teamId: { in: teamIds }
          }
          if (categoryId) {
            teamUpdateWhere.categoryId = categoryId
          }
          await tx.tournamentTeam.updateMany({
            where: teamUpdateWhere,
            data: {
              groupName: groupLetter
            }
          })
        }
      }

      // 2. Find and delete existing phases starting with "Grupo "
      const existingGroupPhases = await tx.phase.findMany({
        where: {
          tournamentId: params.id,
          name: { startsWith: 'Grupo ' },
          ...(categoryId ? { categoryId } : {})
        }
      })
      const groupPhaseIds = existingGroupPhases.map(p => p.id)
      const groupPhaseNames = existingGroupPhases.map(p => p.name)

      if (groupPhaseIds.length > 0) {
        await tx.match.deleteMany({
          where: {
            tournamentId: params.id,
            OR: [
              { phaseId: { in: groupPhaseIds } },
              { phaseName: { in: groupPhaseNames } }
            ]
          }
        })

        await tx.phase.deleteMany({
          where: {
            id: { in: groupPhaseIds }
          }
        })
      }

      // 3. Create a Phase for each group A, B, C...
      for (let i = 0; i < numGroups; i++) {
        const groupLetter = groups[i]
        const phaseName = `Grupo ${groupLetter}`
        const teamIds = groupTeams[groupLetter]

        await tx.phase.create({
          data: {
            tournamentId: params.id,
            name: phaseName,
            type: 'LIGA',
            isClassification: true,
            order: i,
            teams: JSON.stringify(teamIds),
            continueFromId: continueFromId || null,
            ...(categoryId ? { categoryId } : {})
          }
        })
      }
    })

    return NextResponse.json({ message: 'Sorteo de grupos realizado con éxito y fases automáticas creadas' })
  } catch (error) {
    console.error('Group draw error:', error)
    return NextResponse.json({ error: 'Error al realizar el sorteo: ' + (error as Error).message }, { status: 500 })
  }
}
