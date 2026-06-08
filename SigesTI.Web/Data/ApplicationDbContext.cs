using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Models; // Aquí le decimos dónde buscar

namespace SigesTI.Web.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Usamos el nombre completo para que no haya dudas
        public DbSet<SigesTI.Web.Models.Personal> Personal { get; set; }
        public DbSet<Solicitud> Solicitudes { get; set; }
    }
}