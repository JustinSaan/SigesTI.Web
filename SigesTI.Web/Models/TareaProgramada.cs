using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    public class TareaProgramada
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Tarea { get; set; } = string.Empty;

        [Required]
        public int TipoTareaId { get; set; }
        [ForeignKey("TipoTareaId")]
        public virtual TipoTareaProgramada? TipoTarea { get; set; }

        [Required]
        public int PersonaAsignadaId { get; set; }

        [ForeignKey("PersonaAsignadaId")]
        public virtual UsuarioSistema? PersonaAsignada { get; set; } // Cambiado de UsuariosSistema a UsuarioSistema

        [Required]
        public DateTime FechaMaximaRealizacion { get; set; }

        public DateTime? FechaRealizacion { get; set; }

        [Required]
        [StringLength(50)]
        public string Estatus { get; set; } = "Pendiente";

        public string? Objetivo { get; set; }

        public string? Observaciones { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.Now;
        public int CreadoPorId { get; set; }

        public DateTime? FechaUltimaModificacion { get; set; }
        public string? ModificadoPorNombre { get; set; }
    }

    public class TipoTareaProgramada
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Nombre { get; set; } = string.Empty;
    }
}