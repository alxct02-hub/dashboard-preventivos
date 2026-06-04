/*
==========================================
PROCON DASHBOARD V3.0
CHARTS
==========================================
*/

let chartServicios = null;
let chartEquipos = null;
let chartUbicaciones = null;
let chartTalleres = null;

/*
==========================================
DESTRUIR GRAFICAS
==========================================
*/

function destroyCharts(){

    if(chartServicios){
        chartServicios.destroy();
        chartServicios = null;
    }

    if(chartEquipos){
        chartEquipos.destroy();
        chartEquipos = null;
    }

    if(chartUbicaciones){
        chartUbicaciones.destroy();
        chartUbicaciones = null;
    }

    if(chartTalleres){
        chartTalleres.destroy();
        chartTalleres = null;
    }

}

/*
==========================================
RENDER GENERAL
==========================================
*/

function renderAllCharts(data){

    destroyCharts();

    renderServiciosChart(data);

    renderEquiposChart(data);

    renderUbicacionesChart(data);

    renderTalleresChart(data);

}

/*
==========================================
SERVICIOS
==========================================
*/

function renderServiciosChart(data){

    const canvas =
        document.getElementById(
            "chartServicios"
        );

    if(!canvas) return;

    const info =
        getChartServicios(data);

    chartServicios =
        new Chart(
            canvas,
            {
                type:"doughnut",

                data:{

                    labels:info.labels,

                    datasets:[{

                        data:info.values,

                        backgroundColor:[
                            "#2563eb",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#06b6d4",
                            "#f97316",
                            "#84cc16",
                            "#ec4899"
                        ]

                    }]

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false,

                    plugins:{

                        legend:{
                            position:"bottom"
                        }

                    }

                }

            }
        );

}

/*
==========================================
TIPOS DE EQUIPO
==========================================
*/

function renderEquiposChart(data){

    const canvas =
        document.getElementById(
            "chartEquipos"
        );

    if(!canvas) return;

    const info =
        getChartEquipos(data);

    chartEquipos =
        new Chart(
            canvas,
            {
                type:"bar",

                data:{

                    labels:info.labels,

                    datasets:[{

                        label:"Equipos",

                        data:info.values,

                        backgroundColor:"#2563eb"

                    }]

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false,

                    plugins:{
                        legend:{
                            display:false
                        }
                    }

                }

            }
        );

}

/*
==========================================
UBICACIONES
==========================================
*/

function renderUbicacionesChart(data){

    const canvas =
        document.getElementById(
            "chartUbicaciones"
        );

    if(!canvas) return;

    const info =
        getChartUbicaciones(data);

    chartUbicaciones =
        new Chart(
            canvas,
            {
                type:"bar",

                data:{

                    labels:info.labels,

                    datasets:[{

                        label:"Ubicaciones",

                        data:info.values,

                        backgroundColor:"#10b981"

                    }]

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false,

                    indexAxis:'y',

                    plugins:{
                        legend:{
                            display:false
                        }
                    }

                }

            }
        );

}

/*
==========================================
TALLERES
==========================================
*/

function renderTalleresChart(data){

    const canvas =
        document.getElementById(
            "chartTalleres"
        );

    if(!canvas) return;

    const info =
        getChartTalleres(data);

    chartTalleres =
        new Chart(
            canvas,
            {
                type:"pie",

                data:{

                    labels:info.labels,

                    datasets:[{

                        data:info.values,

                        backgroundColor:[
                            "#2563eb",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#06b6d4",
                            "#f97316",
                            "#84cc16"
                        ]

                    }]

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false,

                    plugins:{

                        legend:{
                            position:"bottom"
                        }

                    }

                }

            }
        );

}