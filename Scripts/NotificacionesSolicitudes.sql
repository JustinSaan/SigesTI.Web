/*
 * Notificaciones y autorización de solicitudes de requerimiento.
 * Se puede ejecutar más de una vez: solo crea lo que falta.
 *
 * Estatus de una solicitud: Por autorizar -> Pendiente -> Resuelto.
 * "Por autorizar" solo se usa cuando al generarla se eligió quién la autoriza.
 */

-- 1. Datos de la autorización en la solicitud
IF COL_LENGTH(N'dbo.Solicitudes', N'AutorizadoPor') IS NULL
    ALTER TABLE dbo.Solicitudes ADD AutorizadoPor NVARCHAR(120) NULL;
GO

IF COL_LENGTH(N'dbo.Solicitudes', N'FechaAutorizacion') IS NULL
    ALTER TABLE dbo.Solicitudes ADD FechaAutorizacion DATETIME2 NULL;
GO

-- 2. Notificaciones de cada usuario del sistema
IF OBJECT_ID(N'dbo.Notificaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notificaciones
    (
        IdNotificacion INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Notificaciones PRIMARY KEY,
        IdUsuario      INT NOT NULL,
        IdSolicitud    INT NULL,
        Tipo           NVARCHAR(40) NOT NULL,
        Mensaje        NVARCHAR(300) NOT NULL,
        Leida          BIT NOT NULL CONSTRAINT DF_Notificaciones_Leida DEFAULT 0,
        FechaCreacion  DATETIME2 NOT NULL CONSTRAINT DF_Notificaciones_FechaCreacion DEFAULT SYSDATETIME(),

        -- Al borrar un usuario o una solicitud se borran sus notificaciones
        CONSTRAINT FK_Notificaciones_UsuariosSistema FOREIGN KEY (IdUsuario)
            REFERENCES dbo.UsuariosSistema (IdUsuario) ON DELETE CASCADE,
        CONSTRAINT FK_Notificaciones_Solicitudes FOREIGN KEY (IdSolicitud)
            REFERENCES dbo.Solicitudes (IdSolicitud) ON DELETE CASCADE
    );

    CREATE INDEX IX_Notificaciones_Usuario ON dbo.Notificaciones (IdUsuario, Leida, FechaCreacion DESC);
END
GO
