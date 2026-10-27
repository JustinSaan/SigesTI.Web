using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Seguridad;
using SigesTI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using PersonalModel = SigesTI.Web.Models.Personal;

namespace SigesTI.Web.Pages.Actividades
{
    [Modulo(Modulos.ReporteTickets)]
    public class ReporteTicketsModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public ReporteTicketsModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public IList<Ticket> ListaTickets { get; set; } = new List<Ticket>();
        public IList<Cliente> ListaClientes { get; set; } = new List<Cliente>();
        public IList<PersonalModel> ListaEjecutivosSoporte { get; set; } = new List<PersonalModel>();
        public IList<SistemaTicket> Sistemas { get; set; } = new List<SistemaTicket>();
        public IEnumerable<SistemaTicket> SistemasExternos => Sistemas.Where(s => !s.Interno);
        public IEnumerable<SistemaTicket> SistemasInternos => Sistemas.Where(s => s.Interno);

        public IndicadoresTicketsDto IndicadoresDia { get; set; } = new IndicadoresTicketsDto();
        public IndicadoresTicketsDto IndicadoresSeguimiento { get; set; } = new IndicadoresTicketsDto();
        public IList<ConcentradoSistemaDto> ConcentradoSistemas { get; set; } = new List<ConcentradoSistemaDto>();
        public ConcentradoSistemaDto ConcentradoTotal { get; set; } = new ConcentradoSistemaDto();

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaReporte { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroSistema { get; set; }

        // Busca por número de ticket, nombre o clave de cliente en todas las fechas
        [BindProperty(SupportsGet = true)]
        public string? Busqueda { get; set; }

        public bool EnBusqueda => !string.IsNullOrWhiteSpace(Busqueda);

        private Dictionary<string, string> _clavesPorNombre = new Dictionary<string, string>();
        private bool _mostrarEstatusActual;

        public async Task OnGetAsync()
        {
            FechaReporte ??= DateTime.Today;
            FiltroSistema = FiltroSistema?.Trim();
            Sistemas = await CargarSistemasAsync();

            var clientes = await _context.Clientes.AsNoTracking().ToListAsync();
            ListaClientes = clientes.Where(c => c.Activo).ToList();
            _clavesPorNombre = clientes
                .GroupBy(c => c.Nombre.Trim().ToUpper())
                .ToDictionary(g => g.Key, g => g.First().Clave);
            ListaEjecutivosSoporte = await _context.Personal
                .Where(p => p.Activo && p.Area == "Soporte Técnico")
                .ToListAsync();

            var inicioDia = FechaReporte.Value.Date;
            var finDia = inicioDia.AddDays(1);

            // LÓGICA DE VISIBILIDAD DE TICKETS SEGÚN LA FECHA CONSULTADA (inicioDia)
            var query = _context.Tickets
                .Where(t => t.Activo && (
                    // 1. Tickets creados/abiertos en la fecha consultada
                    (t.FechaEntrada >= inicioDia && t.FechaEntrada < finDia) ||

                    // 2. Tickets cuya FECHA DE SOLUCIÓN sea la fecha consultada (sin importar cuándo se abrieron)
                    (t.FechaSolucion.HasValue && t.FechaSolucion.Value >= inicioDia && t.FechaSolucion.Value < finDia) ||

                    // 3. Tickets que se abrieron ANTES del día consultado y que en ese día AÚN SEGUÍAN "En curso"
                    // (Si ya se cerraron, solo aplican si su FechaSolucion fue posterior al día consultado)
                    (t.FechaEntrada < inicioDia && (
                        t.Estatus == "En curso" ||
                        (t.FechaSolucion.HasValue && t.FechaSolucion.Value >= finDia)
                    ))
                ));

            ListaTickets = await FiltrarPorSistema(query)
                .OrderByDescending(t => t.Estatus == "En curso")
                .ThenByDescending(t => t.FechaEntrada)
                .ToListAsync();

            // Separación para los indicadores del panel superior
            var ticketsDelDia = ListaTickets
                .Where(t => t.FechaEntrada >= inicioDia && t.FechaEntrada < finDia)
                .ToList();

            var ticketsSeguimiento = ListaTickets
                .Where(t => t.FechaEntrada < inicioDia)
                .ToList();

            IndicadoresDia = CalcularMetricas(ticketsDelDia);
            IndicadoresSeguimiento = CalcularMetricas(ticketsSeguimiento);
            ConcentradoSistemas = CalcularConcentrado(ListaTickets, inicioDia);
            ConcentradoTotal = new ConcentradoSistemaDto
            {
                Sistema = "TOTAL",
                Total = ConcentradoSistemas.Sum(c => c.Total),
                Incidencias = ConcentradoSistemas.Sum(c => c.Incidencias),
                Servicios = ConcentradoSistemas.Sum(c => c.Servicios),
                Otros = ConcentradoSistemas.Sum(c => c.Otros),
                Telefono = ConcentradoSistemas.Sum(c => c.Telefono),
                Correo = ConcentradoSistemas.Sum(c => c.Correo),
                Interno = ConcentradoSistemas.Sum(c => c.Interno),
                TiempoForma = ConcentradoSistemas.Sum(c => c.TiempoForma),
                CerradosAtrasados = ConcentradoSistemas.Sum(c => c.CerradosAtrasados),
                EnCurso = ConcentradoSistemas.Sum(c => c.EnCurso)
            };

            // Con búsqueda, indicadores y gráficas siguen siendo del día; solo el Detalle muestra los resultados
            if (EnBusqueda)
            {
                ListaTickets = await BuscarTicketsAsync(Busqueda!.Trim(), clientes);
                _mostrarEstatusActual = true;
            }
        }

        private Task<List<SistemaTicket>> CargarSistemasAsync()
        {
            return _context.SistemasTicket.AsNoTracking()
                .OrderBy(s => s.Orden).ThenBy(s => s.Nombre)
                .ToListAsync();
        }

        private IQueryable<Ticket> FiltrarPorSistema(IQueryable<Ticket> query)
        {
            if (!string.IsNullOrEmpty(FiltroSistema))
            {
                return query.Where(t => t.Sistema == FiltroSistema);
            }

            return query;
        }

        private async Task<List<Ticket>> BuscarTicketsAsync(string termino, List<Cliente> clientes)
        {
            var terminoMayus = termino.ToUpper();
            var nombresCoinciden = clientes
                .Where(c => c.Clave.ToUpper().Contains(terminoMayus) || c.Nombre.ToUpper().Contains(terminoMayus))
                .Select(c => c.Nombre)
                .ToList();

            var query = _context.Tickets.Where(t => t.Activo && (
                t.NumeroTicket.Contains(termino) ||
                t.Cliente.Contains(termino) ||
                nombresCoinciden.Contains(t.Cliente)));

            return await FiltrarPorSistema(query)
                .OrderByDescending(t => t.FechaEntrada)
                .Take(300)
                .ToListAsync();
        }

        public string ClaveCliente(string? nombreCliente)
        {
            var nombre = (nombreCliente ?? "").Trim().ToUpper();
            return _clavesPorNombre.TryGetValue(nombre, out var clave) ? clave : "";
        }

        // "451-0 KENWORTH MEXICANA"; si el cliente no está en el catálogo solo muestra el nombre
        public string ClienteConClave(string? nombreCliente)
        {
            var clave = ClaveCliente(nombreCliente);
            return clave == "" ? nombreCliente ?? "" : $"{clave} {nombreCliente}";
        }

        // Clase CSS de la insignia del sistema; un sistema que ya no está en el catálogo se ve gris
        public string ClaseSistema(string? sistema)
        {
            return SistemaTicket.Buscar(Sistemas, sistema)?.ClaseCss ?? "badge-sistema-otro";
        }

        // Estatus que tenía el ticket al cierre de la fecha consultada.
        // Un ticket cerrado después de esa fecha seguía "En curso" ese día.
        public string EstatusEnFecha(Ticket ticket)
        {
            // En resultados de búsqueda (varias fechas) se muestra el estatus actual
            if (_mostrarEstatusActual) return ticket.Estatus == "Cerrado" ? "Cerrado" : "En curso";

            var finDia = (FechaReporte ?? DateTime.Today).Date.AddDays(1);
            bool cerradoEseDia = ticket.Estatus == "Cerrado"
                && (!ticket.FechaSolucion.HasValue || ticket.FechaSolucion.Value < finDia);

            return cerradoEseDia ? "Cerrado" : "En curso";
        }

        private List<ConcentradoSistemaDto> CalcularConcentrado(IList<Ticket> tickets, DateTime inicioDia)
        {
            return tickets
                .GroupBy(t => string.IsNullOrWhiteSpace(t.Sistema) ? "SIN SISTEMA" : t.Sistema.Trim().ToUpper())
                .Select(g => new ConcentradoSistemaDto
                {
                    Sistema = g.Key,
                    Total = g.Count(),
                    Incidencias = g.Count(t => t.Tipo == "Incidencia"),
                    Servicios = g.Count(t => t.Tipo == "Servicio"),
                    Otros = g.Count(t => t.Tipo != "Incidencia" && t.Tipo != "Servicio"),
                    Telefono = g.Count(t => t.Origen == "Llamada"),
                    Correo = g.Count(t => t.Origen == "Correo"),
                    Interno = g.Count(t => t.Origen == "Interno"),
                    TiempoForma = g.Count(t => EstatusEnFecha(t) == "Cerrado" && t.FechaEntrada.Date == inicioDia),
                    CerradosAtrasados = g.Count(t => EstatusEnFecha(t) == "Cerrado" && t.FechaEntrada.Date < inicioDia),
                    EnCurso = g.Count(t => EstatusEnFecha(t) == "En curso")
                })
                .OrderByDescending(c => c.Total)
                .ToList();
        }

        private bool PuedeEditar(Ticket ticket)
        {
            string rol = HttpContext.Session.GetString("Rol") ?? "";
            if (rol == Roles.Admin) return true;

            string usuario = HttpContext.Session.GetString("Usuario") ?? "";
            string nombreCompleto = HttpContext.Session.GetString("NombreCompleto") ?? "";
            bool esMio = ticket.Ejecutivo.Equals(usuario, StringComparison.OrdinalIgnoreCase)
                      || ticket.Ejecutivo.Equals(nombreCompleto, StringComparison.OrdinalIgnoreCase);

            return esMio && ticket.Estatus != "Cerrado";
        }

        private IndicadoresTicketsDto CalcularMetricas(List<Ticket> tickets)
        {
            return new IndicadoresTicketsDto
            {
                Total = tickets.Count,
                Servicio = tickets.Count(t => t.Tipo == "Servicio"),
                Incidencia = tickets.Count(t => t.Tipo == "Incidencia"),
                Ajuste = tickets.Count(t => t.Tipo == "Ajuste"),
                Mejora = tickets.Count(t => t.Tipo == "Mejora"),

                PorSistema = Sistemas.ToDictionary(
                    s => s.IdSistema,
                    s => tickets.Count(t => s.Nombre.Equals((t.Sistema ?? "").Trim(), StringComparison.OrdinalIgnoreCase))),

                Llamada = tickets.Count(t => t.Origen == "Llamada"),
                Correo = tickets.Count(t => t.Origen == "Correo"),
                EscaladoDesarrollo = tickets.Count(t => t.Escalado && t.AreaEscalada == "Desarrollo"),
                EscaladoConsultoria = tickets.Count(t => t.Escalado && t.AreaEscalada == "Consultoría"),
                EscaladoVentas = tickets.Count(t => t.Escalado && t.AreaEscalada == "Ventas"),
                EscaladoCobranza = tickets.Count(t => t.Escalado && t.AreaEscalada == "Cobranza"),
                Cerrado = tickets.Count(t => EstatusEnFecha(t) == "Cerrado"),
                EnCurso = tickets.Count(t => EstatusEnFecha(t) == "En curso")
            };
        }

        public async Task<JsonResult> OnGetContactosPorClienteAsync(int clienteId)
        {
            var contactos = await _context.ContactosCliente
                .Where(c => c.ClienteId == clienteId && c.Activo)
                .Select(c => new { c.NombreContacto, c.Correo })
                .ToListAsync();

            return new JsonResult(contactos);
        }

        [Permiso(Accion.Crear)]
        public async Task<IActionResult> OnPostCrearTicketAsync(
            string NumeroTicket, DateTime? FechaEntrada, string Hora, string Origen,
            string ClienteId, string? NuevaClaveCliente, string? NuevoNombreCliente,
            string? Reporto, string? ReportoManual, string? CorreoReporto,
            string Ejecutivo, string Sistema, string Tipo, string Estatus,
            string? Escalado, string? AreaEscalada, string? Descripcion,
            string? Comentarios, string? Solucion, DateTime? FechaSolucion)
        {
            try
            {
                string nombreClienteFinal = "";
                string personaReportoFinal = "";
                bool seEscala = Escalado == "true" || Escalado == "1";

                if (ClienteId == "OTRO" && !string.IsNullOrEmpty(NuevoNombreCliente))
                {
                    var nuevoCliente = new Cliente
                    {
                        Clave = string.IsNullOrWhiteSpace(NuevaClaveCliente) ? "CLI-" + DateTime.Now.Ticks.ToString().Substring(12) : Cliente.NormalizarClave(NuevaClaveCliente),
                        Nombre = NuevoNombreCliente,
                        Activo = true
                    };
                    _context.Clientes.Add(nuevoCliente);
                    await _context.SaveChangesAsync();
                    nombreClienteFinal = nuevoCliente.Nombre;

                    if (!string.IsNullOrEmpty(ReportoManual))
                    {
                        _context.ContactosCliente.Add(new ContactoCliente
                        {
                            ClienteId = nuevoCliente.Id,
                            NombreContacto = ReportoManual,
                            Correo = CorreoReporto,
                            Activo = true
                        });
                        await _context.SaveChangesAsync();
                        personaReportoFinal = ReportoManual;
                    }
                }
                else if (int.TryParse(ClienteId, out int idCliente))
                {
                    var clienteExistente = await _context.Clientes.FindAsync(idCliente);
                    if (clienteExistente != null)
                    {
                        nombreClienteFinal = clienteExistente.Nombre;
                        if (Reporto == "OTRO" && !string.IsNullOrEmpty(ReportoManual))
                        {
                            _context.ContactosCliente.Add(new ContactoCliente
                            {
                                ClienteId = idCliente,
                                NombreContacto = ReportoManual,
                                Correo = CorreoReporto,
                                Activo = true
                            });
                            await _context.SaveChangesAsync();
                            personaReportoFinal = ReportoManual;
                        }
                        else
                        {
                            personaReportoFinal = Reporto ?? "";
                        }
                    }
                }

                DateTime fechaEntradaFinal = FechaEntrada?.Date ?? DateTime.Today;

                var nuevoTicket = new Ticket
                {
                    FechaEntrada = fechaEntradaFinal,
                    Hora = string.IsNullOrEmpty(Hora) ? DateTime.Now.ToString("hh:mm tt") : Hora,
                    NumeroTicket = NumeroTicket,
                    Cliente = nombreClienteFinal,
                    Ejecutivo = Ejecutivo,
                    Reporto = personaReportoFinal,
                    Estatus = Estatus,
                    Sistema = Sistema.Trim(),
                    Tipo = Tipo,
                    Origen = Origen,
                    Descripcion = Descripcion,
                    Comentarios = Comentarios,
                    Solucion = Solucion,
                    Escalado = seEscala,
                    AreaEscalada = seEscala ? AreaEscalada : null,
                    FechaSolucion = (Estatus == "Cerrado") ? (FechaSolucion?.Date ?? DateTime.Today) : null,
                    FechaUltimaModificacion = DateTime.Now,
                    Activo = true
                };

                _context.Tickets.Add(nuevoTicket);
                await _context.SaveChangesAsync();

                TempData["MensajeExito"] = "El ticket fue registrado correctamente.";
                return RedirectToPage(new { fechaReporte = fechaEntradaFinal.ToString("yyyy-MM-dd") });
            }
            catch (Exception)
            {
                TempData["MensajeError"] = "Ocurrió un error al intentar guardar el ticket.";
                return RedirectToPage(new { fechaReporte = FechaReporte?.ToString("yyyy-MM-dd") });
            }
        }

        [Permiso(Accion.Editar)]
        public async Task<IActionResult> OnPostActualizarTicketAsync(
            int TicketId, DateTime? FechaEntrada, string? Hora, string Cliente, string Reporto, string Ejecutivo,
            string Sistema, string Tipo, string Estatus, string Escalado,
            string? AreaEscalada, DateTime? FechaSolucion, string? Descripcion,
            string? Comentarios, string? Solucion)
        {
            DateTime fechaRedireccion = FechaReporte ?? DateTime.Today;

            try
            {
                var ticket = await _context.Tickets.FindAsync(TicketId);
                if (ticket != null && !PuedeEditar(ticket))
                {
                    TempData["MensajeError"] = "No tienes permiso para modificar este ticket.";
                }
                else if (ticket != null)
                {
                    bool seEscala = Escalado == "true" || Escalado == "1";

                    if (FechaEntrada.HasValue)
                    {
                        ticket.FechaEntrada = FechaEntrada.Value.Date;
                        fechaRedireccion = FechaEntrada.Value.Date;
                    }

                    if (!string.IsNullOrEmpty(Hora)) ticket.Hora = Hora;

                    ticket.Cliente = Cliente;
                    ticket.Reporto = Reporto;
                    ticket.Ejecutivo = Ejecutivo;
                    ticket.Sistema = Sistema.Trim();
                    ticket.Tipo = Tipo;
                    ticket.Estatus = Estatus;
                    ticket.Escalado = seEscala;
                    ticket.AreaEscalada = seEscala ? AreaEscalada : null;

                    if (Estatus == "Cerrado")
                    {
                        ticket.FechaSolucion = FechaSolucion?.Date ?? ticket.FechaSolucion?.Date ?? DateTime.Today;
                    }
                    else
                    {
                        ticket.FechaSolucion = null;
                    }

                    ticket.Descripcion = Descripcion;
                    ticket.Comentarios = Comentarios;
                    ticket.Solucion = Solucion;
                    ticket.FechaUltimaModificacion = DateTime.Now;

                    await _context.SaveChangesAsync();
                    TempData["MensajeExito"] = "El ticket se actualizó correctamente.";
                }
            }
            catch (Exception)
            {
                TempData["MensajeError"] = "Ocurrió un problema al actualizar el ticket.";
            }

            return RedirectToPage(new { fechaReporte = fechaRedireccion.ToString("yyyy-MM-dd") });
        }

        public class ConcentradoSistemaDto
        {
            public string Sistema { get; set; } = string.Empty;
            public int Total { get; set; }
            public int Incidencias { get; set; }
            public int Servicios { get; set; }
            public int Otros { get; set; }
            public int Telefono { get; set; }
            public int Correo { get; set; }
            public int Interno { get; set; }
            public int TiempoForma { get; set; }
            public int CerradosAtrasados { get; set; }
            public int EnCurso { get; set; }

            // Porcentaje de tickets cerrados que se atendieron el mismo día
            public int? PorcentajeEnTiempo
            {
                get
                {
                    int cerrados = TiempoForma + CerradosAtrasados;
                    return cerrados == 0 ? null : (int)Math.Round(TiempoForma * 100.0 / cerrados);
                }
            }
        }

        public class IndicadoresTicketsDto
        {
            public int Total { get; set; }
            public int Servicio { get; set; }
            public int Incidencia { get; set; }
            public int Ajuste { get; set; }
            public int Mejora { get; set; }

            // Tickets por sistema del catálogo (IdSistema → cantidad)
            public Dictionary<int, int> PorSistema { get; set; } = new();
            public int Llamada { get; set; }
            public int Correo { get; set; }
            public int EscaladoDesarrollo { get; set; }
            public int EscaladoConsultoria { get; set; }
            public int EscaladoVentas { get; set; }
            public int EscaladoCobranza { get; set; }
            public int Cerrado { get; set; }
            public int EnCurso { get; set; }
        }
    }
}