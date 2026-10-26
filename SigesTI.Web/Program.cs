using Microsoft.EntityFrameworkCore;
using QuestPDF.Infrastructure;
using SigesTI.Web.Data;
using SigesTI.Web.Seguridad;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// Conexión con SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Permisos por rol
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<PermisosService>();
builder.Services.AddScoped<SesionService>();

// Razor Pages (cada handler pasa por el filtro de permisos)
builder.Services.AddRazorPages()
    .AddMvcOptions(options => options.Filters.Add<PermisosFilter>());

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

    // Con sesión abierta se revisa que el usuario siga activo y con el mismo rol
    if (tieneSesion && !esInicioSesion && !esArchivoEstatico)
    {
        var sesion = context.RequestServices.GetRequiredService<SesionService>();

        if (!await sesion.ValidarSesionAsync(context))
        {
            context.Response.Redirect("/InicioSesion/Login");
            return;
        }
    }

    await next();
});

app.UseAuthorization();

app.MapStaticAssets();

app.MapRazorPages()
   .WithStaticAssets();

app.Run();