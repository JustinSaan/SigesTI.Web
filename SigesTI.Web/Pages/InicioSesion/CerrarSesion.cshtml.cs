using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SigesTI.Web.Seguridad;

namespace SigesTI.Web.Pages.InicioSesion
{
    public class CerrarSesionModel : PageModel
    {
        private readonly SesionesActivas _sesionesActivas;

        public CerrarSesionModel(SesionesActivas sesionesActivas)
        {
            _sesionesActivas = sesionesActivas;
        }

        /*
         * Cierra la sesión únicamente mediante POST.
         * Al cerrarla, el usuario ya puede entrar desde otro equipo.
         */
        public IActionResult OnPost()
        {
            int? idUsuario = HttpContext.Session.GetInt32("IdUsuario");

            if (idUsuario != null)
            {
                _sesionesActivas.Quitar(idUsuario.Value);
            }

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
