using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using SigesTI.Web.Seguridad;

namespace SigesTI.Web.Pages.Cuenta
{
    [Modulo(Modulos.Cuenta)]
    public class ControlAccesoModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PermisosService _permisos;
        private readonly SesionService _sesion;
        private readonly ILogger<ControlAccesoModel> _logger;
        private readonly PasswordHasher<UsuarioSistema> _passwordHasher;

        public ControlAccesoModel(
            ApplicationDbContext context,
            PermisosService permisos,
            SesionService sesion,
            ILogger<ControlAccesoModel> logger)
        {
            _context = context;
            _permisos = permisos;
            _sesion = sesion;
            _logger = logger;
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

        public IList<PermisoRol> ListaPermisos { get; set; }
            = new List<PermisoRol>();

        // Sistemas de los tickets (modal "Sistemas", solo Admin)
        public IList<SistemaTicket> ListaSistemas { get; set; }
            = new List<SistemaTicket>();

        /* ================================================================
           DATOS DEL USUARIO QUE TIENE LA SESIÓN ABIERTA
           ================================================================ */

        public bool EsAdmin => _permisos.EsAdmin;

        public int IdUsuarioActual =>
            HttpContext.Session.GetInt32("IdUsuario") ?? 0;

        /* ================================================================
           FORMULARIO DE USUARIO
           ================================================================ */

        [BindProperty]
        public UsuarioInput UsuarioForm { get; set; } = new();

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

        [Permiso(Accion.Crear)]
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

            if (!Roles.EsValido(UsuarioForm.Rol))
            {
                MostrarErrorNuevoUsuario(
                    "El rol seleccionado no es válido.");

                return RedirectToPage();
            }

            // Solo un Admin puede crear otro Admin.
            if (UsuarioForm.Rol == Roles.Admin && !EsAdmin)
            {
                MostrarErrorNuevoUsuario(
                    "Solo un Admin puede crear usuarios con rol Admin.");

                return RedirectToPage();
            }

            // La contraseña temporal debe tener mínimo ocho caracteres.
            if (UsuarioForm.PasswordTemporal.Length < 8)
            {
                MostrarErrorNuevoUsuario(
                    "La contraseña temporal debe tener al menos 8 caracteres.");

                return RedirectToPage();
            }

            if (!CorreoValido(UsuarioForm.Correo))
            {
                MostrarErrorNuevoUsuario(
                    "El correo electrónico no es válido.");

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

                await RegistrarBitacora(
                    "Cuenta",
                    "Creación",
                    $"Creó el usuario {usuario.NombreUsuario}");

                await _context.SaveChangesAsync();

                TempData["Exito"] =
                    "Usuario registrado correctamente.";

                return RedirectToPage();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Error al registrar el usuario {NombreUsuario}", UsuarioForm.NombreUsuario);

                MostrarErrorNuevoUsuario(
                    "No fue posible guardar el usuario en la base de datos.");

                return RedirectToPage();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al registrar el usuario {NombreUsuario}", UsuarioForm.NombreUsuario);

                MostrarErrorNuevoUsuario(
                    "Ocurrió un error inesperado al registrar el usuario.");

                return RedirectToPage();
            }
        }

        /* ================================================================
           EDITAR USUARIO
           ================================================================ */

        [Permiso(Accion.Editar)]
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
                MostrarErrorEditar(
                    "Todos los campos de edición son obligatorios.");

