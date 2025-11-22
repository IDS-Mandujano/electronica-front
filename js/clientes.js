document.addEventListener('DOMContentLoaded', function () {

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

    const auth = window.authUtils;
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-cliente');

    let todosLosClientes = [];
    function renderizarTablaClientes(clientes) {
        tableBody.innerHTML = '';

        if (clientes.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No se encontraron clientes.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cliente.nombre}</td>
                <td>${cliente.celular}</td>
                <td>${cliente.totalPedidos}</td>
                <td>
                    <button class="btn-accion" data-celular="${cliente.celular}">Ver Pedidos</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async function cargarClientes() {
        if (!auth || !tableBody) {
            console.error("Error: auth.js o #table-body no encontrados.");
            return;
        }
        const token = auth.getUserData().token;
        if (!token) {
            console.error("Error: No se encontró token de autenticación.");
            return;
        }

        try {
            const response = await fetch(`${auth.API_URL}/tarjetas`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'No se pudieron cargar los datos.');
            }

            const tarjetas = result.data || [];
            const clientesMap = new Map();
            tarjetas.forEach(tarjeta => {
                const celular = tarjeta.numeroCelular;
                if (clientesMap.has(celular)) {
                    const clienteExistente = clientesMap.get(celular);
                    clienteExistente.totalPedidos += 1;
                    clientesMap.set(celular, clienteExistente);
                } else {
                    clientesMap.set(celular, {
                        nombre: tarjeta.nombreCliente,
                        celular: tarjeta.numeroCelular,
                        totalPedidos: 1
                    });
                }
            });

            todosLosClientes = Array.from(clientesMap.values());

            renderizarTablaClientes(todosLosClientes);

        } catch (error) {
            console.error("Error al cargar clientes:", error);
            tableBody.innerHTML = `<tr><td colspan="4" style="color: red;">Error al cargar: ${error.message}</td></tr>`;
        }
    }

    cargarClientes();
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const clientesFiltrados = todosLosClientes.filter(cliente =>
                cliente.nombre.toLowerCase().includes(termino) ||
                cliente.celular.includes(termino)
            );

            renderizarTablaClientes(clientesFiltrados);
        });
    }

    if (tableBody) {
        tableBody.addEventListener('click', function (e) {
            if (e.target.classList.contains('btn-accion')) {
                const celularCliente = e.target.dataset.celular;
                window.location.href = `ClientePedido.html?celular=${celularCliente}`;
            }
        });
    }

});