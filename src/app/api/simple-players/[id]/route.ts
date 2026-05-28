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

    let player = await prisma.playerProfile.findUnique({
      where: { id: params.id },
      include: {
        teamPlayers: true,
      },
    })

    if (!player) {
      // Intentar buscar en TeamMember local
      const localMember = await prisma.teamMember.findUnique({
        where: { id: params.id },
        include: { team: true },
      })

      if (!localMember || localMember.role !== 'PLAYER') {
        return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
      }

      // Si es local y se especificó un Documento de Identidad y fecha de nacimiento reales, promocionar a global:
      if (
        validated.dni &&
        validated.dni.trim() !== '' &&
        validated.dni.trim() !== 'Sin documento' &&
        validated.dateOfBirth &&
        validated.dateOfBirth.trim() !== '' &&
        validated.dateOfBirth.trim() !== 'Sin fecha'
      ) {
        const finalDni = validated.dni.trim()
        const finalBirthDate = new Date(validated.dateOfBirth)

        // Validar DNI único
        const existingDni = await prisma.playerProfile.findUnique({
          where: { dni: finalDni }
        })
        if (existingDni) {
          return NextResponse.json({ error: 'Ya existe un jugador con este documento de identidad.' }, { status: 400 })
        }

        // Validar edad con el equipo de destino
        const targetTeamId = validated.teamId || localMember.teamId
        if (targetTeamId) {
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

        // Crear User + PlayerProfile + TeamPlayer
        const randomId = crypto.randomUUID()
        const user = await prisma.user.create({
          data: {
            email: `player_${randomId}@copadepor.local`,
            password: 'placeholder',
            name: validated.name,
            role: 'PLAYER',
          },
        })

        const playerProfile = await prisma.playerProfile.create({
          data: {
            userId: user.id,
            dni: finalDni,
            dateOfBirth: finalBirthDate,
          },
        })

        if (targetTeamId) {
          await prisma.teamPlayer.create({
            data: {
              teamId: targetTeamId,
              playerId: playerProfile.id,
            },
          })

          // Registrar en el historial de transferencias
          await prisma.playerTransfer.create({
            data: {
              playerId: playerProfile.id,
              fromTeamId: null,
              toTeamId: targetTeamId,
            },
          })
        }

        // Eliminar el TeamMember local original
        await prisma.teamMember.delete({
          where: { id: localMember.id },
        })

        return NextResponse.json({ id: playerProfile.id, name: validated.name, promoted: true })
      } else {
        // Solo actualizar el nombre o equipo del miembro local (sigue siendo local)
        const targetTeamId = validated.teamId || localMember.teamId
        await prisma.teamMember.update({
          where: { id: localMember.id },
          data: {
            name: validated.name,
            teamId: targetTeamId || localMember.teamId,
          },
        })

        return NextResponse.json({ id: localMember.id, name: validated.name, promoted: false })
      }
    }

    const finalDni = validated.dni?.trim() || player.dni
    const finalBirthDate = validated.dateOfBirth ? new Date(validated.dateOfBirth) : player.dateOfBirth

    // Validar DNI único si cambia
    if (finalDni !== player.dni) {
      const existingDni = await prisma.playerProfile.findUnique({
        where: { dni: finalDni }
      })
      if (existingDni) {
        return NextResponse.json({ error: 'Ya existe un jugador con este documento de identidad.' }, { status: 400 })
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

    // Actualizar equipo (transferencia) y registrar en el historial
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

      // Registrar transferencia en el historial
      await prisma.playerTransfer.create({
        data: {
          playerId: params.id,
          fromTeamId: currentTeamId,
          toTeamId: targetTeamId,
        },
      })
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
      // Intentar buscar en TeamMember local
      const localMember = await prisma.teamMember.findUnique({
        where: { id: params.id },
      })

      if (localMember && localMember.role === 'PLAYER') {
        await prisma.teamMember.delete({
          where: { id: params.id },
        })
        return NextResponse.json({ success: true })
      }

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