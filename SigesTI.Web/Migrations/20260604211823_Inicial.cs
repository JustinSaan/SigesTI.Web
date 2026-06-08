using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SigesTI.Web.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Personales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Area = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Personales", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Solicitudes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonalId = table.Column<int>(type: "int", nullable: false),
                    FechaIngreso = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaEntrega = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReqSistemas = table.Column<bool>(type: "bit", nullable: false),
                    UnidadesRed = table.Column<bool>(type: "bit", nullable: false),
                    ImpresoraConfigurada = table.Column<bool>(type: "bit", nullable: false),
                    Otros = table.Column<bool>(type: "bit", nullable: false),
                    DescripcionUnidadesRed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DescripcionImpresora = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OtrosDetalle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EjecutivoAsignado = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AutorizaAdmin = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResponsableArea = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Solicitudes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Solicitudes_Personales_PersonalId",
                        column: x => x.PersonalId,
                        principalTable: "Personales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Solicitudes_PersonalId",
                table: "Solicitudes",
                column: "PersonalId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Solicitudes");

            migrationBuilder.DropTable(
                name: "Personales");
        }
    }
}
