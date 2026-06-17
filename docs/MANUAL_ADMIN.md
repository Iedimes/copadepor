# Manual de Administrador — CopaDepor

Panel de administración para gestión de torneos, equipos, fixtures y resultados.

## 1. Gestión de Torneos

### 1.1 Crear Torneo
1. Desde el Dashboard, click en "+ Nuevo Campeonato"
2. Elegir tipo: Único o con Categorías
3. Seleccionar deporte
4. Configurar criterios de clasificación (orden por drag-and-drop)
5. Completar nombre, fechas, formato y crear

### 1.2 Configuración del Torneo
Dentro de un torneo, click en ⚙️ (engranaje):
- **Información General**: Nombre, descripción, fechas
- **Color del Menú Público**: Color de la barra lateral (por defecto negro)
- **Logo y Banner**: Imagen del torneo
- **Formato de Fases**: Agregar/eliminar fases (Liga, Eliminatoria)
- **Patrocinadores**: Gestionar sponsors
- **Noticias**: Publicar novedades
- **Personalización**: Deporte, criterios de clasificación, plan

### 1.3 Eliminar Torneo
- Click en el ícono de eliminar en la lista del Dashboard
- Siempre pide confirmación antes de eliminar

## 2. Gestión de Equipos

1. Ir a "Equipos" en el menú de configuración
2. **Agregar**: Click en "+" y completar nombre
3. **Miembros**: Click en el equipo para gestionar jugadores y cuerpo técnico
4. **Asignar a Torneo**: Desde la página del torneo, "Seleccionar equipos"

## 3. Gestión del Fixture

### 3.1 Generar Partidos
1. Click en "+" al lado del calendario de fechas
2. Elegir: "⚽ SOLO IDA" o "🔄 IDA Y VUELTA"
3. El sistema distribuye los equipos en rondas automáticamente

### 3.2 Regenerar
1. Click en "+" nuevamente
2. Confirmar "Borrar todo y regenerar"
3. Se eliminan todos los partidos de la fase y se crean nuevos

### 3.3 Limpiar Resultados
Opción "🧹 Limpiar resultados y tarjetas": reinicia marcadores y eventos sin eliminar la estructura del fixture.

### 3.4 Eliminatoria
1. Desde el menú de fases, click en "🏆 GENERAR ELIMINATORIA"
2. Seleccionar teams clasificados
3. El sistema genera el bracket automáticamente

## 4. Edición de Partidos

Click en un partido del calendario para abrir el modal de gestión:

### 4.1 Resultado
- Goles de local y visitante
- Goles de penal (para eliminatorias)
- Estado: Programado → EN VIVO → Finalizado
- W.O. si corresponde

### 4.2 Goles
- Seleccionar jugador, minuto y período
- Goles en contra (own goal)

### 4.3 Tarjetas
- **🟡 Amarilla**: Advertencia
- **🟦 Azul (Futsal)**: Exclusión temporal de 2 minutos — aparece en el sin bin tracker
- **🔴 Roja**: Expulsión

### 4.4 Faltas (Futsal)
- Se cuentan automáticamente por equipo y período (1°T / 2°T)
- Al llegar a 5 faltas en un período, se muestra una advertencia naranja
- Las faltas se computan de amarillas + azules registradas en el partido

### 4.5 Timer (Futsal)
- Click en el botón ⏱ para abrir el control de tiempo
- Por defecto 20 minutos para Futsal
- Botones: "Iniciar" / "Iniciar EN VIVO" / "Cerrar"
- Muestra faltas por período y estado del sin bin

### 4.6 Sin Bin (Futsal)
- Cuando se registra una tarjeta azul, el jugador entra en exclusión temporal
- Se muestra en el timer modal: "🟦 [Jugador] vuelve X' (restan N')"
- Al cumplirse los 2 minutos, pasa a "✅ Recuperados"

### 4.7 Seleccionar Equipos
- "Seleccionar equipos" asigna/remplaza equipos al partido
- "Cambiar equipos" permite cambiar un equipo específico
- Valida que el equipo no juegue contra sí mismo
- Valida que el equipo no esté en otro partido de la misma ronda

## 5. Fases del Torneo

- **Liga (Todos contra todos)**: Round Robin con ida o ida y vuelta
- **Eliminatoria**: Bracket de eliminación directa
- **Liga + Eliminatoria**: Fase de grupos seguida de playoffs
- Se pueden crear fases adicionales desde configuración

## 6. Estadísticas

- **Tabla de Posiciones**: PJ, PG, PE, PP, GF, GC, DG, PTS
- **Goleadores**: Ranking de jugadores con más goles
- **Fair Play**: Tarjetas por equipo
- **Estadísticas de Fecha**: Totales de juegos y goles por jornada

## 7. Panel Público

- URL pública: `/public/tournaments/[id]`
- Vista de calendario, clasificación y estadísticas
- Optimizado para mobile
- Muestra tarjetas azules en el resumen del partido

## 8. Deportes Soportados

- Fútbol 11 (FUTBOL_11)
- **Futsal (FUTSAL)** — con tarjeta azul, faltas, timer 20'
- Fútbol 7 (FUTBOL_7)
- Balonmano, Baloncesto, Vóley, Vóley Playa
- Tenis, Tenis de Mesa, Beach Tennis
- Ajedrez, Atletismo
- Deporte Genérico, Disparos
- Battle Royale, MOBA LoL, MOBA Dota

## Atajos y Tips

- Los torneos nuevos se crean con color negro por defecto
- Al crear un torneo, el color se puede personalizar después desde configuración
- Para pruebas locales, la BD apunta a `localhost:3306`
- En producción (Vercel), la BD es Aiven MySQL con SSL
