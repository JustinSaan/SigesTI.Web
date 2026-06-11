using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Models
{
    public class Personal
    {
        [Key]
        public int Id { get; set; } // Nota: Si en tu base de datos se llama IdPersonal, déjalo como IdPersonal

        [Required(ErrorMessage = "El nombre es obligatorio")]
        public string Nombre { get; set; } = string.Empty;

        [Required(ErrorMessage = "El área es obligatoria")]
        public string Area { get; set; } = string.Empty;

        [Required(ErrorMessage = "El correo es obligatorio")]
        [EmailAddress(ErrorMessage = "Correo inválido")]
        public string Correo { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        // 🆕 NUEVOS CAMPOS AGREGADOS CON ÉXITO
        [Required(ErrorMessage = "El puesto es obligatorio")]
        public string Puesto { get; set; } = string.Empty;

        public bool EsResponsable { get; set; } = false;
    }
}