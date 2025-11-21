document.addEventListener('DOMContentLoaded', function () {
    console.log("🔧 InventarioTecnico.js cargado");

    const auth = window.authUtils;
    const tablaMateriaprima = document.getElementById('tabla-materia-prima');
    const tablaTarjetasVenta = document.getElementById('tabla-tarjetas-venta');
    const searchMateriaPrima = document.getElementById('search-materia-prima');
    const searchTarjetas = document.getElementById('search-tarjetas');

    let todasLasMateriaPrima = [];
    let todasLasTarjetasVenta = [];

    // --- 1. Cargar Materia Prima ---
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
                
                // Filtrar solo productos con stock bajo (< 10)
                const stockBajo = todasLasMateriaPrima.filter(p => p.cantidadPiezas < 10);
                
                console.log(`✅ Productos totales: ${todasLasMateriaPrima.length}. Stock bajo: ${stockBajo.length}`);
                renderizarMateriaPrima(stockBajo);
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

        const userData = auth.getUserData();
        const token = userData.token;

        if (!token) {
            console.warn("⚠️ No hay token, redirigiendo...");
            window.location.href = '/login.html';
            return;
        }

        try {
            console.log("📡 Cargando tarjetas finalizadas (desde /finalizado y /tarjetas)...");

            const [resFinalizado, resTarjetas] = await Promise.all([
                fetch(`${auth.API_URL}/finalizado`, { headers: { 'Authorization': 'Bearer ' + token } }),
                fetch(`${auth.API_URL}/tarjetas`, { headers: { 'Authorization': 'Bearer ' + token } })
            ]);

            let finalizadosApi = [];
            if (resFinalizado.ok) {
                const json = await resFinalizado.json();
                // La API puede devolver { data: [...] } o directamente un array
                finalizadosApi = Array.isArray(json) ? json : (json.data || []);
            } else {
                console.warn('⚠️ No se pudo cargar /finalizado, continuará con /tarjetas solamente');
            }

            let tarjetasApi = [];
            if (resTarjetas.ok) {
                const jsonT = await resTarjetas.json();
                tarjetasApi = jsonT.data || [];
            } else {
                console.warn('⚠️ No se pudo cargar /tarjetas');
            }

            // Convertir tarjetasApi con estado FINALIZADO a la forma de finalizado (registroTarjetaId)
            const finalizadosDesdeTarjetas = tarjetasApi
                .filter(t => t.estado && t.estado.toUpperCase() === 'FINALIZADO')
                .map(t => ({
                    registroTarjetaId: t.id,
                    nombreCliente: t.nombreCliente || t.clienteNombre || '',
                    tecnicoNombre: t.tecnicoNombre || t.tecnico || '',
                    fechaEntrega: t.fechaEntrega || null,
                    marca: t.marca || t.marcaProducto || '',
                    modelo: t.modelo || t.modeloProducto || '',
                    costoReparacion: t.costoReparacion || t.costo || 0
                }));

            // Unir ambas fuentes y deduplicar por registroTarjetaId
            const combined = [...finalizadosApi, ...finalizadosDesdeTarjetas];
            const seen = new Set();
            todasLasTarjetasVenta = combined.filter(item => {
                const key = (item.registroTarjetaId || item.id || '').toString();
                if (!key) return false;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).map(item => {
                // Normalizar campos para el render
                return {
                    registroTarjetaId: item.registroTarjetaId || item.id,
                    nombreCliente: item.nombreCliente || item.nombre || '',
                    marca: item.marca || item.marcaProducto || '',
                    modelo: item.modelo || item.modeloProducto || '',
                    tecnicoNombre: item.tecnicoNombre || item.tecnico || '',
                    fechaEntrega: item.fechaEntrega || item.fecha || null,
                    costoReparacion: item.costoReparacion || item.costo || 0
                };
            });

            console.log(`✅ Tarjetas finalizadas (combinadas): ${todasLasTarjetasVenta.length}`);
            renderizarTarjetasVenta(todasLasTarjetasVenta);

        } catch (error) {
            console.error("❌ Error al cargar tarjetas:", error);
            tablaTarjetasVenta.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión</td></tr>';
        }
    }

    // --- 3. Renderizar Materia Prima ---
    function renderizarMateriaPrima(productos) {
        tablaMateriaprima.innerHTML = '';

        if (productos.length === 0) {
            tablaMateriaprima.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay productos con stock bajo.</td></tr>';
            return;
        }

        productos.forEach(prod => {
            const row = document.createElement('tr');
            
            // Determinar estado del stock
            let estadoClass = 'status-default';
            let estadoTexto = '✓ Normal';
            
            if (prod.cantidadPiezas < 3) {
                estadoClass = 'status-cancelado';
                estadoTexto = '🔴 CRÍTICO';
            } else if (prod.cantidadPiezas < 7) {
                estadoClass = 'status-proceso';
                estadoTexto = '🟡 Bajo';
            }

            row.innerHTML = `
                <td><strong>${prod.nombreProducto}</strong></td>
                <td>${prod.categoria}</td>
                <td style="font-weight: bold; color: #d90429;">${prod.cantidadPiezas}</td>
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
            
            row.innerHTML = `
                <td><small>${tarjeta.registroTarjetaId.substring(0, 8)}...</small></td>
                <td>${tarjeta.nombreCliente}</td>
                <td>${tarjeta.marca} / ${tarjeta.modelo}</td>
                <td>${tarjeta.tecnicoNombre || 'Sin Asignar'}</td>
                <td>${tarjeta.fechaEntrega || 'N/A'}</td>
                <td><strong>$${tarjeta.costoReparacion || '0'}</strong></td>
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
            renderizarMateriaPrima(filtrados.filter(p => p.cantidadPiezas < 10));
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

    // Recargar cuando se actualicen datos
    document.addEventListener('datosActualizados', () => {
        console.log("🔄 Datos actualizados, recargando inventario...");
        cargarMateriaPrima();
        cargarTarjetasVenta();
    });
});
