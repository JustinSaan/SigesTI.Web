using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using PersonalModel = SigesTI.Web.Models.Personal;

namespace SigesTI.Web.Pages.Actividades
{
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

        public IndicadoresTicketsDto IndicadoresDia { get; set; } = new IndicadoresTicketsDto();
        public IndicadoresTicketsDto IndicadoresSeguimiento { get; set; } = new IndicadoresTicketsDto();

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaReporte { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroSistema { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroOrigen { get; set; }

        public async Task OnGetAsync()
        {
            FechaReporte ??= DateTime.Today;

            ListaClientes = await _context.Clientes.Where(c => c.Activo).ToListAsync();
            ListaEjecutivosSoporte = await _context.Personal
                .Where(p => p.Activo && p.Area == "Soporte Técnico")
                .ToListAsync();

            var inicioDia = FechaReporte.Value.Date;
            var finDia = inicioDia.AddDays(1);

            var query = _context.Tickets
                .Where(t => t.Activo && (
                    (t.FechaEntrada >= inicioDia && t.FechaEntrada < finDia) ||
                    (t.FechaSolucion.HasValue && t.FechaSolucion.Value >= inicioDia && t.FechaSolucion.Value < finDia) ||
                    t.Estatus == "En curso"
                ));

            if (!string.IsNullOrEmpty(FiltroSistema))
            {
                query = query.Where(t => t.Sistema == FiltroSistema);
            }

            if (!string.IsNullOrEmpty(FiltroOrigen))
            {
                query = query.Where(t => t.Origen == FiltroOrigen);
            }

            ListaTickets = await query
                .OrderByDescending(t => t.Estatus == "En curso")
                .ThenByDescending(t => t.FechaEntrada)
                .ToListAsync();

            var ticketsDelDia = ListaTickets
                .Where(t => t.FechaEntrada >= inicioDia && t.FechaEntrada < finDia)
                .ToList();

            var ticketsSeguimiento = ListaTickets
                .Where(t => t.FechaEntrada < inicioDia)
                .ToList();

            IndicadoresDia = CalcularMetricas(ticketsDelDia);
            IndicadoresSeguimiento = CalcularMetricas(ticketsSeguimiento);
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
                DIA = tickets.Count(t => t.Sistema == "DIA"),
                DIAWEB = tickets.Count(t => t.Sistema == "DIAWEB"),
                MED = tickets.Count(t => t.Sistema == "MED"),
                SITA = tickets.Count(t => t.Sistema == "SITA"),
                VUCEM = tickets.Count(t => t.Sistema == "VUCEM"),
                DIAENLINEA = tickets.Count(t => t.Sistema == "DIAENLINEA"),
                COA = tickets.Count(t => t.Sistema == "COA"),
                ADMIN = tickets.Count(t => t.Sistema == "ADMIN"),
                Llamada = tickets.Count(t => t.Origen == "Llamada"),
                Correo = tickets.Count(t => t.Origen == "Correo"),
                EscaladoDesarrollo = tickets.Count(t => t.Escalado && t.AreaEscalada == "Desarrollo"),
                EscaladoConsultoria = tickets.Count(t => t.Escalado && t.AreaEscalada == "Consultoría"),
                EscaladoVentas = tickets.Count(t => t.Escalado && t.AreaEscalada == "Ventas"),
                EscaladoCobranza = tickets.Count(t => t.Escalado && t.AreaEscalada == "Cobranza"),
                Cerrado = tickets.Count(t => t.Estatus == "Cerrado"),
                EnCurso = tickets.Count(t => t.Estatus == "En curso")
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
                        Clave = string.IsNullOrEmpty(NuevaClaveCliente) ? "CLI-" + DateTime.Now.Ticks.ToString().Substring(12) : NuevaClaveCliente,
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

                var nuevoTicket = new Ticket
                {
                    FechaEntrada = FechaEntrada ?? DateTime.Now,
                    Hora = string.IsNullOrEmpty(Hora) ? DateTime.Now.ToString("hh:mm tt") : Hora,
                    NumeroTicket = NumeroTicket,
                    Cliente = nombreClienteFinal,
                    Ejecutivo = Ejecutivo,
                    Reporto = personaReportoFinal,
                    Estatus = Estatus,
                    Sistema = Sistema,
                    Tipo = Tipo,
                    Origen = Origen,
                    Descripcion = Descripcion,
                    Comentarios = Comentarios,
                    Solucion = Solucion,
                    Escalado = seEscala,
                    AreaEscalada = seEscala ? AreaEscalada : null,
                    FechaSolucion = (Estatus == "Cerrado") ? (FechaSolucion ?? DateTime.Now) : null,
                    Activo = true
                };

                _context.Tickets.Add(nuevoTicket);
                await _context.SaveChangesAsync();

                TempData["MensajeExito"] = "El ticket fue registrado correctamente.";
                return RedirectToPage();
            }
            catch (Exception)
            {
                TempData["MensajeError"] = "Ocurrió un error al intentar guardar el ticket.";
                return RedirectToPage();
            }
        }

        public async Task<IActionResult> OnPostActualizarTicketAsync(
            int TicketId, DateTime? FechaEntrada, string Cliente, string Reporto, string Ejecutivo,
            string Sistema, string Tipo, string Estatus, string Escalado,
            string? AreaEscalada, DateTime? FechaSolucion, string? Descripcion,
            string? Comentarios, string? Solucion)
        {
            try
            {
                var ticket = await _context.Tickets.FindAsync(TicketId);
                if (ticket != null)
                {
                    bool seEscala = Escalado == "true" || Escalado == "1";

                    if (FechaEntrada.HasValue) ticket.FechaEntrada = FechaEntrada.Value;
                    ticket.Cliente = Cliente;
                    ticket.Reporto = Reporto;
                    ticket.Ejecutivo = Ejecutivo;
                    ticket.Sistema = Sistema;
                    ticket.Tipo = Tipo;
                    ticket.Estatus = Estatus;
                    ticket.Escalado = seEscala;
                    ticket.AreaEscalada = seEscala ? AreaEscalada : null;

                    if (Estatus == "Cerrado")
                    {
                        ticket.FechaSolucion = FechaSolucion ?? DateTime.Now;
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

            return RedirectToPage();
        }

        public class IndicadoresTicketsDto
        {
            public int Total { get; set; }
            public int Servicio { get; set; }
            public int Incidencia { get; set; }
            public int Ajuste { get; set; }
            public int Mejora { get; set; }
            public int DIA { get; set; }
            public int DIAWEB { get; set; }
            public int MED { get; set; }
            public int SITA { get; set; }
            public int VUCEM { get; set; }
            public int DIAENLINEA { get; set; }
            public int COA { get; set; }
            public int ADMIN { get; set; }
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