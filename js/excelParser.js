/*
==========================================
PROCON DASHBOARD V4.0
EXCEL PARSER - FINAL
==========================================
*/

let GLOBAL_DATA = [];

function parseExcelMatrix(matrix, sheetName){

    const result = {

        registros: [],

        meses: [],

        anios: [],

        servicios: [],

        ubicaciones: {},

        talleres: {},

        tiposEquipo: {},

        serviciosResumen: {}

    };

    if(
        !matrix ||
        matrix.length < 2
    ){
        console.warn("Matriz vacía o inválida");
        return result;
    }

    console.log("=== INICIO ANÁLISIS EXCEL ===");
    console.log("Total de filas:", matrix.length);
    
    // Mostrar primeras 5 filas para análisis
    for (let i = 0; i < Math.min(5, matrix.length); i++) {
        console.log(`Fila ${i}:`, matrix[i]);
    }

    /*
    ==========================================
    DETECTAR FILA DE ENCABEZADOS
    ==========================================
    */

    let headerRowIndex = -1;
    let headerRow = null;

    // Estrategia: buscar la fila que tenga "MES" en la primera celda
    // o la primera fila con contenido significativo después de saltar filas de título
    for (let i = 0; i < Math.min(15, matrix.length); i++) {
        const row = matrix[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] || "").trim().toUpperCase();
        
        // Detectar filas de título o filtros
        if (firstCell === "MANTENIMIENTOS PREVENTIVOS" || 
            firstCell === "(TODAS)" ||
            firstCell === "") {
            console.log(`Fila ${i} descartada (título/filtro): "${firstCell}"`);
            continue;
        }

        // La fila de encabezados debe comenzar con "MES" o tener múltiples columnas no vacías
        const nonEmptyCells = row.filter(cell => 
            String(cell || "").trim() !== ""
        ).length;

        if (firstCell === "MES" || nonEmptyCells >= 5) {
            // Verificar que sea realmente una fila de encabezados
            const rowContent = row.map(c => String(c || "").trim().toUpperCase()).join(" ");
            
            if (rowContent.includes("MES") || rowContent.includes("TIPO")) {
                headerRowIndex = i;
                headerRow = row;
                console.log(`✓ ENCABEZADOS ENCONTRADOS en fila ${i}`);
                console.log(`Contenido: [${row.map(c => `"${c}"`).join(", ")}]`);
                break;
            }
        }
    }

    // Si no encontró, retornar error
    if (headerRowIndex === -1 || !headerRow) {
        console.error("❌ No se encontró fila de encabezados válida");
        return result;
    }

    /*
    ==========================================
    MAPEAR COLUMNAS REALES
    ==========================================
    */

    console.log("\n=== MAPEO DE COLUMNAS ===");

    const normalizeText = (text) => {
        return String(text || "")
            .trim()
            .toLowerCase()
            .replace(/[áàâä]/g, 'a')
            .replace(/[éèêë]/g, 'e')
            .replace(/[íìîï]/g, 'i')
            .replace(/[óòôö]/g, 'o')
            .replace(/[úùûü]/g, 'u')
            .replace(/[\s\-_°º]/g, '');
    };

    let COL_MES = -1;
    let COL_ANIO = -1;
    let COL_UBICACION = -1;
    let COL_UNIDAD = -1;
    let COL_TIPO = -1;
    let COL_SERVICIO = -1;
    let COL_TALLER = -1;

    // Mapear cada columna
    headerRow.forEach((header, index) => {
        const original = String(header || "").trim();
        const normalized = normalizeText(header);
        
        console.log(`[${index}] "${original}" → "${normalized}"`);

        // Buscar "MES"
        if (normalized.includes("mes")) {
            COL_MES = index;
            console.log(`  ✓ COL_MES = ${index}`);
        }

        // Buscar "AÑO" o "ANIO"
        if (normalized.includes("ano") || normalized.includes("anio")) {
            COL_ANIO = index;
            console.log(`  ✓ COL_ANIO = ${index}`);
        }

        // Buscar "UBICACION"
        if (normalized.includes("ubicacion")) {
            COL_UBICACION = index;
            console.log(`  ✓ COL_UBICACION = ${index}`);
        }

        // Buscar "UNIDAD" o "N°" o "UNIDADES"
        if (normalized.includes("unidad") || normalized === "n" || normalized.includes("numero")) {
            COL_UNIDAD = index;
            console.log(`  ✓ COL_UNIDAD = ${index}`);
        }

        // Buscar "TIPO MANTENIMIENTO" o solo "TIPO" (servicio)
        if (normalized.includes("mantenimiento") || normalized.includes("servicio")) {
            COL_SERVICIO = index;
            console.log(`  ✓ COL_SERVICIO (Tipo Mantenimiento) = ${index}`);
        }

        // Buscar "TIPO EQUIPO" o "TIPO" (si no es servicio)
        if (normalized === "tipo" && COL_SERVICIO === -1) {
            COL_TIPO = index;
            console.log(`  ✓ COL_TIPO = ${index}`);
        }

        // Buscar "TALLER"
        if (normalized.includes("taller")) {
            COL_TALLER = index;
            console.log(`  ✓ COL_TALLER = ${index}`);
        }
    });

    // Fallbacks si no encontró algunas columnas
    if (COL_UNIDAD === -1) {
        // Si hay una columna que diga "UNIDADES" o "TIPO UNIDADES", usar esa
        headerRow.forEach((header, index) => {
            const norm = normalizeText(header);
            if (norm.includes("unidades")) {
                COL_UNIDAD = index;
                console.log(`Fallback: COL_UNIDAD asignada a ${index} (contiene "unidades")`);
            }
        });
    }

    if (COL_SERVICIO === -1) {
        // Si hay una columna que diga "PLANEADOS" y sea después de columna 4, usar esa como servicio
        headerRow.forEach((header, index) => {
            const norm = normalizeText(header);
            if (norm.includes("planeado") && index > 4) {
                COL_SERVICIO = index;
                console.log(`Fallback: COL_SERVICIO asignada a ${index} (contiene "planeado")`);
            }
        });
    }

    console.log("\n=== ÍNDICES FINALES ===");
    console.log({
        COL_MES,
        COL_ANIO,
        COL_UBICACION,
        COL_UNIDAD,
        COL_TIPO,
        COL_SERVICIO,
        COL_TALLER
    });

    // Validar que se encontraron las columnas críticas
    if (COL_MES === -1 || COL_UNIDAD === -1 || COL_SERVICIO === -1) {
        console.error("❌ Faltan columnas críticas:", {
            COL_MES,
            COL_UNIDAD,
            COL_SERVICIO
        });
        return result;
    }

    // Procesar filas de datos
    const dataStartIndex = headerRowIndex + 1;
    console.log(`\n=== PROCESANDO DATOS desde fila ${dataStartIndex} ===`);

    let registrosValidos = 0;
    let registrosSaltados = 0;

    for (let i = dataStartIndex; i < matrix.length; i++) {
        const row = matrix[i];

        if (!row || row.length === 0) {
            registrosSaltados++;
            continue;
        }

        const unidad = String(row[COL_UNIDAD] || "").trim();

        // Saltar filas vacías
        if (unidad === "") {
            registrosSaltados++;
            continue;
        }

        const mes = String(row[COL_MES] || "").trim().toUpperCase();
        const anio = COL_ANIO !== -1 ? 
            String(row[COL_ANIO] || "").trim().toUpperCase() : "";
        const servicio = String(row[COL_SERVICIO] || "").trim().toUpperCase();

        const registro = {
            mes,
            anio,
            ubicacion: COL_UBICACION !== -1 ? 
                String(row[COL_UBICACION] || "").trim().toUpperCase() : "",
            unidad,
            tipo: COL_TIPO !== -1 ? 
                String(row[COL_TIPO] || "").trim().toUpperCase() : "",
            servicio,
            taller: COL_TALLER !== -1 ? 
                String(row[COL_TALLER] || "").trim().toUpperCase() : ""
        };

        registro.clasificacion = clasificarEquipo(
            registro.tipo,
            registro.servicio
        );

        result.registros.push(registro);
        registrosValidos++;
    }

    console.log(`✓ Registros válidos procesados: ${registrosValidos}`);
    console.log(`⚠ Registros saltados (vacíos): ${registrosSaltados}`);

    if (result.registros.length > 0) {
        console.log("\nPrimeros 3 registros:");
        result.registros.slice(0, 3).forEach((reg, idx) => {
            console.log(`  [${idx}]:`, reg);
        });
    }

    GLOBAL_DATA = result.registros;
    buildStatistics(result);

    console.log("=== FIN ANÁLISIS ===\n");

    return result;

}

