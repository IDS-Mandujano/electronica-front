document.addEventListener('DOMContentLoaded', function () {

    // --- LÓGICA DEL SUBMENÚ ---
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            trigger.classList.toggle('active');
            const submenu = trigger.nextElementSibling;
            if (submenu.style.maxHeight) {
                submenu.style.maxHeight = null;
            } else {
                submenu.style.maxHeight = submenu.scrollHeight + "px";
            }

            document.querySelectorAll('.btn-submenu.active').forEach(otherTrigger => {
                if (otherTrigger !== trigger) {
                    otherTrigger.classList.remove('active');
                    otherTrigger.nextElementSibling.style.maxHeight = null;
                }
            });
        });
    });

    const auth = window.authUtils;

    const pedidosTableBody = document.getElementById('table-body');
    const productosTableBody = document.getElementById('productos-table-body');
    const statusFilter = document.getElementById('status-filter');

    const countActivos = document.getElementById('count-activos');
    const countProceso = document.getElementById('count-proceso');
    const countFinalizados = document.getElementById('count-finalizados');
    const countStockBajo = document.getElementById('count-stock-bajo');

    let todosLosPedidos = [];

    // --- FUNCIÓN SEGURA PARA COPIAR (HTTP y HTTPS) ---
    function copiarAlPortapapeles(texto) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(texto);
        } else {
            return new Promise((resolve, reject) => {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = texto;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
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

    // --- RENDERIZADO DE PEDIDOS ---
    function renderizarTablaPedidos(pedidos) {
        pedidosTableBody.innerHTML = '';
        if (pedidos.length === 0) {
            pedidosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No se encontraron pedidos.</td></tr>';
            return;
        }

        pedidos.forEach(pedido => {
            let estadoClass = 'status-default';
            const estado = pedido.estado ? pedido.estado.toUpperCase() : 'UNKNOWN';

            if (estado === 'EN_PROCESO') estadoClass = 'status-en_proceso';
            else if (estado === 'FINALIZADO') estadoClass = 'status-finalizado';
            else if (estado === 'PENDIENTE_ENTREGA') estadoClass = 'status-pendiente';
            else if (estado === 'CANCELADO') estadoClass = 'status-cancelado';

            const row = document.createElement('tr');
            const folio = pedido.id ? pedido.id.substring(0, 8) : 'N/A';

            row.innerHTML = `
                <td>${folio}...</td>
                <td>${pedido.nombreCliente}</td>
                <td>
                    <div class="status-container">
                        <span class="status-badge ${estadoClass}">${pedido.estado}</span>
                    </div>
                </td>
                <td>${pedido.tecnicoNombre || 'Sin Asignar'}</td>
                <td id="materiales-${pedido.id}"><small style="color:#999;">Cargando...</small></td>
                <td>
                    <button class="btn-accion btn-copiar" data-folio="${pedido.id}">Copiar ID</button>
                </td>
            `;
            pedidosTableBody.appendChild(row);

            // Cargar materiales asincrónicamente
            cargarMateriales(pedido.id);
        });
    }

    // --- CARGAR MATERIALES USADOS ---
    async function cargarMateriales(servicioId) {
        try {
            const token = auth.getUserData().token;
            const res = await fetch(`${auth.API_URL}/servicios/${servicioId}/materiales`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const container = document.getElementById(`materiales-${servicioId}`);
            if (!container) return;

            if (res.ok) {
                const result = await res.json();
                if (result.data && result.data.length > 0) {
                    const materialesHTML = result.data.map(m =>
                        `<span style="background:#e8f5e9; padding:2px 6px; border-radius:4px; font-size:11px; margin:2px; display:inline-block;">${m.nombrePieza} x${m.cantidadUsada}</span>`
                    ).join(' ');
                    container.innerHTML = `<small>${materialesHTML}</small>`;
                } else {
                    container.innerHTML = '<small style="color:#999;">Sin materiales</small>';
                }
            } else {
                container.innerHTML = '<small style="color:#999;">-</small>';
            }
        } catch (error) {
            console.error('Error cargando materiales:', error);
            const container = document.getElementById(`materiales-${servicioId}`);
            if (container) container.innerHTML = '<small style="color:#999;">Error</small>';
        }
    }

    // --- RENDERIZADO DE PRODUCTOS ---
    function renderizarTablaProductos(productos) {
        productosTableBody.innerHTML = '';
        if (productos.length === 0) {
            productosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No se encontraron productos.</td></tr>';
            return;
        }

        const productosStockBajo = productos.filter(p => {
            const stock = p.cantidad !== undefined ? p.cantidad : p.cantidadPiezas;
            return stock < 10;
        });

        if (productosStockBajo.length === 0) {
            productosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay productos con stock bajo.</td></tr>';
            return;
        }

        productosStockBajo.forEach(producto => {
            const stock = producto.cantidad !== undefined ? producto.cantidad : producto.cantidadPiezas;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${producto.nombreProducto}</td>
                <td>${producto.categoria}</td>
                <td>${producto.unidad}</td>
                <td style="color: #d90429; font-weight: bold;">${stock} ⚠️</td>
                <td>
                    <button class="btn-accion" onclick="window.location.href='MateriaPrima.html'">Gestionar</button>
                </td>
            `;
            productosTableBody.appendChild(row);
        });
    }

    async function cargarDatosPagina() {
        if (!auth) return console.error("Error: auth.js no está cargado.");
        const token = auth.getUserData().token;
        if (!token) return window.location.href = '/login.html';

        if (pedidosTableBody) {
            try {
                const [resTarjetas, resFinalizado] = await Promise.all([
                    fetch(`${auth.API_URL}/tarjetas`, { headers: { 'Authorization': 'Bearer ' + token } }),
                    fetch(`${auth.API_URL}/finalizado`, { headers: { 'Authorization': 'Bearer ' + token } })
                ]);

                const tarjetasResult = resTarjetas.ok ? await resTarjetas.json() : { data: [] };
                const finalizadosResult = resFinalizado.ok ? await resFinalizado.json() : { data: [] };

                const tarjetasApi = tarjetasResult.data || [];
                const finalizadosApi = (Array.isArray(finalizadosResult) ? finalizadosResult : (finalizadosResult.data || [])).map(f => ({
                    id: f.id || f.registroTarjetaId,
                    nombreCliente: f.nombreCliente,
                    tecnicoNombre: f.tecnicoNombre,
                    estado: f.estado || 'ENTREGADO',  // Usar el estado real del backend
                }));

                // Filter out FINALIZADO from tarjetasApi to avoid duplicates
                const tarjetasNoFinalizadas = tarjetasApi.filter(t => t.estado !== 'FINALIZADO' && t.estado !== 'ENTREGADO');

                todosLosPedidos = [...tarjetasNoFinalizadas, ...finalizadosApi];

                let activos = 0, enProceso = 0, finalizados = 0;
                todosLosPedidos.forEach(pedido => {
                    const est = pedido.estado;
                    if (est === 'PENDIENTE' || est === 'EN_PROCESO' || est === 'PENDIENTE_ENTREGA') activos++;
                    if (est === 'EN_PROCESO') enProceso++;
                    // Contar tanto FINALIZADO como ENTREGADO como "finalizados"
                    if (est === 'FINALIZADO' || est === 'ENTREGADO') finalizados++;
                });

                if (countActivos) countActivos.textContent = activos;
                if (countProceso) countProceso.textContent = enProceso;
                if (countFinalizados) countFinalizados.textContent = finalizados;

                renderizarTablaPedidos(todosLosPedidos);

            } catch (error) {
                console.error("Error al cargar pedidos:", error);
                pedidosTableBody.innerHTML = `<tr><td colspan="5" style="color: red;">Error de conexión</td></tr>`;
            }
        }

        if (productosTableBody || countStockBajo) {
            try {
                const response = await fetch(`${auth.API_URL}/productos`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const result = await response.json();

                if (response.ok) {
                    const productos = result.data || [];
                    const stockBajoCount = productos.filter(p => {
                        const stock = p.cantidad !== undefined ? p.cantidad : p.cantidadPiezas;
                        return stock < 10;
                    }).length;

                    if (countStockBajo) {
                        countStockBajo.textContent = stockBajoCount;
                        const cardElement = countStockBajo.closest('.card-stock-bajo');
                        if (stockBajoCount > 0) cardElement.classList.add('active');
                        else cardElement.classList.remove('active');
                    }

                    if (productosTableBody) {
                        renderizarTablaProductos(productos);
                    }
                }
            } catch (error) {
                console.error("Error stock:", error);
            }
        }
    }

    cargarDatosPagina();

    // Filtro
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            const estadoSeleccionado = statusFilter.value;
            if (estadoSeleccionado === 'todos') {
                renderizarTablaPedidos(todosLosPedidos);
            } else {
                const pedidosFiltrados = todosLosPedidos.filter(pedido => pedido.estado === estadoSeleccionado);
                renderizarTablaPedidos(pedidosFiltrados);
            }
        });
    }

    // Copiar ID con el Fix HTTP
    if (pedidosTableBody) {
        pedidosTableBody.addEventListener('click', function (e) {
            const btn = e.target.closest('.btn-copiar');
            if (btn) {
                const folio = btn.dataset.folio;
                if (folio) {
                    copiarAlPortapapeles(folio).then(() => {
                        const originalText = btn.textContent;
                        btn.textContent = '¡Copiado!';
                        setTimeout(() => btn.textContent = originalText, 2000);
                    }).catch(err => {
                        console.error('Error copiado:', err);
                        if (auth && auth.showAlert) auth.showAlert("Error al copiar");
                    });
                }
            }
        });
    }
});