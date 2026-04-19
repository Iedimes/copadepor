import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="container mx-auto px-4 py-16">
        <header className="flex justify-between items-center mb-16">
          <h1 className="text-4xl font-bold text-white">CopaDepor</h1>
          <div className="space-x-4">
            <Link href="/login" className="text-white hover:text-blue-200">Iniciar sesión</Link>
            <Link href="/register" className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50">
              Registrarse
            </Link>
          </div>
        </header>

        <main className="text-center text-white">
          <h2 className="text-5xl font-bold mb-6">Gestiona tus torneos deportivos</h2>
          <p className="text-xl mb-12 text-blue-100">
            La plataforma completa para organizar competencias de fútbol, futsal, básquet, handball y voleibol
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3">📅 Calendario Automático</h3>
              <p className="text-blue-100">Genera fixture de forma instantánea con múltiples formatos de competición</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3">📊 Estadísticas en Vivo</h3>
              <p className="text-blue-100">Tablas de posición, goleadores y seguimiento automático de resultados</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3">📱 Multiplataforma</h3>
              <p className="text-blue-100">Accede desde navegador o instala como app en tu móvil</p>
            </div>
          </div>

          <div className="mt-16 flex justify-center gap-4">
            <Link href="/register" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-50">
              Comenzar gratis
            </Link>
            <Link href="/login" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white/10">
              Ya tengo cuenta
            </Link>
          </div>
        </main>

        <footer className="mt-24 text-center text-blue-200">
          <p>© 2026 CopaDepor. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  )
}