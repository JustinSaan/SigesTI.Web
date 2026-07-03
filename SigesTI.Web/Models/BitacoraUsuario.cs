using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    public class BitacoraUsuario
    {
        [Key]
        public int IdBitacora { get; set; }

        public int? IdUsuario { get; set; }

        [ForeignKey("IdUsuario")]
        public UsuarioSistema? UsuarioSistema { get; set; }

        [Required]
        [StringLength(50)]
        public required string Modulo { get; set; }

        [Required]
        [StringLength(50)]
        public required string Accion { get; set; }

        [Required]
        [StringLength(300)]
        public required string Descripcion { get; set; }

        public DateTime FechaHora { get; set; } = DateTime.Now;
    }
}