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

            // FIX: Usar prod.cantidad en lugar de prod.cantidadPiezas
            if (prod.cantidad < 5) {
                estadoClass = 'status-cancelado'; // Rojo
                estadoTexto = 'Crítico';
                estiloCantidad = 'color: #d90429; font-weight: bold;';
                iconoAlerta = '⚠️';
            } else if (prod.cantidad < 10) {
                estadoClass = 'status-en_proceso'; // Amarillo
                estadoTexto = 'Bajo';
                estiloCantidad = 'color: #e59400; font-weight: bold;';
            }

            row.innerHTML = `
                <td><strong>${prod.nombreProducto}</strong></td>
                <td>${prod.categoria}</td>
                <td style="${estiloCantidad}">${prod.cantidad} ${iconoAlerta}</td>
                <td>${prod.unidad || 'N/A'}</td>
                <td><span class="status-badge ${estadoClass}">${estadoTexto}</span></td>
                <td>
                    <button class="btn-accion btn-usar-material" data-id="${prod.id}" data-nombre="${prod.nombreProducto}" data-stock="${prod.cantidad}" style="background:#27ae60; color:white;">🔧 Usar</button>
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

    // --- 7. LISTENERS DE ACCIÓN (Usar Material) ---
    if (tablaMateriaprima) {
        tablaMateriaprima.addEventListener('click', async function (e) {
            const btn = e.target.closest('.btn-usar-material');
            if (!btn) return;

            const productoId = btn.dataset.id;
            const nombreProducto = btn.dataset.nombre;
            const stockDisponible = btn.dataset.stock;

            // Cargar modal
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) {
                console.error('❌ Modal container no encontrado');
                return;
            }

            const res = await fetch('assets/modals/UsarMaterial.html');
            modalContainer.innerHTML = await res.text();

            // Llenar datos del producto
            document.getElementById('material-producto-id').value = productoId;
            document.getElementById('material-producto-nombre').value = nombreProducto;
            document.getElementById('material-stock-disponible').textContent = stockDisponible;

            // Mostrar modal
            document.querySelector('.modal-usar-material-scope .modal-backdrop').style.display = 'flex';

            // Listeners de cierre
            document.getElementById('btn-cerrar-modal-material').addEventListener('click', () => {
                modalContainer.innerHTML = '';
            });
            document.getElementById('btn-cancelar-modal-material').addEventListener('click', () => {
                modalContainer.innerHTML = '';
            });

            // Submit form
            document.getElementById('form-usar-material').addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = {
                    productoId: document.getElementById('material-producto-id').value,
                    servicioId: document.getElementById('material-servicio-id').value,
                    cantidad: parseInt(document.getElementById('material-cantidad').value)
                };

                try {
                    const token = auth.getUserData().token;
                    const response = await fetch(`${auth.API_URL}/productos/uso`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify(formData)
                    });

                    const result = await response.json();

                    if (response.ok) {
                        if (window.mostrarAlerta) {
                            window.mostrarAlerta('success', '✅ Material registrado correctamente');
                        }
                        modalContainer.innerHTML = '';
                        cargarMateriaPrima(); // Recargar para mostrar stock actualizado
                    } else {
                        if (window.mostrarAlerta) {
                            window.mostrarAlerta('error', result.message || 'Error al registrar material');
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    if (window.mostrarAlerta) {
                        window.mostrarAlerta('error', 'Error de conexión');
                    }
                }
            });
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