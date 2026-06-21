using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SigesTI.Web.Pages.Solicitudes
{
    public class GenerarModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public GenerarModel(ApplicationDbContext context)
        {
            _context = context;
        }

        [BindProperty]
        public Solicitud NuevaSolicitud { get; set; } = new Solicitud();

        [BindProperty]
        public string AreaAuxiliar { get; set; } = null!;

        [BindProperty]
        public string[] SistemasSeleccionados { get; set; } = Array.Empty<string>();

        [BindProperty]
        public string ImpresoraConfiguradaAux { get; set; } = "No";

        public List<SelectListItem> AreasOptions { get; set; } = new();
        public List<SelectListItem> SoporteOptions { get; set; } = new();
        public List<SelectListItem> AdminOptions { get; set; } = new();
        public List<SelectListItem> EstatusOptions { get; set; } = new();

        public void OnGet()
        {
            AreasOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "Ventas", Text = "Ventas" },
                new SelectListItem { Value = "Administración", Text = "Administración" },
                new SelectListItem { Value = "Soporte Técnico", Text = "Soporte Técnico" },
                new SelectListItem { Value = "Consultoría", Text = "Consultoría" },
                new SelectListItem { Value = "Cobranza", Text = "Cobranza" }
            };

            SoporteOptions = _context.Personal
                .Where(p => p.Area == "Soporte Técnico" || p.Area == "Soporte")
                .Select(p => new SelectListItem
                {
                    Value = p.Nombre,
                    Text = p.Nombre
                }).ToList();

            AdminOptions = _context.Personal
                .Where(p => p.Area == "Administración")
                .Select(p => new SelectListItem
                {
                    Value = p.Nombre,
                    Text = p.Nombre
                }).ToList();

            EstatusOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "Pendiente", Text = "Pendiente" },
                new SelectListItem { Value = "Resuelto", Text = "Resuelto" }
            };
        }

        // CORRECCIÓN: Retorna un estado para que AJAX en el Frontend maneje la animación de SweetAlert2
        public IActionResult OnPost()
        {
            // Forzar remoción de campos auxiliares en la validación que causan falsos errores en el ModelState
            ModelState.Remove("AreaAuxiliar");
            ModelState.Remove("ImpresoraConfiguradaAux");

            if (!ModelState.IsValid)
            {
                // Si hay un error real de datos nulos en el modelo, mandamos un aviso controlado al cliente
                return new BadRequestObjectResult("Por favor, rellene todos los campos requeridos.");
            }

            if (SistemasSeleccionados != null && SistemasSeleccionados.Length > 0)
            {
                NuevaSolicitud.SistemasDetalle = string.Join(", ", SistemasSeleccionados);
            }

            _context.Solicitudes.Add(NuevaSolicitud);
            _context.SaveChanges();

            // Enviamos señal en limpio diciendo que la base de datos procesó el registro exitosamente
            return new JsonResult(new { success = true });
        }

        public JsonResult OnGetFiltrarPersonal(string area)
        {
            var listaPersonal = _context.Personal
                .Where(p => p.Area == area)
                .Select(p => new
                {
                    id = p.Id,
                    nombre = p.Nombre,
                    correo = p.Correo,
                    puesto = p.Puesto,
                    esResponsable = p.EsResponsable
                }).ToList();

            return new JsonResult(listaPersonal);
        }
    }
}