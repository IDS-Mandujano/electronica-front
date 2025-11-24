document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ Modals.js inicializado");

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        console.error("❌ Error fatal: No se encontró #modal-container");
        return;
    }

    // --- HELPER: Cerrar Modal dinámico (#modal-container) ---
    function cerrarModal() {
        modalContainer.innerHTML = '';
    }

    // --- HELPER: Mostrar Alertas (Toasts) ---
    function mostrarAlerta(tipo, mensaje) {
        // Si tu sistema de alertas está disponible
        if (window.alerts && typeof window.alerts.showSuccess === "function") {
            if (tipo === 'error') {
                window.alerts.showError(mensaje, "Error");
            } else if (tipo === 'success') {
                window.alerts.showSuccess(mensaje, "¡Éxito!");
            } else if (tipo === 'warning') {
                window.alerts.showWarning(mensaje, "Advertencia");
            }
            return;
        }

        // Si falló, NO usar alert del navegador
        console.warn("⚠ Alertas personalizadas no disponibles:", mensaje);
    }


    // --- HELPER: Mostrar Confirmación Personalizada (CORREGIDO) ---
    function mostrarConfirmacion(titulo, mensaje, detallesHtml = '') {
        return new Promise(async (resolve) => {
            try {
                console.log('[confirm] iniciando mostrarConfirmacion', { titulo, mensaje });

                // Limpieza previa (si existe)
                const alertaPrevia = document.querySelector('.alert-wrapper-temp');
                if (alertaPrevia && alertaPrevia.parentElement) {
                    alertaPrevia.parentElement.removeChild(alertaPrevia);
                    console.log('[confirm] alerta previa eliminada');
                }

                // Fetch con la ruta correcta y manejos
                const res = await fetch('assets/alerts/warning.html');
                if (!res.ok) throw new Error(`fetch warning.html -> ${res.status} ${res.statusText}`);
                const html = await res.text();

                // wrapper seguro (evita colisiones con otros elementos)
                const wrapper = document.createElement('div');
                wrapper.className = 'alert-wrapper-temp';
                wrapper.style.position = 'fixed';
                wrapper.style.top = '0';
                wrapper.style.left = '0';
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
                wrapper.style.zIndex = '99999';
                wrapper.innerHTML = html;
                document.body.appendChild(wrapper);
                console.log('[confirm] HTML inyectado en DOM');

                // asegurar que backdrop sea visible
                const backdrop = wrapper.querySelector('.alert-backdrop');
                if (backdrop) {
                    backdrop.style.display = 'flex';
                    backdrop.style.position = 'fixed';
                    backdrop.style.zIndex = '100000';
                    backdrop.style.top = '0';
                    backdrop.style.left = '0';
                    backdrop.style.width = '100%';
                    backdrop.style.height = '100%';
                }

                // insertar texto
                const titleEl = wrapper.querySelector('#alert-title');
                const msgEl = wrapper.querySelector('#alert-message');
                if (titleEl) titleEl.textContent = titulo;
                if (msgEl) msgEl.textContent = mensaje;

                // detalles (si los hay)
                if (detallesHtml) {
                    const detailsContainer = document.createElement('div');
                    detailsContainer.innerHTML = detallesHtml;
                    detailsContainer.style.marginTop = '10px';
                    detailsContainer.style.fontSize = '0.9em';
                    detailsContainer.style.color = '#555';
                    if (msgEl && msgEl.parentNode) msgEl.parentNode.insertBefore(detailsContainer, msgEl.nextSibling);
                }

                // botones
                const btnOk = wrapper.querySelector('#alert-ok-btn');
                const btnCancel = wrapper.querySelector('#alert-cancel-btn');

                const cleanup = (result) => {
                    try {
                        if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
                    } catch (err) {
                        console.error('[confirm] error cleanup:', err);
                    }
                    resolve(result);
                };

                // click handlers robustos
                if (btnOk) {
                    btnOk.addEventListener('click', () => {
                        console.log('[confirm] OK pulsado');
                        cleanup(true);
                    }, { once: true });
                }
                if (btnCancel) {
                    btnCancel.addEventListener('click', () => {
                        console.log('[confirm] Cancel pulsado');
                        cleanup(false);
                    }, { once: true });
                }

                // cerrar al click en backdrop (fuera del contenido)
                if (backdrop) {
                    backdrop.addEventListener('click', (e) => {
                        if (e.target === backdrop) {
                            console.log('[confirm] backdrop clic => cancelar');
                            cleanup(false);
                        }
                    });
                }

            } catch (e) {
                console.error('[confirm] Error mostrando confirmación, fallback a confirm():', e);
                // fallback garantizado
                const fallback = confirm(mensaje);
                resolve(fallback);
            }
        });
    }


    // --- HELPER: Cargar Técnicos ---
    async function poblarTecnicos(selectId, submitButtonId) {
        const auth = window.authUtils;
        if (!auth) return;
        const token = auth.getUserData().token;

        const selectElement = modalContainer.querySelector(selectId);
        const submitButton = modalContainer.querySelector(submitButtonId);
        if (!selectElement || !submitButton) return;

        try {
            const response = await fetch(`${auth.API_URL}/users/tecnicos`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const result = await response.json();

            if (result.data && result.data.length > 0) {
                selectElement.disabled = false;
                submitButton.disabled = false;
                selectElement.innerHTML = '<option value="" disabled selected>Seleccionar técnico...</option>';
                result.data.forEach(tec => {
                    const opt = document.createElement('option');
                    opt.value = tec.id;
                    opt.textContent = tec.nombre;
                    selectElement.appendChild(opt);
                });
            } else {
                selectElement.innerHTML = '<option value="">No hay técnicos</option>';
                mostrarAlerta('error', 'No hay técnicos registrados.');
            }
        } catch (e) {
            console.error(e);
        }
    }

    // --- HELPER: Enviar Petición ---
    async function sendRequest(url, method, data, token) {
        console.log(`📡 Enviando ${method} a ${url}`, data);
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: method !== 'GET' ? JSON.stringify(data) : undefined // No body para GET o DELETE sin data específica
        });

        // Manejar DELETE con respuesta 204 No Content
        if (method === 'DELETE' && response.status === 204) return { success: true, message: 'Eliminado sin contenido' };

        let result;
        try {
            result = await response.json();
        } catch (e) {
            // Si no hay contenido JSON y el estado es OK (ej. 200 con cuerpo vacío)
            if (response.ok) return { success: true, message: 'Petición exitosa sin cuerpo de respuesta JSON' };

            console.error("❌ Error al parsear respuesta JSON:", e);
            console.error("Respuesta del servidor (raw):", response.status, response.statusText);
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
            console.error("❌ Respuesta del servidor completa:", result);
            console.error("Status:", response.status);
            console.error("Payload enviado:", data);

            // Mostrar detalles adicionales si existen
            const mensaje = result.message || result.error || result.details || `Error: ${response.status} ${response.statusText}`;
            throw new Error(mensaje);
        }
        return result;
    }

    // ==================================================
    // === 1. APERTURA DE MODALES (REGISTRO) ===
    // ==================================================

    const btnTarjeta = document.getElementById('btn-abrir-modal-tarjeta');
    if (btnTarjeta) {
        btnTarjeta.addEventListener('click', async () => {
            if (modalContainer.innerHTML !== '') return;
            const res = await fetch('/assets/modals/RegistroTarjeta.html');
            modalContainer.innerHTML = await res.text();
            await poblarTecnicos('#asignar-tecnico', '#form-registro-tarjeta .btn-submit');
            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';
        });
    }

    const btnFinalizado = document.getElementById('btn-abrir-modal-finalizado');
    if (btnFinalizado) {
        btnFinalizado.addEventListener('click', async () => {
            if (modalContainer.innerHTML !== '') return;
            const res = await fetch('/assets/modals/RegistroFinalizado.html');
            modalContainer.innerHTML = await res.text();
            await poblarTecnicos('#finalizado-asignar-tecnico', '#form-registro-finalizado .btn-submit');

            // Autocomplete cuando se ingresa ID de tarjeta
            const inputTarjetaId = modalContainer.querySelector('#finalizado-tarjeta-id');
            if (inputTarjetaId) {
                inputTarjetaId.addEventListener('blur', async () => {
                    await autocompletarDatosTarjeta();
                });
                inputTarjetaId.addEventListener('change', async () => {
                    await autocompletarDatosTarjeta();
                });
            }

            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';
        });
    }

    // --- HELPER: Autocompletar datos de tarjeta en RegistroFinalizado ---
    async function autocompletarDatosTarjeta() {
        const auth = window.authUtils;
        if (!auth) return;
        const token = auth.getUserData().token;

        const inputId = modalContainer.querySelector('#finalizado-tarjeta-id');
        if (!inputId) return;

        const tarjetaId = inputId.value.trim();

        // Si está vacío, limpiar los campos
        if (!tarjetaId) {
            limpiarCamposFinalizado();
            return;
        }

        try {
            console.log(`🔍 Buscando tarjeta: ${tarjetaId}`);
            const res = await fetch(`${auth.API_URL}/tarjetas/${tarjetaId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) {
                console.warn(`⚠️ Tarjeta no encontrada: ${res.status}`);
                limpiarCamposFinalizado();
                mostrarAlerta('error', `No se encontró tarjeta con ID: ${tarjetaId}`);
                return;
            }

            const json = await res.json();
            const tarjeta = json.data || json;

            // Completar los campos con los datos de la tarjeta
            const nombreClienteInput = modalContainer.querySelector('#finalizado-cliente-nombre');
            const celularInput = modalContainer.querySelector('#finalizado-cliente-celular');
            const marcaInput = modalContainer.querySelector('#finalizado-equipo-marca');
            const modeloInput = modalContainer.querySelector('#finalizado-equipo-modelo');
            const solucionInput = modalContainer.querySelector('#finalizado-equipo-problema');
            const tecnicoSelect = modalContainer.querySelector('#finalizado-asignar-tecnico');

            if (nombreClienteInput) {
                nombreClienteInput.value = tarjeta.nombreCliente || '';
                nombreClienteInput.disabled = true;
            }
            if (celularInput) {
                celularInput.value = tarjeta.numeroCelular || '';
                celularInput.disabled = true;
            }
            if (marcaInput) {
                marcaInput.value = tarjeta.marca || '';
                marcaInput.disabled = true;
            }
            if (modeloInput) {
                modeloInput.value = tarjeta.modelo || '';
                modeloInput.disabled = true;
            }
            if (solucionInput) {
                solucionInput.value = tarjeta.problemaDescrito || tarjeta.problema || '';
                solucionInput.disabled = true;
            }

            // Autocompletar técnico por ID si existe
            if (tecnicoSelect && tarjeta.tecnicoId) {
                tecnicoSelect.value = tarjeta.tecnicoId;
                tecnicoSelect.disabled = true;
                console.log(`✅ Técnico seleccionado: ${tarjeta.tecnicoNombre} (${tarjeta.tecnicoId})`);
            }

            console.log(`✅ Datos completados y deshabilitados para tarjeta ${tarjetaId}`);

        } catch (error) {
            console.error(`❌ Error al buscar tarjeta: ${error.message}`);
            limpiarCamposFinalizado();
            mostrarAlerta('error', `Error al buscar tarjeta: ${error.message}`);
        }
    }

    // --- HELPER: Limpiar campos de Finalizado ---
    function limpiarCamposFinalizado() {
        const nombreClienteInput = modalContainer.querySelector('#finalizado-cliente-nombre');
        const celularInput = modalContainer.querySelector('#finalizado-cliente-celular');
        const marcaInput = modalContainer.querySelector('#finalizado-equipo-marca');
        const modeloInput = modalContainer.querySelector('#finalizado-equipo-modelo');
        const solucionInput = modalContainer.querySelector('#finalizado-equipo-problema');
        const tecnicoSelect = modalContainer.querySelector('#finalizado-asignar-tecnico');

        if (nombreClienteInput) {
            nombreClienteInput.value = '';
            nombreClienteInput.disabled = false;
        }
        if (celularInput) {
            celularInput.value = '';
            celularInput.disabled = false;
        }
        if (marcaInput) {
            marcaInput.value = '';
            marcaInput.disabled = false;
        }
        if (modeloInput) {
            modeloInput.value = '';
            modeloInput.disabled = false;
        }
        if (solucionInput) {
            solucionInput.value = '';
            solucionInput.disabled = false;
        }
        if (tecnicoSelect) {
            tecnicoSelect.value = '';
            tecnicoSelect.disabled = false;
        }
    }

    const btnProducto = document.getElementById('btn-abrir-modal-producto');
    if (btnProducto) {
        btnProducto.addEventListener('click', async () => {
            if (modalContainer.innerHTML !== '') return;
            const res = await fetch('/assets/modals/RegistroProducto.html');
            modalContainer.innerHTML = await res.text();
            const fechaInput = modalContainer.querySelector('#producto-fecha');
            if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];
            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';
        });
    }

    // ==================================================
    // === ACCIONES GLOBALES (Editar / Eliminar) ===
    // ==================================================
    window.modalActions = window.modalActions || {};

    // --- ABRIR: EDITAR PRODUCTO ---
    // --- EDITAR PRODUCTO ---
    window.modalActions.abrirModalEditarProducto = async function (id) {
        if (modalContainer.innerHTML !== '') return;
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        // Obtenemos el rol del usuario
        const userRole = auth.getUserData().type.toLowerCase(); // 'tecnico' o 'gerente'

        try {
            // 1. Obtener datos
            const resProd = await fetch(`${auth.API_URL}/productos/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!resProd.ok) throw new Error('Error al obtener producto');
            const jsonProd = await resProd.json();
            const producto = jsonProd.data;

            // 2. Cargar HTML
            const resHtml = await fetch('/assets/modals-actions/EditarProducto.html');
            if (!resHtml.ok) throw new Error('No se encontró EditarProducto.html');
            modalContainer.innerHTML = await resHtml.text();

            // 3. Referencias a los elementos
            const inputId = modalContainer.querySelector('#edit-producto-id');
            const inputNombre = modalContainer.querySelector('#edit-producto-nombre');
            const inputUnidad = modalContainer.querySelector('#edit-producto-unidad');
            const selectCategoria = modalContainer.querySelector('#edit-producto-categoria');
            const inputCantidad = modalContainer.querySelector('#edit-producto-cantidad');
            const inputOhms = modalContainer.querySelector('#edit-producto-ohms');
            const inputPrecio = modalContainer.querySelector('#edit-producto-precio');

            // 4. Rellenar formulario
            inputId.value = producto.id;
            inputNombre.value = producto.nombreProducto;
            inputUnidad.value = producto.unidad;

            selectCategoria.value = producto.categoria;
            if (!selectCategoria.value) {
                Array.from(selectCategoria.options).forEach(opt => {
                    if (opt.value.toLowerCase() === producto.categoria.toLowerCase()) selectCategoria.value = opt.value;
                });
            }

            const cant = producto.cantidad !== undefined ? producto.cantidad : producto.cantidadPiezas;
            inputCantidad.value = cant;
            inputOhms.value = producto.cantidadOhms || "";
            inputPrecio.value = producto.precioUnitario || "";


            // ============================================================
            // 5. VALIDACIÓN DE ROL (Técnico vs Gerente)
            // ============================================================
            if (userRole === 'tecnico') {
                // El técnico SOLO puede editar la cantidad.
                // Usamos 'readonly' y estilos para bloquear los demás sin usar 'disabled'
                // (si usamos disabled, el valor no se envía al guardar y da error).

                // Bloquear Nombre
                inputNombre.readOnly = true;
                inputNombre.classList.add('input-readonly'); // Clase gris de tu CSS

                // Bloquear Categoría (Select no tiene readonly, usamos CSS)
                selectCategoria.style.pointerEvents = 'none';
                selectCategoria.style.backgroundColor = '#e9ecef';
                selectCategoria.tabIndex = -1; // Evitar tabulación

                // Bloquear Unidad
                inputUnidad.style.pointerEvents = 'none';
                inputUnidad.style.backgroundColor = '#e9ecef';
                inputUnidad.tabIndex = -1;

                // Bloquear Ohms y Precio
                inputOhms.readOnly = true;
                inputOhms.classList.add('input-readonly');

                inputPrecio.readOnly = true;
                inputPrecio.classList.add('input-readonly');

                // La cantidad se mantiene editable (sin cambios)
            }
            // ============================================================


            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

        } catch (e) {
            mostrarAlerta('error', e.message);
        }
    };

    // --- ELIMINAR PRODUCTO (USANDO CONFIRMACIÓN CUSTOM) ---
    window.modalActions.eliminarProducto = async function (id) {
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        let detalles = '';
        try {
            const res = await fetch(`${auth.API_URL}/productos/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
            const json = await res.json();
            const p = json.data;
            const stock = p.cantidadPiezas !== undefined ? p.cantidadPiezas : p.cantidad;
            detalles = `
                <strong>Producto:</strong> ${p.nombreProducto}<br>
                <strong>Stock:</strong> ${stock} ${p.unidad}
            `;
        } catch (err) {
            detalles = 'El producto podría no existir o hay un error de conexión.';
        }

        const confirmado = await mostrarConfirmacion('Eliminar Producto', '¿Estás seguro de que deseas eliminar este ítem del inventario? Esta acción no se puede deshacer.', detalles);

        if (!confirmado) return;

        try {
            await sendRequest(`${auth.API_URL}/productos/${id}`, 'DELETE', {}, token);
            mostrarAlerta('success', 'Producto eliminado correctamente.');
            document.dispatchEvent(new CustomEvent('datosActualizados'));
        } catch (e) {
            mostrarAlerta('error', e.message);
        }
    };

    // --- EDITAR FINALIZADO ---
    window.modalActions.abrirModalEditarFinalizado = async function (id) {
        if (modalContainer.innerHTML !== '') return;
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        try {
            const resData = await fetch(`${auth.API_URL}/finalizado/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!resData.ok) throw new Error('Error al obtener datos.');
            const json = await resData.json();
            const data = json.data || json;

            const resHtml = await fetch('/assets/modals-actions/EditarFinalizado.html');
            if (!resHtml.ok) throw new Error('No se encontró EditarFinalizado.html');
            modalContainer.innerHTML = await resHtml.text();

            modalContainer.querySelector('#edit-finalizado-id').value = data.id;
            modalContainer.querySelector('#edit-finalizado-cliente').value = data.nombreCliente;
            const equipoInput = modalContainer.querySelector('#edit-finalizado-equipo');
            if (equipoInput) equipoInput.value = `${data.marca} - ${data.modelo}`;
            modalContainer.querySelector('#edit-finalizado-problema').value = data.problemaCambiado;
            modalContainer.querySelector('#edit-finalizado-costo').value = data.costoReparacion;

            let fecha = data.fechaEntrega;
            if (fecha && fecha.length >= 10) {
                modalContainer.querySelector('#edit-finalizado-fecha').value = fecha.substring(0, 10);
            }

            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

        } catch (e) {
            mostrarAlerta('error', e.message);
        }
    };

    // --- ELIMINAR FINALIZADO (USANDO CONFIRMACIÓN CUSTOM) ---
    window.modalActions.eliminarFinalizado = async function (id) {
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        let detalles = '';
        try {
            const res = await fetch(`${auth.API_URL}/finalizado/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
            const data = await res.json();
            const registro = data.data || data;
            detalles = `
                <p><strong>Folio:</strong> ${registro.registroTarjetaId.substring(0, 8)}...</p>
                <p><strong>Cliente:</strong> ${registro.nombreCliente}</p>
                <p><strong>Costo:</strong> $${parseFloat(registro.costoReparacion).toFixed(2)}</p>
            `;
        } catch (e) {
            detalles = 'El registro podría no existir o hay un error de conexión.';
        }

        const confirmado = await mostrarConfirmacion('Eliminar Venta', '¿Seguro que deseas eliminar este registro de venta?', detalles);

        if (!confirmado) return;

        try {
            await sendRequest(`${auth.API_URL}/finalizado/${id}`, 'DELETE', {}, token);
            mostrarAlerta('success', 'Venta eliminada');
            document.dispatchEvent(new CustomEvent('datosActualizados'));
        } catch (e) {
            mostrarAlerta('error', e.message);
        }
    };

    // --- ABRIR: EDITAR ESTADO ---
    window.modalActions.abrirModalEditarEstado = async function (id) {
        if (modalContainer.innerHTML !== '') return;
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        try {
            // 1. Obtener datos de la tarjeta
            const resData = await fetch(`${auth.API_URL}/tarjetas/${id}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!resData.ok) throw new Error('Error al obtener datos de la tarjeta.');
            const json = await resData.json();
            const tarjeta = json.data || json;

            // 2. Cargar tu HTML específico
            const resHtml = await fetch('/assets/modals-actions/EditarEstado.html');
            if (!resHtml.ok) throw new Error('No se encontró EditarEstado.html');
            modalContainer.innerHTML = await resHtml.text();

            // 3. Llenar los campos (Solo lectura y Select)
            modalContainer.querySelector('#edit-estado-id').value = tarjeta.id;
            modalContainer.querySelector('#edit-estado-folio').value = tarjeta.id.substring(0, 8); // Folio corto
            modalContainer.querySelector('#edit-estado-info').value = `${tarjeta.marca} - ${tarjeta.modelo} (${tarjeta.nombreCliente})`;

            // Seleccionar el estado actual
            const selectEstado = modalContainer.querySelector('#edit-estado-select');
            selectEstado.value = tarjeta.estado;

            // 4. Guardar los datos completos de la tarjeta en la forma (en atributo data)
            const form = modalContainer.querySelector('#form-editar-estado');
            form.dataset.tarjetaCompleta = JSON.stringify(tarjeta);

            // 5. Mostrar
            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

        } catch (e) {
            mostrarAlerta('error', e.message);
        }
    };

    // --- ABRIR: EDITAR CLIENTE ---
    window.modalActions.abrirModalEditarCliente = async function (celular) {
        if (modalContainer.innerHTML !== '') return;

        const auth = window.authUtils;
        const token = auth.getUserData().token;

        try {
            // 1. Buscar datos del cliente
            // Nota: Si no tienes GET /clientes/{id}, seguimos usando la lógica de buscar en tarjetas
            // Pero si ya creaste el endpoint, úsalo directo:
            let clienteEncontrado = null;

            try {
                const res = await fetch(`${auth.API_URL}/clientes/${celular}`, { headers: { 'Authorization': 'Bearer ' + token } });
                if (res.ok) {
                    const json = await res.json();
                    clienteEncontrado = json.data || json;
                }
            } catch (e) { console.warn("Endpoint clientes no disponible, buscando en tarjetas..."); }

            // Fallback: Buscar en tarjetas si el endpoint de clientes no devolvió nada
            if (!clienteEncontrado) {
                const resTarjetas = await fetch(`${auth.API_URL}/tarjetas`, { headers: { 'Authorization': 'Bearer ' + token } });
                const jsonTarjetas = await resTarjetas.json();
                const tarjetas = jsonTarjetas.data || [];
                const tarjeta = tarjetas.find(t => t.numeroCelular === celular);
                if (tarjeta) {
                    clienteEncontrado = { nombre: tarjeta.nombreCliente, numeroCelular: tarjeta.numeroCelular };
                }
            }

            if (!clienteEncontrado) throw new Error("No se encontraron datos del cliente.");

            // 2. Cargar HTML
            const resHtml = await fetch('/assets/modals-actions/EditarCliente.html');
            modalContainer.innerHTML = await resHtml.text();

            // 3. Rellenar formulario
            // ▼▼▼ CLAVE: Guardamos el celular original en el input hidden para usarlo en la URL del PUT ▼▼▼
            modalContainer.querySelector('#edit-cliente-id').value = clienteEncontrado.numeroCelular;

            modalContainer.querySelector('#edit-cliente-nombre').value = clienteEncontrado.nombre || clienteEncontrado.nombreCliente;
            modalContainer.querySelector('#edit-cliente-celular').value = clienteEncontrado.numeroCelular;

            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

        } catch (error) {
            mostrarAlerta('error', error.message);
        }
    };

    // ... (dentro de window.modalActions en modals.js) ...

    // --- ELIMINAR CLIENTE ---
    window.modalActions.eliminarCliente = async function (celular) {
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        // 1. Confirmación con tu modal personalizada
        const confirmado = await mostrarConfirmacion(
            'Eliminar Cliente',
            `¿Estás seguro de eliminar al cliente con celular ${celular}?`
        );

        if (!confirmado) return;

        try {
            // 2. Petición a la API
            const response = await fetch(`${auth.API_URL}/clientes/${celular}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });

            // 3. Manejo de respuesta exitosa (204 No Content)
            if (response.status === 204) {
                mostrarAlerta('success', 'Cliente eliminado correctamente');
                document.dispatchEvent(new CustomEvent('datosActualizados'));
                return;
            }

            // 4. Manejo de otras respuestas
            const text = await response.text();
            const result = text ? JSON.parse(text) : { message: "Error desconocido" };

            if (!response.ok) {
                throw new Error(result.message || 'Error al eliminar');
            }

            // Si devolvió 200 OK con JSON
            mostrarAlerta('success', 'Cliente eliminado correctamente');
            document.dispatchEvent(new CustomEvent('datosActualizados'));

        } catch (e) {
            mostrarAlerta('error', e.message);
        }
    };



    // ==================================================
    // === 3. MANEJO DE EVENTOS (SUBMIT) ===
    // ==================================================

    // --- MANEJO DE CIERRE PARA MODAL ESTATICO DE CLIENTES ---
    // Esto es necesario porque el modal de clientes NO está dentro de #modal-container
    const modalEditarCliente = document.getElementById('modal-editar-cliente');
    if (modalEditarCliente) {
        const btnCerrar = modalEditarCliente.querySelector('#btn-cerrar-modal-cliente');
        const btnCancelar = modalEditarCliente.querySelector('#btn-cancelar-modal-cliente');
        const backdrop = modalEditarCliente.querySelector('.modal-backdrop');

        const cerrarModalCliente = () => {
            modalEditarCliente.style.display = 'none';
        };

        if (btnCerrar) btnCerrar.addEventListener('click', cerrarModalCliente);
        if (btnCancelar) btnCancelar.addEventListener('click', cerrarModalCliente);
        // Cierre al hacer click en el fondo
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    cerrarModalCliente();
                }
            });
        }
    }

    // --- MANEJO DE CIERRES PARA MODALES DINÁMICOS ---
    modalContainer.addEventListener('click', (e) => {
        if (e.target.id === 'btn-cerrar-modal' || e.target.id === 'btn-cancelar-modal' || e.target.classList.contains('modal-backdrop')) {
            cerrarModal();
        }
    });

    // --- MANEJO DE SUBMITS ---
    document.addEventListener('submit', async (event) => {
        const form = event.target;
        const formId = form.getAttribute('id');

        // Solo procesamos los formularios que nos interesan (los definidos en este script)
        if (!['form-editar-cliente', 'form-editar-estado', 'form-editar-producto', 'form-registro-producto', 'form-registro-tarjeta', 'form-registro-finalizado', 'form-editar-finalizado'].includes(formId)) {
            return;
        }

        event.preventDefault();

        const formData = new FormData(form);
        const datos = Object.fromEntries(formData.entries());
        const auth = window.authUtils;

        if (!auth) return mostrarAlerta('error', 'Error fatal: auth.js no cargado');
        const token = auth.getUserData().token;
        if (!token) return mostrarAlerta('error', 'Sesión expirada');

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) auth.setButtonLoading(submitButton, true);

        try {
            let exito = false;

            // --- EDICIÓN DE CLIENTE ---
            if (formId === 'form-editar-cliente') {
                const idCliente = datos.celularOriginal || datos.id;

                // 2. URL: Usamos el ID original en la ruta
                const url = `${auth.API_URL}/clientes/${idCliente}`;

                // 3. Body: Enviamos los datos nuevos
                const payload = {
                    nombre: datos.nombre,
                    numeroCelular: datos.celular // El nuevo número (si lo cambió)
                };

                console.log("📤 Actualizando cliente:", url, payload);
                cerrarModal()

                // 4. Petición PUT
                await sendRequest(url, 'PUT', payload, token);

                mostrarAlerta('success', 'Cliente actualizado correctamente');
                exito = true;
            }

            // --- EDICIÓN DE ESTADO ---
            else if (formId === 'form-editar-estado') {
                // Obtener datos completos de la tarjeta almacenados
                const tarjetaCompleta = JSON.parse(form.dataset.tarjetaCompleta || '{}');

                const payload = {
                    id: datos.id,
                    nombreCliente: tarjetaCompleta.nombreCliente,
                    numeroCelular: tarjetaCompleta.numeroCelular,
                    marca: tarjetaCompleta.marca,
                    modelo: tarjetaCompleta.modelo,
                    problemaDescrito: tarjetaCompleta.problemaDescrito,
                    estado: datos.estado,
                    tecnicoId: tarjetaCompleta.tecnicoId,
                    tecnicoNombre: tarjetaCompleta.tecnicoNombre,
                    fechaRegistro: tarjetaCompleta.fechaRegistro
                };

                // Si cambiamos a FINALIZADO, agregar fecha de finalización
                if (datos.estado === 'FINALIZADO' && !tarjetaCompleta.fechaFinalizacion) {
                    payload.fechaFinalizacion = new Date().toISOString().split('T')[0];
                }

                await sendRequest(`${auth.API_URL}/tarjetas/${datos.id}`, 'PUT', payload, token);
                mostrarAlerta('success', 'Estado actualizado correctamente');
                exito = true;
            }

            // --- EDICIÓN DE PRODUCTO ---
            else if (formId === 'form-editar-producto') {
                const payload = {
                    nombreProducto: datos.nombreProducto,
                    categoria: datos.categoria,
                    unidad: datos.unidad,
                    cantidadPiezas: parseInt(datos.cantidadPiezas || 0, 10),
                    cantidadOhms: datos.cantidadOhms ? parseFloat(datos.cantidadOhms) : null,
                    precioUnitario: datos.precioUnitario ? parseFloat(datos.precioUnitario) : null
                };
                await sendRequest(`${auth.API_URL}/productos/${datos.id}`, 'PUT', payload, token);
                mostrarAlerta('success', 'Producto actualizado');
                exito = true;
            }

            // --- REGISTRO DE PRODUCTO ---
            else if (formId === 'form-registro-producto') {
                const payload = {
                    nombreProducto: datos.nombreProducto,
                    categoria: datos.categoria,
                    cantidad: parseInt(datos.cantidad, 10),
                    unidad: datos.unidad,
                    fechaRegistro: datos.fechaRegistro
                };
                await sendRequest(`${auth.API_URL}/productos`, 'POST', payload, token);
                mostrarAlerta('success', 'Producto creado');
                exito = true;
            }

            // --- REGISTRO DE TARJETA ---
            else if (formId === 'form-registro-tarjeta') {
                const select = form.querySelector('#asignar-tecnico');
                const payload = {
                    nombreCliente: datos.clienteNombre, numeroCelular: datos.clienteCelular,
                    marca: datos.equipoMarca, modelo: datos.equipoModelo,
                    problemaDescrito: datos.equipoProblema, tecnicoId: datos.asignarTecnico,
                    tecnicoNombre: select.options[select.selectedIndex].text,
                    fechaRegistro: datos.fechaRegistro, estado: 'EN_PROCESO'
                };
                await sendRequest(`${auth.API_URL}/tarjetas`, 'POST', payload, token);
                mostrarAlerta('success', 'Tarjeta registrada');
                exito = true;
            }

            // --- REGISTRO FINALIZADO ---
            else if (formId === 'form-registro-finalizado') {

                // 1. Obtener referencias directas a los elementos (incluso si están disabled)
                const tarjetaIdInput = form.querySelector('#finalizado-tarjeta-id');
                const nombreInput = form.querySelector('#finalizado-cliente-nombre');
                const celularInput = form.querySelector('#finalizado-cliente-celular');
                const marcaInput = form.querySelector('#finalizado-equipo-marca');
                const modeloInput = form.querySelector('#finalizado-equipo-modelo');
                const problemaInput = form.querySelector('#finalizado-equipo-problema');
                const selectTecnico = form.querySelector('#finalizado-asignar-tecnico');

                // 2. Construir el payload leyendo .value directamente
                const payload = {
                    // Prioridad: valor del input directo. Si no, lo que tenga formData.
                    registroTarjetaId: tarjetaIdInput ? tarjetaIdInput.value : datos.registroTarjetaId,
                    nombreCliente: nombreInput ? nombreInput.value : datos.clienteNombre,
                    numeroCelular: celularInput ? celularInput.value : datos.clienteCelular,
                    marca: marcaInput ? marcaInput.value : datos.marca,
                    modelo: modeloInput ? modeloInput.value : datos.modelo,
                    problemaCambiado: problemaInput ? problemaInput.value : datos.problemaCambiado,

                    // Técnico
                    tecnicoId: selectTecnico ? selectTecnico.value : datos.tecnicoId,
                    tecnicoNombre: selectTecnico && selectTecnico.selectedIndex >= 0
                        ? selectTecnico.options[selectTecnico.selectedIndex].text
                        : '',

                    // Estos campos no suelen estar disabled, así que formData (datos) está bien
                    fechaEntrega: datos.fechaEntrega,
                    costoReparacion: parseFloat(datos.costoReparacion)
                };

                console.log('📤 Enviando payload finalizado:', payload); // Debug para ver si el ID va bien

                await sendRequest(`${auth.API_URL}/finalizado`, 'POST', payload, token);
                mostrarAlerta('success', 'Pedido finalizado exitosamente');
                exito = true;
            }

            // --- EDICIÓN DE FINALIZADO ---
            else if (formId === 'form-editar-finalizado') {
                const payload = {
                    problemaCambiado: datos.problemaCambiado,
                    fechaEntrega: datos.fechaEntrega,
                    costoReparacion: parseFloat(datos.costoReparacion)
                };
                await sendRequest(`${auth.API_URL}/finalizado/${datos.id}`, 'PUT', payload, token);
                mostrarAlerta('success', 'Venta actualizada');
                exito = true;
            }

            if (exito) {
                cerrarModal();

                document.dispatchEvent(new CustomEvent('datosActualizados'));
            }

        } catch (error) {
            console.error("❌ Error submit:", error);
            mostrarAlerta('error', error.message);
        } finally {
            if (submitButton) auth.setButtonLoading(submitButton, false);
        }
    });
});