document.addEventListener('DOMContentLoaded', function () {

    // --- LÓGICA DEL SUBMENÚ ---
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            trigger.classList.toggle('active');
            const submenu = trigger.nextElementSibling;
            submenu.style.maxHeight = submenu.style.maxHeight ? null : submenu.scrollHeight + "px";

            document.querySelectorAll('.btn-submenu.active').forEach(other => {
                if (other !== trigger) {
                    other.classList.remove('active');
                    other.nextElementSibling.style.maxHeight = null;
                }
            });
        });
    });

    // Activar submenú actual
    const link = document.querySelector('a[href="TarjetasVenta.html"]');
    if (link) {
        const btn = link.closest('.submenu-container').querySelector('.btn-submenu');
        if (btn) btn.click();
    }

    // --- LÓGICA DE TABLA ---
    const auth = window.authUtils;
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-input');
    let todasLasTarjetas = [];

    function renderizarTabla(tarjetas) {
        tableBody.innerHTML = '';
        if (!tarjetas || tarjetas.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No se encontraron tarjetas finalizadas.</td></tr>';
            return;
        }

        tarjetas.forEach(tarjeta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tarjeta.registroTarjetaId.substring(0, 8)}...</td>
                <td>${tarjeta.nombreCliente}</td>
                <td>${tarjeta.marca} / ${tarjeta.modelo}</td>
                <td>${tarjeta.tecnicoNombre}</td>
                <td>${tarjeta.fechaEntrega}</td>
                <td>$${parseFloat(tarjeta.costoReparacion).toFixed(2)}</td>
                <td>
                    <button class="btn-accion btn-editar" data-id="${tarjeta.id}" style="background:#ffc107; color:#333;">✏️</button>
                    <button class="btn-accion btn-eliminar" data-id="${tarjeta.id}" style="background:#dc3545; color:white;">🗑️</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async function cargarTarjetasEnVenta() {
        if (!auth || !tableBody) return;
        const token = auth.getUserData().token;
        if (!token) return;

        try {
            const response = await fetch(`${auth.API_URL}/finalizado`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!response.ok) throw new Error('Error de conexión');

            const json = await response.json();
            todasLasTarjetas = Array.isArray(json) ? json : (json.data || []);
            renderizarTabla(todasLasTarjetas);
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align:center;">Error: ${error.message}</td></tr>`;
        }
    }

    cargarTarjetasEnVenta();

    // Buscador
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtradas = todasLasTarjetas.filter(t =>
                t.nombreCliente.toLowerCase().includes(term) ||
                t.modelo.toLowerCase().includes(term)
            );
            renderizarTabla(filtradas);
        });
    }

    // === LISTENERS DE ACCIÓN (Conexión a Modals.js) ===
    // === LISTENERS DE ACCIÓN (CON DEBUGGING) ===
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-accion');
            if (!btn) return;

            console.log("Clic en botón:", btn); // ¿Llega el clic?

            // Verificar si modalActions existe
            if (!window.modalActions) {
                console.error("❌ ERROR CRÍTICO: window.modalActions no está definido. ¿modals.js cargó?");
                return;
            }

            const id = btn.dataset.id;
            console.log("ID del registro:", id); // ¿Tenemos ID?

            if (btn.classList.contains('btn-editar')) {
                console.log("Intentando abrir modal de edición...");
                if (window.modalActions.abrirModalEditarFinalizado) {
                    window.modalActions.abrirModalEditarFinalizado(id);
                } else {
                    console.error("❌ ERROR: La función abrirModalEditarFinalizado no existe.");
                }
            }
            else if (btn.classList.contains('btn-eliminar')) {
                console.log("Intentando eliminar...");
                if (window.modalActions.eliminarFinalizado) {
                    window.modalActions.eliminarFinalizado(id);
                    console.log("Llamada a eliminarFinalizado realizada.");
                } else {
                    console.error("❌ ERROR CRÍTICO: La función eliminarFinalizado NO existe en window.modalActions.");
                    console.log("Contenido de modalActions:", window.modalActions);
                }
            }
        });
    }

    // Recargar al actualizar
    document.addEventListener('datosActualizados', cargarTarjetasEnVenta);
});