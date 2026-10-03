using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace SigesTI.Web.Models
{
    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public DateTime FechaEntrada { get; set; } = DateTime.Now;

        public DateTime? FechaUltimaModificacion { get; set; }

        [Required]
        [StringLength(20)]
        public string Hora { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string NumeroTicket { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Cliente { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Ejecutivo { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Reporto { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Estatus { get; set; } = "En curso";

        [Required]
        [StringLength(50)]
        public string Sistema { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Tipo { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Origen { get; set; } = "Externo";

        [StringLength(500)]
        public string? Descripcion { get; set; }

        public string? Comentarios { get; set; }

        public string? Solucion { get; set; }

        public bool Escalado { get; set; } = false;

        [StringLength(100)]
        public string? AreaEscalada { get; set; }

        public DateTime? FechaSolucion { get; set; }

        public bool Activo { get; set; } = true;
    }
}