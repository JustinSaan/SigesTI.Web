using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SigesTI.Web.Data;

namespace SigesTI.Web.Seguridad
{
    /*
     * Mantiene la sesión al día con la base de datos.
     * El rol y el estado se guardan en la sesión al iniciar, pero un Admin
     * puede cambiarlos después; aquí se revisan en cada petición.
     */
    public class SesionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly SesionesActivas _sesionesActivas;

        public SesionService(ApplicationDbContext context, IMemoryCache cache, SesionesActivas sesionesActivas)
        {
            _context = context;
            _cache = cache;
            _sesionesActivas = sesionesActivas;
        }

        private record EstadoUsuario(
            string Rol,
            string NombreUsuario,
            string NombreCompleto,
            bool Activo,
            bool RequiereCambioPassword);

        private static string ClaveCache(int idUsuario) => $"SesionUsuario_{idUsuario}";

        /*
         * true si el usuario pasó más del tiempo permitido sin usar el sistema; en ese caso se cierra su sesión.
         * Las peticiones automáticas (la campana de notificaciones) no cuentan como actividad.
         */
        public bool CaducoPorInactividad(HttpContext httpContext, bool esSegundoPlano)
        {
            int? idUsuario = httpContext.Session.GetInt32("IdUsuario");
            string? ultimaActividad = httpContext.Session.GetString("UltimaActividad");

            if (idUsuario == null)
            {
                return false;
            }

            if (ultimaActividad != null
                && DateTime.Now - new DateTime(long.Parse(ultimaActividad)) > _sesionesActivas.TiempoInactividad)
            {
                httpContext.Session.Clear();
                _sesionesActivas.Quitar(idUsuario.Value);
                return true;
            }

            if (!esSegundoPlano || ultimaActividad == null)
            {
                httpContext.Session.SetString("UltimaActividad", DateTime.Now.Ticks.ToString());
            }

            return false;
        }

        // Devuelve false si la sesión ya no es válida y hay que mandar al usuario al Login
        public async Task<bool> ValidarSesionAsync(HttpContext httpContext, bool esSegundoPlano)
        {
            int? idUsuario = httpContext.Session.GetInt32("IdUsuario");

            if (idUsuario == null)
            {
                return false;
            }

            // Se guarda unos segundos en memoria para no consultar la base en cada petición
            var estado = await _cache.GetOrCreateAsync(ClaveCache(idUsuario.Value), async entrada =>
            {
                entrada.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);

                return await _context.UsuariosSistema
                    .AsNoTracking()
                    .Where(u => u.IdUsuario == idUsuario.Value)
                    .Select(u => new EstadoUsuario(
                        u.Rol,
                        u.NombreUsuario,
                        u.NombreCompleto,
                        u.Activo,
                        u.RequiereCambioPassword))
                    .FirstOrDefaultAsync();
            });

            // Eliminado, desactivado o con contraseña restablecida: se cierra su sesión
            if (estado == null || !estado.Activo || estado.RequiereCambioPassword)
            {
                httpContext.Session.Clear();
                _sesionesActivas.Quitar(idUsuario.Value);
                return false;
            }

            // Marca que la sesión sigue en uso (así no se puede abrir otra en otro equipo)
            if (!esSegundoPlano)
            {
                _sesionesActivas.Registrar(idUsuario.Value, httpContext.Session.Id);
            }

            // Si un Admin le cambió el rol o el nombre, la sesión toma los datos nuevos
            httpContext.Session.SetString("Rol", estado.Rol);
            httpContext.Session.SetString("Usuario", estado.NombreUsuario);
            httpContext.Session.SetString("NombreCompleto", estado.NombreCompleto);

            return true;
        }

        // Se llama al editar, eliminar o restablecer un usuario para que el cambio aplique de inmediato
        public void OlvidarUsuario(int idUsuario)
        {
            _cache.Remove(ClaveCache(idUsuario));
        }
    }
}
