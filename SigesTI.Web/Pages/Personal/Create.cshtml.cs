using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SigesTI.Web.Data;

namespace SigesTI.Web.Pages
{
    public class CreateModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public CreateModel(ApplicationDbContext context)
        {
            _context = context;
        }

        // CORRECCIÓN: Inicializamos la propiedad con un objeto vacío para silenciar la advertencia de nulos
        [BindProperty]
        public SigesTI.Web.Models.Personal Personal { get; set; } = new SigesTI.Web.Models.Personal();

        public void OnGet()
        {
        }

        public IActionResult OnPost()
        {
            if (ModelState.IsValid)
            {
                // Guarda directamente en la base de datos
                _context.Personal.Add(Personal);
                _context.SaveChanges();

                // Te redirige a la lista que está dentro de la carpeta Personal
                return RedirectToPage("/Personal/Index");
            }

            return Page();
        }
    }
}