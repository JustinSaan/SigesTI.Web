/*
 * Catálogo de sistemas de los tickets (SITA, VUCEM, DIAWEB...) con sus colores.
 * Se administra desde el botón "Sistemas" del Reporte de Tickets.
 * Se puede ejecutar más de una vez: solo crea lo que falta.
 */

IF OBJECT_ID(N'dbo.SistemasTicket', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SistemasTicket
    (
        IdSistema  INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_SistemasTicket PRIMARY KEY,
        Nombre     NVARCHAR(50) NOT NULL,
        ColorFondo NVARCHAR(7) NOT NULL,
        ColorTexto NVARCHAR(7) NOT NULL,
        Interno    BIT NOT NULL CONSTRAINT DF_SistemasTicket_Interno DEFAULT 0,
        Orden      INT NOT NULL CONSTRAINT DF_SistemasTicket_Orden DEFAULT 0
    );

    CREATE UNIQUE INDEX UX_SistemasTicket_Nombre ON dbo.SistemasTicket (Nombre);
END
GO

-- Sistemas que ya se usaban, con los mismos colores
IF NOT EXISTS (SELECT 1 FROM dbo.SistemasTicket)
BEGIN
    INSERT INTO dbo.SistemasTicket (Nombre, ColorFondo, ColorTexto, Interno, Orden) VALUES
        (N'DIA',                 N'#008BBF', N'#FFFFFF', 0, 1),
        (N'DIAWEB',              N'#8FE5FF', N'#0F172A', 0, 2),
        (N'SITA',                N'#EA580C', N'#FFFFFF', 0, 3),
        (N'VUCEM',               N'#1D4ED8', N'#FFFFFF', 0, 4),
        (N'DIAENLINEA PREMIUM',  N'#B6FF82', N'#0F172A', 0, 5),
        (N'COA',                 N'#15803D', N'#FFFFFF', 0, 6),
        (N'CONECTOR DIAWEB-ZOÉ', N'#704332', N'#FFFFFF', 0, 7),
        (N'ADMIN',               N'#C9A227', N'#0F172A', 1, 8);
END
GO

-- Los tickets anteriores guardaban variantes del nombre; se dejan igual que en el catálogo
UPDATE dbo.Tickets SET Sistema = N'DIAENLINEA PREMIUM'
WHERE Sistema LIKE N'%DIAENLINEA%' AND Sistema <> N'DIAENLINEA PREMIUM';

UPDATE dbo.Tickets SET Sistema = N'CONECTOR DIAWEB-ZOÉ'
WHERE (Sistema LIKE N'%CONECTOR%' OR Sistema LIKE N'%ZOE%' OR Sistema LIKE N'%ZOÉ%')
  AND Sistema <> N'CONECTOR DIAWEB-ZOÉ';

UPDATE dbo.Tickets SET Sistema = LTRIM(RTRIM(Sistema))
WHERE Sistema <> LTRIM(RTRIM(Sistema));
GO
