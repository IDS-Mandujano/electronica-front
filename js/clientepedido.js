document.addEventListener("DOMContentLoaded", async () => {

    // ==================================================
    // 1. LÓGICA DEL SIDEBAR (SUBMENÚ)
    // ==================================================
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

    // ==================================================
    // 2. LÓGICA DE PEDIDOS
    // ==================================================
    const params = new URLSearchParams(window.location.search);
    const celularCliente = params.get("celular");
    const tabla = document.getElementById("tabla-pedidos");

    if (!celularCliente) {
        tabla.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Error: No se proporcionó número de celular.</td></tr>";
        return;
    }

    // Verificar Auth
    if (typeof window.authUtils === 'undefined') {
        console.error("Auth.js no cargado");
        tabla.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Error interno: Auth no cargado.</td></tr>";
        return;
    }

    const auth = window.authUtils;
    const token = auth.getUserData().token;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Mostrar usuario logueado
    const userData = auth.getUserData();
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) userNameDisplay.textContent = userData.nombreCompleto || 'Usuario';

    // Logout logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }

    // --- HELPER: Obtener Badge de Estado ---
    function obtenerBadgeEstado(estado) {
        let clase = 'status-default';
        const est = (estado || '').toUpperCase();

        if (est === 'EN_PROCESO') clase = 'status-en_proceso';
        else if (est === 'FINALIZADO') clase = 'status-finalizado';
        else if (est === 'ENTREGADO') clase = 'status-entregado';
        else if (est === 'PENDIENTE' || est === 'DIAGNOSTICO') clase = 'status-pendiente';
        else if (est === 'CANCELADO') clase = 'status-cancelado';
        else if (est === 'ESPERA_REFACCION') clase = 'status-espera';

        return `<span class="status-badge ${clase}">${estado}</span>`;
    }

    async function fetchJSON(url) {
        const res = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return await res.json();
    }

    try {
        // 1. Traer datos del Cliente
        let clienteNombre = "Cliente no encontrado";
        try {
            const resCliente = await fetchJSON(`${auth.API_URL}/clientes/${celularCliente}`);
            const dataCliente = resCliente.data || resCliente;
            if (dataCliente && dataCliente.nombre) {
                clienteNombre = `${dataCliente.nombre} ${dataCliente.apellidos || ''}`.trim();
            }
        } catch (e) {
            console.warn("No se pudo obtener info del cliente:", e);
        }

        const elNombre = document.getElementById("cliente-nombre");
        const elCelular = document.getElementById("cliente-celular");
        if (elNombre) elNombre.textContent = clienteNombre;
        if (elCelular) elCelular.textContent = celularCliente;

        // 2. Traer TODOS los servicios (pedidos)
        // El backend ahora centraliza todo en /api/servicios
        const resServicios = await fetchJSON(`${auth.API_URL}/servicios`);
        const todosLosServicios = resServicios.data || [];

        // 3. Filtrar por celular del cliente
        const pedidosCliente = todosLosServicios.filter(s => s.numeroCelular === celularCliente);

        // 4. Renderizar Tabla
        tabla.innerHTML = "";

        if (pedidosCliente.length === 0) {
            tabla.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Este cliente no tiene pedidos registrados.</td></tr>";
            return;
        }

        // Ordenar por fecha (más reciente primero)
        pedidosCliente.sort((a, b) => {
            const dateA = new Date(a.fechaIngreso || 0);
            const dateB = new Date(b.fechaIngreso || 0);
            return dateB - dateA;
        });

        pedidosCliente.forEach(p => {
            const tr = document.createElement("tr");

            // Formatear fecha
            let fechaStr = p.fechaIngreso;
            if (fechaStr) {
                try {
                    const dateObj = new Date(fechaStr);
                    fechaStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (e) { }
            } else {
                fechaStr = '---';
            }

            // Costo
            const costo = p.costoReparacion ? `$${parseFloat(p.costoReparacion).toFixed(2)}` : 'Pendiente';

            tr.innerHTML = `
                <td>${obtenerBadgeEstado(p.estado)}</td>
                <td>${fechaStr}</td>
                <td>${p.marca || ''} ${p.modelo || ''}</td>
                <td>${p.problemaReportado || ''}</td>
                <td><strong>${costo}</strong></td>
            `;
            tabla.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tabla.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Error al cargar el historial: " + error.message + "</td></tr>";
    }
});