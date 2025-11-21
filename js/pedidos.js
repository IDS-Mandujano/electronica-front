document.addEventListener('DOMContentLoaded', function () {
    
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
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

    const auth = window.authUtils;

    const pedidosTableBody = document.getElementById('table-body');
    const productosTableBody = document.getElementById('productos-table-body');
    const statusFilter = document.getElementById('status-filter');

    const countActivos = document.getElementById('count-activos');
    const countProceso = document.getElementById('count-proceso');
    const countFinalizados = document.getElementById('count-finalizados');
    const countStockBajo = document.getElementById('count-stock-bajo');

    let todosLosPedidos = [];
    function renderizarTablaPedidos(pedidos) {
        pedidosTableBody.innerHTML = ''; 
        if (pedidos.length === 0) {
            pedidosTableBody.innerHTML = '<tr><td colspan="5">No se encontraron pedidos.</td></tr>';
            return;
        }
        pedidos.forEach(pedido => {
            const estadoClase = window.statusHelper.getEstadoClassLowercase(pedido.estado);
            const row = document.createElement('tr');
            
            const folio = pedido.id ? pedido.id.substring(0, 8) : 'N/A'; 
            
            row.innerHTML = `
                <td>${folio}...</td>
                <td>${pedido.nombreCliente}</td>
                <td>
                    <div class="status-container">
                        <span class="status ${estadoClase}"></span>
                        <span>${pedido.estado}</span>
                    </div>
                </td>
                <td>${pedido.tecnicoNombre}</td>
                <td>
                    <button class="btn-accion btn-copiar" data-folio="${pedido.id}">Copiar ID</button>
                </td>
            `;
            pedidosTableBody.appendChild(row);
        });
    }

    function renderizarTablaProductos(productos) {
        productosTableBody.innerHTML = '';
        if (productos.length === 0) {
            productosTableBody.innerHTML = '<tr><td colspan="5">No se encontraron productos.</td></tr>';
            return;
        }
        
        const productosStockBajo = productos.filter(p => p.cantidadPiezas < 10);

        if (productosStockBajo.length === 0) {
            productosTableBody.innerHTML = '<tr><td colspan="5">No hay productos con stock bajo.</td></tr>';
            return;
        }

        productosStockBajo.forEach(producto => {
            const row = document.createElement('tr');
            row.classList.add('stock-bajo-row');
            row.innerHTML = `
                <td>${producto.nombreProducto}</td>
                <td>${producto.categoria}</td>
                <td>${producto.unidad}</td>
                <td>${producto.cantidadPiezas} ⚠️</td>
                <td>
                    <button class="btn-accion" data-id="${producto.id}">Ver</button>
                </td>
            `;
            productosTableBody.appendChild(row);
        });
    }

    async function cargarDatosPagina() {
        if (!auth) {
            console.error("Error: auth.js no está cargado.");
            return;
        }
        const token = auth.getUserData().token;
        if (!token) {
            console.error("Error: No se encontró token de autenticación.");
            return;
        }

        if (pedidosTableBody) {
            try {
                const [resTarjetas, resFinalizado] = await Promise.all([
                    fetch(`${auth.API_URL}/tarjetas`, { headers: { 'Authorization': 'Bearer ' + token } }),
                    fetch(`${auth.API_URL}/finalizado`, { headers: { 'Authorization': 'Bearer ' + token } })
                ]);

                if (!resTarjetas.ok) throw new Error('No se pudieron cargar las tarjetas.');
                if (!resFinalizado.ok) throw new Error('No se pudieron cargar los finalizados.');

                const tarjetasResult = await resTarjetas.json();
                const finalizadosResult = await resFinalizado.json(); 

                const tarjetasApi = tarjetasResult.data || [];
                
                const finalizadosApi = finalizadosResult.map(f => ({
                    id: f.registroTarjetaId, 
                    nombreCliente: f.nombreCliente,
                    tecnicoNombre: f.tecnicoNombre,
                    estado: 'FINALIZADO',
                }));
                
                todosLosPedidos = [...tarjetasApi, ...finalizadosApi]; 
                
                let activos = 0, enProceso = 0, finalizados = 0;
                todosLosPedidos.forEach(pedido => {
                    
                    if (pedido.estado === 'EN_PROCESO' || pedido.estado === 'PENDIENTE_ENTREGA') {
                        activos++;
                    }
                    if (pedido.estado === 'EN_PROCESO') {
                        enProceso++;
                    }
                    if (pedido.estado === 'FINALIZADO') {
                        finalizados++;
                    }
                });
                if(countActivos) countActivos.textContent = activos;
                if(countProceso) countProceso.textContent = enProceso;
                if(countFinalizados) countFinalizados.textContent = finalizados;
                
                renderizarTablaPedidos(todosLosPedidos);

            } catch (error) {
                console.error("Error al cargar pedidos:", error);
                pedidosTableBody.innerHTML = `<tr><td colspan="5" style="color: red;">Error al cargar: ${error.message}</td></tr>`;
            }
        }
        
        if (productosTableBody || countStockBajo) {
             try {
                const response = await fetch(`${auth.API_URL}/productos`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message);
                
                const productos = result.data;

                if(countStockBajo) {
                    const stockBajoCount = productos.filter(p => p.cantidadPiezas < 10).length;
                    countStockBajo.textContent = stockBajoCount;
                    const cardElement = countStockBajo.closest('.card-stock-bajo');
                    if (stockBajoCount > 0) cardElement.classList.add('active');
                    else cardElement.classList.remove('active');
                }

                if (productosTableBody) {
                    renderizarTablaProductos(productos); 
                }
            } catch (error) {
                console.error("Error al cargar productos/stock:", error);
                if (productosTableBody) productosTableBody.innerHTML = `<tr><td colspan="5" style="color: red;">Error al cargar: ${error.message}</td></tr>`;
                
                if (countStockBajo) countStockBajo.textContent = 'Error';
            }
        }
    }
    cargarDatosPagina(); 

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            const estadoSeleccionado = statusFilter.value;
            
            if (estadoSeleccionado === 'todos') {
                renderizarTablaPedidos(todosLosPedidos);
            } else {
                const pedidosFiltrados = todosLosPedidos.filter(pedido => {
                    return pedido.estado === estadoSeleccionado;
                });
                renderizarTablaPedidos(pedidosFiltrados);
            }
        });
    }

    if (pedidosTableBody) {
        pedidosTableBody.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-copiar')) {
                const button = e.target;
                const folio = button.dataset.folio; 
                if (!folio) return;
                navigator.clipboard.writeText(folio).then(() => {
                    const originalText = button.textContent;
                    button.textContent = '¡Copiado!';
                    button.disabled = true;
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.disabled = false;
                    }, 2000);
                }).catch(err => {
                    console.error('Error al copiar el folio:', err);
                    if(auth) auth.showAlert('No se pudo copiar el ID.', 'error');
                });
            }
        });
    }

});