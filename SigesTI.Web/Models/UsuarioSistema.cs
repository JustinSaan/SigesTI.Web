using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Models
{
    public class UsuarioSistema
    {
        [Key]
        public int IdUsuario { get; set; }

        [Required]
        [StringLength(120)]
        public required string NombreCompleto { get; set; }

        [Required]
        [StringLength(50)]
        public required string NombreUsuario { get; set; }

        [Required]
        [StringLength(120)]
        public required string Correo { get; set; }

        [Required]
        [StringLength(20)]
        public required string Rol { get; set; } // Administrador o Soporte

        [Required]
        public required string PasswordHash { get; set; }

        public bool Activo { get; set; } = true;

        public bool RequiereCambioPassword { get; set; } = true;

        public DateTime? UltimoAcceso { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.Now;

        public required ICollection<BitacoraUsuario> Bitacoras { get; set; }
    }
}