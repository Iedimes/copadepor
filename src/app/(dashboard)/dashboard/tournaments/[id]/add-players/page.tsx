'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface TeamMember {
  id: string
  teamId: string
  name: string
  role: string
  number: number | null
  phone: string | null
  isActive: boolean
}

interface ModalData {
  member: TeamMember
  mode: 'edit' | 'add'
}

export default function AddPlayersPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalData | null>(null)
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<'PLAYER' | 'COACH' | 'ASSISTANT' | 'TECHNICAL'>('PLAYER')
  const inputRef = useRef<HTMLInputElement>(null)

  const tournamentId = params.id as string
  const teamId = searchParams.get('teamId') || ''
  const teamName = decodeURIComponent(searchParams.get('teamName') || 'Equipo')

  useEffect(() => {
    if (teamId) {
      fetchMembers()
    }
  }, [teamId])

  const fetchMembers = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`/api/teams/${teamId}/members?teamId=${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setMembers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
    setLoading(false)
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) return

    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/teams/${teamId}/members?teamId=${teamId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMemberName,
          role: 'PLAYER',
          teamId: teamId,
        }),
      })

      if (res.ok) {
        setNewMemberName('')
        fetchMembers()
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Error al agregar jugador')
    }
    setSaving(false)
    // Enfocar el input después de que todo termine
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleGoBack = () => {
    router.push(`/dashboard/tournaments/${tournamentId}/add-teams`)
  }

  const handleOpenModal = (member: TeamMember, mode: 'edit' | 'add') => {
    setModal({ member, mode })
    setEditName(member.name)
    setEditNumber(member.number?.toString() || '')
    setEditPhone(member.phone || '')
    setEditRole(member.role as 'PLAYER' | 'COACH' | 'ASSISTANT' | 'TECHNICAL')
  }

  const handleCloseModal = () => {
    setModal(null)
  }

  const handleSaveModal = async () => {
    if (!modal || !editName.trim()) return

    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      await fetch(`/api/teams/${teamId}/members/${modal.member.id}?teamId=${teamId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: modal.member.id,
          name: editName,
          number: editNumber ? parseInt(editNumber) : null,
          phone: editPhone || null,
          role: editRole,
        }),
      })

      setModal(null)
      fetchMembers()
    } catch (error) {
      console.error('Error saving member:', error)
      alert('Error al guardar')
    }
    setSaving(false)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('¿Eliminar este jugador?')) return

    const token = localStorage.getItem('token')

    try {
      await fetch(`/api/teams/${teamId}/members/${memberId}?teamId=${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      fetchMembers()
    } catch (error) {
      console.error('Error deleting member:', error)
      alert('Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center gap-4">
        <button onClick={handleGoBack} className="text-blue-600 hover:text-blue-800">
          ← Volver
        </button>
        <div>
          <h1 className="text-xl font-bold">Agregar Jugadores</h1>
          <p className="text-sm text-gray-500">Equipo: {teamName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        {/* Formulario para agregar jugador */}
        <form onSubmit={handleAddMember} className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Nuevo Jugador</h2>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Nombre del jugador (Enter para agregar)"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={saving || !newMemberName.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>

        {/* Lista de jugadores */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Jugadores Agregados ({members.length})</h2>

          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No hay jugadores agregados aún
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleOpenModal(member, 'edit')}
                >
                  <div className="flex items-center gap-3">
                    {member.number && (
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-full text-sm">
                        {member.number}
                      </span>
                    )}
                    <div>
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {member.role === 'PLAYER' ? 'Jugador' : member.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteMember(member.id)
                    }}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón Volver */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGoBack}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            ✓ Volver a Equipos
          </button>
        </div>
      </div>

      {/* Modal para editar jugador */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Editar Jugador</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número
                </label>
                <input
                  type="number"
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  placeholder="Ej: 10"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ej: 300 123 4567"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option value="PLAYER">Jugador</option>
                  <option value="COACH">Entrenador</option>
                  <option value="ASSISTANT">Asistente</option>
                  <option value="TECHNICAL">Cuerpo Técnico</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveModal}
                disabled={saving || !editName.trim()}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 py-3 border rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}