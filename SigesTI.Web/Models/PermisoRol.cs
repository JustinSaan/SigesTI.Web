using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Models
{
    public class PermisoRol
    {
        [Key]
        public int IdPermisoRol { get; set; }

        [Required]
        [StringLength(20)]
        public string Rol { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Modulo { get; set; } = string.Empty;

        public bool PuedeVer { get; set; }

        public bool PuedeCrear { get; set; }

        public bool PuedeEditar { get; set; }

        public bool PuedeEliminar { get; set; }

        public bool PuedeExportar { get; set; }
    }
}
