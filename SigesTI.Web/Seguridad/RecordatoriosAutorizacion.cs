using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Seguridad
{
    /*
     * Revisa cada hora las solicitudes "Por autorizar". Si al administrador no se le ha avisado
     * en las últimas 24 horas (ni la solicitud original ni un recordatorio), le manda un recordatorio.
     * Corre en segundo plano mientras la aplicación está encendida (se registra en Program.cs).
     */
    public class RecordatoriosAutorizacion : BackgroundService
    {
        private static readonly TimeSpan CadaCuanto = TimeSpan.FromHours(1);
        private static readonly TimeSpan SinAutorizar = TimeSpan.FromHours(24);

        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<RecordatoriosAutorizacion> _logger;

        public RecordatoriosAutorizacion(IServiceScopeFactory scopes, ILogger<RecordatoriosAutorizacion> logger)
        {
            _scopes = scopes;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken detener)
        {
            using var reloj = new PeriodicTimer(CadaCuanto);

            do
            {
                try
                {
                    await EnviarRecordatoriosAsync(detener);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    // Si la base no responde se intenta otra vez en la siguiente vuelta
                    _logger.LogError(ex, "No se pudieron enviar los recordatorios de autorización.");
                }
            }
            while (await reloj.WaitForNextTickAsync(detener));
        }

        private async Task EnviarRecordatoriosAsync(CancellationToken detener)
        {
            using var scope = _scopes.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var notificaciones = scope.ServiceProvider.GetRequiredService<NotificacionesService>();

            DateTime limite = DateTime.Now - SinAutorizar;

            var porAutorizar = await context.Solicitudes
                .Include(s => s.Personal)
                .Where(s => s.Estatus == EstatusSolicitud.PorAutorizar)
                .ToListAsync(detener);

            foreach (var sol in porAutorizar)
            {
                DateTime? ultimoAviso = await context.Notificaciones
                    .Where(n => n.IdSolicitud == sol.IdSolicitud &&
                                (n.Tipo == TiposNotificacion.AutorizacionRequerida || n.Tipo == TiposNotificacion.RecordatorioAutorizacion))
                    .MaxAsync(n => (DateTime?)n.FechaCreacion, detener);

                // Sin aviso previo = el administrador no tenía usuario ligado cuando se generó
                DateTime referencia = ultimoAviso ?? sol.FechaIngreso;

                if (referencia <= limite)
                {
                    notificaciones.RecordarAutorizacion(sol, sol.Personal?.Nombre ?? "N/A");
                }
            }

            await context.SaveChangesAsync(detener);
        }
    }
}
