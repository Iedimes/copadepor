import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const teamSchema = z.object({
  teamId: z.string(),
  categoryId: z.string().optional().nullable(),
  clone: z.boolean().optional().default(false),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    let query = `
      SELECT tt.*, t.name as teamName, t.id as teamIdReal, t.logo as teamLogo, t.color as teamColor, t.parentTeamId as teamParentTeamId
      FROM TournamentTeam tt
      JOIN Team t ON tt.teamId = t.id
      WHERE tt.tournamentId = ?
    `
    const queryParams: any[] = [params.id]
    if (categoryId && categoryId !== 'null' && categoryId !== 'undefined' && categoryId.trim() !== '') {
      query += ' AND tt.categoryId = ?'
      queryParams.push(categoryId)
    }

    const teams: any = await prisma.$queryRawUnsafe(query, ...queryParams)

    const formattedTeams = teams.map((tt: any) => ({
      id: tt.id,
      tournamentId: tt.tournamentId,
      teamId: tt.teamId,
      groupName: tt.groupName,
      order: tt.order,
      registeredAt: tt.registeredAt,
      status: tt.status,
      categoryId: tt.categoryId,
      team: {
        id: tt.teamIdReal,
        name: tt.teamName,
        logo: tt.teamLogo || null,
        color: tt.teamColor || null,
        parentTeamId: tt.teamParentTeamId || null,
      }
    }))

    return NextResponse.json(formattedTeams)
  } catch (error) {
    console.error('Get tournament teams error:', error)
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const validated = teamSchema.parse(body)

    let finalTeamId = validated.teamId

    // Si se especificó clonar, duplicar el equipo y todos sus integrantes
    if (validated.clone) {
      const originalTeam = await prisma.team.findUnique({
        where: { id: validated.teamId },
        include: {
          teamMembers: true,
          players: true,
        },
      })

      if (!originalTeam) {
        return NextResponse.json({ error: 'El equipo original no existe' }, { status: 404 })
      }

      // Crear nuevo equipo duplicado
      const clonedTeam = await prisma.team.create({
        data: {
          name: originalTeam.name,
          logo: originalTeam.logo,
          color: originalTeam.color,
          coach: originalTeam.coach,
          managerId: payload.userId,
          parentTeamId: originalTeam.id,
        },
      })

      // Duplicar integrantes del cuerpo técnico/locales
      if (originalTeam.teamMembers.length > 0) {
        await prisma.teamMember.createMany({
          data: originalTeam.teamMembers.map((m) => ({
            teamId: clonedTeam.id,
            name: m.name,
            role: m.role,
            number: m.number,
            phone: m.phone,
            isActive: m.isActive,
          })),
        })
      }

      // Duplicar enlaces a jugadores globales (TeamPlayer)
      if (originalTeam.players.length > 0) {
        await prisma.teamPlayer.createMany({
          data: originalTeam.players.map((p) => ({
            teamId: clonedTeam.id,
            playerId: p.playerId,
            number: p.number,
            isCaptain: p.isCaptain,
            isActive: p.isActive,
          })),
        })
      }

      finalTeamId = clonedTeam.id
    }

    const existing = await prisma.tournamentTeam.findFirst({
      where: { 
        tournamentId: params.id, 
        teamId: finalTeamId,
        ...(validated.categoryId && { categoryId: validated.categoryId })
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'El equipo ya está registrado en esta categoría' }, { status: 400 })
    }

    const tournamentTeam = await prisma.tournamentTeam.create({
      data: {
        tournamentId: params.id,
        teamId: finalTeamId,
        categoryId: validated.categoryId || null,
      },
      include: {
        team: true,
      },
    })

    return NextResponse.json(tournamentTeam, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Add team error:', error)
    return NextResponse.json({ error: 'Error al agregar equipo' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { action, teamOrders } = body

    if (action === 'reorder') {
      // Validar que el usuario sea el organizador
      const tournament = await prisma.tournament.findUnique({
        where: { id: params.id },
      })

      if (!tournament || tournament.organizerId !== payload.userId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }

      await Promise.all(
        teamOrders.map((to: { id: string, order: number }) =>
          prisma.$executeRawUnsafe(
            'UPDATE TournamentTeam SET `order` = ? WHERE id = ?',
            to.order, to.id
          )
        )
      )

      return NextResponse.json({ success: true })
    }

    if (action === 'syncroster') {
      const { teamId } = body

      const cloneTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: { teamMembers: true, players: true },
      })

      if (!cloneTeam || !cloneTeam.parentTeamId) {
        return NextResponse.json({ error: 'El equipo no es un clon o no existe' }, { status: 400 })
      }

      const originalTeam = await prisma.team.findUnique({
        where: { id: cloneTeam.parentTeamId },
        include: { teamMembers: true, players: true },
      })

      if (!originalTeam) {
        return NextResponse.json({ error: 'El equipo original no existe' }, { status: 404 })
      }

      // Sincronizar TeamMember (local): actualizar existentes, agregar nuevos
      for (const originalMember of originalTeam.teamMembers) {
        const existing = cloneTeam.teamMembers.find(
          (m) => m.name.toLowerCase() === originalMember.name.toLowerCase()
        )

        if (existing) {
          await prisma.teamMember.update({
            where: { id: existing.id },
            data: {
              name: originalMember.name,
              role: originalMember.role,
              number: originalMember.number,
              isActive: originalMember.isActive,
            },
          })
        } else {
          await prisma.teamMember.create({
            data: {
              teamId: cloneTeam.id,
              name: originalMember.name,
              role: originalMember.role,
              number: originalMember.number,
              phone: originalMember.phone,
              isActive: originalMember.isActive,
            },
          })
        }
      }

      // Sincronizar TeamPlayer (global): actualizar existentes por playerId, agregar nuevos
      for (const originalPlayer of originalTeam.players) {
        const existing = cloneTeam.players.find(
          (p) => p.playerId === originalPlayer.playerId
        )

        if (existing) {
          await prisma.teamPlayer.update({
            where: { id: existing.id },
            data: {
              number: originalPlayer.number,
              isCaptain: originalPlayer.isCaptain,
              isActive: originalPlayer.isActive,
            },
          })
        } else {
          await prisma.teamPlayer.create({
            data: {
              teamId: cloneTeam.id,
              playerId: originalPlayer.playerId,
              number: originalPlayer.number,
              isCaptain: originalPlayer.isCaptain,
              isActive: originalPlayer.isActive,
            },
          })
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Update teams error details:', error)
    return NextResponse.json({ 
      error: 'Error al actualizar equipos', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
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
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })
    }

    // Validar que el usuario sea el organizador del torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Eliminar la asociación del equipo con el torneo en la tabla TournamentTeam
    await prisma.tournamentTeam.deleteMany({
      where: {
        tournamentId: params.id,
        teamId: teamId,
      },
    })

    // Limpieza de clones huérfanos: Si el equipo ya no participa en ningún otro torneo o categoría, lo eliminamos de forma definitiva de la base de datos para no saturar el panel principal
    try {
      const otherAssociations = await prisma.tournamentTeam.findFirst({
        where: {
          teamId: teamId,
        },
      })

      if (!otherAssociations) {
        // Eliminar cascada de roster local y global, luego el equipo en sí
        await prisma.teamPlayer.deleteMany({ where: { teamId } })
        await prisma.teamMember.deleteMany({ where: { teamId } })
        await prisma.team.delete({ where: { id: teamId } })
      }
    } catch (cleanError) {
      console.warn('No se pudo borrar el registro del equipo por dependencias activas (ej: fixture generado), se mantiene la integridad referencial.', cleanError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete tournament team error:', error)
    return NextResponse.json({ error: 'Error al eliminar el equipo del torneo' }, { status: 500 })
  }
}