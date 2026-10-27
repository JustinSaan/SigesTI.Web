using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages
{
    /*
     * Acciones del menú del usuario en el layout.
     * No lleva [Modulo]: cualquier usuario con sesión puede cambiar su propia contraseña.
     */
    public class MiCuentaModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PasswordHasher<UsuarioSistema> _passwordHasher = new();

        public MiCuentaModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public IActionResult OnGet()
        {
            return RedirectToPage("/Index");
        }

        public async Task<JsonResult> OnPostCambiarPasswordAsync(string passwordActual, string passwordNueva, string confirmarPassword)
        {
            if (string.IsNullOrWhiteSpace(passwordActual) ||
                string.IsNullOrWhiteSpace(passwordNueva) ||
                string.IsNullOrWhiteSpace(confirmarPassword))
            {
                return Respuesta(false, "Debes completar todos los campos.");
            }

            if (passwordNueva.Length < 6)
            {
                return Respuesta(false, "La contraseña nueva debe tener al menos 6 caracteres.");
            }

            if (passwordNueva != confirmarPassword)
            {
                return Respuesta(false, "Las contraseñas nuevas no coinciden.");
            }

            if (passwordNueva == passwordActual)
            {
                return Respuesta(false, "La contraseña nueva debe ser diferente a la actual.");
            }

            int? idUsuario = HttpContext.Session.GetInt32("IdUsuario");

            var usuario = await _context.UsuariosSistema
                .FirstOrDefaultAsync(u => u.IdUsuario == idUsuario);

            if (usuario == null)
            {
                return Respuesta(false, "No fue posible encontrar tu cuenta.");
            }

            var resultado = _passwordHasher.VerifyHashedPassword(usuario, usuario.PasswordHash, passwordActual);

            if (resultado == PasswordVerificationResult.Failed)
            {
                return Respuesta(false, "La contraseña actual es incorrecta.");
            }

            usuario.PasswordHash = _passwordHasher.HashPassword(usuario, passwordNueva);

            _context.BitacoraUsuarios.Add(new BitacoraUsuario
            {
                IdUsuario = usuario.IdUsuario,
                NombreUsuario = usuario.NombreUsuario,
                NombreCompleto = usuario.NombreCompleto,
                Correo = usuario.Correo,
                Modulo = "Cuenta",
                Accion = "Cambiar contraseña",
                Descripcion = "Cambió su propia contraseña",
                FechaHora = DateTime.Now
            });

            await _context.SaveChangesAsync();

            return Respuesta(true, "Tu contraseña se actualizó correctamente.");
        }

        private static JsonResult Respuesta(bool success, string message)
        {
            return new JsonResult(new { success, message });
        }
    }
}