/*
==========================================
LIMPIEZA
==========================================
*/

function cleanValue(value){

    if(
        value === null ||
        value === undefined
    ){
        return "";
    }

    return String(value)
        .trim()
        .toUpperCase();

}

/*
==========================================
CLASIFICACION
==========================================
*/

function clasificarEquipo(
    tipo,
    servicio
){

    const t =
        String(tipo || "")
        .toUpperCase();

    const s =
        String(servicio || "")
        .toUpperCase();

    if(
        s.includes("MODULO")
    ){
        return "SISTEMA BOMBEO";
    }

    if(
        t.startsWith("R")
    ){
        return "OLLA";
    }

    if(
        t.startsWith("P")
    ){
        return "PLANTA";
    }

    if(
        t.startsWith("B")
    ){
        return "BOMBA";
    }

    if(
        t.startsWith("T")
    ){
        return "TRASCABO";
    }

    if(
        t.startsWith("E")
    ){
        return "EXCAVADORA";
    }

    return "OTROS";

}

/*
==========================================
ESTADISTICAS GENERALES
==========================================
*/

function buildStatistics(result){

    result.registros.forEach(reg => {

        if(
            reg.mes &&
            !result.meses.includes(
                reg.mes
            )
        ){
            result.meses.push(
                reg.mes
            );
        }

        if(
            reg.anio &&
            !result.anios.includes(
                reg.anio
            )
        ){
            result.anios.push(
                reg.anio
            );
        }

        if(
            reg.servicio &&
            !result.servicios.includes(
                reg.servicio
            )
        ){
            result.servicios.push(
                reg.servicio
            );
        }

        if(
            !result.ubicaciones[
                reg.ubicacion
            ]
        ){
            result.ubicaciones[
                reg.ubicacion
            ] = 0;
        }

        result.ubicaciones[
            reg.ubicacion
        ]++;

        if(
            !result.talleres[
                reg.taller
            ]
        ){
            result.talleres[
                reg.taller
            ] = 0;
        }

        result.talleres[
            reg.taller
        ]++;

        if(
            !result.tiposEquipo[
                reg.clasificacion
            ]
        ){
            result.tiposEquipo[
                reg.clasificacion
            ] = 0;
        }

        result.tiposEquipo[
            reg.clasificacion
        ]++;

        if(
            !result.serviciosResumen[
                reg.servicio
            ]
        ){
            result.serviciosResumen[
                reg.servicio
            ] = 0;
        }

        result.serviciosResumen[
            reg.servicio
        ]++;

    });

    result.meses.sort();
    result.anios.sort();

}

