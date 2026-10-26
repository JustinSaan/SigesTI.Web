using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Seguridad;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages.Actividades
{
    [Modulo(Modulos.PlanRespaldos)]
    public class PlanRespaldosModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public PlanRespaldosModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public List<string> Areas { get; set; } = new();
        public List<EquipoDto> EquiposMatriz { get; set; } = new();

        public async Task OnGetAsync()
        {
            Areas = await _context.Personal
                .Where(p => !string.IsNullOrEmpty(p.Area))
                .Select(p => p.Area!)
                .Distinct()
                .OrderBy(a => a)
                .ToListAsync();

            var fechaHoy = DateTime.Today;

            var equipos = await _context.EquiposRespaldo
                .Include(e => e.Personal)
                .Include(e => e.Programaciones)
                .OrderBy(e => e.Orden)
                .ThenBy(e => e.Id)
                .ToListAsync();

            EquiposMatriz = equipos.Select(e => new EquipoDto
            {
                Id = e.Id,
                Area = ObtenerArea(e),
                Ejecutivo = ObtenerNombreEjecutivo(e),
                PersonalId = e.PersonalId,
                EjecutivoManual = e.EjecutivoManual,
                SiguienteRespaldo = CalcularSiguienteRespaldo(e),
                Hostname = e.Hostname,
                DireccionIP = e.DireccionIP,
                Activo = e.Activo,
                Orden = e.Orden,
                Programaciones = e.Programaciones
                    .Where(p => p.FechaProgramada >= fechaHoy || p.Estado != "Realizado")
                    .OrderBy(p => p.FechaProgramada)
                    .Select(p => new ProgramacionDto
                    {
                        Id = p.Id,
                        FechaProgramada = p.FechaProgramada,
                        Estado = p.Estado,
                        Observaciones = p.Observaciones
                    }).ToList()
            }).ToList();
        }

        public async Task<JsonResult> OnGetEjecutivosPorAreaAsync(string area)
        {
            var ejecutivos = await _context.Personal
                .Where(p => p.Area == area)
                .Select(p => new { id = p.Id, nombre = p.Nombre })
                .ToListAsync();

            return new JsonResult(ejecutivos);
        }

        // ===== NUEVO (Plan de Respaldos): datos del calendario de "Consultar respaldos realizados" =====
        // Estatus: Realizado, En Curso, Atrasado (no realizado y la fecha ya pasó) o Pendiente (no realizado y en tiempo)
        public async Task<JsonResult> OnGetConsultaRespaldosAsync(int anio, int mes, string? area, int? personalId)
        {
            var fechaHoy = DateTime.Today;

            var equipos = await _context.EquiposRespaldo
                .Include(e => e.Personal)
                .Include(e => e.Programaciones.Where(p => p.FechaProgramada.Year == anio && p.FechaProgramada.Month == mes))
                .ToListAsync();

            var respaldos = equipos
                .Select(e => new
                {
                    Equipo = e,
                    Area = ObtenerArea(e)
                })
                .Where(x => string.IsNullOrEmpty(area) || string.Equals(x.Area, area, StringComparison.OrdinalIgnoreCase))
                .Where(x => !personalId.HasValue || x.Equipo.PersonalId == personalId)
                .SelectMany(x => x.Equipo.Programaciones.Select(p => new
                {
                    dia = p.FechaProgramada.Day,
                    area = x.Area,
                    ejecutivo = ObtenerNombreEjecutivo(x.Equipo),
                    hostname = x.Equipo.Hostname,
                    ip = x.Equipo.DireccionIP,
                    estatus = ObtenerEstatusCalendario(p, fechaHoy),
                    observaciones = p.Observaciones
                }))
                .OrderBy(r => r.dia)
                .ThenBy(r => r.ejecutivo)
                .ToList();

            return new JsonResult(respaldos);
        }

        // Estatus que se pinta en el calendario: Realizado, En Curso, Atrasado (ya pasó la fecha) o Pendiente
        private static string ObtenerEstatusCalendario(ProgramacionRespaldo p, DateTime fechaHoy)
        {
            if (p.Estado == "Realizado") return "Realizado";
            if (p.Estado == "En Curso") return "En Curso";
            return p.FechaProgramada.Date < fechaHoy ? "Atrasado" : "Pendiente";
        }
        // ===== FIN NUEVO =====

        [Permiso(Accion.Crear)]
        public async Task<IActionResult> OnPostGuardarEquipoAsync([FromBody] CrearEquipoRequest request)
        {
            if (request == null) return BadRequest("Petición inválida.");

            if (request.Activo && (request.Fechas == null || !request.Fechas.Any()))
                return BadRequest("Debe proporcionar al menos una fecha de respaldo para equipos activos.");

            int maxOrden = await _context.EquiposRespaldo.MaxAsync(e => (int?)e.Orden) ?? 0;

            var nuevoEquipo = new EquipoRespaldo
            {
                Area = request.Area,
                PersonalId = request.PersonalId > 0 ? request.PersonalId : null,
                EjecutivoManual = LimpiarEjecutivoManual(request.PersonalId, request.EjecutivoManual),
                Hostname = request.Hostname,
                DireccionIP = request.DireccionIP,
                Activo = request.Activo,
                Orden = maxOrden + 1,
                FechaCreacion = DateTime.Now
            };

            _context.EquiposRespaldo.Add(nuevoEquipo);
            await _context.SaveChangesAsync();

            if (request.Activo && request.Fechas != null && request.Fechas.Any())
            {
                foreach (var fecha in request.Fechas.Distinct())
                {
                    _context.ProgramacionRespaldos.Add(new ProgramacionRespaldo
                    {
                        EquipoRespaldoId = nuevoEquipo.Id,
                        FechaProgramada = fecha,
                        Estado = "Pendiente"
                    });
                }
                await _context.SaveChangesAsync();
            }

            return new JsonResult(new { success = true });
        }

        [Permiso(Accion.Editar)]
        public async Task<IActionResult> OnPostActualizarEquipoAsync([FromBody] EditarEquipoRequest request)
        {
            var equipo = await _context.EquiposRespaldo
                .Include(e => e.Programaciones)
                .FirstOrDefaultAsync(e => e.Id == request.Id);

            if (equipo == null) return NotFound();

            equipo.Area = request.Area;
            equipo.PersonalId = request.PersonalId > 0 ? request.PersonalId : null;
            equipo.EjecutivoManual = LimpiarEjecutivoManual(request.PersonalId, request.EjecutivoManual);
            equipo.Hostname = request.Hostname;
            equipo.DireccionIP = request.DireccionIP;
            equipo.Activo = request.Activo;

            if (request.NuevasFechas != null)
            {
                foreach (var f in request.NuevasFechas)
                {
                    if (!equipo.Programaciones.Any(p => p.FechaProgramada.Date == f.Date))
                    {
                        equipo.Programaciones.Add(new ProgramacionRespaldo
                        {
                            FechaProgramada = f,
                            Estado = "Pendiente"
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        [Permiso(Accion.Editar)]
        public async Task<IActionResult> OnPostCambiarEstadoRespaldoAsync([FromBody] CambiarEstadoRequest request)
        {
            var prog = await _context.ProgramacionRespaldos.FindAsync(request.ProgramacionId);
            if (prog == null) return NotFound();

            prog.Estado = request.Estado;
            prog.Observaciones = request.Observaciones;
            if (request.Estado == "Realizado")
            {
                prog.FechaCompletado = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        // Nuevo handler para modificar una fecha individual asignada
        [Permiso(Accion.Editar)]
        public async Task<IActionResult> OnPostEditarFechaProgramadaAsync([FromBody] EditarFechaRequest request)
        {
            var prog = await _context.ProgramacionRespaldos.FindAsync(request.ProgramacionId);
            if (prog == null) return NotFound();

            prog.FechaProgramada = request.NuevaFecha;
            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        // ===== NUEVO (Plan de Respaldos): eliminar un equipo junto con todas sus fechas programadas =====
        [Permiso(Accion.Eliminar)]
        public async Task<IActionResult> OnPostEliminarEquipoAsync([FromBody] EliminarEquipoRequest request)
        {
            var equipo = await _context.EquiposRespaldo
                .Include(e => e.Programaciones)
                .FirstOrDefaultAsync(e => e.Id == request.Id);

            if (equipo == null) return NotFound();

            _context.ProgramacionRespaldos.RemoveRange(equipo.Programaciones);
            _context.EquiposRespaldo.Remove(equipo);
            await _context.SaveChangesAsync();

            return new JsonResult(new { success = true });
        }

        // ===== NUEVO (Plan de Respaldos): helpers de área, ejecutivo y siguiente respaldo =====
        private static string ObtenerArea(EquipoRespaldo e)
        {
            return !string.IsNullOrEmpty(e.Area) ? e.Area : (e.Personal?.Area ?? "Sin Área / General");
        }

        // Primero el ejecutivo de la tabla Personal; si no hay, el escrito a mano; si tampoco, "Sin Ejecutivo Asignado"
        private static string ObtenerNombreEjecutivo(EquipoRespaldo e)
        {
            if (e.Personal != null) return e.Personal.Nombre;
            if (!string.IsNullOrWhiteSpace(e.EjecutivoManual)) return e.EjecutivoManual;
            return "Sin Ejecutivo Asignado";
        }

        // El nombre manual solo se guarda cuando NO se eligió un ejecutivo de la tabla Personal
        private static string? LimpiarEjecutivoManual(int? personalId, string? ejecutivoManual)
        {
            if (personalId > 0 || string.IsNullOrWhiteSpace(ejecutivoManual)) return null;
            return ejecutivoManual.Trim();
        }

        // ----- Configuración del cálculo del siguiente respaldo (cámbiala aquí si cambian las reglas) -----
        private static readonly string[] MesesEs = { "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };

        // Áreas normales: se respaldan cada 3 meses, en estos meses del año
        private static readonly int[] MesesRespaldoTrimestral = { 1, 4, 7, 10 }; // Enero, Abril, Julio, Octubre

        // Área de Desarrollo: cada 15 días contados a partir del día siguiente al último respaldo
        private const int DiasEntreRespaldosDesarrollo = 15;

        private static string CalcularSiguienteRespaldo(EquipoRespaldo e)
        {
            var hoy = DateTime.Today;
            bool esDesarrollo = ObtenerArea(e).ToLower().Contains("desarrollo");

            if (esDesarrollo)
            {
                // Fecha del último respaldo realizado (si nunca se ha hecho uno, se toma el día de hoy)
                DateTime ultimoRespaldo = e.Programaciones
                    .Where(p => p.Estado == "Realizado")
                    .Select(p => (p.FechaCompletado ?? p.FechaProgramada).Date)
                    .DefaultIfEmpty(hoy)
                    .Max();

                // El día siguiente al respaldo es el día 1, así que el día 15 es: último respaldo + 15 días
                DateTime siguiente = ultimoRespaldo.AddDays(DiasEntreRespaldosDesarrollo);

                // Si cae en fin de semana se recorre al viernes anterior
                if (siguiente.DayOfWeek == DayOfWeek.Saturday) siguiente = siguiente.AddDays(-1);
                if (siguiente.DayOfWeek == DayOfWeek.Sunday) siguiente = siguiente.AddDays(-2);

                return $"El siguiente respaldo es el {siguiente.Day} de {MesesEs[siguiente.Month]} {siguiente.Year}";
            }

            // Demás áreas: se busca el siguiente mes de respaldo trimestral después del mes actual
            DateTime mes = new DateTime(hoy.Year, hoy.Month, 1).AddMonths(1);
            while (!MesesRespaldoTrimestral.Contains(mes.Month))
            {
                mes = mes.AddMonths(1);
            }

            return $"El siguiente respaldo es en {MesesEs[mes.Month]} {mes.Year}";
        }
        // ===== FIN NUEVO =====

        [Permiso(Accion.Editar)]
        public async Task<IActionResult> OnPostGuardarOrdenAsync([FromBody] List<int> ordenIds)
        {
            if (ordenIds == null || !ordenIds.Any()) return BadRequest();

            for (int i = 0; i < ordenIds.Count; i++)
            {
                var equipo = await _context.EquiposRespaldo.FindAsync(ordenIds[i]);
                if (equipo != null)
                {
                    equipo.Orden = i + 1;
                }
            }

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        public class EquipoDto
        {
            public int Id { get; set; }
            public string Area { get; set; } = string.Empty;
            public string Ejecutivo { get; set; } = string.Empty;
            public int? PersonalId { get; set; }
            public string? EjecutivoManual { get; set; }
            public string SiguienteRespaldo { get; set; } = string.Empty;
            public string Hostname { get; set; } = string.Empty;
            public string DireccionIP { get; set; } = string.Empty;
            public bool Activo { get; set; }
            public int Orden { get; set; }
            public List<ProgramacionDto> Programaciones { get; set; } = new();
        }

        public class ProgramacionDto
        {
            public int Id { get; set; }
            public DateTime FechaProgramada { get; set; }
            public string Estado { get; set; } = string.Empty;
            public string? Observaciones { get; set; }
        }

        public class CrearEquipoRequest
        {
            public string? Area { get; set; }
            public int? PersonalId { get; set; }
            public string? EjecutivoManual { get; set; }
            public string Hostname { get; set; } = string.Empty;
            public string DireccionIP { get; set; } = string.Empty;
            public bool Activo { get; set; }
            public List<DateTime> Fechas { get; set; } = new();
        }

        public class EditarEquipoRequest
        {
            public int Id { get; set; }
            public string? Area { get; set; }
            public int? PersonalId { get; set; }
            public string? EjecutivoManual { get; set; }
            public string Hostname { get; set; } = string.Empty;
            public string DireccionIP { get; set; } = string.Empty;
            public bool Activo { get; set; }
            public List<DateTime>? NuevasFechas { get; set; }
        }

        public class CambiarEstadoRequest
        {
            public int ProgramacionId { get; set; }
            public string Estado { get; set; } = string.Empty;
            public string? Observaciones { get; set; }
        }

        public class EliminarEquipoRequest
        {
            public int Id { get; set; }
        }

        public class EditarFechaRequest
        {
            public int ProgramacionId { get; set; }
            public DateTime NuevaFecha { get; set; }
        }
    }
}
