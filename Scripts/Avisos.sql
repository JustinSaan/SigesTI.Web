/*
 * Avisos del área que se muestran en la pantalla principal.
 * Solo el administrador los publica y los quita.
 * Se puede ejecutar más de una vez: solo crea lo que falta.
 */

IF OBJECT_ID(N'dbo.Avisos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Avisos
    (
        IdAviso          INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Avisos PRIMARY KEY,
        Titulo           NVARCHAR(100) NOT NULL,
        Mensaje          NVARCHAR(500) NOT NULL,
        Tipo             NVARCHAR(20) NOT NULL CONSTRAINT DF_Avisos_Tipo DEFAULT N'Informativo',
        PublicadoPor     NVARCHAR(150) NULL,
        FechaPublicacion DATETIME2 NOT NULL CONSTRAINT DF_Avisos_FechaPublicacion DEFAULT SYSDATETIME(),
        FechaExpira      DATETIME2 NULL
    );

    CREATE INDEX IX_Avisos_FechaPublicacion ON dbo.Avisos (FechaPublicacion DESC);
END
GO
