/*
==========================================
PROCON DASHBOARD V3.0
EXCEL PARSER
==========================================
*/

let GLOBAL_DATA = [];

function parseExcelMatrix(matrix, sheetName) {

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

    if (!matrix || matrix.length === 0) {
        return result;
    }

    const headerRow = findHeaderRow(matrix);

    if (headerRow === -1) {
        throw new Error(
            "No se localizaron encabezados válidos."
        );
    }

    const headers = matrix[headerRow].map(h =>
        String(h || "").trim().toUpperCase()
    );

    const cols = detectColumns(headers);

    if (!cols.unidad || !cols.tipo || !cols.servicio) {
        throw new Error(
            "No se localizaron las columnas requeridas."
        );
    }

    for (let i = headerRow + 1; i < matrix.length; i++) {

        const row = matrix[i];

        if (!row || row.length === 0) continue;

        const unidad =
            String(
                row[cols.unidad] || ""
            ).trim();

        if (unidad === "") continue;

        const registro = {

            mes:
                cleanValue(
                    row[cols.mes]
                ),

            anio:
                cleanValue(
                    row[cols.anio]
                ),

            ubicacion:
                cleanValue(
                    row[cols.ubicacion]
                ),

            unidad:
                unidad,

            tipo:
                cleanValue(
                    row[cols.tipo]
                ),

            servicio:
                cleanValue(
                    row[cols.servicio]
                ),

            taller:
                cleanValue(
                    row[cols.taller]
                )

        };

        registro.clasificacion =
            clasificarEquipo(
                registro.tipo,
                registro.servicio
            );

        result.registros.push(registro);
    }

    GLOBAL_DATA = result.registros;

    buildStatistics(
        result
    );

    return result;
}

/*
==========================================
BUSCAR ENCABEZADOS
==========================================
*/

function findHeaderRow(matrix) {

    for (let i = 0; i < 20; i++) {

        const row = matrix[i];

        if (!row) continue;

        const text = row.join(" ")
            .toUpperCase();

        if (
            text.includes("MES") &&
            text.includes("AÑO")
        ) {
            return i;
        }
    }

    return -1;
}

/*
==========================================
DETECTAR COLUMNAS
==========================================
*/

function detectColumns(headers) {

    const cols = {};

    headers.forEach((h, index) => {

        if (
            h.includes("MES")
        ) {
            cols.mes = index;
        }

        if (
            h.includes("AÑO")
        ) {
            cols.anio = index;
        }

        if (
            h.includes("UBIC")
        ) {
            cols.ubicacion = index;
        }

        if (
            h === "N°" ||
            h === "NO" ||
            h.includes("UNIDAD")
        ) {
            cols.unidad = index;
        }

        if (
            h === "TIPO"
        ) {
            cols.tipo = index;
        }

        if (
            h.includes("TIPO MTTO") ||
            h.includes("SERVICIO") ||
            h.includes("MANTENIMIENTO")
        ) {
            cols.servicio = index;
        }

        if (
            h.includes("TALLER")
        ) {
            cols.taller = index;
        }

    });

    return cols;
}

/*
==========================================
LIMPIAR DATOS
==========================================
*/

function cleanValue(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toUpperCase();
}

/*
==========================================
CLASIFICACION EQUIPOS
==========================================
*/

