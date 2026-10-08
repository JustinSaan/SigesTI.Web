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

        [BindProperty]
        public bool IndicarActividadesAdicionales { get; set; }

        [BindProperty]
        public TareaInputModel TareaInput { get; set; } = new();

        public class TareaInputModel
        {
            public int Id { get; set; }
            public string Tarea { get; set; } = string.Empty;
            public int TipoTareaId { get; set; }
            public string? NuevoTipo { get; set; }
            public int PersonaAsignadaId { get; set; }
            public DateTime FechaMaximaRealizacion { get; set; } = DateTime.Today;
            public string? Objetivo { get; set; }
            public string? Observaciones { get; set; }
            public string? Estatus { get; set; }
            public DateTime? FechaRealizacion { get; set; }
        }

        public async Task OnGetAsync()
        {
            await CargarDatosAsync();
        }

        private async Task CargarDatosAsync()
        {
            ListaTareas = await _context.TareasProgramadas
                .Include(t => t.TipoTarea)
                .Include(t => t.PersonaAsignada)
                .OrderByDescending(t => t.FechaCreacion)
                .ToListAsync();

            var tipos = await _context.TiposTareaProgramada.OrderBy(t => t.Nombre).ToListAsync();
            SelectTipos = new SelectList(tipos, "Id", "Nombre");

            // Cargar usuarios activos de la tabla UsuariosSistema
            var usuarios = await _context.UsuariosSistema
                .Where(u => u.Activo == true)
                .Select(u => new { u.IdUsuario, Nombre = u.NombreCompleto ?? u.NombreUsuario })
                .ToListAsync();

            SelectUsuarios = new SelectList(usuarios, "IdUsuario", "Nombre");
        }

        private (int id, string nombre) ObtenerUsuarioSesion()
        {
            // Ajusta los nombres de las variables de sesión según tu implementación
            int userId = HttpContext.Session.GetInt32("IdUsuario") ?? 0;
            string nombreUsuario = HttpContext.Session.GetString("NombreCompleto")
                                ?? HttpContext.Session.GetString("NombreUsuario")
                                ?? "Usuario del Sistema";

            return (userId, nombreUsuario);
        }

        public async Task<IActionResult> OnPostGuardarTareaAsync()
        {
            var (usuarioId, usuarioNombre) = ObtenerUsuarioSesion();

            if (TareaInput.TipoTareaId == -1 && !string.IsNullOrWhiteSpace(TareaInput.NuevoTipo))
            {
                var nuevoTipo = new TipoTareaProgramada { Nombre = TareaInput.NuevoTipo.Trim() };
                _context.TiposTareaProgramada.Add(nuevoTipo);
                await _context.SaveChangesAsync();
                TareaInput.TipoTareaId = nuevoTipo.Id;
            }

            if (TareaInput.Id == 0) // Crear
            {
                var nueva = new TareaProgramada
                {
                    Tarea = TareaInput.Tarea,
                    TipoTareaId = TareaInput.TipoTareaId,
                    PersonaAsignadaId = TareaInput.PersonaAsignadaId,
                    FechaMaximaRealizacion = TareaInput.FechaMaximaRealizacion,
                    Objetivo = TareaInput.Objetivo,
                    Observaciones = TareaInput.Observaciones,
                    Estatus = "Pendiente",
                    FechaCreacion = DateTime.Now,
                    CreadoPorId = usuarioId
                };
                _context.TareasProgramadas.Add(nueva);
            }
            else // Editar
            {
                var existente = await _context.TareasProgramadas.FindAsync(TareaInput.Id);
                if (existente != null)
                {
                    existente.Tarea = TareaInput.Tarea;
                    existente.TipoTareaId = TareaInput.TipoTareaId;
                    existente.PersonaAsignadaId = TareaInput.PersonaAsignadaId;
                    existente.FechaMaximaRealizacion = TareaInput.FechaMaximaRealizacion;
                    existente.Objetivo = TareaInput.Objetivo;

                    if (!string.IsNullOrWhiteSpace(TareaInput.Observaciones))
                    {
                        var fechaFormateada = DateTime.Now.ToString("dd/MM/yyyy hh:mm:ss tt");
                        var leyenda = $"Editado el: {fechaFormateada} Por: {usuarioNombre}\n{TareaInput.Observaciones}";
                        existente.Observaciones = leyenda;
                    }

                    existente.FechaUltimaModificacion = DateTime.Now;
                    existente.ModificadoPorNombre = usuarioNombre;
                }
            }

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true, message = "Tarea guardada correctamente." });
        }

        public async Task<IActionResult> OnGetObtenerTareaAsync(int id)
        {
            var tarea = await _context.TareasProgramadas.FindAsync(id);
            if (tarea == null) return NotFound();

            return new JsonResult(new
            {
                id = tarea.Id,
                tarea = tarea.Tarea,
                tipoTareaId = tarea.TipoTareaId,
                personaAsignadaId = tarea.PersonaAsignadaId,
                fechaMaximaRealizacion = tarea.FechaMaximaRealizacion.ToString("yyyy-MM-dd"),
                objetivo = tarea.Objetivo,
                observaciones = tarea.Observaciones,
                estatus = tarea.Estatus
            });
        }

        public async Task<IActionResult> OnPostMarcarResueltaAsync(int id, DateTime fechaRealizacion, string? observaciones)
        {
            var tarea = await _context.TareasProgramadas.FindAsync(id);
            if (tarea == null) return NotFound();

            var (_, usuarioNombre) = ObtenerUsuarioSesion();

            tarea.Estatus = "Resuelta";
            tarea.FechaRealizacion = fechaRealizacion;

            if (!string.IsNullOrWhiteSpace(observaciones))
            {
                var fechaFormateada = DateTime.Now.ToString("dd/MM/yyyy hh:mm:ss tt");
                tarea.Observaciones = $"Editado el: {fechaFormateada} Por: {usuarioNombre}\n{observaciones}";
            }

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true, message = "La tarea se marcó como resuelta." });
        }
    }
}