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
                tablaMateriaprima.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar materia prima</td></tr>';
            }
        } catch (error) {
            console.error("❌ Error:", error);
            tablaMateriaprima.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error de conexión</td></tr>';
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

    // --- 3. Renderizar Materia Prima (CON ALERTAS VISUALES) ---
    function renderizarMateriaPrima(productos) {
        tablaMateriaprima.innerHTML = '';

        if (productos.length === 0) {
            tablaMateriaprima.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay productos registrados.</td></tr>';
            return;
        }

        productos.forEach(prod => {
            const row = document.createElement('tr');
            
            // Lógica visual de Stock
            let estadoClass = 'status-entregado'; // Verde (Normal)
            let estadoTexto = 'Normal';
            let estiloCantidad = ''; // Estilo extra para el número
            let iconoAlerta = '';

            // Umbrales: < 5 es Crítico, < 10 es Bajo
            if (prod.cantidadPiezas < 5) {
                estadoClass = 'status-cancelado'; // Rojo
                estadoTexto = 'Crítico';
                estiloCantidad = 'color: #d90429; font-weight: bold;'; // Texto rojo fuerte
                iconoAlerta = '⚠️';
                // row.classList.add('stock-bajo-row'); // Descomenta si quieres toda la fila roja
            } else if (prod.cantidadPiezas < 10) {
                estadoClass = 'status-en_proceso'; // Amarillo
                estadoTexto = 'Bajo';
                estiloCantidad = 'color: #e59400; font-weight: bold;'; // Texto naranja
            }

            row.innerHTML = `
                <td><strong>${prod.nombreProducto}</strong></td>
                <td>${prod.categoria}</td>
                <td style="${estiloCantidad}">${prod.cantidadPiezas} ${iconoAlerta}</td>
                <td>${prod.unidad || 'N/A'}</td>
                <td><span class="status-badge ${estadoClass}">${estadoTexto}</span></td>
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

    // --- 7. Inicializar ---
    cargarMateriaPrima();
    cargarTarjetasVenta();
});