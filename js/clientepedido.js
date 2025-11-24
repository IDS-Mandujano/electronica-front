document.addEventListener("DOMContentLoaded", async () => {

    // ==================================================
    // 1. LÓGICA DEL SIDEBAR (SUBMENÚ)
    // ==================================================
    const submenuTriggers = document.querySelectorAll('.btn-submenu');
    submenuTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            // Alternar clase active en el botón
            trigger.classList.toggle('active');
            
            // Controlar la altura del submenú
            const submenu = trigger.nextElementSibling;
            if (submenu.style.maxHeight) {
                submenu.style.maxHeight = null;
            } else {
                submenu.style.maxHeight = submenu.scrollHeight + "px";
            }

            // Cerrar otros submenús si los hubiera
            document.querySelectorAll('.btn-submenu.active').forEach(otherTrigger => {
                if (otherTrigger !== trigger) {
                    otherTrigger.classList.remove('active');
                    otherTrigger.nextElementSibling.style.maxHeight = null;
                }
            });
        });
    });

    // ==================================================
    // 2. LÓGICA DE LA PÁGINA (PEDIDOS DEL CLIENTE)
    // ==================================================
    const params = new URLSearchParams(window.location.search);
    const celularCliente = params.get("celular");

    if (!celularCliente) {
        document.getElementById("tabla-pedidos").innerHTML =
            "<tr><td colspan='5' style='text-align:center; color:red;'>Error: No se proporcionó número de celular.</td></tr>";
        return;
    }

    const auth = window.authUtils;
    // Verificar si auth existe antes de usarlo
    if (!auth) {
        console.error("Auth.js no cargado");
        return;
    }
    
    const token = auth.getUserData().token;
    if (!token) {
        console.error("No token, redirigiendo...");
        window.location.href = '/login.html';
        return;
    }

    async function fetchJSON(url) {
        const res = await fetch(url, {
            headers: { "Authorization": "Bearer " + token }
        });
        return await res.json();
    }

    try {
        // 🔵 1. Traer tarjetas (pedidos activos)
        const tarjetasResp = await fetchJSON(`${auth.API_URL}/tarjetas`);
        const tarjetas = (tarjetasResp.data || []).filter(t => t.numeroCelular === celularCliente);

        // 🔵 2. Traer finalizados (pedidos concluidos)
        const finalizadosResp = await fetchJSON(`${auth.API_URL}/finalizado`);
        // La API de finalizados a veces devuelve array directo o {data: []}
        const listaFinalizados = Array.isArray(finalizadosResp) ? finalizadosResp : (finalizadosResp.data || []);
        const finalizadosCliente = listaFinalizados.filter(f => f.numeroCelular === celularCliente);

        // 🔵 3. Combinar pedidos
        const pedidos = [
            ...tarjetas.map(t => ({
                tipo: `<span style="color:orange; font-weight:bold;">${t.estado}</span>`,
                fecha: t.fechaRegistro,
                producto: `${t.marca} ${t.modelo}`,
                problema: t.problemaDescrito,
                total: "Pendiente"
            })),
            ...finalizadosCliente.map(f => ({
                tipo: `<span style="color:green; font-weight:bold;">FINALIZADO</span>`,
                fecha: f.fechaEntrega,
                producto: `${f.marca} ${f.modelo}`,
                problema: f.problemaCambiado || "Reparación completada",
                total: "$" + parseFloat(f.costoReparacion).toFixed(2)
            }))
        ];

        // 🔵 4. Mostrar datos del cliente en el header
        const nombreCliente = tarjetas[0]?.nombreCliente || finalizadosCliente[0]?.nombreCliente || "Cliente Desconocido";
        document.getElementById("cliente-nombre").textContent = nombreCliente;
        document.getElementById("cliente-celular").textContent = celularCliente;

        // 🔵 5. Renderizar la tabla
        const tabla = document.getElementById("tabla-pedidos");
        tabla.innerHTML = "";

        if (pedidos.length === 0) {
            tabla.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Este cliente no tiene pedidos registrados.</td></tr>";
            return;
        }

        pedidos.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.tipo}</td>
                <td>${p.fecha}</td>
                <td>${p.producto}</td>
                <td>${p.problema}</td>
                <td>${p.total}</td>
            `;
            tabla.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        document.getElementById("tabla-pedidos").innerHTML =
            "<tr><td colspan='5' style='color:red; text-align:center;'>Error al cargar el historial de pedidos</td></tr>";
    }

});