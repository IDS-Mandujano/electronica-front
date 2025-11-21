document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ Gerente.js cargado correctamente");

    const auth = window.authUtils;
    const alerts = window.alerts || { showError: (m) => alert(m), showSuccess: (m) => alert(m) };

    // Referencias del DOM (Tablas)
    const tarjetasTableBody = document.getElementById('table-body'); // Tabla principal de tarjetas
    const productosTableBody = document.getElementById('productos-table-body'); // Tabla de stock bajo
    const finalizadosTableBody = document.getElementById('finalizados-table-body'); // Tabla de finalizados

    // Referencias del DOM (Contadores del Dashboard)
    const countActivos = document.getElementById('count-activos');
    const countProceso = document.getElementById('count-proceso');
    const countFinalizados = document.getElementById('count-finalizados');
    const countStockBajo = document.getElementById('count-stock-bajo');

    // --- 1. LÓGICA DEL MENÚ LATERAL (ACORDEÓN) ---
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            // Cerrar otros submenús abiertos
            document.querySelectorAll('.btn-submenu.active').forEach(other => {
                if (other !== trigger) {
                    other.classList.remove('active');
                    other.nextElementSibling.style.maxHeight = null;
                }
            });
            // Alternar el actual
            trigger.classList.toggle('active');
            const submenu = trigger.nextElementSibling;
            if (submenu.style.maxHeight) {
                submenu.style.maxHeight = null;
            } else {
                submenu.style.maxHeight = submenu.scrollHeight + "px";
            }
        });
    });

    // --- 2. RENDERIZADO DE TABLAS ---

    // A) Tarjetas Recientes
    function renderizarTablaTarjetas(tarjetas) {
        if (!tarjetasTableBody) return;
        tarjetasTableBody.innerHTML = '';

        if (tarjetas.length === 0) {
            tarjetasTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay tarjetas recientes.</td></tr>';
            return;
        }

        // Mostramos solo las últimas 5 o 10 para el dashboard
        const recientes = tarjetas.slice(0, 10);

        recientes.forEach(tarjeta => {
            const row = document.createElement('tr');
            
            // Obtener clase de estado usando helper centralizado
            const estadoClass = window.statusHelper.getEstadoClass(tarjeta.estado);

            row.innerHTML = `
                <td title="${tarjeta.id}">${tarjeta.id.substring(0, 8)}...</td>
                <td>${tarjeta.nombreCliente}</td>
                <td><span class="status-badge ${estadoClass}">${tarjeta.estado}</span></td>
                <td>${tarjeta.tecnicoNombre || 'Sin Asignar'}</td>
                <td>
                    <button class="btn-accion btn-copiar" data-id="${tarjeta.id}" title="Copiar Folio Completo">
                        📋 Copiar ID
                    </button>
                </td>
            `;
            tarjetasTableBody.appendChild(row);
        });
    }

    // B) Productos (Stock Bajo)
    function renderizarTablaProductos(productos) {
        if (!productosTableBody) return;
        productosTableBody.innerHTML = '';

        // Filtramos solo los que tienen stock bajo (< 10) para el dashboard
        const stockBajo = productos.filter(p => p.cantidadPiezas < 10);

        if (stockBajo.length === 0) {
            productosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Todo el stock está correcto.</td></tr>';
            return;
        }

        stockBajo.slice(0, 5).forEach(prod => {
            const row = document.createElement('tr');
            row.classList.add('stock-bajo-row'); // Clase para resaltar en rojo si existe en CSS
            row.innerHTML = `
                <td>${prod.nombreProducto}</td>
                <td>${prod.categoria}</td>
                <td>${prod.unidad}</td>
                <td style="color: #d9534f; font-weight: bold;">${prod.cantidadPiezas} ⚠️</td>
                <td>
                    <a href="MateriaPrima.html" class="btn-accion">Gestionar</a>
                </td>
            `;
            productosTableBody.appendChild(row);
        });

        // Actualizar contador de tarjeta
        if (countStockBajo) countStockBajo.textContent = stockBajo.length;
    }

    // C) Pedidos Finalizados Recientes
    function renderizarTablaFinalizados(finalizados) {
        if (!finalizadosTableBody) return;
        finalizadosTableBody.innerHTML = '';

        if (finalizados.length === 0) {
            finalizadosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay entregas recientes.</td></tr>';
            return;
        }

        finalizados.slice(0, 5).forEach(pedido => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td title="${pedido.registroTarjetaId}">${pedido.registroTarjetaId.substring(0, 8)}...</td>
                <td>${pedido.nombreCliente}</td>
                <td>${pedido.tecnicoNombre}</td>
                <td>${pedido.fechaEntrega}</td>
                <td>$${pedido.costoReparacion}</td>
            `;
            finalizadosTableBody.appendChild(row);
        });
    }

    // --- 3. CARGA DE DATOS (API) ---
    async function cargarDashboard() {
        if (!auth) return console.error("Auth no cargado");
        const token = auth.getUserData().token;
        if (!token) return console.error("No token");

        try {
            // 1. Cargar Tarjetas
            const resTarjetas = await fetch(`${auth.API_URL}/tarjetas`, { headers: { 'Authorization': 'Bearer ' + token } });
            const dataTarjetas = await resTarjetas.json();
            
            if (resTarjetas.ok && dataTarjetas.success) {
                const tarjetas = dataTarjetas.data;
                
                // Actualizar contadores
                const activos = tarjetas.filter(t => t.estado !== 'FINALIZADO' && t.estado !== 'ENTREGADO').length;
                const finalizados = tarjetas.filter(t => t.estado === 'FINALIZADO').length;
                const enProceso = tarjetas.filter(t => t.estado === 'EN_PROCESO').length;

                if (countActivos) countActivos.textContent = activos;
                if (countFinalizados) countFinalizados.textContent = finalizados;
                if (countProceso) countProceso.textContent = enProceso;

                renderizarTablaTarjetas(tarjetas);
            }

            // 2. Cargar Productos (Para Stock Bajo)
            const resProd = await fetch(`${auth.API_URL}/productos`, { headers: { 'Authorization': 'Bearer ' + token } });
            const dataProd = await resProd.json();
            if (resProd.ok && dataProd.success) {
                renderizarTablaProductos(dataProd.data);
            }

            // 3. Cargar Finalizados (Historial)
            const resFin = await fetch(`${auth.API_URL}/finalizado`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (resFin.ok) {
                const dataFin = await resFin.json();
                // La API de finalizado a veces devuelve un array directo, verificamos:
                const listaFinalizados = Array.isArray(dataFin) ? dataFin : (dataFin.data || []);
                renderizarTablaFinalizados(listaFinalizados);
            }

        } catch (error) {
            console.error("Error cargando dashboard:", error);
        }
    }

    // --- 4. LISTENER PARA COPIAR ID (SOLUCIÓN) ---
    if (tarjetasTableBody) {
        tarjetasTableBody.addEventListener('click', function(e) {
            // .closest() busca el elemento padre más cercano que coincida con la clase.
            // Esto arregla el problema si das clic en un icono o texto dentro del botón.
            const btn = e.target.closest('.btn-copiar');

            if (btn) {
                const id = btn.dataset.id; // Obtiene el data-id="${tarjeta.id}"
                
                if (id) {
                    navigator.clipboard.writeText(id).then(() => {
                        alerts.showSuccess('Folio copiado al portapapeles');
                    }).catch(err => {
                        console.error('Error al copiar:', err);
                        alerts.showError('No se pudo copiar el folio');
                    });
                } else {
                    console.error("El botón no tiene ID asignado");
                }
            }
        });
    }

    // --- INICIO ---
    cargarDashboard();
});