using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Seguridad;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages.Cuenta
{
    [Modulo(Modulos.Cuenta)]
    public class ReporteBitacoraModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public ReporteBitacoraModel(
            ApplicationDbContext context)
        {
            _context = context;
        }

        public IList<BitacoraUsuario> Registros { get; set; }
            = new List<BitacoraUsuario>();

        [BindProperty(SupportsGet = true)]
        public string? FiltroNombre { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroCorreo { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroModulo { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltroAccion { get; set; }

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaInicio { get; set; }

        [BindProperty(SupportsGet = true)]
        public DateTime? FechaFin { get; set; }

        public DateTime FechaGeneracion { get; set; }

        /* ================================================================
           VISTA PREVIA (se muestra dentro del modal y desde ahí se imprime)
           ================================================================ */

        [Permiso(Accion.Exportar)]
        public async Task OnGetAsync()
        {
            FechaGeneracion = DateTime.Now;
            Registros = await CargarRegistrosAsync();
        }

        /* ================================================================
           DESCARGAR PDF
           El PDF se arma en ReporteBitacoraPdf.cs con QuestPDF.
           ================================================================ */

        [Permiso(Accion.Exportar)]
        public async Task<IActionResult> OnGetPdfAsync()
        {
            var registros = await CargarRegistrosAsync();
            string generadoPor = HttpContext.Session.GetString("NombreCompleto") ?? "—";
            DateTime ahora = DateTime.Now;

            byte[] pdf = ReporteBitacoraPdf.Generar(registros, generadoPor, ahora);

            return File(pdf, "application/pdf", $"ReporteBitacora_{ahora:ddMMyyyyHHmmss}.pdf");
        }

        /* ================================================================
           REGISTROS CON LOS FILTROS ELEGIDOS
           ================================================================ */

        private async Task<List<BitacoraUsuario>> CargarRegistrosAsync()
        {
            var consulta = _context.BitacoraUsuarios
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(FiltroNombre))
            {
                consulta = consulta.Where(b => b.NombreCompleto == FiltroNombre);
            }

            if (!string.IsNullOrWhiteSpace(FiltroCorreo))
            {
                consulta = consulta.Where(b => b.Correo == FiltroCorreo);
            }

            if (!string.IsNullOrWhiteSpace(FiltroModulo))
            {
                consulta = consulta.Where(b => b.Modulo == FiltroModulo);
            }

            if (!string.IsNullOrWhiteSpace(FiltroAccion))
            {
                consulta = consulta.Where(b => b.Accion == FiltroAccion);
            }

            if (FechaInicio.HasValue)
            {
                DateTime inicio = FechaInicio.Value.Date;
                consulta = consulta.Where(b => b.FechaHora >= inicio);
            }

            if (FechaFin.HasValue)
            {
                DateTime fin = FechaFin.Value.Date.AddDays(1);
                consulta = consulta.Where(b => b.FechaHora < fin);
            }

            return await consulta
                .OrderByDescending(b => b.FechaHora)
                .ToListAsync();
        }

        /* ================================================================
           COLOR DE CADA ACCIÓN
           Lo usan la tabla de Control de acceso, la vista previa y el PDF.
           ================================================================ */

        public static string ObtenerClaseAccion(string accion)
        {
            string texto = accion.ToLower();

            if (texto.Contains("cre"))
            {
                return "creacion";
            }

            if (texto.Contains("edit") || texto.Contains("edic") || texto.Contains("contraseña"))
            {
                return "edicion";
            }

            if (texto.Contains("elimin") || texto.Contains("depur"))
            {
                return "eliminacion";
            }

            return "acceso";
        }

        // Título de cada día: "Lunes, 26 de octubre de 2026"
        public static string TituloDia(DateTime fecha)
        {
            string texto = fecha.ToString("dddd, d 'de' MMMM 'de' yyyy", new System.Globalization.CultureInfo("es-MX"));
            return char.ToUpper(texto[0]) + texto[1..];
        }
    }
}
