using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace SigesTI.Web.Pages.Shared
{
    /*
     * Encabezado y pie de todos los reportes PDF.
     * Mismo diseño que el reporte de Tareas Programadas Generales (css/Reportes/reporte-encabezado.css).
     */
    public static class EncabezadoPdf
    {
        // Área y título a la izquierda, fecha del reporte en un recuadro a la derecha
        public static void Encabezado(IContainer contenedor, string titulo, DateTime fecha)
        {
            contenedor.Column(columna =>
            {
                columna.Item().PaddingBottom(7.5f).Row(fila =>
                {
                    fila.RelativeItem().AlignBottom().Column(titulos =>
                    {
                        titulos.Item().PaddingBottom(1.5f)
                            .Text("ÁREA DE SOPORTE TÉCNICO")
                            .FontSize(7).Bold().LetterSpacing(0.13f).FontColor("#0284C7");

                        titulos.Item()
                            .Text(titulo)
                            .FontSize(15).ExtraBold().LineHeight(1.1f).FontColor("#0F172A");
                    });

                    fila.AutoItem().AlignBottom()
                        .Border(0.75f).BorderColor("#BAE6FD")
                        .CornerRadius(4.5f)
                        .Background("#F0F9FF")
                        .PaddingVertical(3).PaddingHorizontal(9)
                        .Column(recuadro =>
                        {
                            recuadro.Item().AlignCenter()
                                .Text("FECHA DEL REPORTE")
                                .FontSize(6).Bold().LetterSpacing(0.08f).FontColor("#64748B");

                            recuadro.Item().AlignCenter()
                                .Text(fecha.ToString("dd/MM/yyyy"))
                                .FontSize(10.5f).Bold().FontColor("#0C4A6E");
                        });
                });

                // Doble línea: azul oscuro gruesa y azul delgada debajo
                columna.Item().LineHorizontal(2.25f).LineColor("#0F2A52");
                columna.Item().PaddingTop(2.25f).LineHorizontal(1.5f).LineColor("#2563EB");
            });
        }

        // Pie de cada hoja: solo el nombre del sistema a la izquierda
        public static void Pie(IContainer contenedor)
        {
            contenedor
                .BorderTop(0.75f).BorderColor("#E2E8F0")
                .PaddingTop(4.5f)
                .Text("SigesST - Sistema de Gestión de Soporte Técnico")
                .FontSize(6.5f).FontColor("#94A3B8");
        }
    }
}