/*
==========================================
TOTAL REGISTROS
==========================================
*/

function getTotalRegistros(){

    return GLOBAL_DATA.length;

}

/*
==========================================
SERVICIO PRINCIPAL
==========================================
*/

function getServicioPrincipal(){

    const contador = {};

    GLOBAL_DATA.forEach(reg => {

        if(
            !contador[
                reg.servicio
            ]
        ){
            contador[
                reg.servicio
            ] = 0;
        }

        contador[
            reg.servicio
        ]++;

    });

    let mayor = 0;
    let servicio = "-";

    Object.keys(contador)
    .forEach(key => {

        if(
            contador[key] > mayor
        ){

            mayor =
                contador[key];

            servicio =
                key;

        }

    });

    return servicio;

}

/*
==========================================
UBICACION PRINCIPAL
==========================================
*/

function getUbicacionPrincipal(){

    const contador = {};

    GLOBAL_DATA.forEach(reg => {

        if(
            !contador[
                reg.ubicacion
            ]
        ){
            contador[
                reg.ubicacion
            ] = 0;
        }

        contador[
            reg.ubicacion
        ]++;

    });

    let mayor = 0;
    let ubicacion = "-";

    Object.keys(contador)
    .forEach(key => {

        if(
            contador[key] > mayor
        ){

            mayor =
                contador[key];

            ubicacion =
                key;

        }

    });

    return ubicacion;

}

/*
==========================================
TALLER PRINCIPAL
==========================================
*/

