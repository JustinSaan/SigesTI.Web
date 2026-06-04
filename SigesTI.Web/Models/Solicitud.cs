using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    public class Solicitud
    {
        [Key]
        public int Id { get; set; } // Este será el número consecutivo autoincrementable (0001, 0002...)

        [Required]
        public int PersonalId { get; set; } // Relación con el empleado que solicita

        [ForeignKey("PersonalId")]
        public Personal? Personal { get; set; }

        [Required]
        public DateTime FechaIngreso { get; set; } = DateTime.Now;

        public DateTime? FechaEntrega { get; set; } // Fecha opcional para cuando se cierre la solictud

        // --- CHECKBOXES DE REQUERIMIENTOS ---
        public bool ReqSistemas { get; set; }
        public bool UnidadesRed { get; set; }
        public bool ImpresoraConfigurada { get; set; }
        public bool Otros { get; set; }

        // --- DETALLES DE TEXTO ADICIONALES ---
        public string? DescripcionUnidadesRed { get; set; }
        public string? DescripcionImpresora { get; set; }
        public string? OtrosDetalle { get; set; } // Se habilitará solo si 'Otros' es verdadero

        // --- CONTROL INTERNO Y VALIDACIONES ---
        [Required(ErrorMessage = "Debe asignar un ejecutivo de soporte")]
        [StringLength(100)]
        public string EjecutivoAsignado { get; set; } = string.Empty; // Quién del equipo de TI lo atiende

        [Required(ErrorMessage = "Falta la validación de Administración")]
        public string AutorizaAdmin { get; set; } = string.Empty; // Guardará el estado de firma

        [Required(ErrorMessage = "Falta la validación de la Jefatura")]
        public string ResponsableArea { get; set; } = string.Empty; // Jefatura que aprueba
    }
}