using System;
using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Models
{
    public class Notificacion
    {
        [Key]
        public int IdNotificacion { get; set; }

        // Usuario del sistema que la recibe
        public int IdUsuario { get; set; }

        public int? IdSolicitud { get; set; }

        // Ver TiposNotificacion
        [Required]
        [StringLength(40)]
        public string Tipo { get; set; } = string.Empty;

        [Required]
        [StringLength(300)]
        public string Mensaje { get; set; } = string.Empty;

        public bool Leida { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.Now;
    }

    public static class TiposNotificacion
    {
        // Al administrador elegido: tiene que autorizar el requerimiento
        public const string AutorizacionRequerida = "AutorizacionRequerida";

        // Al administrador, después de autorizar
        public const string AutorizacionAtendida = "AutorizacionAtendida";

        // Al ejecutivo de soporte: cuántos requerimientos tiene pendientes (una sola que se actualiza)
        public const string PendientesSoporte = "PendientesSoporte";

        // Al ejecutivo de soporte y al solicitante
        public const string RequerimientoAutorizado = "RequerimientoAutorizado";

        // Al administrador, cada 24 horas mientras no autorice (RecordatoriosAutorizacion)
        public const string RecordatorioAutorizacion = "RecordatorioAutorizacion";

        // Al solicitante, cuando su requerimiento se marca como resuelto
        public const string RequerimientoResuelto = "RequerimientoResuelto";
    }
}