function getTallerPrincipal(){

    const contador = {};

    GLOBAL_DATA.forEach(reg => {

        if(
            !contador[
                reg.taller
            ]
        ){
            contador[
                reg.taller
            ] = 0;
        }

        contador[
            reg.taller
        ]++;

    });

    let mayor = 0;
    let taller = "-";

    Object.keys(contador)
    .forEach(key => {

        if(
            contador[key] > mayor
        ){

            mayor =
                contador[key];

            taller =
                key;

        }

    });

    return taller;

}

/*
==========================================
PORCENTAJES SERVICIOS
==========================================
*/

function getServiciosPorcentaje(){

    const total =
        GLOBAL_DATA.length;

    const resumen = {};

    GLOBAL_DATA.forEach(reg => {

        if(
            !resumen[
                reg.servicio
            ]
        ){
            resumen[
                reg.servicio
            ] = 0;
        }

        resumen[
            reg.servicio
        ]++;

    });

    const resultado = [];

    Object.keys(resumen)
    .forEach(servicio => {

        resultado.push({

            servicio:
                servicio,

            cantidad:
                resumen[
                    servicio
                ],

            porcentaje:

                (
                    resumen[
                        servicio
                    ]
                    /
                    total
                ) * 100

        });

    });

    resultado.sort(
        (a,b) =>
            b.cantidad -
            a.cantidad
    );

    return resultado;

}

/*
==========================================
FILTROS
==========================================
*/

function filterData(
    mes = "TODOS",
    anio = "TODOS",
    servicio = "TODOS"
){

    return GLOBAL_DATA.filter(reg => {

        const cumpleMes =
            mes === "TODOS" ||
            reg.mes === mes;

        const cumpleAnio =
            anio === "TODOS" ||
            reg.anio === anio;

        const cumpleServicio =
            servicio === "TODOS" ||
            reg.servicio === servicio;

        return (
            cumpleMes &&
            cumpleAnio &&
            cumpleServicio
        );

    });

}

/*
==========================================
COMBOS FILTROS
==========================================
*/

function populateFilters(data){

    const mesSelect =
        document.getElementById(
            "filterMes"
        );

    const anioSelect =
        document.getElementById(
            "filterAnio"
        );

    const servicioSelect =
        document.getElementById(
            "filterServicio"
        );

    if(
        !mesSelect ||
        !anioSelect ||
        !servicioSelect
    ){
        return;
    }

    mesSelect.innerHTML =
        `<option value="TODOS">Todos</option>`;

    anioSelect.innerHTML =
        `<option value="TODOS">Todos</option>`;

    servicioSelect.innerHTML =
        `<option value="TODOS">Todos</option>`;

    data.meses.forEach(mes => {

        mesSelect.innerHTML +=
        `<option value="${mes}">
            ${mes}
        </option>`;

    });

    data.anios.forEach(anio => {

        anioSelect.innerHTML +=
        `<option value="${anio}">
            ${anio}
        </option>`;

    });

    data.servicios.forEach(servicio => {

        servicioSelect.innerHTML +=
        `<option value="${servicio}">
            ${servicio}
        </option>`;

    });

}

/*
==========================================
CHART SERVICIOS
==========================================
*/

function getChartServicios(data){

    const resumen = {};

    data.forEach(reg => {

        if(
            !resumen[
                reg.servicio
            ]
        ){
            resumen[
                reg.servicio
            ] = 0;
        }

        resumen[
            reg.servicio
        ]++;

    });

    return {

        labels:
            Object.keys(resumen),

        values:
            Object.values(resumen)

    };

}

/*
==========================================
CHART EQUIPOS
==========================================
*/

function getChartEquipos(data){

    const resumen = {};

    data.forEach(reg => {

        if(
            !resumen[
                reg.clasificacion
            ]
        ){
            resumen[
                reg.clasificacion
            ] = 0;
        }

        resumen[
            reg.clasificacion
        ]++;

    });

    return {

        labels:
            Object.keys(resumen),

        values:
            Object.values(resumen)

    };

}

/*
==========================================
CHART UBICACIONES
==========================================
*/

