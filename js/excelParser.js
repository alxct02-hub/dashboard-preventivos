/*
==========================================
PROCON DASHBOARD V4.0
EXCEL PARSER - MEJORADO v3
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

    /*
    ==========================================
    BUSCAR FILA DE ENCABEZADOS
    ==========================================
    */

    let headerRowIndex = -1;
    let headerRow = null;

    // Buscar la fila que contiene los encabezados reales
    // Ignorar filas de título como "MANTENIMIENTOS PREVENTIVOS"
    for (let i = 0; i < Math.min(10, matrix.length); i++) {
        const row = matrix[i];
        if (!row || row.length === 0) continue;

        // Ignorar filas que son solo títulos (una sola celda con contenido)
        const nonEmptyCells = row.filter(cell => 
            String(cell || "").trim() !== ""
        );
        
        // Si la fila tiene menos de 4 celdas no vacías, probablemente es un título
        if (nonEmptyCells.length < 4) {
            console.log(`Fila ${i} descartada (parece ser título): ${row[0]}`);
            continue;
        }

        const rowContent = row.map(cell => 
            String(cell || "").trim().toUpperCase()
        ).join(" ");

        // Detectar si esta es la fila de encabezados
        // Buscar palabras clave que indican que es una fila de encabezados
        if (
            rowContent.includes("MES") ||
            (rowContent.includes("AÑO") && rowContent.includes("UBICACION")) ||
            (rowContent.includes("TIPO") && rowContent.includes("TALLER"))
        ) {
            headerRowIndex = i;
            headerRow = row;
            console.log(`✓ Fila de encabezados encontrada en índice: ${i}`);
            console.log(`Contenido: ${rowContent}`);
            break;
        }
    }

    // Si no encontró, retornar error
    if (headerRowIndex === -1) {
        console.error("No se encontró fila de encabezados válida");
        return result;
    }

    console.log("Encabezados detectados:", headerRow);

    /*
    ==========================================
    DETECTAR COLUMNAS AUTOMÁTICAMENTE
    ==========================================
    */

    // Normalizar encabezados para búsqueda
    const normalizeHeader = (header) => {
        return String(header || "")
            .trim()
            .toLowerCase()
            .replace(/[áàâä]/g, 'a')
            .replace(/[éèêë]/g, 'e')
            .replace(/[íìîï]/g, 'i')
            .replace(/[óòôö]/g, 'o')
            .replace(/[úùûü]/g, 'u')
            .replace(/[\s\-_]/g, '')
            .replace(/[°º]/g, '');
    };

    // Buscar índices de columnas
    let COL_MES = -1;
    let COL_ANIO = -1;
    let COL_UBICACION = -1;
    let COL_UNIDAD = -1;
    let COL_TIPO = -1;
    let COL_SERVICIO = -1;
    let COL_TALLER = -1;

    headerRow.forEach((header, index) => {
        const normalized = normalizeHeader(header);
        const original = String(header || "").trim();
        
        console.log(`Columna ${index}: "${original}" -> "${normalized}"`);

        if (normalized.includes('mes')) {
            COL_MES = index;
            console.log(`  ✓ COL_MES = ${index}`);
        }
        if (normalized.includes('ano') || normalized.includes('anio')) {
            COL_ANIO = index;
            console.log(`  ✓ COL_ANIO = ${index}`);
        }
        if (normalized.includes('ubicacion')) {
            COL_UBICACION = index;
            console.log(`  ✓ COL_UBICACION = ${index}`);
        }
        if (normalized === 'n' || normalized === 'n' || normalized.match(/^n[°º]?$/)) {
            COL_UNIDAD = index;
            console.log(`  ✓ COL_UNIDAD = ${index}`);
        }
        if (normalized.includes('mtto') || normalized.includes('mantenimiento')) {
            COL_SERVICIO = index;
            console.log(`  ✓ COL_SERVICIO = ${index}`);
        }
        if (normalized.includes('taller')) {
            COL_TALLER = index;
            console.log(`  ✓ COL_TALLER = ${index}`);
        }
    });

    // Si no encontró "Tipo mtto", buscar "Tipo" que sea servicio
    if (COL_SERVICIO === -1) {
        headerRow.forEach((header, index) => {
            const normalized = normalizeHeader(header);
            if (normalized === 'tipo') {
                COL_SERVICIO = index;
                console.log(`Asignando columna ${index} como Servicio (Tipo)`);
            }
        });
    }

    // Si no encontró "Tipo" como columna separada, buscar en posición esperada
    if (COL_TIPO === -1 && headerRow.length > 4) {
        const norm4 = normalizeHeader(headerRow[4]);
        if (norm4.includes('tipo')) {
            COL_TIPO = 4;
            console.log(`Asignando columna 4 como Tipo`);
        }
    }

    // Si no encontró N°, usar columna 3 (posición típica)
    if (COL_UNIDAD === -1 && headerRow.length > 3) {
        COL_UNIDAD = 3;
        console.log("Asignando columna 3 como Unidad (N°)");
    }

    console.log("Índices detectados:", {
        COL_MES,
        COL_ANIO,
        COL_UBICACION,
        COL_UNIDAD,
        COL_TIPO,
        COL_SERVICIO,
        COL_TALLER
    });

    // Validar que se encontraron las columnas críticas
    if (COL_MES === -1 || COL_ANIO === -1 || COL_UNIDAD === -1 || COL_SERVICIO === -1) {
        console.error("No se encontraron todas las columnas requeridas", {
            COL_MES,
            COL_ANIO,
            COL_UNIDAD,
            COL_SERVICIO
        });
        return result;
    }

    // Procesar filas de datos (comenzando desde la siguiente fila después de encabezados)
    const dataStartIndex = headerRowIndex + 1;
    console.log(`Procesando datos desde fila ${dataStartIndex}`);
    
    for(
        let i = dataStartIndex;
        i < matrix.length;
        i++
    ){

        const row = matrix[i];

        if(
            !row ||
            row.length === 0
        ){
            continue;
        }

        const unidad =
            String(
                row[COL_UNIDAD] || ""
            ).trim();

        // Saltar filas vacías
        if(
            unidad === ""
        ){
            continue;
        }

        const registro = {

            mes:
                cleanValue(
                    row[COL_MES]
                ),

            anio:
                cleanValue(
                    row[COL_ANIO]
                ),

            ubicacion:
                COL_UBICACION !== -1 ?
                cleanValue(row[COL_UBICACION]) :
                "",

            unidad:
                unidad,

            tipo:
                COL_TIPO !== -1 ?
                cleanValue(row[COL_TIPO]) :
                "",

            servicio:
                cleanValue(
                    row[COL_SERVICIO]
                ),

            taller:
                COL_TALLER !== -1 ?
                cleanValue(row[COL_TALLER]) :
                ""

        };

        registro.clasificacion =
            clasificarEquipo(
                registro.tipo,
                registro.servicio
            );

        result.registros.push(
            registro
        );

    }

    console.log("✓ Registros procesados:", result.registros.length);
    if (result.registros.length > 0) {
        console.log("Primeros 3 registros:", result.registros.slice(0, 3));
    } else {
        console.warn("⚠ No se procesaron registros");
    }

    GLOBAL_DATA =
        result.registros;

    buildStatistics(
        result
    );

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

        /*
        =====================
        MESES
        =====================
        */

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

        /*
        =====================
        AÑOS
        =====================
        */

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

        /*
        =====================
        SERVICIOS
        =====================
        */

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

        /*
        =====================
        UBICACIONES
        =====================
        */

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

        /*
        =====================
        TALLERES
        =====================
        */

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

        /*
        =====================
        TIPO EQUIPO
        =====================
        */

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

        /*
        =====================
        SERVICIOS RESUMEN
        =====================
        */

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
