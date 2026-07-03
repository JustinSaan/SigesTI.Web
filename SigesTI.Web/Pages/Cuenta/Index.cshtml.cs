using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages.Cuenta
{
    public class IndexModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PasswordHasher<UsuarioSistema> _passwordHasher;

        public IndexModel(ApplicationDbContext context)
        {
            _context = context;
            _passwordHasher = new PasswordHasher<UsuarioSistema>();
        }

        public IList<UsuarioSistema> ListaUsuarios { get; set; } = new List<UsuarioSistema>();
        public IList<BitacoraUsuario> ListaBitacora { get; set; } = new List<BitacoraUsuario>();

        [BindProperty]
        public UsuarioInput UsuarioForm { get; set; } = new();

        public async Task OnGetAsync()
        {
            await CargarDatos();
        }

        public async Task<IActionResult> OnPostRegistrarUsuarioAsync()
        {
            if (await _context.UsuariosSistema.AnyAsync(u => u.NombreUsuario == UsuarioForm.NombreUsuario))
            {
                TempData["Error"] = "El nombre de usuario ya existe.";
                return RedirectToPage();
            }

            var usuario = new UsuarioSistema
            {
                NombreCompleto = UsuarioForm.NombreCompleto,
                NombreUsuario = UsuarioForm.NombreUsuario,
                Correo = UsuarioForm.Correo,
                Rol = UsuarioForm.Rol,
                Activo = UsuarioForm.Activo,
                RequiereCambioPassword = true,
                FechaCreacion = DateTime.Now,
                PasswordHash = string.Empty,
                Bitacoras = new List<BitacoraUsuario>()
            };

            usuario.PasswordHash = _passwordHasher.HashPassword(usuario, UsuarioForm.PasswordTemporal);

            _context.UsuariosSistema.Add(usuario);
            await _context.SaveChangesAsync();

            await RegistrarBitacora(usuario.IdUsuario, "Cuenta", "Creación", $"Creó el usuario {usuario.NombreUsuario}");

            TempData["Exito"] = "Usuario registrado correctamente.";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostEditarUsuarioAsync()
        {
            var usuario = await _context.UsuariosSistema.FindAsync(UsuarioForm.IdUsuario);

            if (usuario == null)
            {
                TempData["Error"] = "No se encontró el usuario.";
                return RedirectToPage();
            }

            usuario.NombreCompleto = UsuarioForm.NombreCompleto;
            usuario.NombreUsuario = UsuarioForm.NombreUsuario;
            usuario.Correo = UsuarioForm.Correo;
            usuario.Rol = UsuarioForm.Rol;
            usuario.Activo = UsuarioForm.Activo;

            await _context.SaveChangesAsync();

            await RegistrarBitacora(usuario.IdUsuario, "Cuenta", "Edición", $"Editó el usuario {usuario.NombreUsuario}");

            TempData["Exito"] = "Usuario actualizado correctamente.";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostCambiarEstadoAsync(int idUsuario)
        {
            var usuario = await _context.UsuariosSistema.FindAsync(idUsuario);

            if (usuario == null)
            {
                TempData["Error"] = "No se encontró el usuario.";
                return RedirectToPage();
            }

            usuario.Activo = !usuario.Activo;

            await _context.SaveChangesAsync();

            await RegistrarBitacora(usuario.IdUsuario, "Cuenta", "Cambio de estado",
                $"Cambió el usuario {usuario.NombreUsuario} a {(usuario.Activo ? "Activo" : "Inactivo")}");

            TempData["Exito"] = "Estado del usuario actualizado correctamente.";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostRestablecerPasswordAsync(int idUsuario)
        {
            var usuario = await _context.UsuariosSistema.FindAsync(idUsuario);

            if (usuario == null)
            {
                TempData["Error"] = "No se encontró el usuario.";
                return RedirectToPage();
            }

            string passwordTemporal = GenerarPasswordTemporal();

            usuario.PasswordHash = _passwordHasher.HashPassword(usuario, passwordTemporal);
            usuario.RequiereCambioPassword = true;

            await _context.SaveChangesAsync();

            await RegistrarBitacora(usuario.IdUsuario, "Cuenta", "Restablecer contraseña",
                $"Restableció la contraseña temporal del usuario {usuario.NombreUsuario}");

            TempData["PasswordTemporal"] = passwordTemporal;
            TempData["Exito"] = $"Contraseña temporal generada para {usuario.NombreUsuario}.";

            return RedirectToPage();
        }

        private async Task CargarDatos()
        {
            ListaUsuarios = await _context.UsuariosSistema
                .OrderBy(u => u.NombreCompleto)
                .ToListAsync();

            ListaBitacora = await _context.BitacoraUsuarios
                .Include(b => b.UsuarioSistema)
                .OrderByDescending(b => b.FechaHora)
                .Take(100)
                .ToListAsync();
        }

        private async Task RegistrarBitacora(int idUsuario, string modulo, string accion, string descripcion)
        {
            var bitacora = new BitacoraUsuario
            {
                IdUsuario = idUsuario,
                Modulo = modulo,
                Accion = accion,
                Descripcion = descripcion,
                FechaHora = DateTime.Now
            };

            _context.BitacoraUsuarios.Add(bitacora);
            await _context.SaveChangesAsync();
        }

        private string GenerarPasswordTemporal()
        {
            return $"Temp{DateTime.Now:HHmmss}!";
        }

        public class UsuarioInput
        {
            public int IdUsuario { get; set; }
            public string NombreCompleto { get; set; } = string.Empty;
            public string NombreUsuario { get; set; } = string.Empty;
            public string Correo { get; set; } = string.Empty;
            public string Rol { get; set; } = string.Empty;
            public string PasswordTemporal { get; set; } = string.Empty;
            public bool Activo { get; set; } = true;
        }
    }
}