# 🛠️ Manual de Usuario Administrador - CopaDepor

Bienvenido al panel de administración de CopaDepor. Este manual detalla las funciones críticas para la gestión de torneos, equipos y fixtures.

## 1. Gestión de Torneos
Desde el Dashboard principal, puede ver la lista de torneos activos o crear nuevos.
*   **Crear Torneo**: Haga clic en el botón "+" en la lista de torneos.
*   **Configuración**: Dentro de un torneo, use el botón de engranaje ⚙️ para acceder a la configuración global.

## 2. Gestión de Equipos
Antes de generar un fixture, es obligatorio que el torneo tenga equipos asignados.
*   **Agregar Equipos**: Vaya a "Equipos" en el menú de configuración.
*   **Validación**: El sistema no permitirá generar partidos si el torneo tiene 0 equipos.

## 3. Gestión del Fixture (Calendario)
El sistema utiliza el formato **Round Robin** para la generación de partidos.

### 🚀 Generación Inicial
1.  Haga clic en el botón "+" del lado derecho del calendario de fechas.
2.  Seleccione **"⚽ SOLO IDA"** o **"🔄 IDA Y VUELTA"**.
3.  El sistema distribuirá automáticamente los equipos en rondas (fechas).

### 🔄 Regeneración
Si necesita cambiar el formato o se equivocó al agregar equipos:
1.  Hace clic en el mismo botón "+".
2.  El sistema le avisará que ya existen partidos y le dará la opción de **"Borrar todo y regenerar"**.
3.  *Nota: Esto eliminará todos los partidos actuales de la fase seleccionada.*

### 🧹 Limpiar/Restaurar Resultados
Si ya ha registrado goles o tarjetas pero desea reiniciar la fase manteniendo los mismos partidos:
1.  En el modal de fixture, seleccione la opción **"🧹 Limpiar resultados y tarjetas"**.
2.  Esto pondrá todos los marcadores en 0 (o nulos), borrará todos los eventos registrados y pondrá los partidos en estado "Programado".

## 4. Registro de Partidos
Para cargar datos de un partido:
1.  Haga clic en un partido del calendario.
2.  Se abrirá el **Modal de Gestión de Partido**.
3.  **Goles**: Registre el autor del gol, el minuto y el tipo.
4.  **Tarjetas**: Registre amarillas y rojas vinculadas a jugadores específicos.
5.  **Estado**: Cambie el estado a "EN VIVO" para seguimiento en tiempo real o "FINALIZADO" para cerrar el acta.

---
*CopaDepor - Sistema de Gestión de Torneos*
