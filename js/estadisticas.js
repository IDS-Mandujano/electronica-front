document.addEventListener('DOMContentLoaded', function () {
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            document.querySelectorAll('.btn-submenu.active').forEach(otherTrigger => {
                if (otherTrigger !== trigger) {
                    otherTrigger.classList.remove('active');
                    otherTrigger.nextElementSibling.style.maxHeight = null;
                }
            });
            trigger.classList.toggle('active');
            const submenu = trigger.nextElementSibling;
            if (submenu.style.maxHeight) {
                submenu.style.maxHeight = null;
            } else {
                submenu.style.maxHeight = submenu.scrollHeight + "px";
            }
        });
    });

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

    const ctx = document.getElementById('ventasChart');
    const btnSemana = document.getElementById('filter-semana');
    const btnMes = document.getElementById('filter-mes');
    const statVendidasHoy = document.getElementById('stats-vendidas-hoy');
    const statVendidasSemana = document.getElementById('stats-vendidas-semana');
    const statVendidasMes = document.getElementById('stats-vendidas-mes');
    const statIngresosMes = document.getElementById('stats-ingresos-mes');

    let ventasChart;
    async function cargarStatsSummary() {
        try {
            const response = await fetch(`${auth.API_URL}/stats/summary`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            const data = result.data;

            statVendidasHoy.textContent = data.vendidasHoy;
            statVendidasSemana.textContent = data.vendidasSemana;
            statVendidasMes.textContent = data.vendidasMes;
            statIngresosMes.textContent = `$${data.ingresosMes.toFixed(2)}`;

        } catch (error) {
            console.error('Error al cargar resumen:', error);
            auth.showAlert('No se pudo cargar el resumen.', 'error');
        }
    }

    async function cargarDatosChart(tipo) {

        if (tipo === 'semana') {
            btnSemana.classList.add('active');
            btnMes.classList.remove('active');
        } else {
            btnSemana.classList.remove('active');
            btnMes.classList.add('active');
        }

        try {
            const response = await fetch(`${auth.API_URL}/stats/chart?tipo=${tipo}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            const labels = result.data.labels;
            const data = result.data.valores;

            if (ventasChart) {
                ventasChart.destroy();
            }

            ventasChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tarjetas Vendidas',
                        data: data,
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
                            ticks: { stepSize: 1 }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });

        } catch (error) {
            console.error(`Error al cargar datos del gráfico (${tipo}):`, error);
            if (auth.showAlert) auth.showAlert('No se pudieron cargar las estadísticas.', 'error');
        }
    }

    cargarDatosChart('semana');
    cargarStatsSummary();

    btnSemana.addEventListener('click', () => cargarDatosChart('semana'));
    btnMes.addEventListener('click', () => cargarDatosChart('mes'));
});