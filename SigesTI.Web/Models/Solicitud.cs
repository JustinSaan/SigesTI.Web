using System;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

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

        // Quién autorizó el requerimiento y cuándo (solo si se pidió autorización)
        public string? AutorizadoPor { get; set; }
        public DateTime? FechaAutorizacion { get; set; }

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

        /*
         * Separa el historial en comentarios para mostrarlos como tarjetas (igual que solicitudes.js).
         * Las solicitudes viejas usan "Entrado el:" y líneas decorativas, que aquí se quitan.
         */
        public static List<ComentarioHistorial> LeerHistorial(string? historial)
        {
            string limpio = Regex.Replace(historial ?? "", "📌 SOLICITUD INICIAL", "");
            limpio = Regex.Replace(limpio, @"^[ \t]*[─═]+[ \t]*$", "", RegexOptions.Multiline);

            var comentarios = new List<ComentarioHistorial>();

            foreach (string bloque in Regex.Split(limpio, "(?=(?:Agregado|Entrado) el: )"))
            {
                string texto = bloque.Trim();
                if (texto == "") continue;

                var partes = Regex.Match(texto, @"^(?:Agregado|Entrado) el: (.+?) Por: (.*)\n?([\s\S]*)$");

                comentarios.Add(partes.Success
                    ? new ComentarioHistorial(partes.Groups[2].Value.Trim(), partes.Groups[1].Value, Regex.Replace(partes.Groups[3].Value.Trim(), @"\n[ \t]+", "\n"))
                    : new ComentarioHistorial(null, null, texto));
            }

            return comentarios;
        }
    }

    public record ComentarioHistorial(string? Autor, string? Fecha, string Texto);

    public static class EstatusSolicitud
    {
        // Se eligió quién la autoriza y todavía no lo hace
        public const string PorAutorizar = "Por autorizar";
        public const string Pendiente = "Pendiente";
        public const string Resuelto = "Resuelto";

        // Texto que se muestra en pantalla y en los reportes
        public static string Texto(string estatus)
        {
            return estatus == PorAutorizar ? "Pendiente por autorizar" : estatus;
        }
    }
}