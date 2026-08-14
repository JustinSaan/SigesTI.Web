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

            var empleado = new SigesTI.Web.Models.Personal
            {
                Nombre = dto.Nombre,
                Area = dto.Area,
                Puesto = dto.Puesto,
                Correo = dto.Correo,
                UnidadesRed = dto.UnidadesRed,
                Activo = dto.Activo,
                EsResponsable = dto.EsResponsable
            };

            _context.Personal.Add(empleado);
            await _context.SaveChangesAsync();

            return new JsonResult(new { success = true });
        }

        public async Task OnGetAsync()
        {
            // Trae todo el personal de la tabla real
            ListaPersonal = await _context.Personal.ToListAsync();
        }

        // Handler AJAX para obtener los detalles del empleado a editar
        public async Task<IActionResult> OnGetDetalleEmpleadoAsync(int id)
        {
            var empleado = await _context.Personal.FirstOrDefaultAsync(p => p.Id == id);
            if (empleado == null)
            {
                return NotFound();
            }

            // Retornamos un objeto plano seguro para JSON
            return new JsonResult(new
            {
                id = empleado.Id,
                nombre = empleado.Nombre,
                area = empleado.Area,
                puesto = empleado.Puesto,
                correo = empleado.Correo,
                unidadesRed = empleado.UnidadesRed,
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

            // Si este empleado se marca como responsable del área, desmarcamos temporalmente al anterior de esa misma área
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

            // Mapeo y actualización de campos
            empleado.Nombre = dto.Nombre;
            empleado.Area = dto.Area;
            empleado.Puesto = dto.Puesto;
            empleado.Correo = dto.Correo;
            empleado.EsResponsable = dto.EsResponsable;
            empleado.UnidadesRed = dto.UnidadesRed;
            empleado.Activo = dto.Activo;

            await _context.SaveChangesAsync();
            return new JsonResult(new { success = true });
        }

        // Handler AJAX para la eliminación segura de un registro
        public async Task<IActionResult> OnPostEliminarEmpleadoAsync(int id)
        {
            var empleado = await _context.Personal.FirstOrDefaultAsync(p => p.Id == id);
            if (empleado == null)
            {
                return new JsonResult(new { success = false, message = "El registro ya no existe en SQL Server." });
            }

            _context.Personal.Remove(empleado);
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