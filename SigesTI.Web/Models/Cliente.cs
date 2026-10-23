using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace SigesTI.Web.Models
{
    public class Cliente
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(20)]
        public string Clave { get; set; } = string.Empty;

        [Required, StringLength(150)]
        public string Nombre { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        public virtual ICollection<ContactoCliente> Contactos { get; set; } = new List<ContactoCliente>();

        // Las claves llevan sufijo de sucursal: "123" se guarda como "123-0" y "451 - 2" como "451-2"
        public static string NormalizarClave(string? clave)
        {
            var valor = System.Text.RegularExpressions.Regex.Replace((clave ?? "").Trim(), @"\s*-\s*", "-");
            if (valor == "") return valor;

            return valor.Contains('-') ? valor : valor + "-0";
        }
    }
}