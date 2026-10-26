/*
 * Permisos por rol.
 * Se puede ejecutar más de una vez: solo crea lo que falta.
 *
 * Roles: Admin (control total, no se guarda aquí), Administración, Soporte y Usuario.
 */

-- 1. Tabla de permisos
IF OBJECT_ID(N'dbo.PermisosRol', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PermisosRol
    (
        IdPermisoRol  INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_PermisosRol PRIMARY KEY,
        Rol           NVARCHAR(20) NOT NULL,
        Modulo        NVARCHAR(50) NOT NULL,
        PuedeVer      BIT NOT NULL CONSTRAINT DF_PermisosRol_PuedeVer DEFAULT 0,
        PuedeCrear    BIT NOT NULL CONSTRAINT DF_PermisosRol_PuedeCrear DEFAULT 0,
        PuedeEditar   BIT NOT NULL CONSTRAINT DF_PermisosRol_PuedeEditar DEFAULT 0,
        PuedeEliminar BIT NOT NULL CONSTRAINT DF_PermisosRol_PuedeEliminar DEFAULT 0,
        PuedeExportar BIT NOT NULL CONSTRAINT DF_PermisosRol_PuedeExportar DEFAULT 0,
        CONSTRAINT UQ_PermisosRol_Rol_Modulo UNIQUE (Rol, Modulo)
    );
END
GO

-- 2. Quitar la restricción vieja de la columna Rol (solo permitía Administrador y Soporte).
--    Su nombre lo generó SQL Server, por eso se busca en vez de escribirlo.
DECLARE @restriccion NVARCHAR(200);

SELECT @restriccion = cc.name
FROM sys.check_constraints cc
JOIN sys.columns c
    ON c.object_id = cc.parent_object_id
   AND c.column_id = cc.parent_column_id
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.UsuariosSistema')
  AND c.name = N'Rol'
  AND cc.name <> N'CK_UsuariosSistema_Rol';

IF @restriccion IS NOT NULL
    EXEC (N'ALTER TABLE dbo.UsuariosSistema DROP CONSTRAINT ' + @restriccion);
GO

-- 3. El rol "Administrador" pasa a llamarse "Admin"
UPDATE dbo.UsuariosSistema
SET Rol = N'Admin'
WHERE Rol = N'Administrador';
GO

-- 4. Nueva restricción con los 4 roles del sistema
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_UsuariosSistema_Rol')
    ALTER TABLE dbo.UsuariosSistema
    ADD CONSTRAINT CK_UsuariosSistema_Rol
    CHECK (Rol IN (N'Admin', N'Administración', N'Soporte', N'Usuario'));
GO

-- 5. Permisos iniciales (después se cambian desde Cuenta > Roles y permisos)
IF NOT EXISTS (SELECT 1 FROM dbo.PermisosRol)
BEGIN
    INSERT INTO dbo.PermisosRol
        (Rol, Modulo, PuedeVer, PuedeCrear, PuedeEditar, PuedeEliminar, PuedeExportar)
    VALUES
        -- Administración
        (N'Administración', N'GenerarSolicitud',     1, 1, 0, 0, 0),
        (N'Administración', N'ConsultarSolicitudes', 1, 0, 1, 0, 1),
        (N'Administración', N'ReporteTickets',       1, 0, 0, 0, 1),
        (N'Administración', N'PlanRespaldos',        1, 0, 0, 0, 0),
        (N'Administración', N'TareasGenerales',      1, 1, 1, 0, 1),
        (N'Administración', N'CampanaRenovacion',    1, 1, 1, 1, 1),
        (N'Administración', N'Indicadores',          1, 0, 0, 0, 1),
        (N'Administración', N'Personal',             1, 1, 1, 0, 0),
        (N'Administración', N'Cuenta',               0, 0, 0, 0, 0),

        -- Soporte
        (N'Soporte', N'GenerarSolicitud',     1, 1, 0, 0, 0),
        (N'Soporte', N'ConsultarSolicitudes', 1, 0, 1, 0, 1),
        (N'Soporte', N'ReporteTickets',       1, 1, 1, 0, 1),
        (N'Soporte', N'PlanRespaldos',        1, 1, 1, 0, 0),
        (N'Soporte', N'TareasGenerales',      1, 1, 1, 0, 1),
        (N'Soporte', N'CampanaRenovacion',    1, 0, 1, 0, 1),
        (N'Soporte', N'Indicadores',          1, 0, 0, 0, 1),
        (N'Soporte', N'Personal',             0, 0, 0, 0, 0),
        (N'Soporte', N'Cuenta',               0, 0, 0, 0, 0),

        -- Usuario
        (N'Usuario', N'GenerarSolicitud',     1, 1, 0, 0, 0),
        (N'Usuario', N'ConsultarSolicitudes', 1, 0, 0, 0, 0),
        (N'Usuario', N'ReporteTickets',       0, 0, 0, 0, 0),
        (N'Usuario', N'PlanRespaldos',        0, 0, 0, 0, 0),
        (N'Usuario', N'TareasGenerales',      0, 0, 0, 0, 0),
        (N'Usuario', N'CampanaRenovacion',    0, 0, 0, 0, 0),
        (N'Usuario', N'Indicadores',          0, 0, 0, 0, 0),
        (N'Usuario', N'Personal',             0, 0, 0, 0, 0),
        (N'Usuario', N'Cuenta',               0, 0, 0, 0, 0);
END
GO
