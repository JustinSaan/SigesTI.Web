using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Models
{
    public class Personal
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "El nombre es obligatorio")]
        [StringLength(100)]
        public string Nombre { get; set; } = string.Empty;

        [Required(ErrorMessage = "El área es obligatoria")]
        [StringLength(50)]
        public string Area { get; set; } = string.Empty; // Ventas, Sistemas, Administración, etc.

        [Required(ErrorMessage = "El correo es obligatorio")]
        [EmailAddress(ErrorMessage = "Formato de correo inválido")]
        [StringLength(100)]
        public string Correo { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;
    }
}