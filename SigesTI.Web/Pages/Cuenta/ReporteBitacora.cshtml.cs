using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages.Cuenta
{
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

        public async Task OnGetAsync()
        {
            FechaGeneracion = DateTime.Now;

            var consulta = _context.BitacoraUsuarios
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(FiltroNombre))
            {
                consulta = consulta.Where(b =>
                    b.NombreCompleto == FiltroNombre);
            }

            if (!string.IsNullOrWhiteSpace(FiltroCorreo))
            {
                consulta = consulta.Where(b =>
                    b.Correo == FiltroCorreo);
            }

            if (!string.IsNullOrWhiteSpace(FiltroModulo))
            {
                consulta = consulta.Where(b =>
                    b.Modulo == FiltroModulo);
            }

            if (!string.IsNullOrWhiteSpace(FiltroAccion))
            {
                consulta = consulta.Where(b =>
                    b.Accion == FiltroAccion);
            }

            if (FechaInicio.HasValue)
            {
                DateTime inicio = FechaInicio.Value.Date;

                consulta = consulta.Where(b =>
                    b.FechaHora >= inicio);
            }

            if (FechaFin.HasValue)
            {
                DateTime fin =
                    FechaFin.Value.Date.AddDays(1);

                consulta = consulta.Where(b =>
                    b.FechaHora < fin);
            }

            Registros = await consulta
                .OrderByDescending(b => b.FechaHora)
                .ToListAsync();
        }

        public string MostrarTexto(
            string? valor,
            string textoPredeterminado)
        {
            if (string.IsNullOrWhiteSpace(valor))
            {
                return textoPredeterminado;
            }

            return valor;
        }

        public string MostrarFecha(DateTime? fecha)
        {
            if (!fecha.HasValue)
            {
                return "Todas";
            }

            return fecha.Value.ToString("dd/MM/yyyy");
        }

        public string ObtenerClaseAccion(string accion)
        {
            if (accion.Contains(
                "cre",
                StringComparison.OrdinalIgnoreCase))
            {
                return "creacion";
            }

            if (accion.Contains(
                    "edit",
                    StringComparison.OrdinalIgnoreCase) ||
                accion.Contains(
                    "contraseña",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "edicion";
            }

            if (accion.Contains(
                "elimin",
                StringComparison.OrdinalIgnoreCase))
            {
                return "eliminacion";
            }

            return "acceso";
        }
    }
}