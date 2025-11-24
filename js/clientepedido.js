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

    const auth = window.authUtils;
    if (!auth) return console.error("Auth.js no cargado");
    const token = auth.getUserData().token;
    if (!token) return window.location.href = '/login.html';

    // --- HELPER: Obtener Badge de Estado ---
    function obtenerBadgeEstado(estado) {
        let clase = 'status-default';
        const est = (estado || '').toUpperCase();

        if (est === 'EN_PROCESO') clase = 'status-en_proceso';
        else if (est === 'FINALIZADO') clase = 'status-finalizado';
        else if (est === 'ENTREGADO') clase = 'status-entregado'; // Si tienes esta clase en CSS
        else if (est === 'PENDIENTE' || est === 'DIAGNOSTICO') clase = 'status-pendiente';
        else if (est === 'CANCELADO') clase = 'status-cancelado';

        return `<span class="status-badge ${clase}">${estado}</span>`;
    }

    async function fetchJSON(url) {
        const res = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
        return await res.json();
    }

    try {
        // 1. Traer datos
        const [tarjetasResp, finalizadosResp] = await Promise.all([
            fetchJSON(`${auth.API_URL}/tarjetas`),
            fetchJSON(`${auth.API_URL}/finalizado`)
        ]);

        const tarjetas = (tarjetasResp.data || []).filter(t => t.numeroCelular === celularCliente);
        const listaFinalizados = Array.isArray(finalizadosResp) ? finalizadosResp : (finalizadosResp.data || []);
        const finalizadosCliente = listaFinalizados.filter(f => f.numeroCelular === celularCliente);

        // 2. Combinar y Mapear
        const pedidos = [
            ...tarjetas.map(t => ({
                estado: t.estado,
                fecha: t.fechaRegistro,
                producto: `${t.marca} ${t.modelo}`,
                problema: t.problemaDescrito,
                total: "Pendiente" // O calcular estimado si tienes
            })),
            ...finalizadosCliente.map(f => ({
                estado: "FINALIZADO",
                fecha: f.fechaEntrega,
                producto: `${f.marca} ${f.modelo}`,
                problema: f.problemaCambiado || "Reparación completada",
                total: "$" + parseFloat(f.costoReparacion).toFixed(2)
            }))
        ];

        // 3. Mostrar Datos del Cliente
        const nombreCliente = tarjetas[0]?.nombreCliente || finalizadosCliente[0]?.nombreCliente || "Cliente";
        document.getElementById("cliente-nombre").textContent = nombreCliente;
        document.getElementById("cliente-celular").textContent = celularCliente;

        // 4. Renderizar Tabla
        tabla.innerHTML = "";

        if (pedidos.length === 0) {
            tabla.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Este cliente no tiene pedidos registrados.</td></tr>";
            return;
        }

        // Ordenar por fecha (opcional)
        // pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        pedidos.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${obtenerBadgeEstado(p.estado)}</td>
                <td>${p.fecha}</td>
                <td>${p.producto}</td>
                <td>${p.problema}</td>
                <td><strong>${p.total}</strong></td>
            `;
            tabla.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tabla.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Error al cargar el historial</td></tr>";
    }
});