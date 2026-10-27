using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Models
{
    // Aviso del área que el administrador publica en la pantalla principal para todos los usuarios
    public class Aviso
    {
        [Key]
        public int IdAviso { get; set; }

        [Required]
        [StringLength(100)]
        public string Titulo { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Mensaje { get; set; } = string.Empty;

        // Ver TiposAviso
        [Required]
        [StringLength(20)]
        public string Tipo { get; set; } = TiposAviso.Informativo;

        [StringLength(150)]
        public string? PublicadoPor { get; set; }

        public DateTime FechaPublicacion { get; set; } = DateTime.Now;

        // Después de esta fecha ya no se muestra; sin fecha se queda hasta que se quite
        public DateTime? FechaExpira { get; set; }
    }

    public static class TiposAviso
    {
        public const string Informativo = "Informativo";
        public const string Importante = "Importante";
        public const string Mantenimiento = "Mantenimiento";

        public static readonly string[] Todos = { Informativo, Importante, Mantenimiento };
    }
}
