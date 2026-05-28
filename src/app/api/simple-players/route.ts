import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const simplePlayerSchema = z.object({
  name: z.string().min(2),
  dni: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  allowAgeException: z.boolean().optional().default(false),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

async function validatePlayerAgeForTeam(
  birthDate: Date,
  teamId: string,
  allowAgeException: boolean
) {
  // Buscar las categorías a las que pertenece el equipo en Torneos
  const tournamentTeams = await prisma.tournamentTeam.findMany({
    where: { teamId },
    include: {
      category: true,
      tournament: true,
    },
  })

  const age = calculateAge(birthDate)

  for (const tt of tournamentTeams) {
    const category = tt.category
    if (!category) continue

    // Validar edad mínima
    if (category.minAge && age < category.minAge) {
      if (!allowAgeException) {
        return {
          valid: false,
          error: `El jugador tiene ${age} años, pero la categoría "${category.name}" del torneo "${tt.tournament.name}" requiere un mínimo de ${category.minAge} años. ¿Deseas aplicar un caso excepcional de menor de edad?`,
          isMinAgeError: true,
        }
      }
    }

    // Validar edad máxima
    if (category.maxAge && age > category.maxAge) {
      return {
        valid: false,
        error: `El jugador tiene ${age} años, pero la categoría "${category.name}" del torneo "${tt.tournament.name}" requiere un máximo de ${category.maxAge} años.`,
        isMinAgeError: false,
      }
    }
  }

  return { valid: true }
}

export async function GET(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    // 1. Obtener todos los perfiles de jugadores globales con su historial de transferencias
    const players = await prisma.playerProfile.findMany({
      include: {
        user: { select: { name: true } },
        teamPlayers: {
          include: {
            team: { select: { id: true, name: true, color: true } },
          },
        },
        transfers: {
          include: {
            fromTeam: { select: { id: true, name: true } },
            toTeam: { select: { id: true, name: true } },
          },
          orderBy: {
            transferredAt: 'desc',
          },
        },
      },
      orderBy: {
        user: { name: 'asc' },
      },
    })

    // 2. Obtener todos los miembros locales con rol de jugador de los equipos del mánager
    const localMembers = await prisma.teamMember.findMany({
      where: {
        role: 'PLAYER',
        team: {
          managerId: payload.userId,
        },
      },
      include: {
        team: { select: { id: true, name: true, color: true } },
      },
    })

    const formattedGlobal = players.map((p) => {
      const activeTeamPlayer = p.teamPlayers[0]
      return {
        id: p.id,
        name: p.user.name,
        dni: p.dni,
        dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
        age: calculateAge(p.dateOfBirth),
        isGlobal: true,
        team: activeTeamPlayer ? {
          id: activeTeamPlayer.team.id,
          name: activeTeamPlayer.team.name,
          color: activeTeamPlayer.team.color || '#3b82f6',
        } : null,
        transfers: p.transfers.map((t) => ({
          id: t.id,
          fromTeam: t.fromTeam ? { id: t.fromTeam.id, name: t.fromTeam.name } : null,
          toTeam: t.toTeam ? { id: t.toTeam.id, name: t.toTeam.name } : null,
          transferredAt: t.transferredAt.toISOString(),
        })),
      }
    })

    const formattedLocal = localMembers.map((m) => {
      return {
        id: m.id,
        name: m.name,
        dni: 'Sin documento',
        dateOfBirth: 'Sin fecha',
        age: 0,
        isGlobal: false,
        team: m.team ? {
          id: m.team.id,
          name: m.team.name,
          color: m.team.color || '#3b82f6',
        } : null,
        transfers: [],
      }
    })

    const combined = [...formattedGlobal, ...formattedLocal]
    combined.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(combined)
  } catch (error) {
    console.error('Get simple players error:', error)
    return NextResponse.json({ error: 'Error al obtener jugadores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = simplePlayerSchema.parse(body)

    const randomId = crypto.randomUUID()
    const finalDni = validated.dni?.trim() || `DNI_${randomId}`
    const finalBirthDate = validated.dateOfBirth ? new Date(validated.dateOfBirth) : new Date('2000-01-01')

    // Validar DNI único
    const existingDni = await prisma.playerProfile.findUnique({
      where: { dni: finalDni }
    })
    if (existingDni) {
      return NextResponse.json({ error: 'Ya existe un jugador con este documento de identidad.' }, { status: 400 })
    }

    // Si se especificó un equipo, realizar validación de edad
    if (validated.teamId) {
      const ageCheck = await validatePlayerAgeForTeam(
        finalBirthDate,
        validated.teamId,
        validated.allowAgeException
      )
      if (!ageCheck.valid) {
        return NextResponse.json({ 
          error: ageCheck.error, 
          isMinAgeError: ageCheck.isMinAgeError,
          ageValidationFailed: true 
        }, { status: 400 })
      }
    }

    // Crear el usuario
    const user = await prisma.user.create({
      data: {
        email: `player_${randomId}@copadepor.local`,
        password: 'placeholder',
        name: validated.name,
        role: 'PLAYER',
      },
    })

    // Crear el perfil de jugador
    const playerProfile = await prisma.playerProfile.create({
      data: {
        userId: user.id,
        dni: finalDni,
        dateOfBirth: finalBirthDate,
      },
    })

    // Si se especificó equipo, agregarlo en TeamPlayer y registrar en el historial
    if (validated.teamId) {
      await prisma.teamPlayer.create({
        data: {
          teamId: validated.teamId,
          playerId: playerProfile.id,
        },
      })

      // Registrar transferencia inicial
      await prisma.playerTransfer.create({
        data: {
          playerId: playerProfile.id,
          fromTeamId: null,
          toTeamId: validated.teamId,
        },
      })
    }

    return NextResponse.json({
      id: playerProfile.id,
      name: validated.name,
      dni: finalDni,
      dateOfBirth: finalBirthDate.toISOString().split('T')[0],
      age: calculateAge(finalBirthDate),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create player error:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: 'Error al crear jugador: ' + message }, { status: 500 })
  }
}