using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    public class ProgramacionRespaldo
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int EquipoRespaldoId { get; set; }

        [ForeignKey("EquipoRespaldoId")]
        public virtual EquipoRespaldo? EquipoRespaldo { get; set; }

        [Required]
        [DataType(DataType.Date)]
        public DateTime FechaProgramada { get; set; }

        [Required]
        [StringLength(20)]
        public string Estado { get; set; } = "Pendiente"; // Pendiente, Realizado, En Curso

        [StringLength(500)]
        public string? Observaciones { get; set; }

        public DateTime? FechaCompletado { get; set; }
    }
}