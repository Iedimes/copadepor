# Nueva Funcionalidad: Criterio de Clasificación

## Resumen
Se ha implementado un nuevo modal **"Criterio de Clasificación"** que se integra en el flujo de creación de campeonatos. Este modal permite al usuario:
- **Ver todos los criterios preseleccionados** (no se pueden deseleccionar)
- **Ordenar criterios por prioridad** mediante arrastre (drag-and-drop)
- Cada posición tiene máxima importancia en orden descendente

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
Se muestra la lista de criterios en orden de prioridad (TODO POR DEFECTO):
⋮⋮ Puntos                          ①
   Suma de puntos obtenidos

⋮⋮ Goles                           ②
   Diferencia de goles

⋮⋮ Goles a Favor                   ③
   Total de goles marcados

⋮⋮ Resultados Entre Sí             ④
   Desempate directo

⋮⋮ Tarjetas Amarillas              ⑤
   Menos tarjetas amarillas

⋮⋮ Tarjetas Rojas                  ⑥
   Menos tarjetas rojas

⋮⋮ W.O. (Walkover)                 ⑦
   Victorias por incomparecencia

Usuario SOLO puede:
✓ Arrastrar los criterios para cambiar orden (⋮⋮ = drag handle)
✓ Ver descripción de cada criterio
✓ Ver posición actual (①②③ etc.)

💡 Tip mostrado: "El orden determina la prioridad para desempate. 
                  El criterio en posición 1 tiene máxima prioridad."

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
// Nuevo enum CON W.O.
enum ClassificationCriterion {
  PUNTOS
  GOLES
  GOLES_A_FAVOR
  RESULTADOS_ENTRE_SI
  TARJETAS_AMARILLAS
  TARJETAS_ROJAS
  W_O
}

// Nuevo campo en Tournament con W.O. incluido
model Tournament {
  ...
  classificationCriteria String @default("PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O")
  ...
}
```

### Frontend (Dashboard Page)
```typescript
// Nuevas variables de estado
const [showCriteriaModal, setShowCriteriaModal] = useState(false)
const [classificationCriteria, setClassificationCriteria] = useState<string[]>([
  'PUNTOS',
  'GOLES',
  'GOLES_A_FAVOR',
  'RESULTADOS_ENTRE_SI',
  'TARJETAS_AMARILLAS',
  'TARJETAS_ROJAS',
  'W_O'
])

// Única función de criterios
- handleMoveCriteria(from, to): Reordena criterios (drag-and-drop)

// Criterios vienen con descripción
const CRITERIA_OPTIONS = [
  { id: 'PUNTOS', label: 'Puntos', description: 'Suma de puntos obtenidos' },
  { id: 'GOLES', label: 'Goles', description: 'Diferencia de goles' },
  // ... etc
  { id: 'W_O', label: 'W.O. (Walkover)', description: 'Victorias por incomparecencia' }
]
```

### API (POST /api/tournaments)
```json
{
  "name": "Copa Oro",
  "sportType": "FUTBOL_11",
  "format": "todos_contra_todos",
  "classificationCriteria": "PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O",
  "startDate": "2026-04-27",
  "endDate": "2026-07-26"
}
```

## Archivos Modificados

1. **src/app/(dashboard)/dashboard/page.tsx**
   - Actualizado: Estado, funciones de criterios, modal JSX
   - Eliminado: handleToggleCriteria (no se necesita)

2. **prisma/schema.prisma**
   - Actualizado: enum ClassificationCriterion (agregado W_O)
   - Actualizado: model Tournament (default con W_O)

3. **src/app/api/tournaments/route.ts**
   - Actualizado: default value en POST handler

## Características del Modal de Criterios (MEJORADO)

### Visual
- Lista con todos 7 criterios preseleccionados
- Ícono ⋮⋮ para indicar que se puede arrastrar
- Número circular ① ② ③ etc. para mostrar posición
- Descripción debajo del nombre de cada criterio
- Fondo azul claro al pasar el mouse
- Contenedor scrolleable si es necesario

### Drag-and-Drop
- Click y arrastra en el ícono ⋮⋮ para reordenar
- Visual feedback: hover hace background azul
- Posición en tiempo real: número circular actualizado

### Validación
- NO hay validación: siempre hay 7 criterios
- Mínimo necesario: 1 criterio ✓ (siempre cumple)
- El botón "Continuar" siempre está habilitado

### Orden de Prioridad
- El orden mostrado es el que se usa para desempate en la clasificación
- Primer criterio: máxima prioridad (①)
- Último criterio: mínima prioridad (⑦)

## Criterios Incluidos

### 7 Criterios Predeterminados en Orden

1. **PUNTOS** - Suma total de puntos obtenidos
2. **GOLES** - Diferencia de goles (a favor - en contra)
3. **GOLES_A_FAVOR** - Total de goles marcados
4. **RESULTADOS_ENTRE_SI** - Desempate con encuentros directos
5. **TARJETAS_AMARILLAS** - Menos tarjetas amarillas (orden inverso)
6. **TARJETAS_ROJAS** - Menos tarjetas rojas (orden inverso)
7. **W_O** - Victorias por incomparecencia/Walkover

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
4. En el modal de criterios, **solo arrastrar para cambiar orden**

## Cambios desde la Versión Anterior

| Aspecto | Antes | Ahora |
|--------|-------|-------|
| Criterios seleccionables | ✓ Sí (toggle) | ✗ No (todos fijos) |
| Criterios por defecto | 6 | 7 (+ W.O.) |
| Se pueden deseleccionar | ✓ Sí | ✗ No |
| Solo cambiar orden | ✗ No | ✓ Sí |
| Sección "no seleccionados" | ✓ Sí | ✗ No (removida) |
| Descripción de criterios | ✗ No | ✓ Sí |
| Indicador de posición | ✓ "Posición: X" | ✓ "① ② ③..." (mejorado) |

## Notas Importantes

- ⚠️ **CRÍTICO**: Requiere Node.js 18.17.0 o superior
- ⚠️ La migración de Prisma es necesaria para crear el campo en BD
- ✓ Los criterios se guardan como string separado por comas
- ✓ El modelo es extensible para futuras versiones
- ✓ W.O. incluido para torneos con victorias por incomparecencia

## Próximas Fases (Opcional)

- [ ] Mostrar criterios en la página de detalles del campeonato
- [ ] Usar criterios en algoritmo de clasificación
- [ ] UI para cambiar criterios después de crear campeonato
- [ ] Validación de criterios según deporte
- [ ] Permitir agregar criterios personalizados

