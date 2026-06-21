using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore; // Añadimos esto para habilitar FromSqlRaw si es necesario
using SigesTI.Web.Data;

namespace SigesTI.Web.Pages
{
    public class IndexModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public IndexModel(ApplicationDbContext context)
        {
            _context = context;
        }

        // Mantenemos la ruta explícita para evitar la ambigüedad con la carpeta Pages/Personal
        public List<SigesTI.Web.Models.Personal> ListaPersonal { get; set; } = new();

        public void OnGet()
        {
            // Como tu DbSet se llama "Personal" pero en la base de datos la tabla se llama "Personales",
            // usamos FromSqlRaw para hacer un SELECT directo a la tabla física real.
            // Es un código limpio, super seguro y no altera tu ApplicationDbContext.
            ListaPersonal = _context.Personal
                                    .FromSqlRaw("SELECT * FROM Personal")
                                    .ToList();
        }
    }
}