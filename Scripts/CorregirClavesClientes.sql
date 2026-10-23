-- Agrega el sufijo "-0" a las claves de cliente que no tienen guion.
-- Las claves que ya tienen sufijo (456-1, 856-3, CLI-12345...) no se tocan.
-- Base de datos: SigesTI_DB, tabla dbo.Clientes

USE SigesTI_DB;
GO

-- 1. Revisar qué claves se van a cambiar
SELECT Id, Clave AS ClaveActual, LTRIM(RTRIM(Clave)) + '-0' AS ClaveNueva, Nombre
FROM dbo.Clientes
WHERE CHARINDEX('-', Clave) = 0
  AND LTRIM(RTRIM(Clave)) <> '';

-- 2. Aplicar el cambio (dentro de una transacción; revisa el conteo antes de confirmar)
BEGIN TRANSACTION;

UPDATE dbo.Clientes
SET Clave = LTRIM(RTRIM(Clave)) + '-0'
WHERE CHARINDEX('-', Clave) = 0
  AND LTRIM(RTRIM(Clave)) <> '';

SELECT @@ROWCOUNT AS ClavesActualizadas;

-- Si el conteo es correcto ejecuta COMMIT; si no, ROLLBACK.
-- COMMIT TRANSACTION;
-- ROLLBACK TRANSACTION;
