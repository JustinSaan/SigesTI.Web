using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using System.ComponentModel.DataAnnotations;

namespace SigesTI.Web.Pages.InicioSesion
{
    public class LoginModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PasswordHasher<UsuarioSistema> _passwordHasher;

        public LoginModel(ApplicationDbContext context)
        {
            _context = context;
            _passwordHasher = new PasswordHasher<UsuarioSistema>();
        }

        [BindProperty]
        public DatosLogin Login { get; set; } = new();

        public bool MostrarModalCambio { get; set; }

        public string MensajeCambio { get; set; } = string.Empty;

        public IActionResult OnGet()
        {
            if (HttpContext.Session.GetInt32("IdUsuario") != null)
            {
                return RedirectToPage("/Index");
            }

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            string nombreUsuario = Login.Usuario.Trim();

            var usuario = await _context.UsuariosSistema
                .FirstOrDefaultAsync(
                    u => u.NombreUsuario == nombreUsuario);

            if (usuario == null)
            {
                MostrarErrorCredenciales();
                return Page();
            }

            if (!usuario.Activo)
            {
                ModelState.AddModelError(
                    string.Empty,
                    "Tu cuenta se encuentra inactiva.");

                return Page();
            }

            bool passwordCorrecta =
                await VerificarPasswordAsync(
                    usuario,
                    Login.Password);

            if (!passwordCorrecta)
            {
                MostrarErrorCredenciales();
                return Page();
            }

            /*
             * Una cuenta con contraseña temporal todavía no
             * obtiene acceso al sistema.
             */
            if (usuario.RequiereCambioPassword)
            {
                HttpContext.Session.SetInt32(
                    "UsuarioCambioPasswordId",
                    usuario.IdUsuario);

                MostrarModalCambio = true;

                return Page();
            }

            CrearSesion(usuario);

            usuario.UltimoAcceso = DateTime.Now;

            await _context.SaveChangesAsync();

            return RedirectToPage("/Index");
        }

        public async Task<IActionResult> OnPostCambiarPasswordAsync(
            string passwordNueva,
            string confirmarPassword)
        {
            MostrarModalCambio = true;

            int? idUsuario =
                HttpContext.Session.GetInt32(
                    "UsuarioCambioPasswordId");

            if (idUsuario == null)
            {
                ModelState.AddModelError(
                    string.Empty,
                    "La solicitud para cambiar la contraseña expiró.");

                MostrarModalCambio = false;

                return Page();
            }

            if (string.IsNullOrWhiteSpace(passwordNueva) ||
                string.IsNullOrWhiteSpace(confirmarPassword))
            {
                MensajeCambio =
                    "Debes completar ambos campos.";

                return Page();
            }

            if (passwordNueva.Length < 6)
            {
                MensajeCambio =
                    "La contraseña debe tener al menos 6 caracteres.";

                return Page();
            }

            if (passwordNueva != confirmarPassword)
            {
                MensajeCambio =
                    "Las contraseñas no coinciden.";

                return Page();
            }

            var usuario = await _context.UsuariosSistema
                .FirstOrDefaultAsync(
                    u => u.IdUsuario == idUsuario.Value);

            if (usuario == null)
            {
                HttpContext.Session.Remove(
                    "UsuarioCambioPasswordId");

                MostrarModalCambio = false;

                ModelState.AddModelError(
                    string.Empty,
                    "No fue posible encontrar la cuenta.");

                return Page();
            }

            usuario.PasswordHash =
                _passwordHasher.HashPassword(
                    usuario,
                    passwordNueva);

            usuario.RequiereCambioPassword = false;

            await _context.SaveChangesAsync();

            HttpContext.Session.Remove(
                "UsuarioCambioPasswordId");

            /*
             * No creamos sesión. El usuario deberá ingresar
             * nuevamente con la contraseña nueva.
             */
            TempData["PasswordCambiada"] = true;

            return RedirectToPage();
        }

        private async Task<bool> VerificarPasswordAsync(
            UsuarioSistema usuario,
            string password)
        {
            try
            {
                var resultado =
                    _passwordHasher.VerifyHashedPassword(
                        usuario,
                        usuario.PasswordHash,
                        password);

                return resultado !=
                    PasswordVerificationResult.Failed;
            }
            catch (FormatException)
            {
                /*
                 * Compatibilidad temporal para contraseñas
                 * antiguas almacenadas sin hash.
                 */
                bool passwordCorrecta =
                    usuario.PasswordHash == password;

                if (passwordCorrecta)
                {
                    usuario.PasswordHash =
                        _passwordHasher.HashPassword(
                            usuario,
                            password);

                    await _context.SaveChangesAsync();
                }

                return passwordCorrecta;
            }
        }

        private void CrearSesion(
            UsuarioSistema usuario)
        {
            HttpContext.Session.SetInt32(
                "IdUsuario",
                usuario.IdUsuario);

            HttpContext.Session.SetString(
                "Usuario",
                usuario.NombreUsuario);

            HttpContext.Session.SetString(
                "NombreCompleto",
                usuario.NombreCompleto);

            HttpContext.Session.SetString(
                "Rol",
                usuario.Rol);
        }

        private void MostrarErrorCredenciales()
        {
            ModelState.AddModelError(
                string.Empty,
                "El usuario o la contraseña son incorrectos.");
        }

        public class DatosLogin
        {
            [Required(ErrorMessage = "Ingresa tu usuario.")]
            [Display(Name = "Usuario")]
            public string Usuario { get; set; } = string.Empty;

            [Required(ErrorMessage = "Ingresa tu contraseña.")]
            [DataType(DataType.Password)]
            [Display(Name = "Contraseña")]
            public string Password { get; set; } = string.Empty;

            [Display(Name = "Recuérdame")]
            public bool Recordarme { get; set; }
        }
    }
}