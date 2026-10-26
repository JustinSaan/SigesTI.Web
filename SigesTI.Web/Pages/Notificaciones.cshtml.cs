using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using SigesTI.Web.Seguridad;

namespace SigesTI.Web.Pages
{
    /*
     * Datos de la campana de notificaciones del layout.
     * No lleva [Modulo]: cualquier usuario con sesión ve sus propias notificaciones.
     */
    public class NotificacionesModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly NotificacionesService _notificaciones;
        private readonly PermisosService _permisos;

        public NotificacionesModel(ApplicationDbContext context, NotificacionesService notificaciones, PermisosService permisos)
        {
            _context = context;
            _notificaciones = notificaciones;
            _permisos = permisos;
        }

        private int? IdUsuarioActual => HttpContext.Session.GetInt32("IdUsuario");

        public IActionResult OnGet()
        {
            return RedirectToPage("/Index");
        }

        public JsonResult OnGetListar()
        {
            var lista = _context.Notificaciones
                .AsNoTracking()
                .Where(n => n.IdUsuario == IdUsuarioActual)
                .OrderBy(n => n.Leida)
                .ThenByDescending(n => n.FechaCreacion)
                .Take(30)
                .Select(n => new
                {
                    id = n.IdNotificacion,
                    tipo = n.Tipo,
                    mensaje = n.Mensaje,
                    leida = n.Leida,
                    idSolicitud = n.IdSolicitud,
                    fecha = n.FechaCreacion
                })
                .ToList();

            int noLeidas = _context.Notificaciones.Count(n => n.IdUsuario == IdUsuarioActual && !n.Leida);

            return new JsonResult(new { noLeidas, lista });
        }

        public JsonResult OnPostLeer(int id)
        {
            var aviso = _context.Notificaciones
                .FirstOrDefault(n => n.IdNotificacion == id && n.IdUsuario == IdUsuarioActual);

            // El aviso de autorización sigue sin leer hasta que el administrador autoriza
            if (aviso != null && aviso.Tipo != TiposNotificacion.AutorizacionRequerida)
            {
                aviso.Leida = true;
                _context.SaveChanges();
            }

            return new JsonResult(new { success = true });
        }

        public JsonResult OnPostLeerTodas()
        {
            var avisos = _context.Notificaciones
                .Where(n => n.IdUsuario == IdUsuarioActual && !n.Leida && n.Tipo != TiposNotificacion.AutorizacionRequerida)
                .ToList();

            avisos.ForEach(n => n.Leida = true);
            _context.SaveChanges();

            return new JsonResult(new { success = true });
        }

        // Datos para el modal de vista previa del requerimiento
        public async Task<JsonResult> OnGetRequerimiento(int id)
        {
            var sol = _context.Solicitudes
                .AsNoTracking()
                .Include(s => s.Personal)
                .FirstOrDefault(s => s.IdSolicitud == id);

            if (sol == null || !await PuedeVerAsync(id))
            {
                return new JsonResult(new { success = false, message = "No tienes acceso a este requerimiento." });
            }

            return new JsonResult(new
            {
                success = true,
                folio = sol.IdSolicitud.ToString("D4"),
                solicitante = sol.Personal?.Nombre ?? "N/A",
                estatus = EstatusSolicitud.Texto(sol.Estatus),
                puedeAutorizar = _notificaciones.PuedeAutorizar(sol, IdUsuarioActual)
            });
        }

        public JsonResult OnPostAutorizar(int id)
        {
            var sol = _context.Solicitudes
                .Include(s => s.Personal)
                .FirstOrDefault(s => s.IdSolicitud == id);

            if (sol == null)
            {
                return new JsonResult(new { success = false, message = "La solicitud ya no existe." });
            }

            if (!_notificaciones.PuedeAutorizar(sol, IdUsuarioActual))
            {
                string motivo = sol.Estatus == EstatusSolicitud.PorAutorizar
                    ? $"Solo {sol.AutorizaAdmin} puede autorizar este requerimiento."
                    : "Este requerimiento ya fue autorizado.";

                return new JsonResult(new { success = false, message = motivo });
            }

            string usuario = HttpContext.Session.GetString("NombreCompleto") ?? sol.AutorizaAdmin ?? "Sistema";

            sol.Estatus = EstatusSolicitud.Pendiente;
            sol.AutorizadoPor = usuario;
            sol.FechaAutorizacion = DateTime.Now;
            sol.DescripcionProblema = Solicitud.AgregarComentario(sol.DescripcionProblema, usuario, "Requerimiento autorizado.");
            _context.SaveChanges();

            _notificaciones.NotificarAutorizado(sol, sol.Personal);
            _notificaciones.ActualizarPendientesSoporte(sol.EjecutivoAsignado, avisar: false);
            _context.SaveChanges();

            return new JsonResult(new { success = true, folio = sol.IdSolicitud.ToString("D4") });
        }

        private Task<bool> PuedeVerAsync(int idSolicitud)
        {
            return PuedeVerSolicitudAsync(_context, _permisos, idSolicitud, IdUsuarioActual);
        }

        // Puede ver el requerimiento quien tiene acceso a Consultar o recibió una notificación de él.
        // También lo usa la página del formato (Solicitudes/Formato).
        public static async Task<bool> PuedeVerSolicitudAsync(ApplicationDbContext context, PermisosService permisos, int idSolicitud, int? idUsuario)
        {
            if (await permisos.PuedeAsync(Modulos.ConsultarSolicitudes, Accion.Ver)) return true;

            return context.Notificaciones.Any(n => n.IdSolicitud == idSolicitud && n.IdUsuario == idUsuario);
        }
    }
}
