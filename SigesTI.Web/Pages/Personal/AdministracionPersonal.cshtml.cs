using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Seguridad;

namespace SigesTI.Web.Pages.Personal
{
    [Modulo(Modulos.Personal)]
    public class AdministracionPersonalModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        // Áreas que siempre aparecen en el modal (se agregan también las que ya existan en la base de datos)
        private static readonly string[] AreasBase =
        {
            "Dirección General", "Sistemas", "Desarrollo", "Ventas",
            "Administración", "Soporte Técnico", "Consultoría", "Cobranza"
        };

        private readonly PermisosService _permisos;

        public AdministracionPersonalModel(ApplicationDbContext context, PermisosService permisos)
        {
            _context = context;
            _permisos = permisos;
        }

        public List<Models.Personal> ListaPersonal { get; set; } = new();
        public List<string> Areas { get; set; } = new();

        public async Task OnGetAsync()
        {
            ListaPersonal = await _context.Personal
                .OrderBy(p => p.Orden)
                .ToListAsync();

            Areas = AreasBase
                .Union(ListaPersonal.Select(p => p.Area).Where(a => !string.IsNullOrWhiteSpace(a)))
                .ToList();
        }

        // Registra (Id = 0) o actualiza (Id > 0) a una persona
        public async Task<IActionResult> OnPostGuardarAsync([FromBody] PersonalDTO dto)
        {
            if (dto == null)
            {
                return new JsonResult(new { success = false, message = "Datos inválidos." });
            }

            var accion = dto.Id == 0 ? Accion.Crear : Accion.Editar;
            if (!await _permisos.PuedeAsync(Modulos.Personal, accion))
            {
                return PermisosFilter.RespuestaSinPermiso(HttpContext);
            }

            dto.Nombre = dto.Nombre?.Trim() ?? "";
            dto.Area = dto.Area?.Trim() ?? "";
            dto.Puesto = dto.Puesto?.Trim() ?? "";
            dto.Correo = dto.Correo?.Trim().ToLower() ?? "";

            if (dto.Nombre == "" || dto.Area == "" || dto.Puesto == "" || dto.Correo == "")
            {
                return new JsonResult(new { success = false, message = "Nombre, área, puesto y correo son obligatorios." });
            }

            if (!new EmailAddressAttribute().IsValid(dto.Correo))
            {
                return new JsonResult(new { success = false, message = "El correo electrónico no es válido." });
            }

            Models.Personal? persona;

            if (dto.Id == 0)
            {
                int maxOrden = await _context.Personal.MaxAsync(p => (int?)p.Orden) ?? 0;
                persona = new Models.Personal { Orden = maxOrden + 1 };
                _context.Personal.Add(persona);
            }
            else
            {
                persona = await _context.Personal.FindAsync(dto.Id);
                if (persona == null)
                {
                    return new JsonResult(new { success = false, message = "La persona ya no existe." });
                }
            }

            // Solo puede haber un responsable por área
            if (dto.EsResponsable)
            {
                var responsablesAnteriores = await _context.Personal
                    .Where(p => p.Area == dto.Area && p.EsResponsable && p.Id != dto.Id)
                    .ToListAsync();

                foreach (var r in responsablesAnteriores)
                {
                    r.EsResponsable = false;
                }
            }

            persona.Nombre = dto.Nombre;
            persona.Area = dto.Area;
            persona.Puesto = dto.Puesto;
            persona.Correo = dto.Correo;
            persona.Activo = dto.Activo;
            persona.EsResponsable = dto.EsResponsable;

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        [Permiso(Accion.Eliminar)]
        public async Task<IActionResult> OnPostEliminarAsync(int id)
        {
            var persona = await _context.Personal.FindAsync(id);
            if (persona == null)
            {
                return new JsonResult(new { success = false, message = "La persona ya no existe." });
            }

            // Si la persona está ligada a otros registros no se borra (la base de datos lo impediría)
            bool tieneTareas = await _context.TareasProgramadas.AnyAsync(t => t.PersonaAsignadaId == id);
            bool tieneSolicitudes = await _context.Solicitudes.AnyAsync(s => s.IdPersonal == id);
            bool tieneEquipos = await _context.EquiposRespaldo.AnyAsync(e => e.PersonalId == id);

            if (tieneTareas || tieneSolicitudes || tieneEquipos)
            {
                return new JsonResult(new
                {
                    success = false,
                    message = "No se puede eliminar porque tiene tareas, solicitudes o equipos de respaldo asignados. Puedes marcarla como Inactiva."
                });
            }

            _context.Personal.Remove(persona);
            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        // Guarda el orden de las filas después del drag and drop
        [Permiso(Accion.Editar)]
        public async Task<IActionResult> OnPostGuardarOrdenAsync([FromBody] List<int> idsOrdenados)
        {
            if (idsOrdenados == null || idsOrdenados.Count == 0)
            {
                return new JsonResult(new { success = false, message = "Lista de IDs vacía." });
            }

            var personas = await _context.Personal
                .Where(p => idsOrdenados.Contains(p.Id))
                .ToListAsync();

            foreach (var persona in personas)
            {
                persona.Orden = idsOrdenados.IndexOf(persona.Id) + 1;
            }

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        // Clase de color del área (mismos colores que Plan de Respaldos)
        public static string ClaseArea(string? area)
        {
            string a = (area ?? "").ToLower();

            if (a.Contains("direcc")) return "area-direccion-general";
            if (a.Contains("ventas")) return "area-ventas";
            if (a.Contains("cobranza")) return "area-cobranza";
            if (a.Contains("consultor")) return "area-consultoria";
            if (a.Contains("desarrollo")) return "area-desarrollo";
            if (a.Contains("sistemas") || a == "ti") return "area-sistemas";
            if (a.Contains("soporte")) return "area-soporte";
            if (a.Contains("admin") || a.Contains("capital")) return "area-administracion";
            if (a.Contains("conta") || a.Contains("finanz")) return "area-contabilidad";
            return "area-general";
        }
    }

    public class PersonalDTO
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public string Puesto { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public bool Activo { get; set; }
        public bool EsResponsable { get; set; }
    }
}
