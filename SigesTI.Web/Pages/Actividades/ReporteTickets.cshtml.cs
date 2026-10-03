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

        // Listas para la vista y modales
        public IList<Ticket> ListaTickets { get; set; } = new List<Ticket>();
        public IList<Cliente> ListaClientes { get; set; } = new List<Cliente>();
        public IList<PersonalModel> ListaEjecutivosSoporte { get; set; } = new List<PersonalModel>();

        // DTO de métricas consolidadas
        public IndicadoresTicketsDto Indicadores { get; set; } = new IndicadoresTicketsDto();

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaReporte { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroSistema { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroOrigen { get; set; }

        public async Task OnGetAsync()
        {
            FechaReporte ??= DateTime.Today;

            // 1. Cargar datos para los combos del Modal de Nuevo Ticket
            ListaClientes = await _context.Clientes.Where(c => c.Activo).ToListAsync();
            ListaEjecutivosSoporte = await _context.Personal
                .Where(p => p.Activo && p.Area == "Soporte Técnico")
                .ToListAsync();

            // 2. Consulta de Tickets filtrados por fecha y criterios
            var query = _context.Tickets
                .Where(t => t.Activo && t.FechaEntrada.Date == FechaReporte.Value.Date);

            if (!string.IsNullOrEmpty(FiltroSistema))
            {
                query = query.Where(t => t.Sistema == FiltroSistema);
            }

            if (!string.IsNullOrEmpty(FiltroOrigen))
            {
                query = query.Where(t => t.Origen == FiltroOrigen);
            }

            ListaTickets = await query.OrderByDescending(t => t.FechaEntrada).ToListAsync();

            // 3. Cálculo de Indicadores en C#
            Indicadores = new IndicadoresTicketsDto
            {
                Total = ListaTickets.Count,

                // Tipos
                Servicio = ListaTickets.Count(t => t.Tipo == "Servicio"),
                Incidencia = ListaTickets.Count(t => t.Tipo == "Incidencia"),
                Ajuste = ListaTickets.Count(t => t.Tipo == "Ajuste"),
                Mejora = ListaTickets.Count(t => t.Tipo == "Mejora"),

                // Sistemas Externos
                DIA = ListaTickets.Count(t => t.Sistema == "DIA"),
                DIAWEB = ListaTickets.Count(t => t.Sistema == "DIAWEB"),
                MED = ListaTickets.Count(t => t.Sistema == "MED"),
                SITA = ListaTickets.Count(t => t.Sistema == "SITA"),
                VUCEM = ListaTickets.Count(t => t.Sistema == "VUCEM"),
                DIAENLINEA = ListaTickets.Count(t => t.Sistema == "DIAENLINEA"),
                COA = ListaTickets.Count(t => t.Sistema == "COA"),

                // Sistema Interno
                ADMIN = ListaTickets.Count(t => t.Sistema == "ADMIN"),

                // Origen
                Llamada = ListaTickets.Count(t => t.Origen == "Llamada"),
                Correo = ListaTickets.Count(t => t.Origen == "Correo"),

                // Escalados
                EscaladoDesarrollo = ListaTickets.Count(t => t.Escalado && t.AreaEscalada == "Desarrollo"),
                EscaladoConsultoria = ListaTickets.Count(t => t.Escalado && t.AreaEscalada == "Consultoría"),
                EscaladoVentas = ListaTickets.Count(t => t.Escalado && t.AreaEscalada == "Ventas"),
                EscaladoCobranza = ListaTickets.Count(t => t.Escalado && t.AreaEscalada == "Cobranza"),

                // Estatus
                Cerrado = ListaTickets.Count(t => t.Estatus == "Cerrado"),
                EnCurso = ListaTickets.Count(t => t.Estatus == "En curso")
            };
        }

        // Handler AJAX para cargar contactos asociados al seleccionar un Cliente
        public async Task<JsonResult> OnGetContactosPorClienteAsync(int clienteId)
        {
            var contactos = await _context.ContactosCliente
                .Where(c => c.ClienteId == clienteId && c.Activo)
                .Select(c => new { c.NombreContacto, c.Correo })
                .ToListAsync();

            return new JsonResult(contactos);
        }

        // Handler POST para Guardar Nuevo Ticket
        public async Task<IActionResult> OnPostCrearTicketAsync(
            string NumeroTicket, string Hora, string Origen,
            string ClienteId, string? NuevaClaveCliente, string? NuevoNombreCliente,
            string? Reporto, string? ReportoManual, string? CorreoReporto,
            string Ejecutivo, string Sistema, string Tipo, string Estatus,
            string? Escalado, string? AreaEscalada, string? Descripcion,
            string? Comentarios, string? Solucion)
        {
            try
            {
                string nombreClienteFinal = "";
                string personaReportoFinal = "";
                bool seEscala = Escalado == "true" || Escalado == "1";

                // 1. Gestión de Cliente y Contacto
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

                // 2. Insertar Ticket
                var nuevoTicket = new Ticket
                {
                    FechaEntrada = DateTime.Now,
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
                    FechaSolucion = (Estatus == "Cerrado") ? DateTime.Now : null,
                    Activo = true
                };

                _context.Tickets.Add(nuevoTicket);
                await _context.SaveChangesAsync();

                // TempData para activar SweetAlert tras redirección
                TempData["MensajeExito"] = "El ticket fue registrado correctamente.";
                return RedirectToPage();
            }
            catch (Exception)
            {
                TempData["MensajeError"] = "Ocurrió un error al intentar guardar el ticket.";
                return RedirectToPage();
            }
        }

        // Handler POST para Actualizar Ticket desde la Vista Previa (Doble Clic)
        public async Task<IActionResult> OnPostActualizarTicketAsync(int TicketId, string? Descripcion, string? Comentarios, string? Solucion, string? Estatus)
        {
            var ticket = await _context.Tickets.FindAsync(TicketId);
            if (ticket != null)
            {
                ticket.Descripcion = Descripcion;
                ticket.Comentarios = Comentarios;
                ticket.Solucion = Solucion;
                ticket.FechaUltimaModificacion = DateTime.Now;

                if (!string.IsNullOrEmpty(Estatus))
                {
                    ticket.Estatus = Estatus;
                    if (Estatus == "Cerrado" && !ticket.FechaSolucion.HasValue)
                    {
                        ticket.FechaSolucion = DateTime.Now;
                    }
                }

                await _context.SaveChangesAsync();
                TempData["MensajeExito"] = "El ticket se actualizó correctamente.";
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