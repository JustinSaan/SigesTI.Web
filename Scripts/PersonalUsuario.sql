/*
 * Liga cada persona de Personal con su usuario del sistema.
 * Las notificaciones de solicitudes se envían al usuario ligado.
 * Se puede ejecutar más de una vez: solo crea lo que falta.
 */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Columna con el usuario del sistema (vacía = sin usuario)
IF COL_LENGTH(N'dbo.Personal', N'IdUsuario') IS NULL
    ALTER TABLE dbo.Personal ADD IdUsuario INT NULL;
GO

-- Si se borra el usuario, la persona se queda sin usuario
IF OBJECT_ID(N'dbo.FK_Personal_UsuariosSistema', N'F') IS NULL
    ALTER TABLE dbo.Personal ADD CONSTRAINT FK_Personal_UsuariosSistema
        FOREIGN KEY (IdUsuario) REFERENCES dbo.UsuariosSistema (IdUsuario) ON DELETE SET NULL;
GO

-- Un usuario solo puede estar ligado a una persona
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Personal_IdUsuario' AND object_id = OBJECT_ID(N'dbo.Personal'))
    CREATE UNIQUE INDEX UX_Personal_IdUsuario ON dbo.Personal (IdUsuario) WHERE IdUsuario IS NOT NULL;
GO

-- 2. Liga inicial automática (solo cuando no hay duda). Lo demás se liga en Administración de Personal.
--    a) Mismo nombre completo, y ese nombre solo existe una vez en cada tabla
UPDATE p
SET p.IdUsuario = u.IdUsuario
FROM dbo.Personal p
JOIN dbo.UsuariosSistema u ON u.NombreCompleto = p.Nombre
WHERE p.IdUsuario IS NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Personal x WHERE x.IdUsuario = u.IdUsuario)
  AND (SELECT COUNT(*) FROM dbo.Personal x WHERE x.Nombre = p.Nombre) = 1
  AND (SELECT COUNT(*) FROM dbo.UsuariosSistema x WHERE x.NombreCompleto = p.Nombre) = 1;
GO

--    b) Mismo correo, y ese correo solo existe una vez en cada tabla
UPDATE p
SET p.IdUsuario = u.IdUsuario
FROM dbo.Personal p
JOIN dbo.UsuariosSistema u ON u.Correo = p.Correo
WHERE p.IdUsuario IS NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Personal x WHERE x.IdUsuario = u.IdUsuario)
  AND (SELECT COUNT(*) FROM dbo.Personal x WHERE x.Correo = p.Correo) = 1
  AND (SELECT COUNT(*) FROM dbo.UsuariosSistema x WHERE x.Correo = p.Correo) = 1;
GO
