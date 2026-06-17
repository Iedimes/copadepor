# CopaDepor — Tournament Management System

Sistema de gestión integral de torneos multideportivos. Creación de torneos, equipos, fixtures automatizados, seguimiento de estadísticas en tiempo real y soporte para reglas de Futsal (tarjeta azul, faltas acumulativas, timer 20').

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes
- **Base de Datos**: MySQL 8.0 (local) / Aiven MySQL (producción)
- **ORM**: Prisma 5.22
- **Deploy**: Vercel (free tier)
- **Auth**: JWT + bcrypt

## Deploy

- **Producción**: https://copadepor.vercel.app
- **Base de datos**: Aiven MySQL (sslca=prisma/ca.pem)
- **Dominio**: copadepor.vercel.app

## Características

- Gestión de torneos (único o por categorías)
- Fixture Round Robin (ida / ida y vuelta) + Eliminatoria directa
- Registro de eventos: goles, amarillas, rojas, **tarjeta azul (Futsal)**
- Contador de faltas por período (1°T / 2°T) con alerta al llegar a 5
- Timer de 20' con control de EN VIVO
- Seguimiento de exclusión temporal (sin bin) con cuenta regresiva
- Tablas de posiciones con criterios de desempate configurables
- Estadísticas de goleadores y fair play
- Gestión de equipos, jugadores y sponsors
- W.O. y fechas libres
- Panel público de consulta de resultados

## Documentación

- [Manual de Administrador](./docs/MANUAL_ADMIN.md)
- [Manual de Usuario Frontend](./docs/MANUAL_FRONTEND.md)
- [Manual del Programador](./docs/MANUAL_PROGRAMADOR.md)

## Instalación Local

```bash
npm install
# Configurar .env con DATABASE_URL local
npm run dev
```

## Estructura del Proyecto

```
src/
  app/
    api/               # API routes (Next.js)
    (dashboard)/       # Dashboard pages
    tournaments/       # Tournament management
    public/            # Public view pages
  lib/
    prisma.ts          # Prisma client singleton
    auth.ts            # JWT + bcrypt utilities
    generated/         # Generated Prisma client
prisma/
  schema.prisma
  migrations/
  ca.pem               # Aiven CA certificate
docs/
  MANUAL_ADMIN.md
  MANUAL_FRONTEND.md
  MANUAL_PROGRAMADOR.md
```

## Variables de Entorno

- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Secret for JWT tokens

## Licencia

Uso interno — Iedimes
