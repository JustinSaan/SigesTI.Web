using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SigesTI.Web.Data;
using System.Globalization;

namespace SigesTI.Web.Pages
{
    public class ActividadRecienteItem
    {
        public string Tipo { get; set; } = string.Empty;
        public string BadgeClass { get; set; } = string.Empty;
        public string Icono { get; set; } = string.Empty;
        public string Titulo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string UrlDetalle { get; set; } = string.Empty;
    }

    public class IndexModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public IndexModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public string NombreUsuarioActual { get; set; } = string.Empty;
        public string RolUsuarioActual { get; set; } = string.Empty;
        public string FechaActualTexto { get; set; } = string.Empty;
        public string HoraActualTexto { get; set; } = string.Empty;

        public List<ActividadRecienteItem> ListaActividades { get; set; } = new();

        public IActionResult OnGet()
        {
            int? idUsuario = HttpContext.Session.GetInt32("IdUsuario");

            if (idUsuario == null)
            {
                return RedirectToPage("/InicioSesion/Login");
            }

            NombreUsuarioActual = HttpContext.Session.GetString("NombreCompleto") ?? "Usuario";
            RolUsuarioActual = HttpContext.Session.GetString("Rol") ?? "Sin rol";

            // Fecha y Hora del Sistema
            var ahora = DateTime.Now;
            FechaActualTexto = ahora.ToString("dddd, dd 'de' MMMM 'de' yyyy", new CultureInfo("es-MX"));
            FechaActualTexto = char.ToUpper(FechaActualTexto[0]) + FechaActualTexto.Substring(1);
            HoraActualTexto = ahora.ToString("hh:mm tt");

            // Cargar avisos y datos reales desde la base de datos
            CargarActividadesReales();

            return Page();
        }

