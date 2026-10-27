/*
 * Reinicia el folio de las solicitudes de requerimiento para que el siguiente
 * sea consecutivo al último que existe (si se borraron todas, el siguiente será 1).
 * Se puede ejecutar cada vez que se borren solicitudes de prueba.
 *
 * No rellena huecos intermedios: si existen la 1, 2 y 5, la siguiente será la 6.
 */

-- 1. Avisos de solicitudes que ya no existen (si no, quedarían ligados a los folios nuevos)
DELETE FROM dbo.Notificaciones
WHERE IdSolicitud IS NOT NULL
  AND IdSolicitud NOT IN (SELECT IdSolicitud FROM dbo.Solicitudes);
GO

-- 2. El siguiente folio será el último existente + 1
DECLARE @ultimoFolio INT = ISNULL((SELECT MAX(IdSolicitud) FROM dbo.Solicitudes), 0);
DBCC CHECKIDENT (N'dbo.Solicitudes', RESEED, @ultimoFolio);
GO
