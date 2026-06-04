/*
==========================================
PROCON DASHBOARD V3.0
APP CONTROLLER
==========================================
*/

let DASHBOARD_DATA = null;

/*
==========================================
INICIO
==========================================
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupNavigation();

        setupFileLoader();

    }
);

/*
==========================================
NAVEGACION
==========================================
*/

function setupNavigation(){

    document
    .querySelectorAll(".sidebar-item")
    .forEach(item => {

        item.addEventListener(
            "click",
            function(){

                if(
                    this.classList.contains(
                        "disabled"
                    )
                ){
                    return;
                }

                document
                .querySelectorAll(
                    ".sidebar-item"
                )
                .forEach(el =>
                    el.classList.remove(
                        "active"
                    )
                );

                document
                .querySelectorAll(
                    ".tab-view"
                )
                .forEach(el =>
                    el.classList.remove(
                        "active"
                    )
                );

                this.classList.add(
                    "active"
                );

                const tab =
                    this.dataset.tab;

                const target =
                    document.getElementById(
                        tab
                    );

                if(target){

                    target.classList.add(
                        "active"
                    );

                }

            }
        );

    });

}

/*
==========================================
CARGADOR EXCEL
==========================================
*/

function setupFileLoader(){

    const zone =
        document.getElementById(
            "drop-zone"
        );

    const input =
        document.getElementById(
            "file-input"
        );

    if(
        !zone ||
        !input
    ){
        return;
    }

    zone.addEventListener(
        "click",
        () => input.click()
    );

    zone.addEventListener(
        "dragover",
        e => {

            e.preventDefault();

            zone.classList.add(
                "dragover"
            );

        }
    );

    zone.addEventListener(
        "dragleave",
        () => {

            zone.classList.remove(
                "dragover"
            );

        }
    );

    zone.addEventListener(
        "drop",
        e => {

            e.preventDefault();

            zone.classList.remove(
                "dragover"
            );

            if(
                e.dataTransfer.files.length
            ){

                processExcelFile(
                    e.dataTransfer.files[0]
                );

            }

        }
    );

    input.addEventListener(
        "change",
        e => {

            if(
                e.target.files.length
            ){

                processExcelFile(
                    e.target.files[0]
                );

            }

        }
    );

}

/*
==========================================
PROCESAR EXCEL
==========================================
*/

function processExcelFile(file){

    updateStatus(
        "Analizando archivo...",
        "success"
    );

    const reader =
        new FileReader();

    reader.readAsArrayBuffer(
        file
    );

    reader.onload =
        function(e){

            try{

                const data =
                    new Uint8Array(
                        e.target.result
                    );

                const workbook =
                    XLSX.read(
                        data,
                        {
                            type:"array"
                        }
                    );

                const sheetName =
                    workbook
                    .SheetNames[0];

                const sheet =
                    workbook.Sheets[
                        sheetName
                    ];

                const matrix =
                    XLSX.utils.sheet_to_json(
                        sheet,
                        {
                            header:1,
                            defval:""
                        }
                    );

                DASHBOARD_DATA =
                    parseExcelMatrix(
                        matrix,
                        sheetName
                    );

                initializeDashboard(
                    DASHBOARD_DATA,
                    sheetName
                );

            }
            catch(error){

                console.error(
                    error
                );

                updateStatus(
                    error.message,
                    "error"
                );

            }

        };

}

/*
==========================================
INICIALIZAR
==========================================
*/

function initializeDashboard(
    data,
    sheetName
){

    document
    .getElementById(
        "dashboard-wrapper"
    )
    .style.display =
        "block";

    document
    .getElementById(
        "upload-tab"
    )
    .classList.remove(
        "active"
    );

    document
    .getElementById(
        "dashboard-tab"
    )
    .classList.add(
        "active"
    );

    document
    .getElementById(
        "menu-dashboard"
    )
    .classList.remove(
        "disabled"
    );

    document
    .getElementById(
        "menu-programacion"
    )
    .classList.remove(
        "disabled"
    );

    document
    .getElementById(
        "menu-distribucion"
    )
    .classList.remove(
        "disabled"
    );

    document
    .getElementById(
        "lbl-periodo-actual"
    )
    .innerHTML =
        `<i class="fa-solid fa-file-excel"></i> ${sheetName}`;

    populateFilters(
        data
    );

    buildServiceTable(
        data.registros
    );

    buildProgramacionTable(
        data.registros
    );

    updateExecutiveKPIs(
        data.registros
    );

    renderAllCharts(
        data.registros
    );

    setupFilters();

    buildExecutiveInsight(
        data.registros
    );

    updateStatus(
        "Archivo procesado correctamente",
        "success"
    );

}

/*
==========================================
FILTROS
==========================================
*/

function setupFilters(){

    const mes =
        document.getElementById(
            "filterMes"
        );

    const anio =
        document.getElementById(
            "filterAnio"
        );

    const servicio =
        document.getElementById(
            "filterServicio"
        );

    if(mes){

        mes.onchange =
            applyFilters;

    }

    if(anio){

        anio.onchange =
            applyFilters;

    }

    if(servicio){

        servicio.onchange =
            applyFilters;

    }

}

/*
==========================================
DIAGNOSTICO EJECUTIVO
==========================================
*/

function buildExecutiveInsight(
    data
){

    const total =
        data.length;

    const servicios =
        getChartServicios(
            data
        );

    let servicioTop =
        "-";

    if(
        servicios.values.length
    ){

        servicioTop =
            servicios.labels[
                servicios.values.indexOf(
                    Math.max(
                        ...servicios.values
                    )
                )
            ];

    }

    const mensaje =

        `Durante el periodo analizado se programaron ${total} mantenimientos preventivos. El servicio predominante corresponde a ${servicioTop}, representando la mayor carga operativa del programa mensual.`;

    const txt =
        document.getElementById(
            "txt-insights"
        );

    if(txt){

        txt.innerHTML =
            mensaje;

    }

}

/*
==========================================
STATUS
==========================================
*/

function updateStatus(
    message,
    type
){

    const box =
        document.getElementById(
            "upload-status"
        );

    if(!box){
        return;
    }

    box.style.display =
        "block";

    box.className =
        `status-message ${type}`;

    box.innerHTML =
        message;

}