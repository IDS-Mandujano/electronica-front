document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ Gerente.js cargado correctamente");

    const auth = window.authUtils;
    const alerts = window.alerts || { showError: (m) => alert(m), showSuccess: (m) => alert(m) };

    // Referencias del DOM (Tablas)
    const tarjetasTableBody = document.getElementById('table-body');
    const productosTableBody = document.getElementById('productos-table-body');
    const finalizadosTableBody = document.getElementById('finalizados-table-body');

    // Referencias del DOM (Contadores)
    const countActivos = document.getElementById('count-activos');
    const countProceso = document.getElementById('count-proceso');
    const countFinalizados = document.getElementById('count-finalizados');
    const countStockBajo = document.getElementById('count-stock-bajo');

    // --- 1. LÓGICA DEL MENÚ LATERAL ---
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            document.querySelectorAll('.btn-submenu.active').forEach(other => {
                if (other !== trigger) {
                    other.classList.remove('active');
                    other.nextElementSibling.style.maxHeight = null;
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

    // --- 2. RENDERIZADO DE TABLAS ---

    // A) Tarjetas Recientes
    function renderizarTablaTarjetas(tarjetas) {
        if (!tarjetasTableBody) return;
        tarjetasTableBody.innerHTML = '';

        if (tarjetas.length === 0) {
            tarjetasTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay tarjetas recientes.</td></tr>';
            return;
        }

        const recientes = tarjetas.slice(0, 10);

        recientes.forEach(tarjeta => {
            const row = document.createElement('tr');

            let estadoClass = 'status-unknown';
            if (tarjeta.estado === 'EN_PROCESO') estadoClass = 'status-en_proceso';
            else if (tarjeta.estado === 'FINALIZADO') estadoClass = 'status-finalizado';
            else if (tarjeta.estado === 'ENTREGADO') estadoClass = 'status-entregado';

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

        const stockBajo = productos.filter(p => {
            const stock = p.cantidad !== undefined ? p.cantidad : p.cantidadPiezas;
            return stock < 10;
        });

        if (countStockBajo) {
            countStockBajo.textContent = stockBajo.length;
            const cardStock = countStockBajo.closest('.card-stock-bajo');
            if (cardStock) {
                if (stockBajo.length > 0) cardStock.classList.add('active');
                else cardStock.classList.remove('active');
            }
        }

        if (stockBajo.length === 0) {
            productosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Todo el stock está correcto.</td></tr>';
            return;
        }

        stockBajo.slice(0, 5).forEach(prod => {
            const stock = prod.cantidad !== undefined ? prod.cantidad : prod.cantidadPiezas;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prod.nombreProducto}</td>
                <td>${prod.categoria}</td>
                <td>${prod.unidad}</td>
                <td style="color: #d90429; font-weight: bold;">${stock} ⚠️</td>
                <td>
                    <a href="MateriaPrima.html" class="btn-accion">Gestionar</a>
                </td>
            `;
            productosTableBody.appendChild(row);
        });
    }

    // C) Pedidos Finalizados Recientes
    function renderizarTablaFinalizados(finalizados) {
        if (!finalizadosTableBody) return;
        finalizadosTableBody.innerHTML = '';

        if (finalizados.length === 0) {
            finalizadosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay entregas recientes.</td></tr>';
            return;
        }

        // Helper para formatear fechas
        function formatDate(dateVal) {
            if (!dateVal) return 'Pendiente';
            if (Array.isArray(dateVal)) {
                const [year, month, day, hour, minute] = dateVal;
                const pad = (n) => n.toString().padStart(2, '0');
                return `${pad(day)}/${pad(month)}/${year} ${pad(hour || 0)}:${pad(minute || 0)}`;
            }
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                return d.toLocaleString('es-MX', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            }
            return dateVal;
        }

        finalizados.slice(0, 5).forEach(pedido => {
            const row = document.createElement('tr');
            const costo = pedido.costoReparacion ? parseFloat(pedido.costoReparacion).toFixed(2) : '0.00';
            const fecha = formatDate(pedido.fechaFinalizacion || pedido.fechaEntregaCliente);
            const idShort = pedido.id ? pedido.id.substring(0, 8) : 'N/A';

            row.innerHTML = `
                <td title="${pedido.id}">${idShort}...</td>
                <td>${pedido.nombreCliente || 'N/A'}</td>
                <td>${pedido.tecnicoNombre || 'N/A'}</td>
                <td>${fecha}</td>
                <td>$${costo}</td>
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

                const activos = tarjetas.filter(t => t.estado !== 'FINALIZADO' && t.estado !== 'ENTREGADO' && t.estado !== 'CANCELADO').length;
                const finalizados = tarjetas.filter(t => t.estado === 'FINALIZADO' || t.estado === 'ENTREGADO').length;
                const enProceso = tarjetas.filter(t => t.estado === 'EN_PROCESO').length;

                if (countActivos) countActivos.textContent = activos;
                if (countFinalizados) countFinalizados.textContent = finalizados;
                if (countProceso) countProceso.textContent = enProceso;

                renderizarTablaTarjetas(tarjetas);
            }

            // 2. Cargar Productos
            const resProd = await fetch(`${auth.API_URL}/productos`, { headers: { 'Authorization': 'Bearer ' + token } });
            const dataProd = await resProd.json();
            if (resProd.ok && dataProd.success) {
                renderizarTablaProductos(dataProd.data);
            }

            // 3. Cargar Finalizados
            const resFin = await fetch(`${auth.API_URL}/finalizado`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (resFin.ok) {
                const dataFin = await resFin.json();
                const listaFinalizados = Array.isArray(dataFin) ? dataFin : (dataFin.data || []);
                renderizarTablaFinalizados(listaFinalizados);
            }

        } catch (error) {
            console.error("Error cargando dashboard:", error);
        }
    }

    // --- FUNCIÓN SEGURA PARA COPIAR (HTTP y HTTPS) ---
    function copiarAlPortapapeles(texto) {
        // Intento 1: API Moderna (Solo HTTPS o Localhost)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(texto);
        } else {
            // Intento 2: Método "Legacy" (Funciona en HTTP)
            return new Promise((resolve, reject) => {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = texto;

                    // Asegurar que no sea visible
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    textArea.style.top = "0";
                    document.body.appendChild(textArea);

                    textArea.focus();
                    textArea.select();

                    const success = document.execCommand('copy');
                    document.body.removeChild(textArea);

                    if (success) resolve();
                    else reject(new Error("Falló execCommand"));
                } catch (err) {
                    reject(err);
                }
            });
        }
    }

    // --- 4. LISTENER PARA COPIAR ID ---
    if (tarjetasTableBody) {
        tarjetasTableBody.addEventListener('click', function (e) {
            const btn = e.target.closest('.btn-copiar');

            if (btn) {
                const id = btn.dataset.id;

                if (id) {
                    copiarAlPortapapeles(id).then(() => {
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '✅ Copiado';
                        setTimeout(() => btn.innerHTML = originalText, 1500);

                        if (alerts.showSuccess) alerts.showSuccess('Folio copiado al portapapeles');
                    }).catch(err => {
                        console.error('Error al copiar:', err);
                        if (alerts.showError) alerts.showError('No se pudo copiar el folio (Navegador no compatible)');
                    });
                }
            }
        });
    }

    // --- INICIO ---
    cargarDashboard();

    document.addEventListener('datosActualizados', cargarDashboard);
});