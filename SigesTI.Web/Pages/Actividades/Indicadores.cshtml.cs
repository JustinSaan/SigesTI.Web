using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Seguridad;
using SigesTI.Web.Models;
using SigesTI.Web.Pages.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SigesTI.Web.Pages.Actividades
{
    [Modulo(Modulos.Indicadores)]
    public class IndicadoresModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public IndicadoresModel(ApplicationDbContext context)
        {
            _context = context;
        }

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaInicio { get; set; }

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaFin { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroOrigen { get; set; }

        [BindProperty]
        public string? Observaciones { get; set; }

        public IndicadoresViewModel Indicadores { get; set; } = new();
        public List<SistemaTicket> Sistemas { get; set; } = new();

        public string Periodo => $"{FechaInicio:dd/MM/yyyy} – {FechaFin:dd/MM/yyyy}";

        // Cuántos clientes salen en la gráfica de clientes más frecuentes
        private const int MaximoClientes = 5;
        private static readonly string[] NombresMeses = { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };

        // Las tareas de este tipo no cuentan como servicios internos
        private const string TipoTareaExterno = "Externo";

        // Áreas a las que se escala un ticket (las mismas del formulario de Reporte de Tickets)
        private static readonly string[] AreasEscalamiento = { "Desarrollo", "Consultoría", "Ventas", "Cobranza" };

        /* ================================================================
           DATOS DE LAS GRÁFICAS (los mismos en pantalla y en el PDF)
           Se dibujan en SVG con GraficasSvg.cs.
           ================================================================ */

        private static readonly Dictionary<string, string> ColoresFijos = new()
        {
            ["Servicio"] = "#0284C7", ["Incidencia"] = "#DC2626", ["Ajuste"] = "#D97706", ["Mejora"] = "#059669",
            ["Llamada"] = "#0284C7", ["Correo"] = "#059669", ["Interno"] = "#7C3AED",
            ["Desarrollo"] = "#7C3AED", ["Consultoría"] = "#0891B2", ["Ventas"] = "#059669", ["Cobranza"] = "#D97706"
        };
        private static readonly string[] Paleta = { "#2563EB", "#DB2777", "#0D9488", "#EA580C", "#9333EA", "#64748B" };
        private static readonly string[] ColoresClientes = { "#0284C7", "#7C3AED", "#059669", "#EA580C", "#DB2777" };

        public const string ColorInternos = "#7C3AED";
        public const string ColorExternos = "#0284C7";
        public const string ColorEscalados = "#7C3AED";

        // Cada sistema con su color del catálogo; gris si ya no existe
        public List<ParteGrafica> PartesSistemas => Indicadores.TicketsPorSistema
            .Select(s =>
            {
                var catalogo = Sistemas.FirstOrDefault(c => c.Nombre.ToUpper() == s.Key);
                return new ParteGrafica(s.Key, s.Value, catalogo?.ColorFondo ?? "#64748B", catalogo?.ColorTexto);
            })
            .ToList();

        public List<ParteGrafica> PartesTipos => Partes(Indicadores.TicketsPorTipo);
        // Medio de entrada: una columna de llamadas y otra de correos por cada periodo
        public List<SerieGrafica> SeriesOrigen => new()
        {
            new("Llamada", ColoresFijos["Llamada"], "#FFFFFF", Indicadores.LlamadasPorFecha),
            new("Correo", ColoresFijos["Correo"], "#FFFFFF", Indicadores.CorreosPorFecha)
        };
        // El radar siempre muestra las cuatro áreas (aunque tengan 0) y cualquier otra que aparezca
        public List<ParteGrafica> PartesEscalados => AreasEscalamiento
            .Union(Indicadores.EscaladosPorArea.Keys)
            .Select(area => new ParteGrafica(area, Indicadores.EscaladosPorArea.GetValueOrDefault(area), ColoresFijos.GetValueOrDefault(area, ColorEscalados)))
            .ToList();

        // Cada cliente con su color para distinguirlos
        public List<ParteGrafica> PartesClientes => Indicadores.ClientesFrecuentes
            .Select((c, i) => new ParteGrafica(c.Key, c.Value, ColoresClientes[i % ColoresClientes.Length]))
            .ToList();

        // Internos: tareas programadas (sin las de tipo Externo); externos: todos los tickets
        public ParteGrafica ParteInternos => new("Servicios internos", Indicadores.ServiciosInternos, ColorInternos);
        public ParteGrafica ParteExternos => new("Servicios externos", Indicadores.TotalTickets, ColorExternos);

        public List<string> DetalleInternos => Indicadores.InternosPorTipo.Any()
            ? Indicadores.InternosPorTipo.Select(t => $"{t.Key}: {t.Value}").ToList()
            : new List<string> { "Sin tareas programadas" };

        public List<string> DetalleExternos => new()
        {
            "Tickets de todos los sistemas",
            $"{Indicadores.TicketsPorSistema.Count} {(Indicadores.TicketsPorSistema.Count == 1 ? "sistema atendido" : "sistemas atendidos")}"
        };

        private static List<ParteGrafica> Partes(Dictionary<string, int> datos)
        {
            return datos
                .Select((d, i) => new ParteGrafica(d.Key, d.Value, ColoresFijos.TryGetValue(d.Key, out var color) ? color : Paleta[i % Paleta.Length]))
                .ToList();
        }

        public async Task OnGetAsync()
        {
            await CargarAsync();
        }

        /* ================================================================
           DESCARGAR PDF
           Se arma en IndicadoresPdf.cs con QuestPDF: textos y gráficas
           quedan dibujados (vectoriales) y no como imagen.
           Es POST para poder mandar las observaciones escritas.
           ================================================================ */

        [Permiso(Accion.Exportar)]
        public async Task<IActionResult> OnPostPdfAsync()
        {
            await CargarAsync();
            DateTime ahora = DateTime.Now;

            byte[] pdf = IndicadoresPdf.Generar(this, ahora);

            return File(pdf, "application/pdf", $"ReporteIndicadoresYMetricas_{ahora:dd-MM-yyyy}.pdf");
        }

        private async Task CargarAsync()
        {
            // Por defecto se evalúa el mes actual
            var hoy = DateTime.Today;
            FechaInicio = (FechaInicio ?? new DateTime(hoy.Year, hoy.Month, 1)).Date;
            FechaFin = (FechaFin ?? FechaInicio.Value.AddMonths(1).AddDays(-1)).Date;

            if (FechaFin < FechaInicio)
            {
                (FechaInicio, FechaFin) = (FechaFin, FechaInicio);
            }

            var desde = FechaInicio.Value;
            var hasta = FechaFin.Value.AddDays(1);

            var queryTickets = _context.Tickets
                .AsNoTracking()
                .Where(t => t.Activo && t.FechaEntrada >= desde && t.FechaEntrada < hasta);

            if (!string.IsNullOrWhiteSpace(FiltroOrigen))
            {
                queryTickets = queryTickets.Where(t => t.Origen == FiltroOrigen);
            }

            var tickets = await queryTickets.ToListAsync();
            Sistemas = await _context.SistemasTicket.AsNoTracking().OrderBy(s => s.Orden).ThenBy(s => s.Nombre).ToListAsync();

            // Tickets
            Indicadores.TotalTickets = tickets.Count;
            Indicadores.TotalCerrados = tickets.Count(t => t.Estatus == "Cerrado");
            Indicadores.TotalEnCurso = Indicadores.TotalTickets - Indicadores.TotalCerrados;

            // En tiempo: se cerró el mismo día que entró (igual que en Reporte de Tickets)
            Indicadores.CerradosEnTiempo = tickets.Count(t => t.Estatus == "Cerrado"
                && (!t.FechaSolucion.HasValue || t.FechaSolucion.Value.Date <= t.FechaEntrada.Date));
            Indicadores.CerradosRetrasados = Indicadores.TotalCerrados - Indicadores.CerradosEnTiempo;
            Indicadores.PorcentajeEficiencia = Porcentaje(Indicadores.TotalCerrados, Indicadores.TotalTickets);

            Indicadores.TotalLlamadas = tickets.Count(t => t.Origen == "Llamada");
            Indicadores.TotalCorreos = tickets.Count(t => t.Origen == "Correo");
            Indicadores.TotalInternos = tickets.Count(t => t.Origen == "Interno");

            // Llamadas y correos por día (hasta 2 semanas), por semana (hasta 2 meses) o por mes
            int dias = (hasta - desde).Days;
            var periodos = new List<(DateTime Inicio, DateTime Fin, string Etiqueta)>();

            if (dias <= 14)
            {
                for (var dia = desde; dia < hasta; dia = dia.AddDays(1))
                {
                    periodos.Add((dia, dia.AddDays(1), dia.ToString("dd/MM")));
                }
                Indicadores.AgrupacionEntrada = "Tickets por día";
            }
            else if (dias <= 62)
            {
                // "Semana 1" y abajo sus días: "01 al 07 oct"
                int numero = 1;
                for (var inicio = desde; inicio < hasta; inicio = inicio.AddDays(7))
                {
                    var fin = inicio.AddDays(7) < hasta ? inicio.AddDays(7) : hasta;
                    periodos.Add((inicio, fin, $"Semana {numero++}\n{RangoDias(inicio, fin.AddDays(-1))}"));
                }
                Indicadores.AgrupacionEntrada = "Tickets por semana";
            }
            else
            {
                for (var mes = new DateTime(desde.Year, desde.Month, 1); mes < hasta; mes = mes.AddMonths(1))
                {
                    periodos.Add((mes < desde ? desde : mes, mes.AddMonths(1) < hasta ? mes.AddMonths(1) : hasta, $"{NombresMeses[mes.Month - 1]} {mes:yy}"));
                }
                Indicadores.AgrupacionEntrada = "Tickets por mes";
            }

            int Contar(string origen, DateTime inicio, DateTime fin) =>
                tickets.Count(t => t.Origen == origen && t.FechaEntrada >= inicio && t.FechaEntrada < fin);

            Indicadores.FechasEntrada = periodos.Select(p => p.Etiqueta).ToList();
            Indicadores.LlamadasPorFecha = periodos.Select(p => Contar("Llamada", p.Inicio, p.Fin)).ToList();
            Indicadores.CorreosPorFecha = periodos.Select(p => Contar("Correo", p.Inicio, p.Fin)).ToList();

            Indicadores.TotalEscalados = tickets.Count(t => t.Escalado);
            Indicadores.PorcentajeEscalados = Porcentaje(Indicadores.TotalEscalados, Indicadores.TotalTickets);

            Indicadores.TicketsPorSistema = Agrupar(tickets, t => t.Sistema?.Trim().ToUpper(), "SIN ESPECIFICAR");
            Indicadores.ClientesFrecuentes = Agrupar(tickets, t => t.Cliente?.Trim().ToUpper(), "SIN CLIENTE")
                .Take(MaximoClientes)
                .ToDictionary(c => c.Key, c => c.Value);
            Indicadores.TicketsPorTipo = Agrupar(tickets, t => t.Tipo, "Sin tipo");
            Indicadores.EscaladosPorArea = Agrupar(tickets.Where(t => t.Escalado), t => t.AreaEscalada, "Sin área");

            // Tareas programadas
            var tareas = await _context.TareasProgramadas
                .AsNoTracking()
                .Include(t => t.TipoTarea)
                .Where(t => t.FechaSolicitud >= desde && t.FechaSolicitud < hasta)
                .ToListAsync();

            Indicadores.TotalTareas = tareas.Count;
            Indicadores.TareasResueltas = tareas.Count(t => t.Estatus == "Resuelta");
            Indicadores.PorcentajeAvancePrograma = Porcentaje(Indicadores.TareasResueltas, Indicadores.TotalTareas);

            // Servicios internos: las tareas programadas de cualquier tipo menos Externo
            var internas = tareas
                .Where(t => !string.Equals(t.TipoTarea?.Nombre?.Trim(), TipoTareaExterno, StringComparison.OrdinalIgnoreCase))
                .ToList();

            Indicadores.ServiciosInternos = internas.Count;
            Indicadores.InternosPorTipo = internas
                .GroupBy(t => t.TipoTarea?.Nombre ?? "General")
                .OrderByDescending(g => g.Count())
                .ToDictionary(g => g.Key, g => g.Count());
        }

        private static double Porcentaje(int parte, int total)
        {
            return total > 0 ? Math.Round((double)parte / total * 100, 1) : 0;
        }

        // "01 al 07 oct", o "29 sep al 05 oct" si la semana pasa de un mes a otro
        private static string RangoDias(DateTime inicio, DateTime fin)
        {
            string mesFin = NombresMeses[fin.Month - 1].ToLower();
            if (inicio.Month == fin.Month) return $"{inicio:dd} al {fin:dd} {mesFin}";

            return $"{inicio:dd} {NombresMeses[inicio.Month - 1].ToLower()} al {fin:dd} {mesFin}";
        }

        // Cuenta los tickets por el campo indicado, de mayor a menor
        private static Dictionary<string, int> Agrupar(IEnumerable<Ticket> tickets, Func<Ticket, string?> campo, string sinValor)
        {
            return tickets
                .GroupBy(t => string.IsNullOrWhiteSpace(campo(t)) ? sinValor : campo(t)!)
                .OrderByDescending(g => g.Count())
                .ToDictionary(g => g.Key, g => g.Count());
        }
    }

    public class IndicadoresViewModel
    {
        public int TotalTickets { get; set; }
        public int TotalCerrados { get; set; }
        public int TotalEnCurso { get; set; }
        public int CerradosEnTiempo { get; set; }
        public int CerradosRetrasados { get; set; }
        public double PorcentajeEficiencia { get; set; }

        public int TotalLlamadas { get; set; }
        public int TotalCorreos { get; set; }
        public int TotalInternos { get; set; }
        public List<string> FechasEntrada { get; set; } = new();
        public string AgrupacionEntrada { get; set; } = "";
        public List<int> LlamadasPorFecha { get; set; } = new();
        public List<int> CorreosPorFecha { get; set; } = new();
        public int TotalEscalados { get; set; }
        public double PorcentajeEscalados { get; set; }

        public int TotalTareas { get; set; }
        public int TareasResueltas { get; set; }
        public double PorcentajeAvancePrograma { get; set; }

        public int ServiciosInternos { get; set; }
        public Dictionary<string, int> InternosPorTipo { get; set; } = new();

        public Dictionary<string, int> TicketsPorSistema { get; set; } = new();
        public Dictionary<string, int> TicketsPorTipo { get; set; } = new();
        public Dictionary<string, int> EscaladosPorArea { get; set; } = new();
        public Dictionary<string, int> ClientesFrecuentes { get; set; } = new();

        // Porcentaje de cada parte de la barra de eficiencia (en tiempo, retrasados y en curso)
        public double ParteDe(int cantidad) => TotalTickets > 0 ? Math.Round((double)cantidad / TotalTickets * 100, 2) : 0;
    }
}