                return RedirectToPage();
            }

            if (!Roles.EsValido(UsuarioForm.Rol))
            {
                MostrarErrorEditar(
                    "El rol seleccionado no es válido.");

                return RedirectToPage();
            }

            if (!CorreoValido(UsuarioForm.Correo))
            {
                MostrarErrorEditar(
                    "El correo electrónico no es válido.");

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

            // Solo un Admin puede modificar a un Admin o dar el rol Admin.
            if (!EsAdmin &&
                (usuario.Rol == Roles.Admin || UsuarioForm.Rol == Roles.Admin))
            {
                TempData["Error"] =
                    "Solo un Admin puede modificar cuentas con rol Admin.";

                return RedirectToPage();
            }

            // Nadie puede quitarse su propio rol ni desactivarse (evita quedarse sin acceso).
            if (usuario.IdUsuario == IdUsuarioActual &&
                (UsuarioForm.Rol != usuario.Rol || !UsuarioForm.Activo))
            {
                MostrarErrorEditar(
                    "No puedes cambiar tu propio rol ni desactivar tu propia cuenta.");

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
                MostrarErrorEditar(
                    "Ya existe ese nombre de usuario. Intenta con otro.");

                return RedirectToPage();
            }

            // Validar que otro usuario no tenga el mismo correo.
            bool existeCorreo = await _context.UsuariosSistema
                .AnyAsync(u =>
                    u.IdUsuario != UsuarioForm.IdUsuario &&
                    u.Correo.ToLower() == correoNormalizado);

            if (existeCorreo)
            {
                MostrarErrorEditar(
                    "Ya existe otro usuario con ese correo.");

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

                await RegistrarBitacora(
                    "Cuenta",
                    "Edición",
                    $"Editó el usuario {usuario.NombreUsuario}");

                await _context.SaveChangesAsync();
                _sesion.OlvidarUsuario(usuario.IdUsuario);

                TempData["Exito"] =
                    "Usuario actualizado correctamente.";

                return RedirectToPage();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Error al actualizar el usuario {IdUsuario}", UsuarioForm.IdUsuario);

                MostrarErrorEditar(
                    "No fue posible actualizar el usuario en la base de datos.");

                return RedirectToPage();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar el usuario {IdUsuario}", UsuarioForm.IdUsuario);

                MostrarErrorEditar(
                    "Ocurrió un error inesperado al actualizar el usuario.");

                return RedirectToPage();
            }
        }

        /* ================================================================
           ELIMINAR USUARIO
           La bitácora no se elimina porque la relación usa SET NULL.
           ================================================================ */

        [Permiso(Accion.Eliminar)]
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

            if (usuario.IdUsuario == IdUsuarioActual)
            {
                TempData["Error"] =
                    "No puedes eliminar tu propia cuenta.";

                return RedirectToPage();
            }

            if (usuario.Rol == Roles.Admin && !EsAdmin)
            {
                TempData["Error"] =
                    "Solo un Admin puede eliminar cuentas con rol Admin.";

                return RedirectToPage();
            }

            string nombreUsuario = usuario.NombreUsuario;

            try
            {
                // Se guardan juntos: si falla la eliminación tampoco queda el registro.
                await RegistrarBitacora(
                    "Cuenta",
                    "Eliminación",
                    $"Eliminó el usuario {nombreUsuario}");

                _context.UsuariosSistema.Remove(usuario);
                await _context.SaveChangesAsync();
                _sesion.OlvidarUsuario(usuario.IdUsuario);

                TempData["Exito"] =
                    $"Usuario {nombreUsuario} eliminado correctamente.";

                return RedirectToPage();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Error al eliminar el usuario {IdUsuario}", idUsuario);

                TempData["Error"] =
                    "No fue posible eliminar el usuario. Revisa si tiene información relacionada.";

                return RedirectToPage();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar el usuario {IdUsuario}", idUsuario);

                TempData["Error"] =
                    "Ocurrió un error inesperado al eliminar el usuario.";

                return RedirectToPage();
            }
        }

        /* ================================================================
           RESTABLECER CONTRASEÑA
           ================================================================ */

        [Permiso(Accion.Editar)]
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

            if (usuario.Rol == Roles.Admin && !EsAdmin)
            {
                TempData["Error"] =
                    "Solo un Admin puede restablecer la contraseña de un Admin.";

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

                await RegistrarBitacora(
                    "Cuenta",
                    "Restablecer contraseña",
                    $"Restableció la contraseña temporal del usuario {usuario.NombreUsuario}");

                await _context.SaveChangesAsync();
                _sesion.OlvidarUsuario(usuario.IdUsuario);

                TempData["PasswordTemporal"] =
                    passwordTemporal;

                TempData["Exito"] =
                    $"Contraseña temporal generada para {usuario.NombreUsuario}.";

                return RedirectToPage();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al restablecer la contraseña del usuario {IdUsuario}", idUsuario);

                TempData["Error"] =
                    "No fue posible restablecer la contraseña.";

                return RedirectToPage();
            }
        }

        /* ================================================================
           GUARDAR PERMISOS DE LOS ROLES
           Cada casilla marcada llega como "Rol|Modulo|Accion".
           Solo el rol Admin puede cambiar permisos.
           ================================================================ */

        public async Task<IActionResult> OnPostGuardarPermisosAsync(
            List<string> permisosMarcados)
        {
            if (!EsAdmin)
            {
                TempData["Error"] =
                    "Solo el rol Admin puede modificar los permisos.";

                return RedirectToPage();
            }

            var marcados = new HashSet<string>(permisosMarcados);
            var nuevosPermisos = new List<PermisoRol>();

            foreach (string rol in Roles.Configurables)
            {
                foreach (var modulo in Modulos.Todos)
                {
                    // Solo cuentan las acciones que existen en ese módulo
                    bool Marcado(Accion accion) =>
                        modulo.Acciones.Contains(accion) &&
                        marcados.Contains($"{rol}|{modulo.Clave}|{accion}");

                    bool puedeVer = Marcado(Accion.Ver);

                    // Sin "Ver" no tiene sentido ninguna otra acción
                    nuevosPermisos.Add(new PermisoRol
                    {
                        Rol = rol,
                        Modulo = modulo.Clave,
                        PuedeVer = puedeVer,
                        PuedeCrear = puedeVer && Marcado(Accion.Crear),
                        PuedeEditar = puedeVer && Marcado(Accion.Editar),
                        PuedeEliminar = puedeVer && Marcado(Accion.Eliminar),
                        PuedeExportar = puedeVer && Marcado(Accion.Exportar)
                    });
                }
            }

            try
            {
                await _permisos.GuardarPermisosAsync(nuevosPermisos);

                await RegistrarBitacora(
                    "Cuenta",
                    "Edición",
                    "Actualizó los permisos de los roles");

                await _context.SaveChangesAsync();

                TempData["Exito"] =
                    "Permisos actualizados correctamente.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al guardar los permisos de los roles");

                TempData["Error"] =
                    "No fue posible guardar los permisos.";
            }

            return RedirectToPage();
        }

        /* ================================================================
           DEPURAR BITÁCORA (solo Admin)
           Solo se pueden borrar registros con más de 3 meses de antigüedad,
           para que lo reciente siempre quede como evidencia.
           ================================================================ */

        public const int MesesMinimosBitacora = 3;

        // Los registros de este día en adelante no se pueden borrar
        public DateTime FechaLimiteDepuracion =>
            DateTime.Today.AddMonths(-MesesMinimosBitacora);

        // Último día que se puede elegir como "hasta"
        public DateTime UltimoDiaDepurable =>
            FechaLimiteDepuracion.AddDays(-1);

        public async Task<IActionResult> OnGetContarDepuracionAsync(
            DateTime? desde,
            DateTime? hasta)
        {
            if (!EsAdmin || !hasta.HasValue)
            {
                return new JsonResult(new { total = 0 });
            }

            int total = await ConsultaDepuracion(desde, hasta.Value)
                .CountAsync();

            return new JsonResult(new { total });
        }

        public async Task<IActionResult> OnPostDepurarBitacoraAsync(
            DateTime? desde,
            DateTime? hasta)
        {
            if (!EsAdmin)
            {
                TempData["Error"] =
                    "Solo el rol Admin puede depurar la bitácora.";

                return RedirectToPage();
            }

            if (!hasta.HasValue)
            {
                TempData["Error"] =
                    "Indica hasta qué fecha quieres eliminar registros.";

                return RedirectToPage();
            }

            if (desde.HasValue && desde.Value.Date > hasta.Value.Date)
            {
                TempData["Error"] =
                    "La fecha inicial no puede ser mayor que la fecha final.";

                return RedirectToPage();
            }

            try
            {
                int eliminados = await ConsultaDepuracion(desde, hasta.Value)
                    .ExecuteDeleteAsync();

                if (eliminados == 0)
                {
                    TempData["Error"] =
                        "No hay registros que eliminar en ese rango.";

                    return RedirectToPage();
                }

                DateTime hastaReal = hasta.Value.Date < UltimoDiaDepurable
                    ? hasta.Value.Date
                    : UltimoDiaDepurable;

                string rango = desde.HasValue
                    ? $"del {desde.Value:dd/MM/yyyy} al {hastaReal:dd/MM/yyyy}"
                    : $"hasta el {hastaReal:dd/MM/yyyy}";

                // La depuración también queda registrada (no se puede borrar por 3 meses)
                await RegistrarBitacora(
                    "Cuenta",
                    "Depuración",
                    $"Depuró {eliminados} registros de la bitácora {rango}");

                await _context.SaveChangesAsync();

                TempData["Exito"] =
                    $"Se eliminaron {eliminados} registros de la bitácora.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al depurar la bitácora");

                TempData["Error"] =
                    "No fue posible depurar la bitácora.";
            }

            return RedirectToPage();
        }

        // Registros del rango elegido, siempre anteriores a la fecha límite
        private IQueryable<BitacoraUsuario> ConsultaDepuracion(
            DateTime? desde,
            DateTime hasta)
        {
            DateTime fin = hasta.Date.AddDays(1);

            if (fin > FechaLimiteDepuracion)
            {
                fin = FechaLimiteDepuracion;
            }

            var consulta = _context.BitacoraUsuarios
                .Where(b => b.FechaHora < fin);

            if (desde.HasValue)
            {
                DateTime inicio = desde.Value.Date;

                consulta = consulta.Where(b => b.FechaHora >= inicio);
            }

            return consulta;
        }

        /* ================================================================
           AYUDAS PARA LA VISTA
           ================================================================ */

        // Un usuario que no es Admin no puede tocar cuentas Admin
        public bool PuedeGestionar(UsuarioSistema usuario)
        {
            return EsAdmin || usuario.Rol != Roles.Admin;
        }

        public bool TienePermiso(string rol, string modulo, Accion accion)
        {
            var permiso = ListaPermisos.FirstOrDefault(p =>
                p.Rol == rol && p.Modulo == modulo);

            if (permiso == null)
            {
                return false;
            }

            return accion switch
            {
                Accion.Ver => permiso.PuedeVer,
                Accion.Crear => permiso.PuedeCrear,
                Accion.Editar => permiso.PuedeEditar,
                Accion.Eliminar => permiso.PuedeEliminar,
                Accion.Exportar => permiso.PuedeExportar,
                _ => false
            };
        }

        public static string ClaseRol(string rol)
        {
            return rol switch
            {
                Roles.Admin => "admin",
                Roles.Administracion => "administracion",
                Roles.Soporte => "soporte",
                _ => "usuario"
            };
        }

        /* ================================================================
           CARGAR USUARIOS, BITÁCORA Y COMBOS
           ================================================================ */

        private async Task CargarDatos()
        {
            await CargarUsuarios();
            await CargarBitacora();
            await CargarOpcionesBitacora();

            if (EsAdmin)
            {
                ListaPermisos = await _permisos.ObtenerPermisosAsync();
                ListaSistemas = await _context.SistemasTicket
                    .AsNoTracking()
                    .OrderBy(s => s.Orden).ThenBy(s => s.Nombre)
                    .ToListAsync();
            }
        }

        // La búsqueda y la paginación de las tablas se hacen en el navegador (modales.js)
        private async Task CargarUsuarios()
        {
            ListaUsuarios = await _context.UsuariosSistema
                .AsNoTracking()
                .OrderBy(u => u.NombreCompleto)
                .ToListAsync();
        }

        // Se carga toda la bitácora para que los filtros coincidan con las opciones de los combos
        private async Task CargarBitacora()
        {
            ListaBitacora = await _context.BitacoraUsuarios
                .AsNoTracking()
                .OrderByDescending(b => b.FechaHora)
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
           Guarda quién hizo la acción (el usuario de la sesión).
           Solo agrega el registro: se guarda con el SaveChanges de quien lo llama.
           ================================================================ */

        private async Task RegistrarBitacora(
            string modulo,
            string accion,
            string descripcion)
        {
            var autor = await _context.UsuariosSistema
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    u.IdUsuario == IdUsuarioActual);

            var bitacora = new BitacoraUsuario
            {
                IdUsuario = autor?.IdUsuario,
                NombreUsuario = autor?.NombreUsuario,
                NombreCompleto = autor?.NombreCompleto,
                Correo = autor?.Correo,
                Modulo = modulo,
                Accion = accion,
                Descripcion = descripcion,
                FechaHora = DateTime.Now
            };

            _context.BitacoraUsuarios.Add(bitacora);
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

        private void MostrarErrorNuevoUsuario(
            string mensaje)
        {
            TempData["Error"] = mensaje;
            TempData["AbrirModalNuevoUsuario"] = "true";
        }

        // Guarda lo que se escribió para volver a abrir el modal de edición con esos datos
        private void MostrarErrorEditar(
            string mensaje)
        {
            TempData["Error"] = mensaje;
            TempData["EditarUsuarioConError"] = JsonSerializer.Serialize(new
            {
                UsuarioForm.IdUsuario,
                UsuarioForm.NombreCompleto,
                UsuarioForm.NombreUsuario,
                UsuarioForm.Correo,
                UsuarioForm.Rol,
                UsuarioForm.Activo
            });
        }

        private static bool CorreoValido(string correo)
        {
            return new EmailAddressAttribute().IsValid(correo);
        }

        // Contraseña aleatoria de 12 caracteres (sin letras que se confunden como O/0 o l/1)
        private static string GenerarPasswordTemporal()
        {
            const string caracteres =
                "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";

            return RandomNumberGenerator.GetString(caracteres, 12);
        }

        /* ================================================================
           SISTEMAS DE LOS TICKETS (solo Admin)
           La lista se usa en el Reporte de Tickets y en Indicadores.
           ================================================================ */

        // Guarda nombres, colores, tipo y orden de la lista del modal.
        // Si un sistema cambia de nombre, sus tickets se actualizan con el nombre nuevo.
        public async Task<IActionResult> OnPostGuardarSistemasAsync([FromBody] List<SistemaTicket> lista)
        {
            if (!EsAdmin)
                return new JsonResult(new { exito = false, mensaje = "Solo el rol Admin puede modificar los sistemas." });

            lista ??= new List<SistemaTicket>();
            foreach (var s in lista)
            {
                s.Nombre = (s.Nombre ?? "").Trim().ToUpper();
                s.ColorFondo = (s.ColorFondo ?? "").Trim().ToUpper();
                s.ColorTexto = (s.ColorTexto ?? "").Trim().ToUpper();
            }

            if (lista.Any(s => s.Nombre == ""))
                return new JsonResult(new { exito = false, mensaje = "Todos los sistemas deben tener nombre." });

            if (lista.Any(s => s.Nombre.Length > 50))
                return new JsonResult(new { exito = false, mensaje = "El nombre de un sistema no puede pasar de 50 caracteres." });

            var repetido = lista.GroupBy(s => s.Nombre).FirstOrDefault(g => g.Count() > 1);
            if (repetido != null)
                return new JsonResult(new { exito = false, mensaje = $"El sistema {repetido.Key} está repetido." });

            var colorValido = new Regex("^#[0-9A-F]{6}$");
            if (lista.Any(s => !colorValido.IsMatch(s.ColorFondo) || !colorValido.IsMatch(s.ColorTexto)))
                return new JsonResult(new { exito = false, mensaje = "Hay un color que no es válido." });

            var actuales = await _context.SistemasTicket.ToListAsync();

            for (int i = 0; i < lista.Count; i++)
            {
                var s = lista[i];
                var existente = actuales.FirstOrDefault(a => a.IdSistema == s.IdSistema);

                if (existente == null)
                {
                    _context.SistemasTicket.Add(new SistemaTicket
                    {
                        Nombre = s.Nombre,
                        ColorFondo = s.ColorFondo,
                        ColorTexto = s.ColorTexto,
                        Interno = s.Interno,
                        Orden = i + 1
                    });
                    continue;
                }

                if (existente.Nombre != s.Nombre)
                {
                    await _context.Tickets
                        .Where(t => t.Sistema == existente.Nombre)
                        .ExecuteUpdateAsync(u => u.SetProperty(t => t.Sistema, s.Nombre));
                }

                existente.Nombre = s.Nombre;
                existente.ColorFondo = s.ColorFondo;
                existente.ColorTexto = s.ColorTexto;
                existente.Interno = s.Interno;
                existente.Orden = i + 1;
            }

            await RegistrarBitacora("Cuenta", "Edición", "Actualizó los sistemas de los tickets");
            await _context.SaveChangesAsync();
            return new JsonResult(new { exito = true });
        }

        // Los tickets del sistema eliminado conservan su nombre, pero se ven en gris
        public async Task<IActionResult> OnPostEliminarSistemaAsync(int idSistema)
        {
            if (!EsAdmin)
                return new JsonResult(new { exito = false, mensaje = "Solo el rol Admin puede eliminar sistemas." });

            var sistema = await _context.SistemasTicket.FindAsync(idSistema);
            if (sistema == null)
                return new JsonResult(new { exito = false, mensaje = "El sistema ya no existe." });

            _context.SistemasTicket.Remove(sistema);
            await RegistrarBitacora("Cuenta", "Eliminación", $"Eliminó el sistema {sistema.Nombre}");
            await _context.SaveChangesAsync();
            return new JsonResult(new { exito = true });
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
