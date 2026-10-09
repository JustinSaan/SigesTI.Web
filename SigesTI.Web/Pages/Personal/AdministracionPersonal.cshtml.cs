using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SigesTI.Web.Pages.Personal
{
    public class IndexModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public IndexModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public List<Models.Personal> ListaPersonal { get; set; } = new();

        public async Task OnGetAsync()
        {
            // Trae todo el personal de la tabla ordenado por la propiedad 'Orden'
            ListaPersonal = await _context.Personal
                .OrderBy(p => p.Orden)
                .ToListAsync();
        }

        public async Task<IActionResult> OnPostRegistrarEmpleadoAsync([FromBody] EmpleadoEditarDTO dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return new JsonResult(new { success = false, message = "Datos inválidos." });
            }

            if (dto.EsResponsable)
            {
                var jefesAnteriores = await _context.Personal
                    .Where(p => p.Area == dto.Area && p.EsResponsable)
                    .ToListAsync();

                foreach (var jefe in jefesAnteriores)
                {
                    jefe.EsResponsable = false;
                }
            }

            int maxOrden = await _context.Personal.AnyAsync()
                ? await _context.Personal.MaxAsync(p => p.Orden)
                : 0;

            var empleado = new SigesTI.Web.Models.Personal
            {
                Nombre = dto.Nombre,
                Area = dto.Area,
                Puesto = dto.Puesto,
                Correo = dto.Correo,
                Activo = dto.Activo,
                EsResponsable = dto.EsResponsable,
                Orden = maxOrden + 1
            };

            _context.Personal.Add(empleado);
            await _context.SaveChangesAsync();

            return new JsonResult(new { success = true });
        }

        // Handler AJAX para obtener los detalles del empleado a editar
        public async Task<IActionResult> OnGetDetalleEmpleadoAsync(int id)
        {
            // Si tu modelo usa 'Id' o 'IdEmpleado', asegúrate de usar el campo correcto aquí:
            var empleado = await _context.Personal.FirstOrDefaultAsync(p => p.Id == id);
            if (empleado == null)
            {
                return NotFound();
            }

            // Retornar JSON limpio sin UnidadesRed
            return new JsonResult(new
            {
                id = empleado.Id,
                nombre = empleado.Nombre, // o empleado.NombreCompleto si así se llama en tu modelo
                area = empleado.Area,
                puesto = empleado.Puesto,
                correo = empleado.Correo, // o empleado.CorreoElectronico
                activo = empleado.Activo,
                esResponsable = empleado.EsResponsable
            });
        }

        // Handler AJAX para guardar los cambios editados
        public async Task<IActionResult> OnPostGuardarCambiosAsync([FromBody] EmpleadoEditarDTO dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return new JsonResult(new { success = false, message = "Datos inválidos." });
            }

            var empleado = await _context.Personal.FirstOrDefaultAsync(p => p.Id == dto.Id);
            if (empleado == null)
            {
                return new JsonResult(new { success = false, message = "El empleado ya no existe." });
            }

            if (dto.EsResponsable)
            {
                var jefesAnteriores = await _context.Personal
                    .Where(p => p.Area == dto.Area && p.EsResponsable && p.Id != dto.Id)
                    .ToListAsync();
                foreach (var j in jefesAnteriores)
                {
                    j.EsResponsable = false;
                }
            }

            empleado.Nombre = dto.Nombre;
            empleado.Area = dto.Area;
            empleado.Puesto = dto.Puesto;
            empleado.Correo = dto.Correo;
            empleado.EsResponsable = dto.EsResponsable;
            empleado.Activo = dto.Activo;

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        // Handler AJAX para reordenar las filas mediante Drag and Drop
        public async Task<IActionResult> OnPostGuardarOrdenAsync([FromBody] List<int> idsOrdenados)
        {
            if (idsOrdenados == null || idsOrdenados.Count == 0)
            {
                return new JsonResult(new { success = false, message = "Lista de IDs vacía." });
            }

            var empleados = await _context.Personal.ToListAsync();

            for (int i = 0; i < idsOrdenados.Count; i++)
            {
                int id = idsOrdenados[i];
                var emp = empleados.FirstOrDefault(p => p.Id == id);
                if (emp != null)
                {
                    emp.Orden = i + 1;
                }
            }

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }
    }

    // DTO auxiliar para recibir los datos desde el modal en crudo
    public class EmpleadoEditarDTO
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public string Puesto { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string UnidadesRed { get; set; } = string.Empty;
        public bool Activo { get; set; }
        public bool EsResponsable { get; set; }
    }
}