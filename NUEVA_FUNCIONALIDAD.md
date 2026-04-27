# Nueva Funcionalidad: Criterio de Clasificación

## Resumen
Se ha implementado un nuevo modal **"Criterio de Clasificación"** que se integra en el flujo de creación de campeonatos. Este modal permite al usuario:
- Seleccionar y ordenar criterios de clasificación mediante arrastre (drag-and-drop)
- Cambiar el orden de prioridad de los criterios
- Activar/desactivar criterios según necesidad

## Flujo Completo de Creación de Campeonato

### 1. **Modal: "Nuevo Campeonato"** (Tipo)
```
Usuario hace clic en "+ Nuevo Campeonato"
    ↓
Elige: "Campeonato Único" o "Campeonato con Categorías"
```

### 2. **Modal: "Selecciona la Modalidad"** (Deporte)
```
Se muestra grid de deportes disponibles:
- Fútbol 11, Futsal, Fútbol 7, Fútbol Sala
- Balonmano, Baloncesto
- Voleibol, Voleibol de Playa
- Tenis de Mesa, Tenis, Beach Tennis
- Ajedrez, Atletismo
- Deporte Genérico, Disparos
- Battle Royale, MOBA (LoL), MOBA (Dota)

Usuario selecciona un deporte
```

### 3. **NEW Modal: "Criterio de Clasificación"** ✨
```
Se muestra la lista de criterios seleccionados en orden de prioridad:
1. Puntos (predeterminado)
2. Goles (predeterminado)
3. Goles a Favor (predeterminado)
4. Resultados Entre Sí (predeterminado)
5. Tarjetas Amarillas (predeterminado)
6. Tarjetas Rojas (predeterminado)

Usuario puede:
✓ Arrastr los criterios para cambiar orden (⋮⋮ = drag handle)
✓ Hacer clic en ✓ para remover un criterio
✓ Ver lista de "Criterios no seleccionados" con opción + para agregar

Botones:
- "Cancelar": Vuelve atrás
- "Continuar": Avanza al siguiente modal
```

### 4. **Modal: "Nuevo Campeonato"** (Datos)
```
Campos:
1. Nombre del Campeonato (text input)
   - Ej: "Copa Oro"

2. Fases del Campeonato (radio buttons mejorados):
   ○ Todos contra todos
     "Una única fase donde todos los equipos juegan entre sí"
   
   ○ Todos contra todos + Eliminatoria
     "Liga inicial seguida de fase eliminatoria con los mejores equipos"
   
   ○ Eliminatoria
     "Sistema de eliminación directa"

3. Nota: "* Se pueden crear o eliminar fases más tarde"

Botones:
- "Cancelar": Cierra sin guardar
- "Crear Campeonato": Crea el campeonato con todos los datos
```

## Cambios Técnicos

### Base de Datos (Prisma Schema)
```prisma
// Nuevo enum
enum ClassificationCriterion {
  PUNTOS
  GOLES
  GOLES_A_FAVOR
  RESULTADOS_ENTRE_SI
  TARJETAS_AMARILLAS
  TARJETAS_ROJAS
}

// Nuevo campo en Tournament
model Tournament {
  ...
  classificationCriteria String @default("PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS")
  ...
}
```

### Frontend (Dashboard Page)
```typescript
// Nuevas variables de estado
const [showCriteriaModal, setShowCriteriaModal] = useState(false)
const [classificationCriteria, setClassificationCriteria] = useState<string[]>([...])

// Nuevas funciones
- handleCriteriaConfirm(): Avanza al siguiente modal
- handleMoveCriteria(from, to): Reordena criterios (drag-and-drop)
- handleToggleCriteria(criterionId): Activa/desactiva un criterio
```

### API (POST /api/tournaments)
```json
{
  "name": "Copa Oro",
  "sportType": "FUTBOL_11",
  "format": "todos_contra_todos",
  "classificationCriteria": "PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI",
  "startDate": "2026-04-27",
  "endDate": "2026-07-26"
}
```

## Archivos Modificados

1. **src/app/(dashboard)/dashboard/page.tsx**
   - Agregados: Estados, funciones de criterios, modal JSX
   - Modificado: handleSportSelect, handleCreateChampionship

2. **prisma/schema.prisma**
   - Agregado: enum ClassificationCriterion
   - Modificado: model Tournament

3. **src/app/api/tournaments/route.ts**
   - Modificado: tournamentSchema, POST handler

## Características del Modal de Criterios

### Drag-and-Drop
- Click y arrastra en el ícono ⋮⋮ para reordenar
- Visual feedback: hover hace background azul
- Posición en tiempo real: "Posición: X"

### Toggle de Criterios
- Botón ✓ en criterios seleccionados para remover
- Botón + en criterios no seleccionados para agregar
- Validación: Mínimo 1 criterio debe estar seleccionado

### Orden de Prioridad
- El orden mostrado es el que se usa para desempate en la clasificación
- Primer criterio: máxima prioridad
- Último criterio: mínima prioridad

## Pasos para Activar

### 1. Actualizar Node.js (REQUERIDO)
```bash
# Descarga Node.js 18 LTS o superior desde https://nodejs.org
# Verifica: node --version  # Debe ser >= 18.17.0
```

### 2. Ejecutar Migraciones
```bash
npm install
npx prisma migrate dev --name add_classification_criteria
```

### 3. Iniciar servidor
```bash
npm run dev
```

### 4. Probar
1. Ir a Dashboard
2. Hacer clic en "+ Nuevo Campeonato"
3. Seguir el flujo completo

## Criterios por Defecto

Al crear un campeonato, los criterios vienen preseleccionados en este orden:
1. **PUNTOS** - Determina ganador por total de puntos
2. **GOLES** - Diferencia de goles
3. **GOLES_A_FAVOR** - Total de goles marcados
4. **RESULTADOS_ENTRE_SI** - Desempate directo
5. **TARJETAS_AMARILLAS** - Menos tarjetas amarillas (orden inverso)
6. **TARJETAS_ROJAS** - Menos tarjetas rojas (orden inverso)

## Notas Importantes

- ⚠️ **CRÍTICO**: Requiere Node.js 18.17.0 o superior
- ⚠️ La migración de Prisma es necesaria para crear el campo en BD
- ✓ Los criterios se guardan como string separado por comas
- ✓ El modelo es extensible para futuras versiones

## Próximas Fases (Opcional)

- [ ] Mostrar criterios en la página de detalles del campeonato
- [ ] Usar criterios en algoritmo de clasificación
- [ ] UI para cambiar criterios después de crear campeonato
- [ ] Validación de criterios según deporte
