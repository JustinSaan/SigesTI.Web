using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SigesTI.Web.Pages.InicioSesion
{
    public class CerrarSesionModel : PageModel
    {
        /*
         * Cierra la sesión únicamente mediante POST.
         */
        public IActionResult OnPost()
        {
            HttpContext.Session.Clear();

            return RedirectToPage("/InicioSesion/Login");
        }

        /*
         * Si alguien intenta entrar directamente por URL,
         * se regresa al inicio del sistema.
         */
        public IActionResult OnGet()
        {
            return RedirectToPage("/Index");
        }
    }
}