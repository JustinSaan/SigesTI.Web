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

        public void OnGet()
        {
            TotalSolicitudes = _context.Solicitudes.Count();

            SolicitudesPendientes = _context.Solicitudes
                .Count(s => s.Estatus == "Pendiente");

            SolicitudesResueltas = _context.Solicitudes
                .Count(s => s.Estatus == "Resuelto");

            TotalPersonal = _context.Personal.Count();
        }
    }
}