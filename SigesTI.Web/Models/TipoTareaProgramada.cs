using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    [Table("TiposTareaProgramada")]
    public class TipoTareaProgramada
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Nombre { get; set; } = string.Empty;
    }
}