document.addEventListener('DOMContentLoaded', function () {
    console.log("🔧 InventarioTecnico.js cargado");

    const auth = window.authUtils;
    const tablaMateriaprima = document.getElementById('tabla-materia-prima');
    const tablaTarjetasVenta = document.getElementById('tabla-tarjetas-venta');
    const searchMateriaPrima = document.getElementById('search-materia-prima');
    const searchTarjetas = document.getElementById('search-tarjetas');

    let todasLasMateriaPrima = [];
    let todasLasTarjetasVenta = [];

    // --- 1. Cargar Materia Prima (TODO EL INVENTARIO) ---
    async function cargarMateriaPrima() {
        if (!auth) return console.error("❌ Error: auth.js no cargado");

        const userData = auth.getUserData();
        const token = userData.token;

        if (!token) {
            console.warn("⚠️ No hay token, redirigiendo...");
            window.location.href = '/login.html';
            return;
        }

        try {
            console.log("📡 Cargando materia prima...");
            const res = await fetch(`${auth.API_URL}/productos`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (res.ok) {
                const json = await res.json();
                todasLasMateriaPrima = json.data || [];

                // Mostramos TODOS los productos
                console.log(`✅ Productos cargados: ${todasLasMateriaPrima.length}`);
                renderizarMateriaPrima(todasLasMateriaPrima);

            } else {
                console.error("❌ Error al obtener materia prima:", res.status);
                tablaMateriaprima.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar materia prima</td></tr>';
            }
        } catch (error) {
            console.error("❌ Error:", error);
            tablaMateriaprima.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión</td></tr>';
        }
    }

    // --- 2. Cargar Tarjetas en Venta (Finalizadas) ---
    async function cargarTarjetasVenta() {
        if (!auth) return console.error("❌ Error: auth.js no cargado");
        const token = auth.getUserData().token;
        if (!token) return;

        try {
            const resFinalizado = await fetch(`${auth.API_URL}/finalizado`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (resFinalizado.ok) {
                const json = await resFinalizado.json();
                const data = Array.isArray(json) ? json : (json.data || []);

                todasLasTarjetasVenta = data.map(item => ({
                    registroTarjetaId: item.registroTarjetaId || item.id,
                    nombreCliente: item.nombreCliente,
                    marca: item.marca,
                    modelo: item.modelo,
                    tecnicoNombre: item.tecnicoNombre,
                    fechaEntrega: item.fechaEntrega,
                    costoReparacion: item.costoReparacion
                }));

                renderizarTarjetasVenta(todasLasTarjetasVenta);

            } else {
                tablaTarjetasVenta.innerHTML = '<tr><td colspan="6" style="text-align:center;">No se encontraron tarjetas finalizadas.</td></tr>';
            }

        } catch (error) {
            console.error("❌ Error al cargar tarjetas:", error);
            tablaTarjetasVenta.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión</td></tr>';
        }
    }

    // --- 3. Renderizar Materia Prima (CON BOTONES) ---
    function renderizarMateriaPrima(productos) {
        tablaMateriaprima.innerHTML = '';

        if (productos.length === 0) {
            tablaMateriaprima.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay productos registrados.</td></tr>';
            return;
        }

        productos.forEach(prod => {
            const row = document.createElement('tr');

            // Lógica visual de Stock
            let estadoClass = 'status-entregado'; // Verde (Normal)
            let estadoTexto = 'Normal';
            let estiloCantidad = '';
            let iconoAlerta = '';

            if (prod.cantidadPiezas < 5) {
                estadoClass = 'status-cancelado'; // Rojo
                estadoTexto = 'Crítico';
                estiloCantidad = 'color: #d90429; font-weight: bold;';
                iconoAlerta = '⚠️';
            } else if (prod.cantidadPiezas < 10) {
                estadoClass = 'status-en_proceso'; // Amarillo
                estadoTexto = 'Bajo';
                estiloCantidad = 'color: #e59400; font-weight: bold;';
            }

            row.innerHTML = `
                <td><strong>${prod.nombreProducto}</strong></td>
                <td>${prod.categoria}</td>
                <td style="${estiloCantidad}">${prod.cantidadPiezas} ${iconoAlerta}</td>
                <td>${prod.unidad || 'N/A'}</td>
                <td><span class="status-badge ${estadoClass}">${estadoTexto}</span></td>
                <td>
                    <button class="btn-accion btn-editar" data-id="${prod.id}" style="background:#ffc107; color:#333;">✏️</button>
                    <button class="btn-accion btn-eliminar" data-id="${prod.id}" style="background:#dc3545; color:white;">🗑️</button>
                </td>
            `;
            tablaMateriaprima.appendChild(row);
        });
    }

    // --- 4. Renderizar Tarjetas en Venta ---
    function renderizarTarjetasVenta(tarjetas) {
        tablaTarjetasVenta.innerHTML = '';

        if (tarjetas.length === 0) {
            tablaTarjetasVenta.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay tarjetas finalizadas en venta.</td></tr>';
            return;
        }

        tarjetas.forEach(tarjeta => {
            const row = document.createElement('tr');
            const costo = parseFloat(tarjeta.costoReparacion || 0).toFixed(2);

            row.innerHTML = `
                <td><small>${tarjeta.registroTarjetaId ? tarjeta.registroTarjetaId.substring(0, 8) : 'N/A'}...</small></td>
                <td>${tarjeta.nombreCliente}</td>
                <td>${tarjeta.marca} / ${tarjeta.modelo}</td>
                <td>${tarjeta.tecnicoNombre || 'Sin Asignar'}</td>
                <td>${tarjeta.fechaEntrega || 'N/A'}</td>
                <td><strong>$${costo}</strong></td>
            `;
            tablaTarjetasVenta.appendChild(row);
        });
    }

    // --- 5. Búsqueda en Materia Prima ---
    if (searchMateriaPrima) {
        searchMateriaPrima.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const filtrados = todasLasMateriaPrima.filter(p =>
                p.nombreProducto.toLowerCase().includes(termino) ||
                p.categoria.toLowerCase().includes(termino)
            );
            renderizarMateriaPrima(filtrados);
        });
    }

    // --- 6. Búsqueda en Tarjetas Venta ---
    if (searchTarjetas) {
        searchTarjetas.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const filtrados = todasLasTarjetasVenta.filter(t =>
                t.nombreCliente.toLowerCase().includes(termino) ||
                t.marca.toLowerCase().includes(termino) ||
                t.modelo.toLowerCase().includes(termino)
            );
            renderizarTarjetasVenta(filtrados);
        });
    }

    // --- 7. LISTENERS DE ACCIÓN (Editar/Eliminar Materia Prima) ---
    if (tablaMateriaprima) {
        tablaMateriaprima.addEventListener('click', function (e) {
            const btn = e.target.closest('.btn-accion');
            if (!btn) return;

            const id = btn.dataset.id;
            if (!id) return;

            // Verificar si modals.js cargó y tiene las funciones
            if (!window.modalActions) {
                console.error("❌ Error: modals.js no cargado correctamente.");
                return;
            }

            if (btn.classList.contains('btn-editar')) {
                window.modalActions.abrirModalEditarProducto(id);
            } else if (btn.classList.contains('btn-eliminar')) {
                window.modalActions.eliminarProducto(id);
            }
        });
    }

    // --- 8. Inicializar ---
    cargarMateriaPrima();
    cargarTarjetasVenta();

    // Recargar cuando se actualicen datos (desde modals.js)
    document.addEventListener('datosActualizados', () => {
        console.log("🔄 Datos actualizados, recargando inventario...");
        cargarMateriaPrima();
        cargarTarjetasVenta();
    });
});