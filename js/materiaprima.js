document.addEventListener('DOMContentLoaded', function () {

    // --- LÓGICA DEL SUBMENÚ ---
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
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

    // --- LÓGICA DE LA PÁGINA DE MATERIA PRIMA ---
    const auth = window.authUtils;
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-input');

    if (!auth) {
        console.error("Error: auth.js no está cargado.");
        return;
    }

    let todaLaMateriaPrima = []; // Guarda la lista completa

    /**
     * Pinta la tabla de productos
     */
    function renderizarTabla(productos) {
        tableBody.innerHTML = '';
        if (productos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No se encontró materia prima.</td></tr>';
            return;
        }

        productos.forEach(producto => {
            const row = document.createElement('tr');

            const limiteStockBajo = 10;
            const stock = producto.cantidad !== undefined ? producto.cantidad : producto.cantidadPiezas;
            const stockBajo = stock < limiteStockBajo;

            if (stockBajo) {
                row.classList.add('stock-bajo-row');
            }

            row.innerHTML = `
                <td>${producto.nombreProducto}</td>
                <td>${producto.categoria}</td>
                <td>${stock} ${stockBajo ? '⚠️' : ''}</td>
                <td>${producto.unidad}</td>
                <td>
                    <button class="btn-accion btn-editar" data-id="${producto.id}">Editar</button>
                    <button class="btn-accion btn-eliminar" data-id="${producto.id}">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    /**
     * Carga todos los productos (son todos materia prima)
     */
    async function cargarMateriaPrima() {
        const token = auth.getUserData().token;
        if (!token) {
            console.error("Error: No se encontró token de autenticación.");
            return;
        }

        try {
            const response = await fetch(`${auth.API_URL}/productos`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'No se pudieron cargar los productos.');
            }
            todaLaMateriaPrima = result.data || [];
            renderizarTabla(todaLaMateriaPrima);
        } catch (error) {
            console.error("Error al cargar materia prima:", error);
            tableBody.innerHTML = `<tr><td colspan="5" style="color: red;">Error al cargar: ${error.message}</td></tr>`;
        }
    }

    // --- INICIALIZACIÓN ---
    cargarMateriaPrima();

    // --- LISTENERS ---

    // Listener para la barra de búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const productosFiltrados = todaLaMateriaPrima.filter(producto =>
                producto.nombreProducto.toLowerCase().includes(termino)
            );
            renderizarTabla(productosFiltrados);
        });
    }

    // Listener para los botones de "Editar" y "Eliminar"
    if (tableBody) {
        tableBody.addEventListener('click', function (e) {
            const target = e.target;
            const id = target.dataset.id;
            if (!id) return;

            if (target.classList.contains('btn-editar')) {
                if (window.modalActions && window.modalActions.abrirModalEditarProducto) {
                    window.modalActions.abrirModalEditarProducto(id);
                } else {
                    console.error('Error: modalActions no disponible.');
                }
            }

            if (target.classList.contains('btn-eliminar')) {
                if (window.modalActions && window.modalActions.eliminarProducto) {
                    window.modalActions.eliminarProducto(id);
                } else {
                    console.error('Error: modalActions no disponible.');
                }
            }
        });
    }

    // Listener para refrescar la tabla cuando 'modals.js' avisa
    document.addEventListener('datosActualizados', () => {
        cargarMateriaPrima();
    });
});