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

        // Agrega un comentario al historial con el mismo formato que Tareas Programadas;
        // los nuevos se ponen arriba de los anteriores
        public static string AgregarComentario(string? historial, string usuario, string texto)
        {
            string fechaHora = DateTime.Now.ToString("dd/MM/yyyy hh:mm:ss tt");
            string bloque = $"Agregado el: {fechaHora} Por: {usuario}\n\n{texto.Trim()}";

            return string.IsNullOrWhiteSpace(historial)
                ? bloque
                : bloque + "\n\n" + historial;
        }
    }
}