function clasificarEquipo(
    tipo,
    servicio
) {

    const value =
        String(tipo || "")
        .toUpperCase();

    if (
        servicio &&
        String(servicio)
        .toUpperCase()
        .includes("MODULO")
    ) {
        return "SISTEMA BOMBEO";
    }

    if (
        value.startsWith("R")
    ) {
        return "OLLA";
    }

    if (
        value.startsWith("P")
    ) {
        return "PLANTA";
    }

    if (
        value.startsWith("B")
    ) {
        return "BOMBA";
    }

    if (
        value.startsWith("T")
    ) {
        return "TRASCABO";
    }

    if (
        value.startsWith("E")
    ) {
        return "EXCAVADORA";
    }

    return "OTROS";
}
/*
==========================================
CONSTRUIR ESTADISTICAS
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
            !result.meses.includes(reg.mes)
        ){
            result.meses.push(reg.mes);
        }

        /*
        =====================
        AÑOS
        =====================
        */

        if(
            reg.anio &&
            !result.anios.includes(reg.anio)
        ){
            result.anios.push(reg.anio);
        }

        /*
        =====================
        SERVICIOS
        =====================
        */

        if(
            reg.servicio &&
            !result.servicios.includes(reg.servicio)
        ){
            result.servicios.push(reg.servicio);
        }

        /*
        =====================
        UBICACIONES
        =====================
        */

        if(!result.ubicaciones[reg.ubicacion]){
            result.ubicaciones[reg.ubicacion] = 0;
        }

        result.ubicaciones[reg.ubicacion]++;

        /*
        =====================
        TALLERES
        =====================
        */

        if(!result.talleres[reg.taller]){
            result.talleres[reg.taller] = 0;
        }

        result.talleres[reg.taller]++;

        /*
        =====================
        TIPO EQUIPO
        =====================
        */

        if(!result.tiposEquipo[reg.clasificacion]){
            result.tiposEquipo[reg.clasificacion] = 0;
        }

        result.tiposEquipo[reg.clasificacion]++;

        /*
        =====================
        SERVICIOS
        =====================
        */

        if(!result.serviciosResumen[reg.servicio]){
            result.serviciosResumen[reg.servicio] = 0;
        }

        result.serviciosResumen[reg.servicio]++;

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
SERVICIO MAS FRECUENTE
==========================================
*/

