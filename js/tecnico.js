document.addEventListener('DOMContentLoaded', function () {
    console.log("🔧 Tecnico.js cargado");

    const auth = window.authUtils;
    const tableBody = document.getElementById('tabla-mis-reparaciones');

    // Contadores
    const countPendientes = document.getElementById('count-pendientes');
    const countProceso = document.getElementById('count-proceso');
    const countFinalizadas = document.getElementById('count-finalizados');
    const countStockBajo = document.getElementById('count-stock-bajo');

    // --- 1. Función para procesar y pintar la tabla ---
    function procesarTarjetas(tarjetas) {
        tableBody.innerHTML = '';
        
        let pendientes = 0;
        let proceso = 0;
        let finalizadas = 0;

        if (tarjetas.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">No tienes reparaciones asignadas.</td></tr>';
            // No retornamos aquí para asegurar que los contadores se pongan en 0
        }

        tarjetas.forEach(t => {
            // Contadores (Ajusta los estados según tu BD exacta)
            if (t.estado === 'EN_PROCESO') proceso++;
            else if (t.estado === 'PENDIENTE' || t.estado === 'DIAGNOSTICO') pendientes++;
            else if (t.estado === 'FINALIZADO' || t.estado === 'ENTREGADO') finalizadas++;
            
            // Obtener estilo del estado usando helper
            const estadoStyle = window.statusHelper.getEstadoStyle(t.estado);
            const colorEstado = estadoStyle.color;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.id.substring(0, 8)}...</td>
                <td>${t.marca} / ${t.modelo}</td>
                <td>${t.problemaDescrito}</td>
                <td><span style="color: ${colorEstado}; font-weight: bold;">${t.estado}</span></td>
                <td>${t.fechaRegistro}</td>
                <td>
                    <button class="btn-accion btn-cambiar-estado" data-id="${t.id}" data-estado="${t.estado}">
                        Editar Estado
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Actualizar HTML de contadores
        if(countPendientes) countPendientes.textContent = pendientes;
        if(countProceso) countProceso.textContent = proceso;
        if(countFinalizadas) countFinalizadas.textContent = finalizadas;
    }

    // --- 2. Cargar Datos del Servidor ---
    async function cargarDashboardTecnico() {
        if (!auth) return console.error("❌ Error: auth.js no cargado");
        
        const userData = auth.getUserData();
        const token = userData.token;
        const myUserId = userData.userId; 

        console.log("👤 Usuario ID:", myUserId);

        if (!token) {
            console.warn("⚠️ No hay token, redirigiendo...");
            window.location.href = '/login.html';
            return;
        }

        try {
            // A. OBTENER TARJETAS
            console.log("📡 Cargando tarjetas...");
            const resTarjetas = await fetch(`${auth.API_URL}/tarjetas`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (resTarjetas.ok) {
                const jsonTarjetas = await resTarjetas.json();
                const todas = jsonTarjetas.data || [];
                
                // FILTRADO: Solo las tarjetas de este técnico
                const misTarjetas = todas.filter(t => t.tecnicoId === myUserId);
                console.log(`✅ Tarjetas encontradas: ${todas.length}. Asignadas a mí: ${misTarjetas.length}`);
                
                procesarTarjetas(misTarjetas);
            } else {
                console.error("❌ Error al obtener tarjetas:", resTarjetas.status);
            }

            // B. OBTENER PRODUCTOS (Para Stock Bajo - Informativo)
            const resProductos = await fetch(`${auth.API_URL}/productos`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (resProductos.ok) {
                const jsonProductos = await resProductos.json();
                const productos = jsonProductos.data || [];
                const bajos = productos.filter(p => p.cantidadPiezas < 5).length;
                
                if (countStockBajo) countStockBajo.textContent = bajos;
                
                const cardStock = countStockBajo ? countStockBajo.closest('.card') : null;
                if (cardStock) {
                    if (bajos > 0) cardStock.classList.add('active'); // Clase para ponerlo rojo si tienes el CSS
                    else cardStock.classList.remove('active');
                }
            }

        } catch (error) {
            console.error("❌ Error cargando dashboard:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="color: red; text-align:center;">Error de conexión: ${error.message}</td></tr>`;
        }
    }

    // --- 3. Listeners ---
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-cambiar-estado');
            if (!btn) return;

            const id = btn.dataset.id;
            
            // Llamada a la función global de modals.js
            if (window.modalActions && window.modalActions.abrirModalEditarEstado) {
                modalActions.abrirModalEditarEstado(id);
            } else {
                console.error("❌ Error: modals.js no está cargado o no tiene la función abrirModalEditarEstado");
                alert("Error interno: No se pudo abrir la modal.");
            }
        });
    }

    // Recargar automáticamente cuando se actualicen datos
    document.addEventListener('datosActualizados', () => {
        console.log("🔄 Datos actualizados, recargando tabla...");
        cargarDashboardTecnico();
    });

    // Inicializar
    cargarDashboardTecnico();
});