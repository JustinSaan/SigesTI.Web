using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    public class EquipoRespaldo
    {
        [Key]
        public int Id { get; set; }

        [StringLength(100)]
        public string? Area { get; set; } // Propiedad agregada

        public int? PersonalId { get; set; }

        [ForeignKey("PersonalId")]
        public virtual Personal? Personal { get; set; }

        [Required]
        [StringLength(100)]
        public string Hostname { get; set; } = string.Empty;

        [Required]
        [StringLength(45)]
        public string DireccionIP { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        public int Orden { get; set; } = 0;

        public DateTime FechaCreacion { get; set; } = DateTime.Now;

        public virtual ICollection<ProgramacionRespaldo> Programaciones { get; set; } = new List<ProgramacionRespaldo>();
    }
}