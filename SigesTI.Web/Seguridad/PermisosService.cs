using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Seguridad
{
    public class PermisosService
    {
        private const string ClaveCache = "PermisosRol";

        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PermisosService(
            ApplicationDbContext context,
            IMemoryCache cache,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _cache = cache;
            _httpContextAccessor = httpContextAccessor;
        }

        public string RolActual =>
            _httpContextAccessor.HttpContext?.Session.GetString("Rol") ?? string.Empty;

        public bool EsAdmin => RolActual == Roles.Admin;

        public Task<bool> PuedeAsync(string modulo, Accion accion)
        {
            return PuedeAsync(RolActual, modulo, accion);
        }

        public async Task<bool> PuedeAsync(string rol, string modulo, Accion accion)
        {
            if (rol == Roles.Admin)
            {
                return true;
            }

            var permisos = await ObtenerPermisosAsync();

            var permiso = permisos.FirstOrDefault(p =>
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

        // Los permisos se guardan en memoria para no consultar la base en cada página
        public async Task<List<PermisoRol>> ObtenerPermisosAsync()
        {
            var permisos = await _cache.GetOrCreateAsync(ClaveCache, async entrada =>
            {
                entrada.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);

                return await _context.PermisosRol
                    .AsNoTracking()
                    .ToListAsync();
            });

            return permisos ?? new List<PermisoRol>();
        }

        // Reemplaza todos los permisos guardados por los nuevos
        public async Task GuardarPermisosAsync(List<PermisoRol> nuevosPermisos)
        {
            var actuales = await _context.PermisosRol.ToListAsync();

            _context.PermisosRol.RemoveRange(actuales);
            _context.PermisosRol.AddRange(nuevosPermisos);

            await _context.SaveChangesAsync();

            _cache.Remove(ClaveCache);
        }
    }
}