function getServicioPrincipal(){

    const contador = {};

    GLOBAL_DATA.forEach(r => {

        if(!contador[r.servicio]){
            contador[r.servicio] = 0;
        }

        contador[r.servicio]++;

    });

    let mayor = 0;
    let servicio = "-";

    Object.keys(contador).forEach(key => {

        if(contador[key] > mayor){

            mayor = contador[key];
            servicio = key;

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

    GLOBAL_DATA.forEach(r => {

        if(!contador[r.ubicacion]){
            contador[r.ubicacion] = 0;
        }

        contador[r.ubicacion]++;

    });

    let mayor = 0;
    let ubicacion = "-";

    Object.keys(contador).forEach(key => {

        if(contador[key] > mayor){

            mayor = contador[key];
            ubicacion = key;

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

    GLOBAL_DATA.forEach(r => {

        if(!contador[r.taller]){
            contador[r.taller] = 0;
        }

        contador[r.taller]++;

    });

    let mayor = 0;
    let taller = "-";

    Object.keys(contador).forEach(key => {

        if(contador[key] > mayor){

            mayor = contador[key];
            taller = key;

        }

    });

    return taller;

}

/*
==========================================
PORCENTAJES SERVICIO
==========================================
*/

function getServiciosPorcentaje(){

    const total = GLOBAL_DATA.length;

    const servicios = {};

    GLOBAL_DATA.forEach(reg => {

        if(!servicios[reg.servicio]){
            servicios[reg.servicio] = 0;
        }

        servicios[reg.servicio]++;

    });

    const resultado = [];

    Object.keys(servicios).forEach(servicio => {

        resultado.push({

            servicio: servicio,

            cantidad: servicios[servicio],

            porcentaje:
                (
                    servicios[servicio]
                    /
                    total
                ) * 100

        });

    });

    resultado.sort(
        (a,b) =>
            b.cantidad - a.cantidad
    );

    return resultado;

}
/*
==========================================
FILTRO GENERAL
==========================================
*/

function filterData(
    mes = "TODOS",
    anio = "TODOS",
    servicio = "TODOS"
){

    return GLOBAL_DATA.filter(reg => {

        const cumpleMes =
            mes === "TODOS"
            ||
            reg.mes === mes;

        const cumpleAnio =
            anio === "TODOS"
            ||
            reg.anio === anio;

        const cumpleServicio =
            servicio === "TODOS"
            ||
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
CARGAR COMBOS FILTRO
==========================================
*/

function populateFilters(data){

    const mesSelect =
        document.getElementById("filterMes");

    const anioSelect =
        document.getElementById("filterAnio");

    const servicioSelect =
        document.getElementById("filterServicio");

    if(
        !mesSelect ||
        !anioSelect ||
        !servicioSelect
    ){
        return;
    }

    mesSelect.innerHTML =
        `<option value="TODOS">Todos los meses</option>`;

    anioSelect.innerHTML =
        `<option value="TODOS">Todos los años</option>`;

    servicioSelect.innerHTML =
        `<option value="TODOS">Todos los servicios</option>`;

    data.meses.forEach(mes => {

        mesSelect.innerHTML += `
            <option value="${mes}">
                ${mes}
            </option>
        `;

    });

    data.anios.forEach(anio => {

        anioSelect.innerHTML += `
            <option value="${anio}">
                ${anio}
            </option>
        `;

    });

    data.servicios.forEach(servicio => {

        servicioSelect.innerHTML += `
            <option value="${servicio}">
                ${servicio}
            </option>
        `;

    });

}

/*
==========================================
SERVICIOS PARA CHART
==========================================
*/

function getChartServicios(data){

    const resumen = {};

    data.forEach(reg => {

        if(!resumen[reg.servicio]){
            resumen[reg.servicio] = 0;
        }

        resumen[reg.servicio]++;

    });

    return {

        labels: Object.keys(resumen),

        values: Object.values(resumen)

    };

}

/*
==========================================
EQUIPOS PARA CHART
==========================================
*/

function getChartEquipos(data){

    const resumen = {};

    data.forEach(reg => {

        if(!resumen[reg.clasificacion]){
            resumen[reg.clasificacion] = 0;
        }

        resumen[reg.clasificacion]++;

    });

    return {

        labels: Object.keys(resumen),

        values: Object.values(resumen)

    };

}

/*
==========================================
UBICACIONES PARA CHART
==========================================
*/

function getChartUbicaciones(data){

    const resumen = {};

    data.forEach(reg => {

        if(!resumen[reg.ubicacion]){
            resumen[reg.ubicacion] = 0;
        }

        resumen[reg.ubicacion]++;

    });

    return {

        labels: Object.keys(resumen),

        values: Object.values(resumen)

    };

}

/*
==========================================
TALLERES PARA CHART
==========================================
*/

function getChartTalleres(data){

    const resumen = {};

    data.forEach(reg => {

        if(!resumen[reg.taller]){
            resumen[reg.taller] = 0;
        }

        resumen[reg.taller]++;

    });

    return {

        labels: Object.keys(resumen),

        values: Object.values(resumen)

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

        if(!resumen[reg.servicio]){
            resumen[reg.servicio] = 0;
        }

        resumen[reg.servicio]++;

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

                <td>
                    ${porcentaje.toFixed(1)}%
                </td>

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
KPIS EJECUTIVOS
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

    document.getElementById(
        "kpi-total"
    ).innerText = total;

    document.getElementById(
        "kpi-servicio-principal"
    ).innerText =
        servicios.labels[
            servicios.values.indexOf(
                Math.max(...servicios.values)
            )
        ] || "-";

    document.getElementById(
        "kpi-ubicacion-principal"
    ).innerText =
        ubicaciones.labels[
            ubicaciones.values.indexOf(
                Math.max(...ubicaciones.values)
            )
        ] || "-";

    document.getElementById(
        "kpi-taller-principal"
    ).innerText =
        talleres.labels[
            talleres.values.indexOf(
                Math.max(...talleres.values)
            )
        ] || "-";

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

    renderAllCharts(data);

}