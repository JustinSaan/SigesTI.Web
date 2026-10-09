using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;

namespace SigesTI.Web.Pages.Actividades
{
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
                // Prioriza e.Area ingresada directamente; si viene vacía, usa la del Personal
                Area = !string.IsNullOrEmpty(e.Area) ? e.Area : (e.Personal?.Area ?? "Sin Área / General"),
                Ejecutivo = e.Personal?.Nombre ?? "Sin Ejecutivo Asignado",
                PersonalId = e.PersonalId,
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

        public async Task<IActionResult> OnPostGuardarEquipoAsync([FromBody] CrearEquipoRequest request)
        {
            if (request == null)
                return BadRequest("Petición inválida.");

            if (request.Activo && (request.Fechas == null || !request.Fechas.Any()))
                return BadRequest("Debe proporcionar al menos una fecha de respaldo para equipos activos.");

            int maxOrden = await _context.EquiposRespaldo.MaxAsync(e => (int?)e.Orden) ?? 0;

            var nuevoEquipo = new EquipoRespaldo
            {
                Area = request.Area,
                PersonalId = request.PersonalId > 0 ? request.PersonalId : null,
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

        public async Task<IActionResult> OnPostActualizarEquipoAsync([FromBody] EditarEquipoRequest request)
        {
            var equipo = await _context.EquiposRespaldo
                .Include(e => e.Programaciones)
                .FirstOrDefaultAsync(e => e.Id == request.Id);

            if (equipo == null) return NotFound();

            equipo.Area = request.Area;
            equipo.PersonalId = request.PersonalId > 0 ? request.PersonalId : null;
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
    }
}