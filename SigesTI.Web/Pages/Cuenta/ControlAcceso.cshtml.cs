using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages.Cuenta
{
    public class AdminVistaModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PasswordHasher<UsuarioSistema> _passwordHasher;

        public AdminVistaModel(ApplicationDbContext context)
        {
            _context = context;
            _passwordHasher = new PasswordHasher<UsuarioSistema>();
        }

        /* ================================================================
           LISTAS QUE SE MUESTRAN EN LA PÁGINA
           ================================================================ */

        public IList<UsuarioSistema> ListaUsuarios { get; set; }
            = new List<UsuarioSistema>();

        public IList<BitacoraUsuario> ListaBitacora { get; set; }
            = new List<BitacoraUsuario>();

        public IList<string> ListaNombresBitacora { get; set; }
            = new List<string>();

        public IList<string> ListaCorreosBitacora { get; set; }
            = new List<string>();

        public IList<string> ListaModulosBitacora { get; set; }
            = new List<string>();

        public IList<string> ListaAccionesBitacora { get; set; }
            = new List<string>();

        /* ================================================================
           FORMULARIO DE USUARIO
           ================================================================ */

        [BindProperty]
        public UsuarioInput UsuarioForm { get; set; } = new();

        /* ================================================================
           FILTROS DE USUARIOS
           Se reciben mediante la dirección de la página.
           ================================================================ */

        [BindProperty(SupportsGet = true)]
        public string? BuscarUsuario { get; set; }

        /* ================================================================
           FILTROS DE BITÁCORA
           ================================================================ */

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

        /* ================================================================
           CARGAR PÁGINA
           ================================================================ */

        public async Task OnGetAsync()
        {
            await CargarDatos();
        }

        /* ================================================================
           REGISTRAR USUARIO
           ================================================================ */

        public async Task<IActionResult> OnPostRegistrarUsuarioAsync()
        {
            LimpiarDatosUsuario();

            // Validar que todos los campos estén completos.
            if (string.IsNullOrWhiteSpace(UsuarioForm.NombreCompleto) ||
                string.IsNullOrWhiteSpace(UsuarioForm.NombreUsuario) ||
                string.IsNullOrWhiteSpace(UsuarioForm.Correo) ||
                string.IsNullOrWhiteSpace(UsuarioForm.Rol) ||
                string.IsNullOrWhiteSpace(UsuarioForm.PasswordTemporal))
            {
                MostrarErrorNuevoUsuario(
                    "Todos los campos son obligatorios.");

                return RedirectToPage();
            }

            // Solo se permiten estos dos roles.
            if (!RolValido(UsuarioForm.Rol))
            {
                MostrarErrorNuevoUsuario(
                    "El rol seleccionado no es válido.");

                return RedirectToPage();
            }

            // La contraseña temporal debe tener mínimo ocho caracteres.
            if (UsuarioForm.PasswordTemporal.Length < 8)
            {
                MostrarErrorNuevoUsuario(
                    "La contraseña temporal debe tener al menos 8 caracteres.");

                return RedirectToPage();
            }

            string usuarioNormalizado =
                UsuarioForm.NombreUsuario.ToLower();

            string correoNormalizado =
                UsuarioForm.Correo.ToLower();

            // Validar nombre de usuario repetido.
            bool existeUsuario = await _context.UsuariosSistema
                .AnyAsync(u =>
                    u.NombreUsuario.ToLower() == usuarioNormalizado);

            if (existeUsuario)
            {
                MostrarErrorNuevoUsuario(
                    "El nombre de usuario ya existe.");

                return RedirectToPage();
            }

            // Validar correo repetido.
            bool existeCorreo = await _context.UsuariosSistema
                .AnyAsync(u =>
                    u.Correo.ToLower() == correoNormalizado);

            if (existeCorreo)
            {
                MostrarErrorNuevoUsuario(
                    "Ya existe un usuario con ese correo.");

                return RedirectToPage();
            }

            try
            {
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

                // Guardar únicamente el hash, nunca la contraseña normal.
                usuario.PasswordHash = _passwordHasher.HashPassword(
                    usuario,
                    UsuarioForm.PasswordTemporal);

                _context.UsuariosSistema.Add(usuario);
                await _context.SaveChangesAsync();

                await RegistrarBitacora(
                    usuario.IdUsuario,
                    "Cuenta",
                    "Creación",
                    $"Creó el usuario {usuario.NombreUsuario}");

                TempData["Exito"] =
                    "Usuario registrado correctamente.";

                return RedirectToPage();
            }
            catch (DbUpdateException)
            {
                MostrarErrorNuevoUsuario(
                    "No fue posible guardar el usuario en la base de datos.");

                return RedirectToPage();
            }
            catch (Exception)
            {
                MostrarErrorNuevoUsuario(
                    "Ocurrió un error inesperado al registrar el usuario.");

                return RedirectToPage();
            }
        }

        /* ================================================================
           EDITAR USUARIO
           ================================================================ */

        public async Task<IActionResult> OnPostEditarUsuarioAsync()
        {
            LimpiarDatosUsuario();

            if (UsuarioForm.IdUsuario <= 0)
            {
                TempData["Error"] =
                    "El identificador del usuario no es válido.";

                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(UsuarioForm.NombreCompleto) ||
                string.IsNullOrWhiteSpace(UsuarioForm.NombreUsuario) ||
                string.IsNullOrWhiteSpace(UsuarioForm.Correo) ||
                string.IsNullOrWhiteSpace(UsuarioForm.Rol))
            {
                TempData["Error"] =
                    "Todos los campos de edición son obligatorios.";

                return RedirectToPage();
            }

            if (!RolValido(UsuarioForm.Rol))
            {
                TempData["Error"] =
                    "El rol seleccionado no es válido.";

                return RedirectToPage();
            }

            var usuario = await _context.UsuariosSistema
                .FindAsync(UsuarioForm.IdUsuario);

            if (usuario == null)
            {
                TempData["Error"] =
                    "No se encontró el usuario seleccionado.";

                return RedirectToPage();
            }

            string usuarioNormalizado =
                UsuarioForm.NombreUsuario.ToLower();

            string correoNormalizado =
                UsuarioForm.Correo.ToLower();

            // Validar que otro usuario no tenga el mismo nombre.
            bool existeUsuario = await _context.UsuariosSistema
                .AnyAsync(u =>
                    u.IdUsuario != UsuarioForm.IdUsuario &&
                    u.NombreUsuario.ToLower() == usuarioNormalizado);

            if (existeUsuario)
            {
                TempData["Error"] =
                    "Ya existe ese nombre de usuario. Intenta con otro.";

                return RedirectToPage();
            }

            // Validar que otro usuario no tenga el mismo correo.
            bool existeCorreo = await _context.UsuariosSistema
                .AnyAsync(u =>
                    u.IdUsuario != UsuarioForm.IdUsuario &&
                    u.Correo.ToLower() == correoNormalizado);

            if (existeCorreo)
            {
                TempData["Error"] =
                    "Ya existe otro usuario con ese correo.";

                return RedirectToPage();
            }

            try
            {
                usuario.NombreCompleto =
                    UsuarioForm.NombreCompleto;

                usuario.NombreUsuario =
                    UsuarioForm.NombreUsuario;

                usuario.Correo =
                    UsuarioForm.Correo;

                usuario.Rol =
                    UsuarioForm.Rol;

                usuario.Activo =
                    UsuarioForm.Activo;

                await _context.SaveChangesAsync();

                await RegistrarBitacora(
                    usuario.IdUsuario,
                    "Cuenta",
                    "Edición",
                    $"Editó el usuario {usuario.NombreUsuario}");

                TempData["Exito"] =
                    "Usuario actualizado correctamente.";

                return RedirectToPage();
            }
            catch (DbUpdateException)
            {
                TempData["Error"] =
                    "No fue posible actualizar el usuario en la base de datos.";

                return RedirectToPage();
            }
            catch (Exception)
            {
                TempData["Error"] =
                    "Ocurrió un error inesperado al actualizar el usuario.";

                return RedirectToPage();
            }
        }

        /* ================================================================
           ELIMINAR USUARIO
           La bitácora no se elimina porque la relación usa SET NULL.
           ================================================================ */

        public async Task<IActionResult> OnPostEliminarUsuarioAsync(
            int idUsuario)
        {
            var usuario = await _context.UsuariosSistema
                .FirstOrDefaultAsync(u =>
                    u.IdUsuario == idUsuario);

            if (usuario == null)
            {
                TempData["Error"] =
                    "No se encontró el usuario seleccionado.";

                return RedirectToPage();
            }

            string nombreUsuario = usuario.NombreUsuario;

            try
            {
                // Guardar la acción antes de eliminar la cuenta.
                await RegistrarBitacora(
                    usuario.IdUsuario,
                    "Cuenta",
                    "Eliminación",
                    $"Eliminó el usuario {usuario.NombreUsuario}");

                _context.UsuariosSistema.Remove(usuario);
                await _context.SaveChangesAsync();

                TempData["Exito"] =
                    $"Usuario {nombreUsuario} eliminado correctamente.";

                return RedirectToPage();
            }
            catch (DbUpdateException)
            {
                TempData["Error"] =
                    "No fue posible eliminar el usuario. Revisa si tiene información relacionada.";

                return RedirectToPage();
            }
            catch (Exception)
            {
                TempData["Error"] =
                    "Ocurrió un error inesperado al eliminar el usuario.";

                return RedirectToPage();
            }
        }

        /* ================================================================
           RESTABLECER CONTRASEÑA
           ================================================================ */

        public async Task<IActionResult> OnPostRestablecerPasswordAsync(
            int idUsuario)
        {
            var usuario = await _context.UsuariosSistema
                .FindAsync(idUsuario);

            if (usuario == null)
            {
                TempData["Error"] =
                    "No se encontró el usuario seleccionado.";

                return RedirectToPage();
            }

            try
            {
                string passwordTemporal =
                    GenerarPasswordTemporal();

                usuario.PasswordHash =
                    _passwordHasher.HashPassword(
                        usuario,
                        passwordTemporal);

                usuario.RequiereCambioPassword = true;

                await _context.SaveChangesAsync();

                await RegistrarBitacora(
                    usuario.IdUsuario,
                    "Cuenta",
                    "Restablecer contraseña",
                    $"Restableció la contraseña temporal del usuario {usuario.NombreUsuario}");

                TempData["PasswordTemporal"] =
                    passwordTemporal;

                TempData["Exito"] =
                    $"Contraseña temporal generada para {usuario.NombreUsuario}.";

                return RedirectToPage();
            }
            catch (Exception)
            {
                TempData["Error"] =
                    "No fue posible restablecer la contraseña.";

                return RedirectToPage();
            }
        }

        /* ================================================================
           CARGAR USUARIOS, BITÁCORA Y COMBOS
           ================================================================ */

        private async Task CargarDatos()
        {
            await CargarUsuarios();
            await CargarBitacora();
            await CargarOpcionesBitacora();
        }

        private async Task CargarUsuarios()
        {
            var consulta = _context.UsuariosSistema
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(BuscarUsuario))
            {
                string buscar = BuscarUsuario.Trim();

                consulta = consulta.Where(u =>
                    u.NombreUsuario.Contains(buscar) ||
                    u.NombreCompleto.Contains(buscar) ||
                    u.Correo.Contains(buscar) ||
                    u.Rol.Contains(buscar));
            }

            ListaUsuarios = await consulta
                .OrderBy(u => u.NombreCompleto)
                .ToListAsync();
        }

        private async Task CargarBitacora()
        {
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

            ListaBitacora = await consulta
                .OrderByDescending(b => b.FechaHora)
                .Take(100)
                .ToListAsync();
        }

        private async Task CargarOpcionesBitacora()
        {
            ListaNombresBitacora =
                await _context.BitacoraUsuarios
                    .AsNoTracking()
                    .Where(b =>
                        b.NombreCompleto != null &&
                        b.NombreCompleto != "")
                    .Select(b => b.NombreCompleto!)
                    .Distinct()
                    .OrderBy(nombre => nombre)
                    .ToListAsync();

            ListaCorreosBitacora =
                await _context.BitacoraUsuarios
                    .AsNoTracking()
                    .Where(b =>
                        b.Correo != null &&
                        b.Correo != "")
                    .Select(b => b.Correo!)
                    .Distinct()
                    .OrderBy(correo => correo)
                    .ToListAsync();

            ListaModulosBitacora =
                await _context.BitacoraUsuarios
                    .AsNoTracking()
                    .Select(b => b.Modulo)
                    .Distinct()
                    .OrderBy(modulo => modulo)
                    .ToListAsync();

            ListaAccionesBitacora =
                await _context.BitacoraUsuarios
                    .AsNoTracking()
                    .Select(b => b.Accion)
                    .Distinct()
                    .OrderBy(accion => accion)
                    .ToListAsync();
        }

        /* ================================================================
           REGISTRAR UNA ACCIÓN EN LA BITÁCORA
           Guarda una copia del nombre, usuario y correo.
           ================================================================ */

        private async Task RegistrarBitacora(
            int idUsuario,
            string modulo,
            string accion,
            string descripcion)
        {
            var usuario = await _context.UsuariosSistema
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    u.IdUsuario == idUsuario);

            var bitacora = new BitacoraUsuario
            {
                IdUsuario = usuario?.IdUsuario,
                NombreUsuario = usuario?.NombreUsuario,
                NombreCompleto = usuario?.NombreCompleto,
                Correo = usuario?.Correo,
                Modulo = modulo,
                Accion = accion,
                Descripcion = descripcion,
                FechaHora = DateTime.Now
            };

            _context.BitacoraUsuarios.Add(bitacora);
            await _context.SaveChangesAsync();
        }

        /* ================================================================
           MÉTODOS AUXILIARES
           ================================================================ */

        private void LimpiarDatosUsuario()
        {
            UsuarioForm.NombreCompleto =
                UsuarioForm.NombreCompleto?.Trim()
                ?? string.Empty;

            UsuarioForm.NombreUsuario =
                UsuarioForm.NombreUsuario?.Trim()
                ?? string.Empty;

            UsuarioForm.Correo =
                UsuarioForm.Correo?.Trim()
                ?? string.Empty;

            UsuarioForm.Rol =
                UsuarioForm.Rol?.Trim()
                ?? string.Empty;

            UsuarioForm.PasswordTemporal =
                UsuarioForm.PasswordTemporal?.Trim()
                ?? string.Empty;
        }

        private bool RolValido(string rol)
        {
            return rol == "Administrador" ||
                   rol == "Soporte";
        }

        private void MostrarErrorNuevoUsuario(
            string mensaje)
        {
            TempData["Error"] = mensaje;
            TempData["AbrirModalNuevoUsuario"] = "true";
        }

        private string GenerarPasswordTemporal()
        {
            return $"Temp{DateTime.Now:HHmmss}!";
        }

        /* ================================================================
           MODELO DEL FORMULARIO
           ================================================================ */

        public class UsuarioInput
        {
            public int IdUsuario { get; set; }

            public string NombreCompleto { get; set; }
                = string.Empty;

            public string NombreUsuario { get; set; }
                = string.Empty;

            public string Correo { get; set; }
                = string.Empty;

            public string Rol { get; set; }
                = string.Empty;

            public string PasswordTemporal { get; set; }
                = string.Empty;

            public bool Activo { get; set; } = true;
        }
    }
}