import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const teamId = params.id;

  if (!teamId) {
    return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })
  }

  try {
    // 1. Obtener miembros locales
    const localMembers = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { number: 'asc' },
    })

    // 2. Obtener miembros globales vinculados mediante TeamPlayer
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { teamId },
      include: {
        player: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    })

    const formattedLocal = localMembers.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      name: m.name,
      role: m.role,
      number: m.number,
      phone: m.phone,
      isActive: m.isActive,
      isGlobal: false,
    }))

    const formattedGlobal = teamPlayers.map((tp) => ({
      id: tp.id,
      teamId: tp.teamId,
      name: tp.player.user.name,
      role: 'PLAYER',
      number: tp.number,
      phone: tp.player.user.phone,
      isActive: tp.isActive,
      isGlobal: true,
      playerId: tp.playerId,
      dni: tp.player.dni,
    }))

    const combined = [...formattedLocal, ...formattedGlobal]
    
    // Ordenar por número si existe, o alfabéticamente
    combined.sort((a, b) => {
      if (a.number !== null && b.number !== null) return a.number - b.number
      if (a.number !== null) return -1
      if (b.number !== null) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json(combined)
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Error al obtener miembros' }, { status: 500 })
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
    const body = await request.json()
    const { name, role, number, phone, dni, dateOfBirth } = body
    const teamId = params.id

    if (!teamId || !name) {
      return NextResponse.json({ error: 'teamId y name requeridos' }, { status: 400 })
    }

    if (dni && dni.trim()) {
      const cleanDni = dni.trim()

      const existingProfile = await prisma.playerProfile.findUnique({
        where: { dni: cleanDni },
      })

      if (existingProfile) {
        const existingLink = await prisma.teamPlayer.findFirst({
          where: { teamId, playerId: existingProfile.id },
        })
        if (existingLink) {
          return NextResponse.json({ error: 'Este jugador ya está registrado en el equipo' }, { status: 400 })
        }

        const teamPlayer = await prisma.teamPlayer.create({
          data: {
            teamId,
            playerId: existingProfile.id,
            number: number ? parseInt(number) : null,
          },
        })

        await prisma.playerTransfer.create({
          data: {
            playerId: existingProfile.id,
            toTeamId: teamId,
          },
        })

        return NextResponse.json({
          id: teamPlayer.id,
          teamId,
          name,
          role: 'PLAYER',
          number: number || null,
          phone: null,
          isActive: true,
          isGlobal: true,
          playerId: existingProfile.id,
          dni: existingProfile.dni,
        }, { status: 201 })
      }

      const randomId = crypto.randomUUID()
      const finalBirthDate = dateOfBirth ? new Date(dateOfBirth) : new Date('2000-01-01')

      const user = await prisma.user.create({
        data: {
          email: `player_${randomId}@copadepor.local`,
          password: 'placeholder',
          name,
          role: 'PLAYER',
        },
      })

      const playerProfile = await prisma.playerProfile.create({
        data: {
          userId: user.id,
          dni: cleanDni,
          dateOfBirth: finalBirthDate,
        },
      })

      const teamPlayer = await prisma.teamPlayer.create({
        data: {
          teamId,
          playerId: playerProfile.id,
          number: number ? parseInt(number) : null,
        },
      })

      await prisma.playerTransfer.create({
        data: {
          playerId: playerProfile.id,
          toTeamId: teamId,
        },
      })

      return NextResponse.json({
        id: teamPlayer.id,
        teamId,
        name,
        role: 'PLAYER',
        number: number || null,
        phone: null,
        isActive: true,
        isGlobal: true,
        playerId: playerProfile.id,
        dni: playerProfile.dni,
      }, { status: 201 })
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        name,
        role: role || 'PLAYER',
        number: number || null,
        phone: phone || null,
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Create member error:', error)
    return NextResponse.json({ error: 'Error al crear miembro' }, { status: 500 })
  }
}