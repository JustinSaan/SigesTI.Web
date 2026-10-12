using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    [Table("CampanaRenovacionDetalle")]
    public class CampanaRenovacionDetalle
    {
        [Key]
        public int Id { get; set; }

        public int CampanaId { get; set; }

        [Required]
        [StringLength(20)]
        public string TipoCliente { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string NoCliente { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string Empresa { get; set; } = string.Empty;

        [StringLength(255)]
        public string? NombreCliente { get; set; }

        [StringLength(500)]
        public string? CorreoElectronico { get; set; }

        [StringLength(100)]
        public string? Telefono { get; set; }

        public string? Sistemas { get; set; }

        public string? NoSerie { get; set; }

        [StringLength(255)]
        public string? EjecutivoAsignado { get; set; }

        public string? ComentariosAdicionales { get; set; }

        [StringLength(50)]
        public string? Ticket { get; set; }

        [Required]
        [StringLength(50)]
        public string Estatus { get; set; } = "Pendiente";

        // Propiedad de navegación
        [ForeignKey("CampanaId")]
        public virtual CampanaRenovacion? Campana { get; set; }
    }
}