using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using SigesTI.Web.Seguridad;

namespace SigesTI.Web.Pages.Solicitudes
{
    /*
     * Vista previa del reporte de solicitudes (se muestra dentro del modal de Consultar
     * y desde ahí se imprime). Mismo diseño que el reporte de Bitácora.
     */
    [Modulo(Modulos.ConsultarSolicitudes)]
    public class ReporteSolicitudesModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public ReporteSolicitudesModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public List<Solicitud> Registros { get; set; } = new();

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaInicio { get; set; }

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaFin { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Area { get; set; }

        [BindProperty(SupportsGet = true)]
        public int? Solicitante { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Estatus { get; set; }

        public string NombreSolicitante { get; set; } = "Todos";

        public DateTime FechaGeneracion { get; set; }

        // Periodo elegido en texto: "Del 01/10/2026 al 26/10/2026"
        public string Periodo => (FechaInicio, FechaFin) switch
        {
            (null, null) => "Todas las fechas",
            (DateTime inicio, null) => $"Desde el {inicio:dd/MM/yyyy}",
            (null, DateTime fin) => $"Hasta el {fin:dd/MM/yyyy}",
            (DateTime inicio, DateTime fin) => $"Del {inicio:dd/MM/yyyy} al {fin:dd/MM/yyyy}"
        };

        public string TextoArea => string.IsNullOrWhiteSpace(Area) ? "Todas" : Area;

        public string TextoEstatus => string.IsNullOrWhiteSpace(Estatus) ? "Todos" : EstatusSolicitud.Texto(Estatus);

        /* ================================================================
           VISTA PREVIA (se muestra dentro del modal y desde ahí se imprime)
           ================================================================ */

        [Permiso(Accion.Exportar)]
        public void OnGet()
        {
            FechaGeneracion = DateTime.Now;
            CargarRegistros();
        }

        /* ================================================================
           DESCARGAR PDF (se arma en ReporteSolicitudesPdf.cs con QuestPDF)
           ================================================================ */

        [Permiso(Accion.Exportar)]
        public IActionResult OnGetPdf()
        {
            CargarRegistros();

            string filtros = $"Periodo: {Periodo}   ·   Área: {TextoArea}   ·   Solicitante: {NombreSolicitante}   ·   Estatus: {TextoEstatus}";
            DateTime ahora = DateTime.Now;

            byte[] pdf = ReporteSolicitudesPdf.Generar(Registros, filtros, ahora);

            return File(pdf, "application/pdf", $"ReporteDeSolicitudes_{ahora:dd-MM-yyyy}.pdf");
        }

        /* ================================================================
           SOLICITUDES CON LOS FILTROS ELEGIDOS
           ================================================================ */

        private void CargarRegistros()
        {
            var consulta = _context.Solicitudes
                .AsNoTracking()
                .Include(s => s.Personal)
                .AsQueryable();

            if (FechaInicio.HasValue)
            {
                DateTime inicio = FechaInicio.Value.Date;
                consulta = consulta.Where(s => s.FechaIngreso >= inicio);
            }

            if (FechaFin.HasValue)
            {
                DateTime fin = FechaFin.Value.Date.AddDays(1);
                consulta = consulta.Where(s => s.FechaIngreso < fin);
            }

            if (!string.IsNullOrWhiteSpace(Area))
            {
                consulta = consulta.Where(s => s.Personal != null && s.Personal.Area == Area);
            }

            if (Solicitante.HasValue)
            {
                consulta = consulta.Where(s => s.IdPersonal == Solicitante.Value);

                NombreSolicitante = _context.Personal
                    .Where(p => p.Id == Solicitante.Value)
                    .Select(p => p.Nombre)
                    .FirstOrDefault() ?? "Todos";
            }

            if (!string.IsNullOrWhiteSpace(Estatus))
            {
                consulta = consulta.Where(s => s.Estatus == Estatus);
            }

            Registros = consulta
                .OrderByDescending(s => s.FechaIngreso)
                .ThenByDescending(s => s.IdSolicitud)
                .ToList();
        }

        // Clase de color del estatus en el reporte y en el formato
        public static string ClaseEstatus(string estatus)
        {
            return estatus switch
            {
                EstatusSolicitud.PorAutorizar => "por-autorizar",
                EstatusSolicitud.Resuelto => "resuelto",
                _ => "pendiente"
            };
        }

        // Título de cada día: "Lunes, 26 de octubre de 2026"
        public static string TituloDia(DateTime fecha)
        {
            string texto = fecha.ToString("dddd, d 'de' MMMM 'de' yyyy", new System.Globalization.CultureInfo("es-MX"));
            return char.ToUpper(texto[0]) + texto[1..];
        }
    }
}
