using System;
using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Models
{
    public class Solicitud
    {
        [Key]
        public int IdSolicitud { get; set; }

        public int IdPersonal { get; set; }

        // Datos del solicitante y puesto (se manejan dinámicamente)
        public string? CorreoSolicitante { get; set; }
        public string? PuestoSolicitante { get; set; }
        public string? NuevaUnidadRed { get; set; }
        public string? UnidadesRed { get; set; }
        public string? TieneImpresoraConfigurada { get; set; } // Si / No
        public string? DetalleImpresora { get; set; } // HP LaserJet, Epson, etc.


        // Checkboxes generales de la bitácora
        public bool ReqSistemas { get; set; }
        public string? SistemasDetalle { get; set; } // Guarda los sistemas elegidos (ADMIN, SITA, etc.)
        public string? OtrosSistemas { get; set; }

        public string? DescripcionProblema { get; set; }
        public string? EjecutivoAsignado { get; set; }
        public string? AutorizaAdmin { get; set; }
        public string? ResponsableArea { get; set; }

        // NUEVOS CAMPOS INTEGRADOS
        [Required]
        [DataType(DataType.Date)]
        public DateTime FechaIngreso { get; set; } = DateTime.Now; // Fecha del día por defecto

        [DataType(DataType.Date)]
        public DateTime? FechaEntrega { get; set; } // Permite nulos hasta que se resuelva

        [Required]
        public string Estatus { get; set; } = "Pendiente"; // Valor predeterminado

        // Propiedad de navegación opcional
        public Personal? Personal { get; set; }
    }
}