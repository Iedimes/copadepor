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
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [role, setRole] = useState<'PLAYER' | 'COACH' | 'ASSISTANT' | 'TECHNICAL'>('PLAYER')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalData | null>(null)
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<'PLAYER' | 'COACH' | 'ASSISTANT' | 'TECHNICAL'>('PLAYER')
  const nameRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setAdding(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/teams/${teamId}/members?teamId=${teamId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          number: number ? parseInt(number) : null,
          role,
          teamId: teamId,
        }),
      })

      if (res.ok) {
        setName('')
        setNumber('')
        setRole('PLAYER')
        fetchMembers()
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Error al agregar jugador')
    }
    setAdding(false)
    setTimeout(() => nameRef.current?.focus(), 100)
  }

  const handleGoBack = () => {
    router.push(`/tournaments/${tournamentId}/add-teams`)
  }

  const handleOpenModal = (member: TeamMember) => {
    setModal({ member, mode: 'edit' })
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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <button onClick={handleGoBack} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-blue-600 transition">← Volver</button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Plantilla de {teamName}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión de jugadores y cuerpo técnico</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl text-xs font-black">
          {members.length} REGISTRADOS
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Columna Izquierda: Formulario */}
          <div className="w-full md:w-1/3">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100 sticky top-28">
              <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Añadir Integrante</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nombre</label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Número</label>
                    <input
                      type="number"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="10"
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Rol</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    >
                      <option value="PLAYER">Jugador</option>
                      <option value="COACH">Entrenador</option>
                      <option value="ASSISTANT">Asistente</option>
                      <option value="TECHNICAL">Técnico</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={adding || !name.trim()}
                  className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest active:scale-[0.98] disabled:opacity-50"
                >
                  {adding ? 'Registrando...' : 'Añadir a Plantilla'}
                </button>
              </form>
            </div>
          </div>

          {/* Columna Derecha: Lista */}
          <div className="flex-1">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100 min-h-[600px]">
              <div className="flex justify-between items-center mb-8 px-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Plantilla Oficial</h2>
              </div>

              {loading ? (
                <div className="p-10 text-center text-slate-300 font-bold italic animate-pulse">Cargando...</div>
              ) : members.length === 0 ? (
                <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic">
                  No hay jugadores registrados
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handleOpenModal(member)}
                      className="group p-5 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-xl transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${member.role === 'PLAYER' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {member.number || member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-black text-slate-800 uppercase tracking-tight">{member.name}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{member.role}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMember(member.id); }}
                        className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para editar */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tight">Editar Integrante</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nombre</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border border-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Número</label>
                  <input type="number" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border border-slate-100" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Rol</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value as any)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border border-slate-100">
                    <option value="PLAYER">Jugador</option><option value="COACH">Entrenador</option><option value="ASSISTANT">Asistente</option><option value="TECHNICAL">Técnico</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={handleCloseModal} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
              <button onClick={handleSaveModal} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}