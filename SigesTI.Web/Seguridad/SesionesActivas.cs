using System.Collections.Concurrent;

namespace SigesTI.Web.Seguridad
{
    /*
     * Lleva en memoria qué sesión tiene abierta cada usuario, para no dejarlo
     * entrar desde otro equipo mientras siga activa.
     * Una sesión cuenta como activa si tuvo movimiento dentro del tiempo de
     * inactividad (Sesion:MinutosInactividad en appsettings.json).
     */
    public class SesionesActivas
    {
        private record Sesion(string IdSesion, DateTime UltimaActividad);

        private readonly ConcurrentDictionary<int, Sesion> _sesiones = new();
        private readonly TimeSpan _tiempoInactividad;

        public SesionesActivas(IConfiguration configuration)
        {
            _tiempoInactividad = TimeSpan.FromMinutes(MinutosInactividad(configuration));
        }

        public TimeSpan TiempoInactividad => _tiempoInactividad;

        public static int MinutosInactividad(IConfiguration configuration)
        {
            return configuration.GetValue("Sesion:MinutosInactividad", 30);
        }

        // true si el usuario ya tiene abierta otra sesión (en otro equipo o navegador)
        public bool TieneOtraSesion(int idUsuario, string idSesion)
        {
            return _sesiones.TryGetValue(idUsuario, out var sesion)
                && sesion.IdSesion != idSesion
                && DateTime.Now - sesion.UltimaActividad < _tiempoInactividad;
        }

        // Se llama al iniciar sesión y en cada petición, para marcar que sigue en uso
        public void Registrar(int idUsuario, string idSesion)
        {
            _sesiones[idUsuario] = new Sesion(idSesion, DateTime.Now);
        }

        // Al cerrar sesión (o cuando el sistema la cierra) el usuario puede volver a entrar desde cualquier equipo
        public void Quitar(int idUsuario)
        {
            _sesiones.TryRemove(idUsuario, out _);
        }
    }
}
