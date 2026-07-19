using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Models;

namespace SigesTI.Web.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<UsuarioSistema> UsuariosSistema { get; set; }
        public DbSet<BitacoraUsuario> BitacoraUsuarios { get; set; }

        public DbSet<SigesTI.Web.Models.Personal> Personal { get; set; }
        public DbSet<Solicitud> Solicitudes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Mapeo de la tabla Personal
            modelBuilder.Entity<SigesTI.Web.Models.Personal>().ToTable("Personal");

            // 2. Clave primaria de Personal es 'Id' tal como lo tienes declarado
            modelBuilder.Entity<SigesTI.Web.Models.Personal>().HasKey(p => p.Id);

            // 3. Mapeo de la tabla Solicitudes
            modelBuilder.Entity<Solicitud>().ToTable("Solicitudes");

            // 4. Relación corregida definitiva:
            // Conecta IdPersonal de la Solicitud con el Id del Personal
            modelBuilder.Entity<Solicitud>()
                .HasOne(s => s.Personal)
                .WithMany()
                .HasForeignKey(s => s.IdPersonal)
                .HasPrincipalKey(p => p.Id);
        }
    }
}