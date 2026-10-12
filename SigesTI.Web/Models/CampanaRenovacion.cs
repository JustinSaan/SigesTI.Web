using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigesTI.Web.Models
{
    [Table("CampanaRenovacion")]
    public class CampanaRenovacion
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int Mes { get; set; }

        [Required]
        public int Anio { get; set; }

        public DateTime FechaCarga { get; set; } = DateTime.Now;

        // Relación Uno a Muchos con los detalles
        public virtual ICollection<CampanaRenovacionDetalle> Detalles { get; set; } = new List<CampanaRenovacionDetalle>();
    }
}