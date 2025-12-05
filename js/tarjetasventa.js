document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 tarjetasventa.js cargado");

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

    // Helper function to format dates
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (e) {
            return dateString;
        }
    }

    function renderizarTabla(tarjetas) {
        console.log("🎨 Renderizando tabla con", tarjetas.length, "elementos");
        tableBody.innerHTML = '';
        if (!tarjetas || tarjetas.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No se encontraron tarjetas finalizadas.</td></tr>';
            return;
        }

        tarjetas.forEach(tarjeta => {
            const row = document.createElement('tr');
            const folioShort = tarjeta.id ? tarjeta.id.substring(0, 8) : 'N/A';
            const fechaEntrega = formatDate(tarjeta.fechaFinalizacion || tarjeta.fechaEntregaCliente);
            const costo = tarjeta.costoReparacion || 0;

            row.innerHTML = `
                <td>${folioShort}...</td>
                <td>${tarjeta.nombreCliente || 'N/A'}</td>
                <td>${tarjeta.marca || 'N/A'} / ${tarjeta.modelo || 'N/A'}</td>
                <td>${tarjeta.tecnicoNombre || 'N/A'}</td>
                <td>${fechaEntrega}</td>
                <td>$${parseFloat(costo).toFixed(2)}</td>
                <td>
                    <button class="btn-accion btn-editar" data-id="${tarjeta.id}" style="background:#ffc107; color:#333;">✏️</button>
                    <button class="btn-accion btn-eliminar" data-id="${tarjeta.id}" style="background:#dc3545; color:white;">🗑️</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async function cargarTarjetasEnVenta() {
        console.log("🚀 Iniciando carga de tarjetas en venta...");

        if (!auth) {
            console.error("❌ Error: authUtils no está definido");
            return;
        }
        if (!tableBody) {
            console.error("❌ Error: tableBody no encontrado");
            return;
        }

        const userData = auth.getUserData();
        if (!userData || !userData.token) {
            console.warn("⚠️ No hay token, redirigiendo...");
            return;
        }
        const token = userData.token;

        try {
            console.log("📡 Solicitando datos a /api/finalizado...");
            const response = await fetch(`${auth.API_URL}/finalizado`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            console.log("📡 Estado respuesta:", response.status);

            if (!response.ok) throw new Error(`Error de conexión: ${response.status}`);

            const json = await response.json();
            console.log("📦 Datos recibidos:", json);

            todasLasTarjetas = Array.isArray(json) ? json : (json.data || []);
            console.log(`✅ Total tarjetas encontradas: ${todasLasTarjetas.length}`);

            renderizarTabla(todasLasTarjetas);
        } catch (error) {
            console.error("❌ Error en cargarTarjetasEnVenta:", error);
            tableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align:center;">Error: ${error.message}</td></tr>`;
        }
    }

    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-accion');
            if (!btn) return;

            console.log("Clic en botón:", btn);

            if (!window.modalActions) {
                console.error("❌ ERROR: window.modalActions no está definido.");
                return;
            }

            const id = btn.dataset.id;
            console.log("ID seleccionado:", id);

            if (btn.classList.contains('btn-editar')) {
                if (window.modalActions.abrirModalEditarFinalizado) {
                    window.modalActions.abrirModalEditarFinalizado(id);
                } else {
                    console.error("❌ ERROR: abrirModalEditarFinalizado no existe.");
                }
            }
            else if (btn.classList.contains('btn-eliminar')) {
                if (window.modalActions.eliminarFinalizado) {
                    window.modalActions.eliminarFinalizado(id);
                } else {
                    console.error("❌ ERROR: eliminarFinalizado no existe.");
                }
            }
        });
    }

    // Buscar
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = searchInput.value.toLowerCase();
            const filtrados = todasLasTarjetas.filter(t =>
                (t.nombreCliente && t.nombreCliente.toLowerCase().includes(query)) ||
                (t.marca && t.marca.toLowerCase().includes(query)) ||
                (t.modelo && t.modelo.toLowerCase().includes(query))
            );
            renderizarTabla(filtrados);
        });
    }

    // Cargar inicial
    cargarTarjetasEnVenta();

    // Recargar al actualizar
    document.addEventListener('datosActualizados', cargarTarjetasEnVenta);
});