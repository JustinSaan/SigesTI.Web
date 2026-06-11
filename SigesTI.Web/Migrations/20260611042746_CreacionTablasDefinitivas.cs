using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SigesTI.Web.Migrations
{
    /// <inheritdoc />
    public partial class CreacionTablasDefinitivas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Personal",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false),
                    Puesto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EsResponsable = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Personal", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Solicitudes",
                columns: table => new
                {
                    IdSolicitud = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdPersonal = table.Column<int>(type: "int", nullable: false),
                    CorreoSolicitante = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PuestoSolicitante = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReqSistemas = table.Column<bool>(type: "bit", nullable: false),
                    SistemasDetalle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OtrosSistemas = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UnidadesRed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Impresora = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DescripcionProblema = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EjecutivoAsignado = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AutorizaAdmin = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResponsableArea = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FechaIngreso = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaEntrega = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Estatus = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Solicitudes", x => x.IdSolicitud);
                    table.ForeignKey(
                        name: "FK_Solicitudes_Personal_IdPersonal",
                        column: x => x.IdPersonal,
                        principalTable: "Personal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Solicitudes_IdPersonal",
                table: "Solicitudes",
                column: "IdPersonal");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Solicitudes");

            migrationBuilder.DropTable(
                name: "Personal");
        }
    }
}
