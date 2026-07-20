using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SigesTI.Web.Data;

namespace SigesTI.Web.Pages
{
    public class IndexModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public IndexModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public int TotalSolicitudes { get; set; }

        public int SolicitudesPendientes { get; set; }

        public int SolicitudesResueltas { get; set; }

        public int TotalPersonal { get; set; }

        /*
         * Información del usuario que tiene iniciada la sesión.
         */
        public string NombreUsuarioActual { get; set; } = string.Empty;

        public string RolUsuarioActual { get; set; } = string.Empty;

        public IActionResult OnGet()
        {
            int? idUsuario =
                HttpContext.Session.GetInt32("IdUsuario");

            if (idUsuario == null)
            {
                return RedirectToPage("/InicioSesion/Login");
            }

            NombreUsuarioActual =
                HttpContext.Session.GetString("NombreCompleto")
                ?? HttpContext.Session.GetString("Usuario")
                ?? "Usuario";

            RolUsuarioActual =
                HttpContext.Session.GetString("Rol")
                ?? "Sin rol";

            TotalSolicitudes =
                _context.Solicitudes.Count();

            SolicitudesPendientes =
                _context.Solicitudes.Count(
                    s => s.Estatus == "Pendiente");

            SolicitudesResueltas =
                _context.Solicitudes.Count(
                    s => s.Estatus == "Resuelto");

            TotalPersonal =
                _context.Personal.Count();

            return Page();
        }
    }
}