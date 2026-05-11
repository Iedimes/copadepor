import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id
  try {
    await prisma.phase.deleteMany({
      where: { tournamentId, name: 'Fase de Prueba Empates' }
    });
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
