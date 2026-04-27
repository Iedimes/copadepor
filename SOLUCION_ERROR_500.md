# 🔧 Solución del Error 500: Falta Columna en Base de Datos

## El Problema
```
Error: Invalid `prisma.tournament.create()` argument `classificationCriteria`. 
Available options are marked with ?.
```

**Causa:** El schema de Prisma fue actualizado pero la tabla `Tournament` en la base de datos NO tiene la columna `classificationCriteria`.

## Solución

### Opción 1: Ejecutar Script SQL (RECOMENDADO - RÁPIDO)

#### Paso 1: Abre phpMyAdmin
1. Ve a http://localhost/phpmyadmin
2. Selecciona la base de datos `copadepor`
3. Haz clic en la pestaña **SQL**

#### Paso 2: Copia y ejecuta este SQL
```sql
ALTER TABLE Tournament 
ADD COLUMN classificationCriteria VARCHAR(255) NOT NULL 
DEFAULT 'PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O' 
AFTER maxSponsors;
```

#### Paso 3: Verifica que se agregó
```sql
DESCRIBE Tournament;
```

Debe aparecer una fila con:
```
| classificationCriteria | varchar(255) | NO   |     | PUNTOS,GOLES... |
```

### Opción 2: Usar CLI MySQL (SI TIENES MYSQL INSTALADO)

```bash
mysql -u root -p copadepor < FIX_DATABASE.sql
```

Ingresa la contraseña (dejada vacía si no la tienes).

### Opción 3: Instalar Node.js y ejecutar migración (MÁS CORRECTO)

1. **Descarga Node.js 18 LTS desde https://nodejs.org**
2. **Instálalo con las opciones por defecto**
3. **Abre una terminal nueva en el proyecto**
4. **Ejecuta:**
   ```bash
   npx prisma migrate deploy
   ```

## Después de Agregar la Columna

### 1. Recarga el cliente
- Para el servidor (Ctrl+C en terminal)
- Inicia de nuevo: `npm run dev`

### 2. Limpia cache de navegador
- Abre DevTools (F12)
- Botón derecho en recarga → "Vaciar caché y recargar"

### 3. Prueba nuevamente
- Dashboard → "+ Nuevo Campeonato"
- Sigue el flujo completo
- El torneo debe crearse sin errores

## Verificar en Base de Datos

Para confirmar que todo funcionó:

```sql
USE copadepor;

-- Ver estructura de tabla
DESCRIBE Tournament;

-- Ver datos de torneo creado
SELECT id, name, sportType, classificationCriteria 
FROM Tournament 
ORDER BY createdAt DESC 
LIMIT 5;
```

## Si Persiste el Error

### Opción A: Borrar prisma cache
```bash
# Elimina la carpeta generada
rm -r src/lib/generated/

# Regenera
npx prisma generate
```

### Opción B: Sincronizar BD con Schema
```bash
# Peligro: puede perder datos
npx prisma db push --force-reset
```

## Tabla de Acciones por Error

| Error | Solución |
|-------|----------|
| `Invalid classificationCriteria` | Ejecutar SQL de ALTER TABLE |
| `classificationCriteria is not a valid property` | Ejecutar `prisma generate` |
| `FOREIGN KEY constraint failed` | Verificar tournament ID existe |
| `Access denied for user` | Revisar USER/PASSWORD en .env |

## Script SQL Alternativo (Si Algo Falla)

Si por algún motivo no puedes executar, aquí están todos los SQLs posibles:

```sql
-- Ver si la columna existe
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Tournament' 
AND COLUMN_NAME = 'classificationCriteria';

-- Si no existe, agregar
ALTER TABLE Tournament 
ADD COLUMN classificationCriteria VARCHAR(255) NOT NULL 
DEFAULT 'PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O';

-- Si existe pero está NULL, actualizar
UPDATE Tournament 
SET classificationCriteria = 'PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O' 
WHERE classificationCriteria IS NULL;

-- Verificar definitivamente
SELECT id, name, classificationCriteria 
FROM Tournament 
LIMIT 10;
```

---

**🚀 Ejecuta el SQL de Opción 1 y te funcionará al instante.**
