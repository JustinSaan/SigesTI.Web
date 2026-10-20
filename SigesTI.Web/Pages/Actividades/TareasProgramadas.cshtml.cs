using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SigesTI.Web.Pages.Actividades
{
    public class TareasProgramadasModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public TareasProgramadasModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public List<TareaProgramada> ListaTareas { get; set; } = new();
        public SelectList SelectTipos { get; set; } = default!;
        public SelectList SelectUsuarios { get; set; } = default!;
        public SelectList SelectPersonal { get; set; } = default!;

        public string RolUsuario { get; set; } = string.Empty;
        public string NombreUsuarioSesion { get; set; } = string.Empty;

        [BindProperty]
        public TareaInputModel TareaInput { get; set; } = new();

        [BindProperty(SupportsGet = true)]
        public DateTime? FiltroFechaInicio { get; set; }

        [BindProperty(SupportsGet = true)]
        public DateTime? FiltroFechaFin { get; set; }

        public class TareaInputModel
        {
            public int Id { get; set; }
            public string Tarea { get; set; } = string.Empty;
            public int TipoTareaId { get; set; }
            public string? NuevoTipo { get; set; }
            public string? PersonaSolicitante { get; set; }
            public int PersonaAsignadaId { get; set; }
            public DateTime FechaSolicitud { get; set; } = DateTime.Today;
            public string? Objetivo { get; set; }
            public string? Observaciones { get; set; }
            public string? NuevoComentario { get; set; }
            public string? Estatus { get; set; }
            public DateTime? FechaRealizacion { get; set; }
        }

        public class CampanaResumenDTO
        {
            public int TotalClientes { get; set; }
            public int EncuestasFinalizadas { get; set; }
            public int SeguimientoPendiente { get; set; }
            public int EncuestasEnCurso { get; set; }
            public int Porcentaje { get; set; }
            public int ContactadosHoy { get; set; }
        }

        private (int? id, string nombre, string rol) ObtenerUsuarioSesion()
        {
            int? userId = HttpContext.Session.GetInt32("IdUsuario");

            string nombreUsuario = HttpContext.Session.GetString("NombreCompleto")
                                ?? HttpContext.Session.GetString("NombreUsuario")
                                ?? string.Empty;

            string rol = HttpContext.Session.GetString("Rol")
                      ?? HttpContext.Session.GetString("Perfil")
                      ?? string.Empty;

            RolUsuario = rol;
            NombreUsuarioSesion = nombreUsuario;

            return (userId, nombreUsuario, rol);
        }

        public async Task<IActionResult> OnGetAsync()
        {
            var (userId, _, _) = ObtenerUsuarioSesion();

            if (!userId.HasValue)
            {
                return RedirectToPage("/InicioSesion/Login");
            }

            await CargarDatosAsync();
            return Page();
        }

        private async Task CargarDatosAsync()
        {
            var queryTareas = _context.TareasProgramadas.AsNoTracking().AsQueryable();

            if (!FiltroFechaInicio.HasValue && !FiltroFechaFin.HasValue)
            {
                
            }
            else
            {
                bool soloFechaSolicitud = FiltroFechaInicio.HasValue && !FiltroFechaFin.HasValue;
                bool soloFechaRealizacion = !FiltroFechaInicio.HasValue && FiltroFechaFin.HasValue;

                if (soloFechaSolicitud)
                {
                    // Filtrar exclusivamente por el día exacto de la Fecha de Solicitud
                    var diaInicio = FiltroFechaInicio.Value.Date;
                    var diaFin = diaInicio.AddDays(1).AddTicks(-1);

                    queryTareas = queryTareas.Where(t => t.FechaSolicitud >= diaInicio && t.FechaSolicitud <= diaFin);
                }
                else if (soloFechaRealizacion)
                {
                    // Filtrar exclusivamente por el día exacto de la Fecha de Realización
                    var diaInicio = FiltroFechaFin.Value.Date;
                    var diaFin = diaInicio.AddDays(1).AddTicks(-1);

                    queryTareas = queryTareas.Where(t => t.FechaRealizacion != null && t.FechaRealizacion >= diaInicio && t.FechaRealizacion <= diaFin);
                }
                else
                {
                    // Rango completo habitual (Fecha Inicio y Fecha Fin proporcionadas)
                    var inicio = FiltroFechaInicio ?? DateTime.MinValue;
                    var fin = FiltroFechaFin.HasValue ? FiltroFechaFin.Value.Date.AddDays(1).AddTicks(-1) : DateTime.MaxValue;

                    queryTareas = queryTareas.Where(t =>
                        (t.FechaSolicitud >= inicio && t.FechaSolicitud <= fin) ||
                        (t.FechaRealizacion != null && t.FechaRealizacion >= inicio && t.FechaRealizacion <= fin)
                    );
                }
            }

            ListaTareas = await queryTareas
                .OrderByDescending(t => t.FechaCreacion)
                .Select(t => new TareaProgramada
                {
                    Id = t.Id,
                    Tarea = t.Tarea,
                    TipoTareaId = t.TipoTareaId,
                    PersonaSolicitante = t.PersonaSolicitante,
                    PersonaAsignadaId = t.PersonaAsignadaId,
                    FechaSolicitud = t.FechaSolicitud,
                    Objetivo = t.Objetivo,
                    Observaciones = t.Observaciones,
                    Estatus = string.IsNullOrWhiteSpace(t.Estatus) ? "Pendiente" : t.Estatus,
                    FechaRealizacion = t.FechaRealizacion,
                    FechaCreacion = t.FechaCreacion,
                    CreadoPorId = t.CreadoPorId,

                    TipoTarea = _context.TiposTareaProgramada
                        .Where(tp => tp.Id == t.TipoTareaId)
                        .Select(tp => new TipoTareaProgramada { Id = tp.Id, Nombre = tp.Nombre })
                        .FirstOrDefault(),

                    PersonaAsignada = _context.Personal
                        .Where(p => p.Id == t.PersonaAsignadaId)
                        .Select(p => new SigesTI.Web.Models.Personal { Id = p.Id, Nombre = p.Nombre })
                        .FirstOrDefault()
                })
                .ToListAsync();

            var tipos = await _context.TiposTareaProgramada.AsNoTracking().OrderBy(t => t.Nombre).ToListAsync();
            SelectTipos = new SelectList(tipos, "Id", "Nombre");

            var personalList = await _context.Personal
                .AsNoTracking()
                .Where(p => p.Activo == true)
                .OrderBy(p => p.Nombre)
                .Select(p => new { p.Id, p.Nombre })
                .ToListAsync();

            SelectPersonal = new SelectList(personalList, "Nombre", "Nombre");
            SelectUsuarios = new SelectList(personalList, "Id", "Nombre");
        }

        public async Task<IActionResult> OnPostGuardarTareaAsync()
        {
            var (usuarioId, usuarioNombre, _) = ObtenerUsuarioSesion();

            if (!usuarioId.HasValue)
            {
                return new JsonResult(new
                {
                    success = false,
                    message = "La sesión ha expirado. Por favor, inicia sesión nuevamente.",
                    redirect = "/InicioSesion/Login"
                });
            }

            try
            {
                if (TareaInput.TipoTareaId == -1 && !string.IsNullOrWhiteSpace(TareaInput.NuevoTipo))
                {
                    string nombreTipoLimpio = TareaInput.NuevoTipo.Trim();
                    var tipoExistente = await _context.TiposTareaProgramada
                        .FirstOrDefaultAsync(t => t.Nombre.ToLower() == nombreTipoLimpio.ToLower());

                    if (tipoExistente != null)
                    {
                        TareaInput.TipoTareaId = tipoExistente.Id;
                    }
                    else
                    {
                        var nuevoTipoObj = new TipoTareaProgramada { Nombre = nombreTipoLimpio };
                        _context.TiposTareaProgramada.Add(nuevoTipoObj);
                        await _context.SaveChangesAsync();
                        TareaInput.TipoTareaId = nuevoTipoObj.Id;
                    }
                }

                string estatusFinal = string.IsNullOrWhiteSpace(TareaInput.Estatus) ? "Pendiente" : TareaInput.Estatus;

                if (TareaInput.Id == 0)
                {
                    string observacionesIniciales = "";
                    if (!string.IsNullOrWhiteSpace(TareaInput.NuevoComentario))
                    {
                        var fechaHora = DateTime.Now.ToString("dd/MM/yyyy hh:mm:ss tt");
                        observacionesIniciales = $"Agregado el: {fechaHora} Por: {usuarioNombre}\n\n{TareaInput.NuevoComentario.Trim()}";
                    }

                    var nueva = new TareaProgramada
                    {
                        Tarea = TareaInput.Tarea,
                        TipoTareaId = TareaInput.TipoTareaId,
                        PersonaSolicitante = TareaInput.PersonaSolicitante ?? "Sin Especificar",
                        PersonaAsignadaId = TareaInput.PersonaAsignadaId,
                        FechaSolicitud = TareaInput.FechaSolicitud.Date,
                        Objetivo = TareaInput.Objetivo,
                        Observaciones = observacionesIniciales,
                        Estatus = estatusFinal,
                        FechaRealizacion = estatusFinal.Equals("Resuelta", StringComparison.OrdinalIgnoreCase)
                            ? (TareaInput.FechaRealizacion ?? DateTime.Today)
                            : null,
                        FechaCreacion = DateTime.Now,
                        CreadoPorId = usuarioId.Value
                    };

                    _context.TareasProgramadas.Add(nueva);
                }
                else
                {
                    var existente = await _context.TareasProgramadas.FindAsync(TareaInput.Id);
                    if (existente != null)
                    {
                        existente.Tarea = TareaInput.Tarea;
                        existente.TipoTareaId = TareaInput.TipoTareaId;
                        existente.PersonaSolicitante = TareaInput.PersonaSolicitante ?? "Sin Especificar";
                        existente.PersonaAsignadaId = TareaInput.PersonaAsignadaId;
                        existente.FechaSolicitud = TareaInput.FechaSolicitud.Date;
                        existente.Objetivo = TareaInput.Objetivo;
                        existente.Estatus = estatusFinal;

                        if (estatusFinal.Equals("Resuelta", StringComparison.OrdinalIgnoreCase))
                        {
                            existente.FechaRealizacion = TareaInput.FechaRealizacion ?? existente.FechaRealizacion ?? DateTime.Today;
                        }
                        else
                        {
                            existente.FechaRealizacion = null;
                        }

                        if (!string.IsNullOrWhiteSpace(TareaInput.NuevoComentario))
                        {
                            var fechaHora = DateTime.Now.ToString("dd/MM/yyyy hh:mm:ss tt");
                            string bloqueComentario = $"Agregado el: {fechaHora} Por: {usuarioNombre}\n\n{TareaInput.NuevoComentario.Trim()}";

                            if (string.IsNullOrWhiteSpace(existente.Observaciones))
                            {
                                existente.Observaciones = bloqueComentario;
                            }
                            else
                            {
                                existente.Observaciones = bloqueComentario + "\n\n" + existente.Observaciones;
                            }
                        }
                    }
                }

                await _context.SaveChangesAsync();
                return new JsonResult(new { success = true, message = "Se han actualizado los datos de manera correcta" });
            }
            catch (Exception ex)
            {
                string mensajeError = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                return new JsonResult(new { success = false, message = $"Error al guardar: {mensajeError}" });
            }
        }

        public async Task<IActionResult> OnGetObtenerTareaAsync(int id)
        {
            var (usuarioId, _, _) = ObtenerUsuarioSesion();
            if (!usuarioId.HasValue)
            {
                return new JsonResult(new { success = false, redirect = "/InicioSesion/Login" });
            }

            var tarea = await _context.TareasProgramadas.FindAsync(id);
            if (tarea == null) return NotFound();

            return new JsonResult(new
            {
                id = tarea.Id,
                tarea = tarea.Tarea,
                tipoTareaId = tarea.TipoTareaId,
                personaSolicitante = tarea.PersonaSolicitante,
                personaAsignadaId = tarea.PersonaAsignadaId,
                fechaSolicitud = tarea.FechaSolicitud.ToString("yyyy-MM-dd"),
                fechaRealizacion = tarea.FechaRealizacion.HasValue ? tarea.FechaRealizacion.Value.ToString("yyyy-MM-dd") : "",
                objetivo = tarea.Objetivo,
                observaciones = tarea.Observaciones,
                estatus = tarea.Estatus ?? "Pendiente"
            });
        }

        public async Task<IActionResult> OnPostCambiarEstatusAsync(int id, string nuevoEstatus)
        {
            var (usuarioId, _, _) = ObtenerUsuarioSesion();
            if (!usuarioId.HasValue)
            {
                return new JsonResult(new { success = false, message = "Sesión expirada.", redirect = "/InicioSesion/Login" });
            }

            try
            {
                var tarea = await _context.TareasProgramadas.FindAsync(id);
                if (tarea == null) return NotFound();

                string estatusAnterior = string.IsNullOrWhiteSpace(tarea.Estatus) ? "Pendiente" : tarea.Estatus;
                tarea.Estatus = nuevoEstatus;

                if (nuevoEstatus.Equals("Resuelta", StringComparison.OrdinalIgnoreCase))
                {
                    tarea.FechaRealizacion = DateTime.Today;
                }
                else
                {
                    tarea.FechaRealizacion = null;
                }

                await _context.SaveChangesAsync();

                return new JsonResult(new
                {
                    success = true,
                    message = $"Se cambió el estatus de \"{estatusAnterior}\" a \"{nuevoEstatus}\" de manera correcta",
                    estatusAnterior = estatusAnterior,
                    nuevoEstatus = nuevoEstatus,
                    fechaRealizacion = tarea.FechaRealizacion?.ToString("dd/MM/yyyy") ?? "-"
                });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { success = false, message = $"Error al actualizar el estatus: {ex.Message}" });
            }
        }

        public async Task<IActionResult> OnPostEliminarTareaAsync(int id)
        {
            var (usuarioId, _, rol) = ObtenerUsuarioSesion();
            if (!usuarioId.HasValue)
            {
                return new JsonResult(new { success = false, message = "Sesión expirada.", redirect = "/InicioSesion/Login" });
            }

            try
            {
                var tarea = await _context.TareasProgramadas.FindAsync(id);
                if (tarea == null) return NotFound();

                if (tarea.Estatus == "Resuelta" && !rol.Equals("Administrador", StringComparison.OrdinalIgnoreCase))
                {
                    return new JsonResult(new { success = false, message = "No tienes permisos para eliminar tareas marcadas como resueltas." });
                }

                _context.TareasProgramadas.Remove(tarea);
                await _context.SaveChangesAsync();

                return new JsonResult(new { success = true, message = "La tarea se ha eliminado de manera correcta." });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { success = false, message = $"Error al eliminar: {ex.Message}" });
            }
        }

        public async Task<IActionResult> OnGetResumenCampanaAsync(int mes, int anio)
        {
            var resumen = new CampanaResumenDTO();

            var campana = await _context.CampanaRenovacion
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Mes == mes && c.Anio == anio);

            if (campana != null)
            {
                var detalles = await _context.CampanaRenovacionDetalle
                    .AsNoTracking()
                    .Where(d => d.CampanaId == campana.Id)
                    .ToListAsync();

                resumen.TotalClientes = detalles.Count;
                resumen.EncuestasFinalizadas = detalles.Count(d => (d.Estatus ?? "").Trim().Equals("Cerrado", StringComparison.OrdinalIgnoreCase));
                resumen.EncuestasEnCurso = detalles.Count(d => (d.Estatus ?? "").Trim().Equals("En curso", StringComparison.OrdinalIgnoreCase));
                resumen.SeguimientoPendiente = detalles.Count(d => (d.Estatus ?? "").Trim().Equals("Pendiente", StringComparison.OrdinalIgnoreCase));

                resumen.Porcentaje = resumen.TotalClientes > 0
                    ? (int)Math.Round(((double)resumen.EncuestasFinalizadas / resumen.TotalClientes) * 100)
                    : 0;

                string fechaHoy = DateTime.Now.ToString("dd/MM/yyyy");
                resumen.ContactadosHoy = detalles.Count(d => !string.IsNullOrWhiteSpace(d.ComentariosAdicionales) && d.ComentariosAdicionales.Contains(fechaHoy));
            }

            return new JsonResult(resumen);
        }
    }
}