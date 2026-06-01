import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePathArray = params.path
    if (!filePathArray || filePathArray.length === 0) {
      return NextResponse.json({ error: 'Ruta no válida' }, { status: 400 })
    }

    // Resolve absolute path to the uploaded file
    const relativePath = path.join(...filePathArray)
    const absolutePath = path.join(process.cwd(), 'public', 'uploads', relativePath)

    // Read file from disk
    const fileBuffer = await readFile(absolutePath)
    
    // Get extension and content-type
    const ext = path.extname(absolutePath)
    const contentType = getContentType(ext)

    // Return the file buffer with correct header
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('File serving error:', error)
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }
}
