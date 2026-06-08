using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages.Solicitudes
{
    public class GenerarModel(ApplicationDbContext context) : PageModel
    {
        private readonly ApplicationDbContext _context = context;

        // Estas son las dos listas exactas que tu archivo HTML (Create.cshtml) necesita leer
        public SelectList AreasOptions { get; set; } = default!;
        public SelectList SoporteOptions { get; set; } = default!;

        [BindProperty]
        public Solicitud NuevaSolicitud { get; set; } = new Solicitud();

        public async Task<IActionResult> OnGetAsync()
        {
            // 1. Cargamos las áreas únicas desde la tabla Personal para el primer menú desplegable
            var areas = await _context.Personal
                                      .Select(p => p.Area)
                                      .Distinct()
                                      .ToListAsync();

            AreasOptions = new SelectList(areas);

            // 2. Cargamos una lista estática (o desde base de datos si la tuvieras) para los ejecutivos de soporte
            var ejecutivos = new List<string> { "Justin Sánchez", "Soporte TI 2", "Soporte TI 3" };
            SoporteOptions = new SelectList(ejecutivos);

            return Page();
        }

        // EL CONTROLADOR JQUERY: Cuando el usuario cambia de área en la vista,
        // este método busca los empleados asignados a ella y regresa su Id, Nombre y Correo en JSON.
        public async Task<JsonResult> OnGetBuscarPersonalPorAreaAsync(string area)
        {
            var empleados = await _context.Personal
                                          .Where(p => p.Area == area)
                                          .Select(p => new { p.Id, p.Nombre, p.Correo })
                                          .ToListAsync();

            return new JsonResult(empleados);
        }

        public async Task<IActionResult> OnPostAsync()
        {
            // Eliminamos la validación automática del objeto virtual "Personal" para que no interfiera al guardar
            ModelState.Remove("NuevaSolicitud.Personal");

            if (!ModelState.IsValid)
            {
                // Si el formulario falla (por ejemplo, si faltan campos obligatorios),
                // volvemos a llenar las listas para que los menús desplegables no se queden vacíos en la recarga
                var areas = await _context.Personal.Select(p => p.Area).Distinct().ToListAsync();
                AreasOptions = new SelectList(areas);

                var ejecutivos = new List<string> { "Justin Sánchez", "Soporte TI 2", "Soporte TI 3" };
                SoporteOptions = new SelectList(ejecutivos);

                return Page();
            }

            // Guardamos el requerimiento en la tabla de Solicitudes de SQL Server
            _context.Solicitudes.Add(NuevaSolicitud);
            await _context.SaveChangesAsync();

            // Redireccionamos a la bitácora general de solicitudes que tienes en la misma carpeta
            return RedirectToPage("./Index");
        }
    }
}