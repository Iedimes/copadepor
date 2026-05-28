import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updatePlayerSchema = z.object({
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

    if (category.minAge && age < category.minAge) {
      if (!allowAgeException) {
        return {
          valid: false,
          error: `El jugador tiene ${age} años, pero la categoría "${category.name}" del torneo "${tt.tournament.name}" requiere un mínimo de ${category.minAge} años. ¿Deseas aplicar un caso excepcional de menor de edad?`,
          isMinAgeError: true,
        }
      }
    }

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const validated = updatePlayerSchema.parse(body)

    const player = await prisma.playerProfile.findUnique({
      where: { id: params.id },
      include: {
        teamPlayers: true,
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    const finalDni = validated.dni?.trim() || player.dni
    const finalBirthDate = validated.dateOfBirth ? new Date(validated.dateOfBirth) : player.dateOfBirth

    // Validar DNI único si cambia
    if (finalDni !== player.dni) {
      const existingDni = await prisma.playerProfile.findUnique({
        where: { dni: finalDni }
      })
      if (existingDni) {
        return NextResponse.json({ error: 'Ya existe un jugador con este DNI.' }, { status: 400 })
      }
    }

    // Validar transferencia y edad
    const currentTeamId = player.teamPlayers[0]?.teamId || null
    const targetTeamId = validated.teamId || null

    if (targetTeamId && targetTeamId !== currentTeamId) {
      const ageCheck = await validatePlayerAgeForTeam(
        finalBirthDate,
        targetTeamId,
        validated.allowAgeException
      )
      if (!ageCheck.valid) {
        return NextResponse.json({
          error: ageCheck.error,
          isMinAgeError: ageCheck.isMinAgeError,
          ageValidationFailed: true,
        }, { status: 400 })
      }
    }

    // Actualizar nombre de usuario
    await prisma.user.update({
      where: { id: player.userId },
      data: { name: validated.name },
    })

    // Actualizar perfil
    await prisma.playerProfile.update({
      where: { id: params.id },
      data: {
        dni: finalDni,
        dateOfBirth: finalBirthDate,
      },
    })

    // Actualizar equipo (transferencia)
    if (targetTeamId !== currentTeamId) {
      // Eliminar relaciones anteriores
      await prisma.teamPlayer.deleteMany({
        where: { playerId: params.id },
      })

      // Agregar nueva relación si se especificó
      if (targetTeamId) {
        await prisma.teamPlayer.create({
          data: {
            teamId: targetTeamId,
            playerId: params.id,
          },
        })
      }
    }

    return NextResponse.json({ id: params.id, name: validated.name })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update player error:', error)
    return NextResponse.json({ error: 'Error al actualizar jugador' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const player = await prisma.playerProfile.findUnique({
      where: { id: params.id },
    })

    if (!player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    await prisma.teamPlayer.deleteMany({
      where: { playerId: params.id },
    })

    await prisma.playerProfile.delete({
      where: { id: params.id },
    })

    await prisma.user.delete({
      where: { id: player.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete player error:', error)
    return NextResponse.json({ error: 'Error al eliminar jugador' }, { status: 500 })
  }
}