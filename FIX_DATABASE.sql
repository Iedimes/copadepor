-- Script SQL para agregar el campo classificationCriteria a la tabla Tournament
-- Ejecuta esto directamente en tu base de datos MySQL

ALTER TABLE Tournament 
ADD COLUMN classificationCriteria VARCHAR(255) NOT NULL 
DEFAULT 'PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O' 
AFTER maxSponsors;

-- Verificar que se agregó correctamente
SELECT id, name, classificationCriteria 
FROM Tournament 
LIMIT 1;

-- Actualizar registros existentes (si hubiera)
UPDATE Tournament 
SET classificationCriteria = 'PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O' 
WHERE classificationCriteria IS NULL;
