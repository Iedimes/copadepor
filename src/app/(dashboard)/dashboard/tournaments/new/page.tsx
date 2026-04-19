'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function NewTournamentPage() {
  const searchParams = useSearchParams()
  const tournamentType = searchParams.get('type') || 'single'
  const selectedSport = searchParams.get('sport') || 'FUTBOL_11'
  const tournamentFormat = searchParams.get('format') || 'todos_contra_todos'
  const sportName = searchParams.get('name') || ''
  
  const [form, setForm] = useState({
    name: sportName ? `${sportName} ${new Date().getFullYear()}` : '',
    description: '',
    sportType: selectedSport,
    format: tournamentFormat,
    startDate: '',
    endDate: '',
    registrationEnd: '',
    maxTeams: 16,
    minPlayers: 7,
    maxPlayersPerTeam: 22,
  })
  
  const [categories, setCategories] = useState([{ name: '', description: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (tournamentType === 'single') {
      setCategories([{ name: 'General', description: 'Categoría única del torneo' }])
    }
  }, [tournamentType])

  useEffect(() => {
    setForm(prev => ({ ...prev, sportType: selectedSport }))
  }, [selectedSport])

  const addCategory = () => {
    setCategories([...categories, { name: '', description: '' }])
  }

  const updateCategory = (index: number, field: string, value: string) => {
    const newCategories = [...categories]
    newCategories[index] = { ...newCategories[index], [field]: value }
    setCategories(newCategories)
  }

  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      setCategories(categories.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      const tournamentData = {
        ...form,
        categories: tournamentType === 'multiple' ? categories : undefined,
      }
      
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tournamentData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear torneo')
        return
      }

      router.push('/dashboard/tournaments')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const sports = [
    { value: 'FUTBOL', label: '⚽ Fútbol', desc: 'Fútbol 11' },
    { value: 'FUTSAL', label: '⚽ Futsal', desc: 'Fútbol sala' },
    { value: 'BASQUET', label: '🏀 Básquet', desc: 'Baloncesto' },
    { value: 'HANDBOL', label: '🤾 Handball', desc: 'Balonmano' },
    { value: 'VOLEY', label: '🏐 Vóley', desc: 'Voleibol' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          {tournamentType === 'single' ? '🏆 Nuevo Campeonato Único' : '📊 Nuevo Campeonato con Categorías'}
        </h1>
        <p className="text-gray-500 mt-1">
          {tournamentType === 'single' 
            ? 'Crea un torneo de una sola modalidad y categoría' 
            : 'Crea un torneo con múltiples categorías (edad, género, etc.)'}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-xl">
            {sports.find(s => s.value === selectedSport)?.label.split(' ')[0] || '🎯'}
          </span>
          <span className="text-blue-700 font-medium">
            {sports.find(s => s.value === selectedSport)?.desc || selectedSport}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Campeonato *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Liga de Fútbol 2026"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Descripción del torneo..."
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">Deporte seleccionado</label>
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {sports.find(s => s.value === selectedSport)?.label.split(' ')[0] || '🎯'}
            </span>
            <div>
              <div className="font-medium text-gray-800">
                {sports.find(s => s.value === selectedSport)?.desc || selectedSport}
              </div>
              <div className="text-sm text-gray-500">Puedes cambiar el deporte en el dashboard</div>
            </div>
          </div>
        </div>

        {tournamentType === 'multiple' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">Categorías</label>
              <button
                type="button"
                onClick={addCategory}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Agregar categoría
              </button>
            </div>
            <div className="space-y-3">
              {categories.map((cat, index) => (
                <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => updateCategory(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre (ej: Masculino, Sub-18, Libre)"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cat.description}
                      onChange={(e) => updateCategory(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Descripción (opcional)"
                    />
                  </div>
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCategory(index)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Inicio *</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Fin *</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin de Inscripciones</label>
          <input
            type="date"
            value={form.registrationEnd}
            onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Máx. Equipos</label>
            <input
              type="number"
              value={form.maxTeams}
              onChange={(e) => setForm({ ...form, maxTeams: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min={2}
              max={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mín. Jugadores</label>
            <input
              type="number"
              value={form.minPlayers}
              onChange={(e) => setForm({ ...form, minPlayers: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Máx. Jugadores</label>
            <input
              type="number"
              value={form.maxPlayersPerTeam}
              onChange={(e) => setForm({ ...form, maxPlayersPerTeam: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Formato de Competición</label>
          <select
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled
          >
            <option value="todos_contra_todos">Todos contra todos</option>
            <option value="liga_eliminacion">Todos contra todos + Eliminatoria</option>
            <option value="eliminacion">Eliminatoria directa</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Campeonato'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}