        private void CargarActividadesReales()
        {
            ListaActividades = new List<ActividadRecienteItem>();
            var hoy = DateTime.Today;

            // ==========================================
            // 1. TICKETS RESUELTOS HOY (Filtro Estricto)
            // ==========================================
            // Se evalúa ÚNICAMENTE FechaSolucion para evitar que la FechaUltimaModificacion nos dé un falso positivo.
            var ticketsResueltosHoy = _context.Tickets
                .Where(t => (t.Estatus == "Resuelto" || t.Estatus == "Cerrado") &&
                            t.FechaSolucion.HasValue &&
                            t.FechaSolucion.Value.Date == hoy)
                .OrderByDescending(t => t.Id)
                .ToList();

            foreach (var ticket in ticketsResueltosHoy)
            {
                string usuarioEjecuto = !string.IsNullOrEmpty(ticket.Ejecutivo)
                    ? ticket.Ejecutivo
                    : (!string.IsNullOrEmpty(ticket.Reporto) ? ticket.Reporto : NombreUsuarioActual);

                string numTicket = !string.IsNullOrEmpty(ticket.NumeroTicket) ? ticket.NumeroTicket : ticket.Id.ToString();

                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "RESUELTO",
                    BadgeClass = "card-resuelto",
                    Icono = "bi-check-circle-fill",
                    Titulo = $"Ticket #{numTicket} Resuelto",
                    Descripcion = $"{usuarioEjecuto} ha cerrado o resuelto el Ticket #{numTicket} el día de hoy.",
                    UrlDetalle = "/Actividades/ReporteTickets"
                });
            }

            // ==========================================
            // 2. TICKETS CREADOS HOY
            // ==========================================
            var ticketsCreadosHoy = _context.Tickets
                .Where(t => t.FechaEntrada.Date == hoy && (t.Estatus == "En Curso" || t.Estatus == "Pendiente" || t.Estatus == "Abierto"))
                .OrderByDescending(t => t.Id)
                .ToList();

            foreach (var ticket in ticketsCreadosHoy)
            {
                string usuarioEjecuto = !string.IsNullOrEmpty(ticket.Ejecutivo)
                    ? ticket.Ejecutivo
                    : (!string.IsNullOrEmpty(ticket.Reporto) ? ticket.Reporto : NombreUsuarioActual);

                string numTicket = !string.IsNullOrEmpty(ticket.NumeroTicket) ? ticket.NumeroTicket : ticket.Id.ToString();

                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "TICKET",
                    BadgeClass = "card-ticket",
                    Icono = "bi-ticket-perforated-fill",
                    Titulo = $"Nuevo Ticket #{numTicket}",
                    Descripcion = $"{usuarioEjecuto} ha generado el Ticket #{numTicket} y se encuentra en estado '{ticket.Estatus}'.",
                    UrlDetalle = "/Actividades/ReporteTickets"
                });
            }

            // ==========================================
            // 3. TICKETS PENDIENTES DE DÍAS ANTERIORES
            // ==========================================
            var ticketsAnterioresPendientes = _context.Tickets
                .Where(t => t.FechaEntrada.Date < hoy && (t.Estatus == "En Curso" || t.Estatus == "Pendiente" || t.Estatus == "Abierto"))
                .ToList();

            if (ticketsAnterioresPendientes.Count > 0)
            {
                var ejecutivos = ticketsAnterioresPendientes
                    .Select(t => !string.IsNullOrEmpty(t.Ejecutivo) ? t.Ejecutivo : (!string.IsNullOrEmpty(t.Reporto) ? t.Reporto : NombreUsuarioActual))
                    .Distinct()
                    .ToList();

                string usuarioTexto = ejecutivos.Count == 1 ? ejecutivos.First() : "El equipo de Soporte";

                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "TICKET PENDIENTE",
                    BadgeClass = "card-pendiente",
                    Icono = "bi-clock-history",
                    Titulo = "Tickets Pendientes",
                    Descripcion = $"{usuarioTexto} tiene {ticketsAnterioresPendientes.Count} ticket(s) en curso pendientes de días anteriores.",
                    UrlDetalle = "/Actividades/ReporteTickets"
                });
            }

            // ==========================================
            // 4. SOLICITUDES DE REQUERIMIENTO
            // ==========================================
            var solicitudesHoy = _context.Solicitudes
                .Where(s => s.FechaIngreso.Date == hoy)
                .OrderByDescending(s => s.IdSolicitud)
                .ToList();

            foreach (var sol in solicitudesHoy)
            {
                string usuarioEjecuto = !string.IsNullOrEmpty(sol.EjecutivoAsignado)
                    ? sol.EjecutivoAsignado
                    : (!string.IsNullOrEmpty(sol.AutorizaAdmin) ? sol.AutorizaAdmin : NombreUsuarioActual);

                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "SOLICITUD",
                    BadgeClass = sol.Estatus == "Resuelto" ? "card-resuelto" : "card-ticket",
                    Icono = sol.Estatus == "Resuelto" ? "bi-check-circle-fill" : "bi-file-earmark-text-fill",
                    Titulo = $"Solicitud #{sol.IdSolicitud}",
                    Descripcion = $"{usuarioEjecuto} gestionó la Solicitud #{sol.IdSolicitud} (Estatus: {sol.Estatus}).",
                    UrlDetalle = "/Solicitudes/Consultar"
                });
            }

            int solicitudesAnterioresPendientes = _context.Solicitudes
                .Count(s => s.FechaIngreso.Date < hoy && (s.Estatus == "Pendiente" || s.Estatus == "En Curso"));

            if (solicitudesAnterioresPendientes > 0)
            {
                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "SOLICITUD PENDIENTE",
                    BadgeClass = "card-pendiente",
                    Icono = "bi-exclamation-triangle-fill",
                    Titulo = "Requerimientos Pendientes",
                    Descripcion = $"Hay {solicitudesAnterioresPendientes} solicitud(es) de requerimientos pendiente(s) por resolver.",
                    UrlDetalle = "/Solicitudes/Consultar"
                });
            }

            // ==========================================
            // 5. SEGURIDAD & RESPALDOS
            // ==========================================
            int usuariosCambioPassword = _context.UsuariosSistema
                .Count(u => u.RequiereCambioPassword == true && u.Activo == true);

            if (usuariosCambioPassword > 0)
            {
                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "SEGURIDAD",
                    BadgeClass = "card-seguridad",
                    Icono = "bi-shield-lock-fill",
                    Titulo = "Seguridad del Sistema",
                    Descripcion = $"Hay {usuariosCambioPassword} usuario(s) pendiente(s) por cambiar su contraseña en el sistema.",
                    UrlDetalle = "/Cuenta/AdminVista"
                });
            }

            ListaActividades.Add(new ActividadRecienteItem
            {
                Tipo = "RESPALDO",
                BadgeClass = "card-respaldo",
                Icono = "bi-hdd-network-fill",
                Titulo = "Plan de Respaldos",
                Descripcion = "El respaldo del área de Soporte Técnico y Base de Datos está programado dentro de las actividades.",
                UrlDetalle = "/Actividades/PlanRespaldos"
            });
        }
    }
}
