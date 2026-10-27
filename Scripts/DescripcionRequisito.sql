/*
 * Descripción del requisito separada del seguimiento.
 * Lo que escribe el solicitante al generar la solicitud se guarda en DescripcionRequisito;
 * DescripcionProblema queda solo para los comentarios de seguimiento.
 * Se puede ejecutar más de una vez: solo crea lo que falta.
 *
 * Las solicitudes anteriores no se modifican: el sistema toma como descripción
 * su primer comentario del historial.
 */

IF COL_LENGTH(N'dbo.Solicitudes', N'DescripcionRequisito') IS NULL
    ALTER TABLE dbo.Solicitudes ADD DescripcionRequisito NVARCHAR(MAX) NULL;
GO
