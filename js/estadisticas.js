document.addEventListener('DOMContentLoaded', function () {

    if (!window.authUtils) {
        console.error('Error: auth.js no está cargado.');
        return;
    }

    const auth = window.authUtils;
    const token = auth.getUserData().token;
    if (!token) {
        console.error("No hay token");
        return;
    }

    /* =============================
       ELEMENTOS DE LOS CONTADORES
       ============================= */
    const statIngresosHoy = document.getElementById('stats-ingresos-hoy');
    const statIngresosSemana = document.getElementById('stats-ingresos-semana');
    const statIngresosMes = document.getElementById('stats-ingresos-mes');
    const statTarjetasFinalizadas = document.getElementById('stats-tarjetas-finalizadas');

    /* =============================
       FUNCIÓN: CARGAR CONTADORES
       ============================= */
    async function cargarStatsSummary() {
        try {
            const response = await fetch(`${auth.API_URL}/stats/summary`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            const data = result.data;

            statIngresosHoy.textContent =
                `$${data.ingresosHoy ? parseFloat(data.ingresosHoy).toFixed(2) : '0.00'}`;

            statIngresosSemana.textContent =
                `$${data.ingresosSemana ? parseFloat(data.ingresosSemana).toFixed(2) : '0.00'}`;

            statIngresosMes.textContent =
                `$${data.ingresosMes ? parseFloat(data.ingresosMes).toFixed(2) : '0.00'}`;

            statTarjetasFinalizadas.textContent =
                data.tarjetasFinalizadas || data.vendidasMes || 0;

        } catch (error) {
            console.error('Error al cargar resumen:', error);
        }
    }


    /* =============================
       GRÁFICA (TAL COMO LA QUIERES)
       ============================= */
    const ctx = document.getElementById('ventasChart');
    const btnDiario = document.getElementById('filter-diario');
    const btnSemanal = document.getElementById('filter-semanal');
    const btnMensual = document.getElementById('filter-mensual');

    let ventasChart;

    async function cargarDatosChart(tipo) {

        btnDiario.classList.remove('active');
        btnSemanal.classList.remove('active');
        btnMensual.classList.remove('active');

        if (tipo === 'diario') btnDiario.classList.add('active');
        if (tipo === 'semanal') btnSemanal.classList.add('active');
        if (tipo === 'mensual') btnMensual.classList.add('active');

        try {
            const endpoint =
                tipo === 'diario' ? `${auth.API_URL}/stats/chart?tipo=diario` :
                tipo === 'semanal' ? `${auth.API_URL}/stats/chart?tipo=semanal` :
                `${auth.API_URL}/stats/chart?tipo=mes`;

            const response = await fetch(endpoint, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const result = await response.json();

            if (!result.success) throw new Error(result.message);

            const labels = result.data.labels;
            const ingresos = result.data.valores.map(n => Number(n));

            if (ventasChart) ventasChart.destroy();

            ventasChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Ingresos ($)',
                        data: ingresos,
                        backgroundColor: 'rgba(30, 45, 59, 0.7)',
                        borderColor: 'rgba(30, 45, 59, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                                    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
                                    return '$' + value;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error gráfico:', error);
        }
    }

    /* =============================
       INICIALIZAR
       ============================= */
    cargarStatsSummary();
    cargarDatosChart('semanal');

    btnDiario.addEventListener('click', () => cargarDatosChart('diario'));
    btnSemanal.addEventListener('click', () => cargarDatosChart('semanal'));
    btnMensual.addEventListener('click', () => cargarDatosChart('mensual'));

});