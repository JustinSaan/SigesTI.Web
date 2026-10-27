using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using SigesTI.Web.Seguridad;

namespace SigesTI.Web.Pages.Solicitudes
{
    /*
     * Formato imprimible de un requerimiento. Se muestra en el modal de vista previa
     * (desde Consultar o desde una notificación).
     * No lleva [Modulo] porque también lo abre el administrador que autoriza, aunque no
     * tenga acceso a Consultar; el permiso se revisa en OnGetAsync.
     */
    public class FormatoModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PermisosService _permisos;

        public FormatoModel(ApplicationDbContext context, PermisosService permisos)
        {
            _context = context;
            _permisos = permisos;
        }

        public Solicitud Solicitud { get; set; } = null!;

        public string ResponsableArea { get; set; } = "Sin jefe asignado";

        public bool TieneResponsable => ResponsableArea != "Sin jefe asignado";

        // Lo que va debajo de la firma de quien entrega: "Sistemas" si es de esa área,
        // si no "Sistemas (Soporte Técnico)"
        public string AreaEntrega { get; set; } = "Sistemas (Soporte Técnico)";

        // Lo que pidió el solicitante
        public string Descripcion { get; set; } = "";

        // Comentarios de quien atiende o autoriza
        public List<ComentarioHistorial> Seguimiento { get; set; } = new();

        public DateTime FechaGeneracion { get; set; }

        public async Task<IActionResult> OnGetAsync(int id)
        {
            int? idUsuario = HttpContext.Session.GetInt32("IdUsuario");

            if (!await NotificacionesModel.PuedeVerSolicitudAsync(_context, _permisos, id, idUsuario))
            {
                return RedirectToPage("/AccesoDenegado");
            }

            var sol = await _context.Solicitudes
                .AsNoTracking()
                .Include(s => s.Personal)
                .FirstOrDefaultAsync(s => s.IdSolicitud == id);

            if (sol == null) return NotFound();

            Solicitud = sol;
            FechaGeneracion = DateTime.Now;
            (Descripcion, Seguimiento) = Solicitud.LeerDescripcionYSeguimiento(sol.DescripcionRequisito, sol.DescripcionProblema);

            string? area = sol.Personal?.Area;
            ResponsableArea = await _context.Personal
                .Where(p => p.Area == area && p.EsResponsable)
                .Select(p => p.Nombre)
                .FirstOrDefaultAsync() ?? "Sin jefe asignado";

            string? areaEjecutivo = await _context.Personal
                .Where(p => p.Nombre == sol.EjecutivoAsignado)
                .Select(p => p.Area)
                .FirstOrDefaultAsync();

            if (areaEjecutivo == "Sistemas")
            {
                AreaEntrega = "Sistemas";
            }

            return Page();
        }
    }
}
