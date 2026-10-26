using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Seguridad
{
    /*
     * Notificaciones de las solicitudes de requerimiento.
     * Los métodos solo agregan o cambian registros; quien los llama hace SaveChanges.
     *
     * En las solicitudes el ejecutivo y el administrador se guardan con el nombre de Personal;
     * se avisa al usuario del sistema ligado a esa persona en Administración de Personal.
     */
    public class NotificacionesService
    {
        private readonly ApplicationDbContext _context;

        public NotificacionesService(ApplicationDbContext context)
        {
            _context = context;
        }

        public UsuarioSistema? UsuarioDePersonal(Personal? persona)
        {
            if (persona?.IdUsuario == null) return null;

            return _context.UsuariosSistema
                .FirstOrDefault(u => u.IdUsuario == persona.IdUsuario && u.Activo);
        }

        public UsuarioSistema? UsuarioPorNombre(string? nombrePersonal)
        {
            if (string.IsNullOrWhiteSpace(nombrePersonal)) return null;

            var persona = _context.Personal.FirstOrDefault(p => p.Nombre == nombrePersonal);
            return UsuarioDePersonal(persona);
        }

        // Solo el administrador elegido puede autorizar, y solo mientras esté "Por autorizar"
        public bool PuedeAutorizar(Solicitud sol, int? idUsuario)
        {
            if (idUsuario == null || sol.Estatus != EstatusSolicitud.PorAutorizar) return false;

            return UsuarioPorNombre(sol.AutorizaAdmin)?.IdUsuario == idUsuario;
        }

        // Aviso al administrador elegido. Devuelve false si no tiene usuario en el sistema.
        public bool SolicitarAutorizacion(Solicitud sol, string nombreSolicitante)
        {
            var administrador = UsuarioPorNombre(sol.AutorizaAdmin);
            if (administrador == null) return false;

            Agregar(administrador.IdUsuario, sol.IdSolicitud, TiposNotificacion.AutorizacionRequerida,
                $"{nombreSolicitante} ha generado un requerimiento, se requiere autorización");

            return true;
        }

        // Se usa cuando cambian al administrador antes de que autorice
        public void CancelarSolicitudAutorizacion(int idSolicitud)
        {
            var avisos = _context.Notificaciones
                .Where(n => n.IdSolicitud == idSolicitud &&
                            (n.Tipo == TiposNotificacion.AutorizacionRequerida || n.Tipo == TiposNotificacion.RecordatorioAutorizacion));

            _context.Notificaciones.RemoveRange(avisos);
        }

        // Recordatorio al administrador cuando la solicitud lleva 24 horas sin autorizar
        public void RecordarAutorizacion(Solicitud sol, string nombreSolicitante)
        {
            var administrador = UsuarioPorNombre(sol.AutorizaAdmin);
            if (administrador == null) return;

            Agregar(administrador.IdUsuario, sol.IdSolicitud, TiposNotificacion.RecordatorioAutorizacion,
                $"Recordatorio: el requerimiento #{sol.IdSolicitud:D4} de {nombreSolicitante} lleva más de 24 horas sin autorizar");
        }

        // Aviso al solicitante cuando su requerimiento queda resuelto
        public void NotificarResuelto(Solicitud sol, Personal? solicitante)
        {
            var usuario = UsuarioDePersonal(solicitante);
            if (usuario == null) return;

            Agregar(usuario.IdUsuario, sol.IdSolicitud, TiposNotificacion.RequerimientoResuelto,
                $"Tu requerimiento #{sol.IdSolicitud:D4} fue resuelto");
        }

        // Al autorizar: el aviso del administrador queda atendido y se avisa al ejecutivo y al solicitante
        public void NotificarAutorizado(Solicitud sol, Personal? solicitante)
        {
            string folio = sol.IdSolicitud.ToString("D4");

            var avisosAdministrador = _context.Notificaciones
                .Where(n => n.IdSolicitud == sol.IdSolicitud && n.Tipo == TiposNotificacion.AutorizacionRequerida)
                .ToList();

            foreach (var aviso in avisosAdministrador)
            {
                aviso.Tipo = TiposNotificacion.AutorizacionAtendida;
                aviso.Mensaje = $"Autorizaste el requerimiento #{folio} de {solicitante?.Nombre ?? "N/A"}";
                aviso.Leida = true;
            }

            // Los recordatorios ya no hacen falta
            _context.Notificaciones.RemoveRange(_context.Notificaciones
                .Where(n => n.IdSolicitud == sol.IdSolicitud && n.Tipo == TiposNotificacion.RecordatorioAutorizacion));

            var destinatarios = new[] { UsuarioPorNombre(sol.EjecutivoAsignado), UsuarioDePersonal(solicitante) }
                .Where(u => u != null)
                .Select(u => u!.IdUsuario)
                .Distinct();

            foreach (int idUsuario in destinatarios)
            {
                Agregar(idUsuario, sol.IdSolicitud, TiposNotificacion.RequerimientoAutorizado,
                    $"Requerimiento técnico #{folio} autorizado");
            }
        }

        /*
         * Aviso único del ejecutivo de soporte con cuántos requerimientos tiene sin resolver.
         * Llamarlo después de guardar la solicitud para que el conteo ya incluya el cambio.
         * avisar = true lo marca como no leído (cuando le llega un requerimiento nuevo).
         */
        public void ActualizarPendientesSoporte(string? nombreEjecutivo, bool avisar)
        {
            var usuario = UsuarioPorNombre(nombreEjecutivo);
            if (usuario == null) return;

            int pendientes = _context.Solicitudes.Count(s =>
                s.EjecutivoAsignado == nombreEjecutivo &&
                (s.Estatus == EstatusSolicitud.Pendiente || s.Estatus == EstatusSolicitud.PorAutorizar));

            var aviso = _context.Notificaciones.FirstOrDefault(n =>
                n.IdUsuario == usuario.IdUsuario && n.Tipo == TiposNotificacion.PendientesSoporte);

            if (pendientes == 0)
            {
                if (aviso != null) _context.Notificaciones.Remove(aviso);
                return;
            }

            string mensaje = pendientes == 1
                ? "Tienes 1 requerimiento técnico pendiente"
                : $"Tienes {pendientes} requerimientos técnicos pendientes";

            if (aviso == null)
            {
                Agregar(usuario.IdUsuario, null, TiposNotificacion.PendientesSoporte, mensaje);
                return;
            }

            aviso.Mensaje = mensaje;

            if (avisar)
            {
                aviso.Leida = false;
                aviso.FechaCreacion = DateTime.Now;
            }
        }

        private void Agregar(int idUsuario, int? idSolicitud, string tipo, string mensaje)
        {
            _context.Notificaciones.Add(new Notificacion
            {
                IdUsuario = idUsuario,
                IdSolicitud = idSolicitud,
                Tipo = tipo,
                Mensaje = mensaje,
                FechaCreacion = DateTime.Now
            });
        }
    }
}
