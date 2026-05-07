# 🏆 CopaDepor - Tournament Management System

CopaDepor es una plataforma moderna y robusta diseñada para la gestión integral de torneos de fútbol. El sistema permite administrar desde la creación de equipos hasta la generación automatizada de fixtures y el seguimiento de estadísticas en tiempo real.

## 🚀 Características Principales

*   **Gestión de Torneos**: Creación y configuración dinámica de fases y rondas.
*   **Fixture Automatizado**: Generación de partidos mediante algoritmos Round Robin (Ida o Ida y Vuelta).
*   **Seguimiento en Vivo**: Registro detallado de eventos de partido (goles, tarjetas amarillas/rojas, etc.).
*   **Estadísticas Automáticas**: Tablas de posiciones, goleadores y fair play actualizados al instante.
*   **Sistema de Limpieza Avanzado**: Capacidad para restaurar resultados de una fase sin perder la estructura del fixture.

## 🛠️ Stack Tecnológico

*   **Frontend**: Next.js (App Router), React, Tailwind CSS.
*   **Backend**: Next.js API Routes.
*   **Base de Datos**: PostgreSQL / MySQL (según entorno).
*   **ORM**: Prisma.

## 📖 Documentación y Manuales

Para facilitar el uso del sistema, hemos creado guías detalladas:

*   [**📘 Manual de Administrador**](./docs/MANUAL_ADMIN.md): Todo sobre gestión de torneos, equipos y fixtures.
*   [**📙 Manual de Usuario (Front-End)**](./docs/MANUAL_FRONTEND.md): Guía para consulta de resultados y tablas.

## 📂 Estructura del Proyecto

*   `/src/app`: Rutas y componentes de la aplicación (Next.js App Router).
*   `/src/app/api`: Endpoints de la API para gestión de datos.
*   `/prisma`: Esquema de la base de datos y migraciones.
*   `/database`: Backups de la base de datos (SQL).
*   `/docs`: Documentación detallada del proyecto.

## 🛠️ Instalación y Desarrollo

1.  Instalar dependencias: `npm install`
2.  Configurar variables de entorno en `.env`.
3.  Ejecutar el servidor de desarrollo: `npm run dev`
4.  Acceder a `http://localhost:3000` (o `3001` si el 3000 está en uso).

---
*Desarrollado con ❤️ para la comunidad deportiva.*