function getChartUbicaciones(data){

    const resumen = {};

    data.forEach(reg => {

        if(
            !resumen[
                reg.ubicacion
            ]
        ){
            resumen[
                reg.ubicacion
            ] = 0;
        }

        resumen[
            reg.ubicacion
        ]++;

    });

    return {

        labels:
            Object.keys(resumen),

        values:
            Object.values(resumen)

    };

}

/*
==========================================
CHART TALLERES
==========================================
*/

function getChartTalleres(data){

    const resumen = {};

    data.forEach(reg => {

        if(
            !resumen[
                reg.taller
            ]
        ){
            resumen[
                reg.taller
            ] = 0;
        }

        resumen[
            reg.taller
        ]++;

    });

    return {

        labels:
            Object.keys(resumen),

        values:
            Object.values(resumen)

    };

}

/*
==========================================
TABLA SERVICIOS
==========================================
*/

function buildServiceTable(data){

    const tabla =
        document.getElementById(
            "tablaServiciosDetalle"
        );

    if(!tabla) return;

    tabla.innerHTML = "";

    const total = data.length;

    const resumen = {};

    data.forEach(reg => {

        if(
            !resumen[
                reg.servicio
            ]
        ){
            resumen[
                reg.servicio
            ] = 0;
        }

        resumen[
            reg.servicio
        ]++;

    });

    Object.keys(resumen)
    .sort()
    .forEach(servicio => {

        const cantidad =
            resumen[servicio];

        const porcentaje =
            (
                cantidad /
                total
            ) * 100;

        tabla.innerHTML += `

        <tr>

            <td>${servicio}</td>

            <td>${cantidad}</td>

            <td>${porcentaje.toFixed(1)}%</td>

        </tr>

        `;

    });

}

/*
==========================================
TABLA PROGRAMACION
==========================================
*/

function buildProgramacionTable(data){

    const tabla =
        document.getElementById(
            "tablaProgramacion"
        );

    if(!tabla) return;

    tabla.innerHTML = "";

    data.forEach(reg => {

        tabla.innerHTML += `

        <tr>

            <td>${reg.unidad}</td>

            <td>${reg.clasificacion}</td>

            <td>${reg.servicio}</td>

            <td>${reg.ubicacion}</td>

            <td>${reg.taller}</td>

        </tr>

        `;

    });

}

/*
==========================================
KPIs EJECUTIVOS
==========================================
*/

function updateExecutiveKPIs(data){

    const total =
        data.length;

    const servicios =
        getChartServicios(data);

    const ubicaciones =
        getChartUbicaciones(data);

    const talleres =
        getChartTalleres(data);

    const kpiTotal =
        document.getElementById(
            "kpi-total"
        );

    const kpiServicio =
        document.getElementById(
            "kpi-servicio-principal"
        );

    const kpiUbicacion =
        document.getElementById(
            "kpi-ubicacion-principal"
        );

    const kpiTaller =
        document.getElementById(
            "kpi-taller-principal"
        );

    if(kpiTotal){
        kpiTotal.innerText = total;
    }

    if(
        kpiServicio &&
        servicios.values.length
    ){
        kpiServicio.innerText =
            servicios.labels[
                servicios.values.indexOf(
                    Math.max(
                        ...servicios.values
                    )
                )
            ];
    }

    if(
        kpiUbicacion &&
        ubicaciones.values.length
    ){
        kpiUbicacion.innerText =
            ubicaciones.labels[
                ubicaciones.values.indexOf(
                    Math.max(
                        ...ubicaciones.values
                    )
                )
            ];
    }

    if(
        kpiTaller &&
        talleres.values.length
    ){
        kpiTaller.innerText =
            talleres.labels[
                talleres.values.indexOf(
                    Math.max(
                        ...talleres.values
                    )
                )
            ];
    }

}

/*
==========================================
APLICAR FILTROS
==========================================
*/

function applyFilters(){

    const mes =
        document.getElementById(
            "filterMes"
        ).value;

    const anio =
        document.getElementById(
            "filterAnio"
        ).value;

    const servicio =
        document.getElementById(
            "filterServicio"
        ).value;

    const data =
        filterData(
            mes,
            anio,
            servicio
        );

    buildServiceTable(data);

    buildProgramacionTable(data);

    updateExecutiveKPIs(data);

    if(
        typeof renderAllCharts ===
        "function"
    ){
        renderAllCharts(data);
    }

}
