using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using SigesTI.Web.Seguridad;
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

    // Paso: 1 = Registrado (por autorizar), 2 = En atención, 3 = Resuelto
    public record MiRequerimiento(int IdSolicitud, string Descripcion, string Estatus, int Paso, string? Ejecutivo, DateTime FechaIngreso);

    public class IndexModel : PageModel
    {
        private static readonly CultureInfo CulturaMx = new("es-MX");
        private static readonly string[] EstatusTicketAbierto = { "En Curso", "Pendiente", "Abierto" };
        private static readonly string[] EstatusSolicitudPendiente = { "Pendiente", "En Curso", "Por autorizar" };

        private readonly ApplicationDbContext _context;
        private readonly PermisosService _permisos;

        public IndexModel(ApplicationDbContext context, PermisosService permisos)
        {
            _context = context;
            _permisos = permisos;
        }

        public string NombreUsuarioActual { get; set; } = string.Empty;
        public string Saludo { get; set; } = string.Empty;
        public string FechaActualTexto { get; set; } = string.Empty;
        public string HoraActualTexto { get; set; } = string.Empty;

        public List<ActividadRecienteItem> ListaActividades { get; set; } = new();
        public List<Aviso> Avisos { get; set; } = new();
        public List<MiRequerimiento> MisRequerimientos { get; set; } = new();

        // Sin persona ligada en Administración de Personal no hay requerimientos propios que mostrar
        public bool TienePersonal { get; set; }
        public bool EsAdmin => _permisos.EsAdmin;

        public async Task OnGetAsync()
        {
            NombreUsuarioActual = HttpContext.Session.GetString("NombreCompleto") ?? "Usuario";

            await CargarAvisosAsync();
            await CargarMisRequerimientosAsync();

            // Fecha y Hora del Sistema (el reloj se actualiza en pantalla con JavaScript)
            var ahora = DateTime.Now;
            Saludo = ahora.Hour < 12 ? "Buenos días" : ahora.Hour < 19 ? "Buenas tardes" : "Buenas noches";
            FechaActualTexto = ahora.ToString("dddd, dd 'de' MMMM 'de' yyyy", CulturaMx);
            FechaActualTexto = char.ToUpper(FechaActualTexto[0]) + FechaActualTexto.Substring(1);
            HoraActualTexto = ahora.ToString("hh:mm tt", CulturaMx);

            bool verTickets = await _permisos.PuedeAsync(Modulos.ReporteTickets, Accion.Ver);
            bool verSolicitudes = await _permisos.PuedeAsync(Modulos.ConsultarSolicitudes, Accion.Ver);

            // Solo se consultan las secciones que el rol puede ver
            if (verTickets)
            {
                await CargarTicketsAsync();
            }

            if (verSolicitudes)
            {
                await CargarSolicitudesAsync();
            }

            if (await _permisos.PuedeAsync(Modulos.Cuenta, Accion.Ver))
            {
                await CargarSeguridadAsync();
            }

            if (await _permisos.PuedeAsync(Modulos.PlanRespaldos, Accion.Ver))
            {
                await CargarRespaldosAsync();
            }
        }

        public async Task<IActionResult> OnPostPublicarAvisoAsync(string titulo, string mensaje, string tipo, DateTime? fechaExpira)
        {
            if (!EsAdmin)
            {
                return RedirectToPage();
            }

            titulo = (titulo ?? "").Trim();
            mensaje = (mensaje ?? "").Trim();

            if (titulo == "" || mensaje == "")
            {
                TempData["AvisoError"] = "Escribe el título y el mensaje del aviso.";
                return RedirectToPage();
            }

            _context.Avisos.Add(new Aviso
            {
                Titulo = titulo.Length > 100 ? titulo[..100] : titulo,
                Mensaje = mensaje.Length > 500 ? mensaje[..500] : mensaje,
                Tipo = TiposAviso.Todos.Contains(tipo) ? tipo : TiposAviso.Informativo,
                PublicadoPor = HttpContext.Session.GetString("NombreCompleto"),
                FechaPublicacion = DateTime.Now,
                FechaExpira = fechaExpira?.Date
            });

            await _context.SaveChangesAsync();

            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostQuitarAvisoAsync(int id)
        {
            if (EsAdmin)
            {
                await _context.Avisos.Where(a => a.IdAviso == id).ExecuteDeleteAsync();
            }

            return RedirectToPage();
        }

        // Avisos vigentes, los más recientes primero
        private async Task CargarAvisosAsync()
        {
            var hoy = DateTime.Today;

            Avisos = await _context.Avisos
                .AsNoTracking()
                .Where(a => a.FechaExpira == null || a.FechaExpira >= hoy)
                .OrderByDescending(a => a.FechaPublicacion)
                .Take(5)
                .ToListAsync();
        }

        // Requerimientos que generó la persona ligada al usuario: los abiertos y los resueltos en la última semana
        private async Task CargarMisRequerimientosAsync()
        {
            int? idUsuario = HttpContext.Session.GetInt32("IdUsuario");

            var idPersonal = await _context.Personal
                .Where(p => p.IdUsuario == idUsuario)
                .Select(p => (int?)p.Id)
                .FirstOrDefaultAsync();

            TienePersonal = idPersonal != null;

            if (!TienePersonal)
            {
                return;
            }

            var haceUnaSemana = DateTime.Today.AddDays(-7);

            var solicitudes = await _context.Solicitudes
                .AsNoTracking()
                .Where(s => s.IdPersonal == idPersonal &&
                            (s.Estatus != EstatusSolicitud.Resuelto || s.FechaEntrega >= haceUnaSemana))
                .OrderByDescending(s => s.IdSolicitud)
                .Take(5)
                .Select(s => new { s.IdSolicitud, s.DescripcionRequisito, s.DescripcionProblema, s.Estatus, s.EjecutivoAsignado, s.FechaIngreso })
                .ToListAsync();

            foreach (var s in solicitudes)
            {
                string descripcion = Solicitud.LeerDescripcionYSeguimiento(s.DescripcionRequisito, s.DescripcionProblema).Descripcion;

                if (descripcion.Length > 90)
                {
                    descripcion = descripcion[..90].TrimEnd() + "…";
                }

                int paso = s.Estatus == EstatusSolicitud.PorAutorizar ? 1
                    : s.Estatus == EstatusSolicitud.Resuelto ? 3
                    : 2;

                MisRequerimientos.Add(new MiRequerimiento(
                    s.IdSolicitud, descripcion, EstatusSolicitud.Texto(s.Estatus), paso, s.EjecutivoAsignado, s.FechaIngreso));
            }
        }

        // Respaldos de los equipos activos: los de hoy (o el próximo) y, solo para el administrador, los atrasados
        private async Task CargarRespaldosAsync()
        {
            var hoy = DateTime.Today;
            var manana = hoy.AddDays(1);

            var programaciones = _context.ProgramacionRespaldos
                .AsNoTracking()
                .Where(p => p.EquipoRespaldo != null && p.EquipoRespaldo.Activo);

            var deHoy = await programaciones
                .Where(p => p.FechaProgramada >= hoy && p.FechaProgramada < manana)
                .Select(p => new { p.Estado, p.EquipoRespaldo!.Area, p.EquipoRespaldo.Hostname })
                .ToListAsync();

            if (deHoy.Count > 0)
            {
                var pendientes = deHoy.Where(p => p.Estado != "Realizado").ToList();
                int realizados = deHoy.Count - pendientes.Count;

                string descripcion = pendientes.Count > 0
                    ? $"Hoy toca respaldar los equipos de {UnirAreas(pendientes.Select(p => p.Area ?? p.Hostname))}."
                    : $"Los respaldos de hoy para {UnirAreas(deHoy.Select(p => p.Area ?? p.Hostname))} ya se realizaron.";

                if (pendientes.Count > 0 && realizados > 0)
                {
                    descripcion += $" Ya se realizaron {realizados} de {deHoy.Count}.";
                }

                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "RESPALDO",
                    BadgeClass = pendientes.Count > 0 ? "card-respaldo" : "card-resuelto",
                    Icono = pendientes.Count > 0 ? "bi-hdd-network-fill" : "bi-check-circle-fill",
                    Titulo = "Respaldos de Hoy",
                    Descripcion = descripcion,
                    UrlDetalle = "/Actividades/PlanRespaldos"
                });
            }
            else
            {
                var fechaProxima = await programaciones
                    .Where(p => p.FechaProgramada >= manana && p.Estado != "Realizado")
                    .OrderBy(p => p.FechaProgramada)
                    .Select(p => (DateTime?)p.FechaProgramada.Date)
                    .FirstOrDefaultAsync();

                string descripcion = "No hay respaldos programados próximamente.";

                if (fechaProxima != null)
                {
                    var diaSiguiente = fechaProxima.Value.AddDays(1);

                    // Todas las áreas que tienen respaldo ese mismo día
                    var areas = await programaciones
                        .Where(p => p.FechaProgramada >= fechaProxima && p.FechaProgramada < diaSiguiente && p.Estado != "Realizado")
                        .Select(p => p.EquipoRespaldo!.Area ?? p.EquipoRespaldo.Hostname)
                        .ToListAsync();

                    descripcion = $"Hoy no hay respaldos programados. El próximo es el {fechaProxima.Value.ToString("dddd dd 'de' MMMM", CulturaMx)} para {UnirAreas(areas)}.";
                }

                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "RESPALDO",
                    BadgeClass = "card-respaldo",
                    Icono = "bi-hdd-network-fill",
                    Titulo = "Plan de Respaldos",
                    Descripcion = descripcion,
                    UrlDetalle = "/Actividades/PlanRespaldos"
                });
            }

            if (!EsAdmin)
            {
                return;
            }

            int atrasados = await programaciones
                .CountAsync(p => p.FechaProgramada < hoy && p.Estado != "Realizado");

            if (atrasados > 0)
            {
                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "RESPALDO ATRASADO",
                    BadgeClass = "card-pendiente",
                    Icono = "bi-exclamation-triangle-fill",
                    Titulo = "Respaldos Atrasados",
                    Descripcion = $"Hay {atrasados} respaldo(s) de días anteriores que no se han marcado como realizados.",
                    UrlDetalle = "/Actividades/PlanRespaldos"
                });
            }
        }

        private async Task CargarTicketsAsync()
        {
            var hoy = DateTime.Today;
            var manana = hoy.AddDays(1);

            // Tickets resueltos hoy: solo se evalúa FechaSolucion para evitar falsos positivos
            var ticketsResueltosHoy = await _context.Tickets
                .AsNoTracking()
                .Where(t => (t.Estatus == "Resuelto" || t.Estatus == "Cerrado") &&
                            t.FechaSolucion >= hoy && t.FechaSolucion < manana)
                .OrderByDescending(t => t.Id)
                .ToListAsync();

            foreach (var ticket in ticketsResueltosHoy)
            {
                string usuarioEjecuto = ResponsableTicket(ticket.Ejecutivo, ticket.Reporto);
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

            // Tickets creados hoy que siguen abiertos
            var ticketsCreadosHoy = await _context.Tickets
                .AsNoTracking()
                .Where(t => t.FechaEntrada >= hoy && t.FechaEntrada < manana && EstatusTicketAbierto.Contains(t.Estatus))
                .OrderByDescending(t => t.Id)
                .ToListAsync();

            foreach (var ticket in ticketsCreadosHoy)
            {
                string usuarioEjecuto = ResponsableTicket(ticket.Ejecutivo, ticket.Reporto);
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

            // Tickets pendientes de días anteriores (solo se traen los responsables)
            var responsablesPendientes = await _context.Tickets
                .AsNoTracking()
                .Where(t => t.FechaEntrada < hoy && EstatusTicketAbierto.Contains(t.Estatus))
                .Select(t => new { t.Ejecutivo, t.Reporto })
                .ToListAsync();

            if (responsablesPendientes.Count > 0)
            {
                var ejecutivos = responsablesPendientes
                    .Select(t => ResponsableTicket(t.Ejecutivo, t.Reporto))
                    .Distinct()
                    .ToList();

                string usuarioTexto = ejecutivos.Count == 1 ? ejecutivos[0] : "El equipo de Soporte";

                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "TICKET PENDIENTE",
                    BadgeClass = "card-pendiente",
                    Icono = "bi-clock-history",
                    Titulo = "Tickets Pendientes",
                    Descripcion = $"{usuarioTexto} tiene {responsablesPendientes.Count} ticket(s) en curso pendientes de días anteriores.",
                    UrlDetalle = "/Actividades/ReporteTickets"
                });
            }
        }

        private async Task CargarSolicitudesAsync()
        {
            var hoy = DateTime.Today;
            var manana = hoy.AddDays(1);

            var solicitudesHoy = await _context.Solicitudes
                .AsNoTracking()
                .Where(s => s.FechaIngreso >= hoy && s.FechaIngreso < manana)
                .OrderByDescending(s => s.IdSolicitud)
                .ToListAsync();

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

            int solicitudesAnterioresPendientes = await _context.Solicitudes
                .CountAsync(s => s.FechaIngreso < hoy && EstatusSolicitudPendiente.Contains(s.Estatus));

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
        }

        private async Task CargarSeguridadAsync()
        {
            int usuariosCambioPassword = await _context.UsuariosSistema
                .CountAsync(u => u.RequiereCambioPassword == true && u.Activo == true);

            if (usuariosCambioPassword > 0)
            {
                ListaActividades.Add(new ActividadRecienteItem
                {
                    Tipo = "SEGURIDAD",
                    BadgeClass = "card-seguridad",
                    Icono = "bi-shield-lock-fill",
                    Titulo = "Seguridad del Sistema",
                    Descripcion = $"Hay {usuariosCambioPassword} usuario(s) pendiente(s) por cambiar su contraseña en el sistema.",
                    UrlDetalle = "/Cuenta/ControlAcceso"
                });
            }
        }

        // "Desarrollo, Soporte Técnico y Administración" (sin repetir áreas)
        private static string UnirAreas(IEnumerable<string> areas)
        {
            var lista = areas.Where(a => !string.IsNullOrWhiteSpace(a)).Distinct().ToList();

            return lista.Count <= 1
                ? lista.FirstOrDefault() ?? ""
                : string.Join(", ", lista.Take(lista.Count - 1)) + " y " + lista[^1];
        }

        private string ResponsableTicket(string? ejecutivo, string? reporto)
        {
            if (!string.IsNullOrEmpty(ejecutivo)) return ejecutivo;
            if (!string.IsNullOrEmpty(reporto)) return reporto;
            return NombreUsuarioActual;
        }
    }
}
