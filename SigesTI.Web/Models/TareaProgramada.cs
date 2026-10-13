using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    [Table("TareasProgramadas")]
    public class TareaProgramada
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(250)]
        public string Tarea { get; set; } = string.Empty;

        [Required]
        public int TipoTareaId { get; set; }

        [ForeignKey("TipoTareaId")]
        public virtual TipoTareaProgramada? TipoTarea { get; set; }

        [Required]
        [StringLength(150)]
        public string PersonaSolicitante { get; set; } = string.Empty;

        [Required]
        public int PersonaAsignadaId { get; set; }

        // Mapeo corregido hacia la tabla Personal
        [ForeignKey("PersonaAsignadaId")]
        public virtual SigesTI.Web.Models.Personal? PersonaAsignada { get; set; }

        [Required]
        public DateTime FechaSolicitud { get; set; } = DateTime.Today;

        public DateTime? FechaRealizacion { get; set; }

        public string? Objetivo { get; set; }
        public int CreadoPorId { get; set; }

        public string? Observaciones { get; set; }

        [Required]
        [StringLength(50)]
        public string Estatus { get; set; } = "Pendiente";

        public DateTime FechaCreacion { get; set; } = DateTime.Now;
    }
}