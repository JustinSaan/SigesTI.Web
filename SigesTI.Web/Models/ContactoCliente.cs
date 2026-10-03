using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace SigesTI.Web.Models
{
    public class ContactoCliente
    {
        [Key]
        public int Id { get; set; }

        public int ClienteId { get; set; }

        [Required, StringLength(150)]
        public string NombreContacto { get; set; } = string.Empty;

        [StringLength(150), EmailAddress]
        public string? Correo { get; set; }

        public bool Activo { get; set; } = true;

        public virtual Cliente? Cliente { get; set; }
    }
}