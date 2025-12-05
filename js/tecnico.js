document.addEventListener('DOMContentLoaded', function () {
    console.log("🔧 Tecnico.js cargado correctamente");

    const auth = window.authUtils;
    const tableBody = document.getElementById('tabla-mis-reparaciones');

    // --- REFERENCIAS DOM ---
    const countPendientes = document.getElementById('count-pendientes');
    const countProceso = document.getElementById('count-proceso');
    const countFinalizadas = document.getElementById('count-finalizadas');
    const countStockBajo = document.getElementById('count-stock-bajo');

    // --- 1. Función para procesar y pintar la tabla ---
    function procesarTarjetas(tarjetas) {
        tableBody.innerHTML = '';

        let pendientes = 0;
        let proceso = 0;
        let finalizadas = 0;

        if (tarjetas.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">No tienes reparaciones asignadas.</td></tr>';
        }

        // --- Helper Formato Fecha ---
        function formatDate(dateVal) {
            if (!dateVal) return 'N/A';
            // If it's an array [2025, 12, 2, 22, 15, 30]
            if (Array.isArray(dateVal)) {
                const [year, month, day, hour, minute, second] = dateVal;
                // Pad with leading zeros
                const pad = (n) => n.toString().padStart(2, '0');
                return `${pad(day)}/${pad(month)}/${year} ${pad(hour)}:${pad(minute)}`;
            }
            // If it's a string, try to parse it
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                return d.toLocaleString('es-MX', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            }
            return dateVal;
        }

        tarjetas.forEach(t => {
            const estado = t.estado ? t.estado.toUpperCase().trim() : '';

            // --- Lógica de Contadores ---
            if (estado === 'EN_PROCESO') {
                proceso++;
            }
            else if (estado === 'PENDIENTE' || estado === 'DIAGNOSTICO') {
                pendientes++;
            }
            else if (estado === 'FINALIZADO' || estado === 'ENTREGADO') {
                finalizadas++;
            }

            // --- Pintar Fila ---
            const estadoStyle = window.statusHelper.getEstadoStyle(t.estado);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.id.substring(0, 8)}...</td>
                <td>${t.marca} / ${t.modelo}</td>
                <td>${t.problemaReportado || 'N/A'}</td>
                <td><span style="color: ${estadoStyle.color}; font-weight: bold;">${t.estado}</span></td>
                <td>${formatDate(t.fechaIngreso)}</td>
                <td>
                    <button class="btn-accion btn-cambiar-estado" data-id="${t.id}" data-estado="${t.estado}">
                        Editar Estado
                    </button>
                    <button class="btn-accion btn-copiar-id" data-id="${t.id}" style="background:#3498db; color:white; margin-left:5px;">
                        📋 Copiar ID
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // --- Actualizar HTML de contadores ---
        if (countPendientes) countPendientes.textContent = pendientes;
        if (countProceso) countProceso.textContent = proceso;

        if (countFinalizadas) {
            countFinalizadas.textContent = finalizadas;
        }
    }

    // --- 2. Cargar Datos del Servidor ---
    async function cargarDashboardTecnico() {
        if (!auth) return console.error("❌ Error: auth.js no cargado");

        const userData = auth.getUserData();
        const token = userData.token;
        const myUserId = userData.userId;

        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        try {
            // A. OBTENER TARJETAS
            const resTarjetas = await fetch(`${auth.API_URL}/tarjetas`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (resTarjetas.ok) {
                const jsonTarjetas = await resTarjetas.json();
                const todas = Array.isArray(jsonTarjetas) ? jsonTarjetas : (jsonTarjetas.data || []);
                const misTarjetas = todas.filter(t => t.tecnicoId === myUserId);
                procesarTarjetas(misTarjetas);
            }

            // B. OBTENER PRODUCTOS (STOCK BAJO)
            const resProductos = await fetch(`${auth.API_URL}/productos`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (resProductos.ok) {
                const jsonProductos = await resProductos.json();

                // Obtener la lista real de productos
                let productos = [];
                if (Array.isArray(jsonProductos)) {
                    productos = jsonProductos;
                } else if (jsonProductos.data && Array.isArray(jsonProductos.data)) {
                    productos = jsonProductos.data;
                }

                // 2. Filtrar y Contar Stock Bajo
                // ✅ CAMBIO IMPORTANTE: Ahora cuenta si es menor a 10 (coincide con Inventario)
                const bajos = productos.filter(p => {
                    const stockVal = p.cantidadPiezas ?? p.cantidad ?? p.stock ?? p.existencias;
                    const numero = Number(stockVal);

                    // Antes tenías numero < 5, ahora es numero < 10
                    return !isNaN(numero) && numero < 10;
                }).length;

                console.log(`📉 Stock bajo detectado (<10): ${bajos}`);

                // 3. Actualizar DOM
                if (countStockBajo) {
                    countStockBajo.textContent = bajos;

                    const cardStock = countStockBajo.closest('.card');
                    if (cardStock) {
                        if (bajos > 0) cardStock.classList.add('active');
                        else cardStock.classList.remove('active');
                    }
                }
            }

        } catch (error) {
            console.error("❌ Error cargando dashboard:", error);
        }
    }

    // --- 3. Listeners ---
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            // Listener para Editar Estado
            const btnEstado = e.target.closest('.btn-cambiar-estado');
            if (btnEstado) {
                const id = btnEstado.dataset.id;
                if (window.modalActions && window.modalActions.abrirModalEditarEstado) {
                    modalActions.abrirModalEditarEstado(id);
                }
                return;
            }

            // Listener para Copiar ID
            const btnCopiar = e.target.closest('.btn-copiar-id');
            if (btnCopiar) {
                const id = btnCopiar.dataset.id;
                navigator.clipboard.writeText(id).then(() => {
                    if (window.mostrarAlerta) {
                        window.mostrarAlerta('success', '✅ ID copiado al portapapeles');
                    } else {
                        alert('ID copiado: ' + id);
                    }
                }).catch(err => {
                    console.error('Error al copiar:', err);
                    alert('ID: ' + id);
                });
                return;
            }
        });
    }

    // Recargar al actualizar
    document.addEventListener('datosActualizados', () => {
        cargarDashboardTecnico();
    });

    // Ejecución Inicial
    cargarDashboardTecnico();
});