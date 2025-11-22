document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    const celularCliente = params.get("celular");

    if (!celularCliente) {
        document.getElementById("tabla-pedidos").innerHTML =
            "<tr><td colspan='5'>Error: No se proporcionó número de celular.</td></tr>";
        return;
    }

    const auth = window.authUtils;
    const token = auth.getUserData().token;

    async function fetchJSON(url) {
        const res = await fetch(url, {
            headers: { "Authorization": "Bearer " + token }
        });
        return await res.json();
    }

    try {
        // 🔵 1. Traer tarjetas (pedidos activos)
        const tarjetasResp = await fetchJSON(`${auth.API_URL}/tarjetas`);
        const tarjetas = tarjetasResp.data.filter(t => t.numeroCelular === celularCliente);

        // 🔵 2. Traer finalizados (pedidos concluidos)
        const finalizados = await fetchJSON(`${auth.API_URL}/finalizado`);
        const finalizadosCliente = finalizados.filter(f => f.numeroCelular === celularCliente);

        // 🔵 3. Combinar pedidos
        const pedidos = [
            ...tarjetas.map(t => ({
                tipo: "En proceso",
                fecha: t.fechaRegistro,
                marca: t.marca,
                modelo: t.modelo,
                costo: "Pendiente",
                problema: t.problemaDescrito,
                tecnico: t.tecnicoNombre
            })),
            ...finalizadosCliente.map(f => ({
                tipo: "Finalizado",
                fecha: f.fechaEntrega,
                marca: f.marca,
                modelo: f.modelo,
                costo: "$" + f.costoReparacion,
                problema: f.problemaCambiado,
                tecnico: f.tecnicoNombre
            }))
        ];

        // 🔵 4. Mostrar datos del cliente
        document.getElementById("cliente-nombre").textContent = tarjetas[0]?.nombreCliente || finalizadosCliente[0]?.nombreCliente;
        document.getElementById("cliente-celular").textContent = celularCliente;

        // 🔵 5. Renderizar la tabla
        const tabla = document.getElementById("tabla-pedidos");
        tabla.innerHTML = "";

        if (pedidos.length === 0) {
            tabla.innerHTML = "<tr><td colspan='5'>Este cliente no tiene pedidos.</td></tr>";
            return;
        }

        pedidos.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.tipo}</td>
                <td>${p.fecha}</td>
                <td>${p.marca} ${p.modelo}</td>
                <td>${p.problema}</td>
                <td>${p.costo}</td>
            `;
            tabla.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        document.getElementById("tabla-pedidos").innerHTML =
            "<tr><td colspan='5' style='color:red;'>Error al cargar pedidos</td></tr>";
    }

});