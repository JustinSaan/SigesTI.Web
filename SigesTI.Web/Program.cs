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
builder.Services.AddSingleton<SesionesActivas>();
builder.Services.AddScoped<NotificacionesService>();
builder.Services.AddHostedService<RecordatoriosAutorizacion>();

// Razor Pages (cada handler pasa por el filtro de permisos)
builder.Services.AddRazorPages()
    .AddMvcOptions(options => options.Filters.Add<PermisosFilter>());

// Sesiones del sistema
builder.Services.AddDistributedMemoryCache();

builder.Services.AddSession(options =>
{
    /*
     * El cierre por inactividad lo decide SesionService.CaducoPorInactividad (Sesion:MinutosInactividad).
     * Aquí se deja un tiempo mayor para que la sesión siga existiendo y se pueda avisar que caducó.
     */
    options.IdleTimeout = TimeSpan.FromDays(1);
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

    // Peticiones hechas con JavaScript (fetch o jQuery); a estas se responde 401 en lugar de redirigir
    bool esAjax =
        context.Request.Headers.XRequestedWith == "XMLHttpRequest";

    // Consultas automáticas (campana de notificaciones) que no cuentan como actividad del usuario
    bool esSegundoPlano =
        context.Request.Headers.ContainsKey("X-Segundo-Plano");

    if (!tieneSesion && !esInicioSesion && !esArchivoEstatico)
    {
        if (esAjax)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        context.Response.Redirect("/InicioSesion/Login");
        return;
    }

    if (tieneSesion && !esInicioSesion && !esArchivoEstatico)
    {
        var sesion = context.RequestServices.GetRequiredService<SesionService>();

        // Sin actividad durante el tiempo configurado: se cierra y el Login avisa que caducó
        if (sesion.CaducoPorInactividad(context, esSegundoPlano))
        {
            if (esAjax)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            context.Response.Redirect("/InicioSesion/Login?caducada=true");
            return;
        }

        // Con sesión abierta se revisa que el usuario siga activo y con el mismo rol
        if (!await sesion.ValidarSesionAsync(context, esSegundoPlano))
        {
            if (esAjax)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

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