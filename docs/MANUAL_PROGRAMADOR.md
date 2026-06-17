# Manual del Programador — CopaDepor

## Arquitectura

### Frontend
- **Next.js 14** con App Router
- **React** functional components + hooks
- **Tailwind CSS** para estilos
- **TypeScript** en todo el código

### Backend
- **API Routes** de Next.js (serverless functions en Vercel)
- **Prisma 5.22** como ORM
- **MySQL 8.0** (local) / **Aiven MySQL** (producción)
- **JWT** para autenticación (bcrypt para passwords)

### Deploy
- **Vercel** (free tier)
- **Aiven MySQL** (free tier, SSL requerido)

## Estructura del Proyecto

```
C:\wamp64\www\copadepor\
├── prisma/
│   ├── schema.prisma          # Modelo de datos
│   ├── ca.pem                 # Certificado CA de Aiven
│   └── migrations/            # Migraciones de BD
├── src/
│   ├── app/
│   │   ├── api/               # Endpoints REST
│   │   │   ├── login/        # POST /api/login
│   │   │   ├── register/      # POST /api/register
│   │   │   ├── tournaments/   # CRUD torneos
│   │   │   ├── teams/         # CRUD equipos
│   │   │   ├── matches/       # CRUD partidos
│   │   │   ├── players/       # CRUD jugadores
│   │   │   └── categories/    # CRUD categorías
│   │   ├── (dashboard)/       # Panel admin
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Dashboard principal (~730 líneas)
│   │   │       ├── teams/page.tsx     # Gestión equipos
│   │   │       ├── players/page.tsx   # Gestión jugadores
│   │   │       └── matches/page.tsx   # Vista partidos
│   │   ├── tournaments/
│   │   │   ├── new/page.tsx           # Crear torneo
│   │   │   └── [id]/page.tsx          # Admin torneo (~7240 líneas)
│   │   ├── public/
│   │   │   └── tournaments/[id]/page.tsx  # Vista pública (~2020 líneas)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── page.tsx               # Landing
│   ├── lib/
│   │   ├── prisma.ts              # Singleton PrismaClient
│   │   ├── auth.ts                # JWT + bcrypt utils
│   │   └── generated/             # Prisma Client generado
│   └── middleware.ts              # Next.js middleware (auth)
├── docs/
│   ├── MANUAL_ADMIN.md
│   ├── MANUAL_FRONTEND.md
│   └── MANUAL_PROGRAMADOR.md
├── .env                    # BD local
├── .gitignore
├── next.config.mjs
├── package.json
└── AGENTS.md
```

## Modelo de Datos (Prisma)

### Enums
- `SportType`: FUTBOL_11, FUTSAL, FUTBOL_7, BALONMANO, BALONCESTO, VOLEY, VOLEY_PLAYA, TENIS_MESA, TENIS, BEACH_TENNIS, AJEDREZ, ATLETISMO, DEPORTE_GENERICO, DISPAROS, BATTLE_ROYALE, MOBA_LOL, MOBA_DOTA
- `MatchStatus`: SCHEDULED, IN_PROGRESS, COMPLETED, POSTPONED, CANCELLED
- `TournamentStatus`: DRAFT, REGISTRATION_OPEN, IN_PROGRESS, COMPLETED, CANCELLED
- `Role`: ADMIN, ORGANIZER, TEAM_MANAGER, PLAYER, REFEREE
- `MemberRole`: PLAYER, COACH, ASSISTANT, TECHNICAL

### Modelos Principales
- **User**: Usuarios del sistema (admin, organizadores, etc.)
- **Tournament**: Torneo con sportType, faseSystem, classificationCriteria, themeColor
- **Category**: Categorías por edad/género dentro de un torneo
- **Phase**: Fases (Liga, Eliminatoria) dentro de un torneo
- **Team**: Equipos deportivos
- **TournamentTeam**: Relación equipo-torneo con grupo
- **TeamMember**: Miembros de equipo (jugadores, técnicos)
- **Match**: Partidos con equipos local/visitante, resultado, estado
- **MatchEvent**: Eventos (GOAL, YELLOW_CARD, **BLUE_CARD**, RED_CARD, OWN_GOAL, SUB_IN, SUB_OUT)
- **Goal**: Goles registrados
- **Standings**: Tabla de posiciones por categoría

### MatchEvent.type
Los tipos de evento son String (no enum de Prisma), lo que permite agregar nuevos tipos sin migración:
```
GOAL, YELLOW_CARD, BLUE_CARD, RED_CARD, OWN_GOAL, SUB_IN, SUB_OUT
```

## Funcionalidades Clave

### Futsal
- **BLUE_CARD**: Tipo de evento para exclusión temporal de 2 minutos
- **Foul counter**: Se computa de YELLOW_CARD + BLUE_CARD por equipo y período
- **Sin bin tracker**: En el timer modal, muestra jugadores en exclusión con tiempo restante
- **Timer 20'**: Por defecto 20 minutos para torneos FUTSAL

### Fixture
- Round Robin con algoritmo de distribución circular
- Soporte para ida, ida y vuelta, y eliminatoria directa
- Validación: equipo no puede jugar contra sí mismo ni estar en 2 partidos de la misma ronda

### Tema
- Color por defecto: negro (#18181B)
- Se puede personalizar por torneo desde configuración
- Presets disponibles en selector de colores

## Conexión a BD

### Local
```
DATABASE_URL="mysql://root:@localhost:3306/copadepor"
```

### Producción (Vercel)
```
DATABASE_URL="mysql://avnadmin:password@host:25214/defaultdb?sslca=prisma/ca.pem"
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev                  # Iniciar servidor en :3000

# Prisma
npx prisma generate          # Regenerar cliente
npx prisma migrate deploy    # Ejecutar migraciones pendientes

# Build
npm run build                # Build de producción

# Deploy
npx vercel deploy --prod     # Deploy a Vercel
```

## Deployment (Vercel + Aiven)

1. Commit y push a GitHub
2. Vercel detecta el push y hace deploy automático (o manual con `vercel deploy --prod`)
3. Variables de entorno en Vercel:
   - `DATABASE_URL`: Aiven MySQL con SSL
   - `JWT_SECRET`: Secret para tokens
4. Aiven MySQL requiere SSL: el certificado CA está en `prisma/ca.pem`
5. Las tablas en Aiven deben tener nombres PascalCase (ej: `User`, `Team`, `Match`)

## Convenciones

- **Nombres de tablas**: PascalCase (Prisma lo exige en Linux)
- **Commits**: Convencional commits (feat:, fix:, etc.)
- **Branch**: Todo sobre `main` (desarrollo directo)
- **Archivos grandes**: `page.tsx` de torneo tiene ~7240 líneas (archivo monolítico)

## Troubleshooting

### EPERM en prisma generate
Causa: Antivirus o proceso bloqueando el DLL.
Solución: Matar procesos Node, desactivar antivirus temporalmente.

### SSL certificate verify failed
Causa: Windows no reconoce el CA de Aiven.
Solución: Usar `sslca=prisma/ca.pem` en la URL.

### Table not found
Causa: Tablas en minúscula (Windows) pero Prisma espera PascalCase (Linux).
Solución: Renombrar tablas: `RENAME TABLE user TO User;`

### DATABASE_URL empty en Vercel
Causa: Variable de entorno mal configurada.
Solución: Verificar en Settings → Environment Variables, redeploy.
