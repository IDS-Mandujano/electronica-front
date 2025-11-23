document.addEventListener('DOMContentLoaded', function () {

    // --- 1. LÓGICA DEL SUBMENÚ ---
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

    // --- 2. VARIABLES Y AUTH ---
    const auth = window.authUtils;
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-cliente');

    let todosLosClientes = [];

    if (!auth) {
        console.error("Error: auth.js no está cargado.");
        return;
    }

    // --- 3. RENDERIZAR TABLA ---
    function renderizarTablaClientes(clientes) {
        tableBody.innerHTML = '';

        if (clientes.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No se encontraron clientes.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cliente.nombre}</td>
                <td>${cliente.numeroCelular}</td>
                <td>${cliente.totalPedidos}</td>
                <td>
                    <button class="btn-accion btn-ver" data-celular="${cliente.numeroCelular}" style="background:#17a2b8; color:white;">Ver Pedidos</button>
                    <button class="btn-accion btn-editar" data-celular="${cliente.numeroCelular}" style="background:#ffc107; color:#333;">✏️</button>
                    <button class="btn-accion btn-eliminar" data-celular="${cliente.numeroCelular}" style="background:#dc3545; color:white;">🗑️</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- 4. CARGAR DATOS (Agrupar tarjetas por cliente) ---
    async function cargarClientes() {
        const token = auth.getUserData()?.token;
        if (!token) {
            console.error("Token no encontrado");
            return;
        }

        try {
            // Usamos /api/tarjetas porque no hay endpoint de clientes
            const response = await fetch(`${auth.API_URL}/tarjetas`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Error al obtener tarjetas");
            }

            const tarjetas = result.data || [];
            const clientesMap = new Map();

            // Agrupamos por número de celular para simular "Clientes"
            tarjetas.forEach(tarjeta => {
                const num = tarjeta.numeroCelular;
                if (clientesMap.has(num)) {
                    const cli = clientesMap.get(num);
                    cli.totalPedidos += 1;
                } else {
                    clientesMap.set(num, {
                        nombre: tarjeta.nombreCliente,
                        numeroCelular: tarjeta.numeroCelular,
                        totalPedidos: 1
                    });
                }
            });

            todosLosClientes = Array.from(clientesMap.values());
            renderizarTablaClientes(todosLosClientes);

        } catch (error) {
            console.error("Error al cargar clientes:", error);
            tableBody.innerHTML = `<tr><td colspan="4" style="color: red; text-align:center;">${error.message}</td></tr>`;
        }
    }

    // --- 5. LISTENERS DE ACCIÓN (Botones) ---
    if (tableBody) {
        tableBody.addEventListener('click', function (e) {
            const btn = e.target.closest('.btn-accion');
            if (!btn) return;

            const celularCliente = btn.dataset.celular;
            if (!celularCliente) return;

            // A) Ver Pedidos
            if (btn.classList.contains('btn-ver')) {
                // Redirige a la vista de pedidos filtrada (si la tienes implementada)
                // O simplemente muestra un mensaje por ahora
               window.location.href = `ClientePedido.html?celular=${celularCliente}`;; 
            }
            
            // B) Editar Cliente
            else if (btn.classList.contains('btn-editar')) {
                if (window.modalActions && window.modalActions.abrirModalEditarCliente) {
                    window.modalActions.abrirModalEditarCliente(celularCliente);
                } else {
                    console.error("❌ Error: modalActions.abrirModalEditarCliente no está definido en modals.js");
                }
            }
            
            // C) Eliminar Cliente (Usando tu ALERTA bonita)
            else if (btn.classList.contains('btn-eliminar')) {
                if (window.modalActions && window.modalActions.eliminarCliente) {
                    // Esto llamará a la función en modals.js que usa mostrarConfirmacion()
                    window.modalActions.eliminarCliente(celularCliente);
                } else {
                    console.error("❌ Error: modalActions.eliminarCliente no está definido en modals.js");
                }
            }
        });
    }

    // --- 6. BUSCADOR ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const filtrados = todosLosClientes.filter(cliente =>
                cliente.nombre.toLowerCase().includes(termino) ||
                cliente.numeroCelular.includes(termino)
            );
            renderizarTablaClientes(filtrados);
        });
    }

    // --- 7. RECARGAR DATOS AUTOMÁTICAMENTE ---
    // Escucha el evento que dispara modals.js cuando algo cambia
    document.addEventListener('datosActualizados', cargarClientes);

    // Inicializar
    cargarClientes();
});