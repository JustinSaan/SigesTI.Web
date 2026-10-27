using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    // Sistema que se elige al registrar un ticket (SITA, VUCEM, DIAWEB...).
    // Su lista y sus colores se administran desde el botón "Sistemas" del Reporte de Tickets.
    [Table("SistemasTicket")]
    public class SistemaTicket
    {
        [Key]
        public int IdSistema { get; set; }

        [Required]
        [StringLength(50)]
        public string Nombre { get; set; } = string.Empty;

        // Colores en formato #RRGGBB
        [Required]
        [StringLength(7)]
        public string ColorFondo { get; set; } = "#64748B";

        [Required]
        [StringLength(7)]
        public string ColorTexto { get; set; } = "#FFFFFF";

        // Sistema interno (ADMIN); los demás son externos
        public bool Interno { get; set; }

        // Posición en las listas y en las columnas de los indicadores
        public int Orden { get; set; }

        // Clase CSS de su insignia; los colores se generan en _ColoresSistemas
        [NotMapped]
        public string ClaseCss => $"badge-sistema-{IdSistema}";

        // Sistema del catálogo que corresponde al guardado en un ticket (null si ya no existe)
        public static SistemaTicket? Buscar(IEnumerable<SistemaTicket> catalogo, string? nombre)
        {
            var valor = (nombre ?? "").Trim();
            return catalogo.FirstOrDefault(s => s.Nombre.Equals(valor, StringComparison.OrdinalIgnoreCase));
        }
    }
}
