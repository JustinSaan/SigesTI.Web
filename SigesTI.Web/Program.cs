using Microsoft.EntityFrameworkCore;
using QuestPDF.Infrastructure;
using SigesTI.Web.Data;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// Conexión con SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Razor Pages
builder.Services.AddRazorPages();

// Sesiones del sistema
builder.Services.AddDistributedMemoryCache();

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

var app = builder.Build();

// Configuración para producción
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseRouting();

app.UseSession();

/*
 * Protege todos los módulos.
 * Sin una sesión activa, el usuario regresa al Login.
 */
app.Use(async (context, next) =>
{
    var ruta = context.Request.Path;

    bool esInicioSesion =
        ruta.StartsWithSegments("/InicioSesion");

    bool esArchivoEstatico =
        Path.HasExtension(ruta.Value);

    bool tieneSesion =
        context.Session.GetInt32("IdUsuario") != null;

    if (!tieneSesion && !esInicioSesion && !esArchivoEstatico)
    {
        context.Response.Redirect("/InicioSesion/Login");
        return;
    }

    await next();
});

app.UseAuthorization();

app.MapStaticAssets();

app.MapRazorPages()
   .WithStaticAssets();

app.Run();