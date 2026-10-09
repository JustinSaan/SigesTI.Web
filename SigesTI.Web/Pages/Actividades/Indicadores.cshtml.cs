using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SigesTI.Web.Pages.Actividades
{
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

        // PROPIEDADES QUE LEE Y CONSUME LA VISTA RAZOR (.cshtml)
        public IndicadoresViewModel Indicadores { get; set; } = new();
        public List<ActividadMantenimientoDto> TablaProgramas { get; set; } = new();

        public async Task<IActionResult> OnGetAsync()
        {
            // Rango de fechas por defecto para el período de evaluación
            FechaInicio ??= new DateTime(2026, 09, 28);
            FechaFin ??= new DateTime(2026, 11, 08);

            var fechaFinHasta = FechaFin.Value.Date.AddDays(1).AddTicks(-1);

            // 1. Consulta de Tickets usando FechaEntrada
            var queryTickets = _context.Tickets
                .AsNoTracking()
                .Where(t => t.Activo && t.FechaEntrada >= FechaInicio && t.FechaEntrada <= fechaFinHasta);

            if (!string.IsNullOrWhiteSpace(FiltroOrigen))
            {
                queryTickets = queryTickets.Where(t => t.Origen == FiltroOrigen);
            }

            var tickets = await queryTickets.ToListAsync();

            // 2. Cálculo de Métricas (KPIs)
            Indicadores.TotalAtendidos = tickets.Count;

            // Revisa si en tus estatus usas 'Cerrado', 'Resuelto', 'Atendido' o similar
            Indicadores.TotalCerrados = tickets.Count(t => t.Estatus == "Cerrado" || t.Estatus == "Resuelto" || t.Estatus == "Atendido");
            Indicadores.TotalEnCurso = tickets.Count(t => t.Estatus == "En curso" || t.Estatus == "En Proceso" || t.Estatus == "Abierto" || t.Estatus == "Pendiente");

            Indicadores.PorcentajeEficiencia = Indicadores.TotalAtendidos > 0
                ? Math.Round((double)Indicadores.TotalCerrados / Indicadores.TotalAtendidos * 100, 1)
                : 0.0;

            Indicadores.TotalLlamadas = tickets.Count(t => t.Origen.Contains("Llamada") || t.Origen == "Teléfono");
            Indicadores.TotalCorreos = tickets.Count(t => t.Origen.Contains("Correo") || t.Origen == "Email");

            int totalCanales = Indicadores.TotalLlamadas + Indicadores.TotalCorreos;
            Indicadores.PorcentajeLlamadas = totalCanales > 0 ? (int)Math.Round((double)Indicadores.TotalLlamadas / totalCanales * 100) : 0;
            Indicadores.PorcentajeCorreos = totalCanales > 0 ? (int)Math.Round((double)Indicadores.TotalCorreos / totalCanales * 100) : 0;

            // 3. Agrupaciones para Chart.js
            Indicadores.TicketsPorSistema = tickets
                .GroupBy(t => string.IsNullOrWhiteSpace(t.Sistema) ? "Sin Especificar" : t.Sistema)
                .ToDictionary(g => g.Key, g => g.Count());

            Indicadores.TicketsPorTipoRequerimiento = tickets
                .GroupBy(t => string.IsNullOrWhiteSpace(t.Tipo) ? "General" : t.Tipo)
                .ToDictionary(g => g.Key, g => g.Count());

            Indicadores.TicketsEscaladosPorArea = tickets
                .Where(t => t.Escalado && !string.IsNullOrWhiteSpace(t.AreaEscalada))
                .GroupBy(t => t.AreaEscalada!)
                .ToDictionary(g => g.Key, g => g.Count());

            // 4. Mantenimientos y Tareas Programadas usando TareasProgramadas
            var tareas = await _context.TareasProgramadas
                .Include(t => t.TipoTarea)
                .AsNoTracking()
                .Where(a => a.FechaMaximaRealizacion >= FechaInicio && a.FechaMaximaRealizacion <= fechaFinHasta)
                .OrderBy(a => a.FechaMaximaRealizacion)
                .ToListAsync();

            int totalActividades = tareas.Count;
            int actividadesCompletadas = tareas.Count(a => a.Estatus == "Realizado" || a.Estatus == "Completado" || a.Estatus == "Finalizado");

            Indicadores.PorcentajeAvancePrograma = totalActividades > 0
                ? (int)Math.Round((double)actividadesCompletadas / totalActividades * 100)
                : 0;

            TablaProgramas = tareas.Select(m => new ActividadMantenimientoDto
            {
                Nombre = m.Tarea ?? "Sin Título",
                Tipo = m.TipoTarea?.Nombre ?? "General",
                FechaProgramada = m.FechaMaximaRealizacion.ToString("dd/MM/yyyy"),
                Estatus = m.Estatus ?? "Pendiente"
            }).ToList();

            return Page();
        }
    }

    // ESTRUCTURAS DE DATOS (DTOs)
    public class IndicadoresViewModel
    {
        public int TotalAtendidos { get; set; }
        public int TotalCerrados { get; set; }
        public int TotalEnCurso { get; set; }
        public double PorcentajeEficiencia { get; set; }
        public int TotalLlamadas { get; set; }
        public int TotalCorreos { get; set; }
        public int PorcentajeLlamadas { get; set; }
        public int PorcentajeCorreos { get; set; }
        public int PorcentajeAvancePrograma { get; set; }

        public Dictionary<string, int> TicketsPorSistema { get; set; } = new();
        public Dictionary<string, int> TicketsPorTipoRequerimiento { get; set; } = new();
        public Dictionary<string, int> TicketsEscaladosPorArea { get; set; } = new();
    }

    public class ActividadMantenimientoDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
        public string FechaProgramada { get; set; } = string.Empty;
        public string Estatus { get; set; } = string.Empty;
    }
}