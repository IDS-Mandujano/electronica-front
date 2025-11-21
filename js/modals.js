document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ Modals.js inicializado");

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        console.error("❌ Error fatal: No se encontró #modal-container");
        return;
    }

    // --- HELPER: Cerrar Modal ---
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
    // Reemplaza tu mostrarConfirmacion por esta versión con debug y tolerancia a errores
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

                // safety timeout opcional (evita que quede colgado para pruebas)
                // window.setTimeout(() => { if (document.querySelector('.alert-wrapper-temp')) { console.warn('[confirm] timeout - cerrando'); cleanup(false); } }, 120000);

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
            body: JSON.stringify(data)
        });
        if (method === 'DELETE' && response.status === 204) return {};

        let result;
        try {
            result = await response.json();
        } catch (e) {
            console.error("❌ Error al parsear respuesta JSON:", e);
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
            console.error("❌ Respuesta del servidor:", result);
            throw new Error(result.message || result.error || `Error: ${response.status} ${response.statusText}`);
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
    window.modalActions.abrirModalEditarProducto = async function (id) {
        if (modalContainer.innerHTML !== '') return;
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        try {
            const resProd = await fetch(`${auth.API_URL}/productos/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!resProd.ok) throw new Error('Error al obtener producto');
            const jsonProd = await resProd.json();
            const producto = jsonProd.data;

            const resHtml = await fetch('/assets/modals-actions/EditarProducto.html');
            if (!resHtml.ok) throw new Error('No se encontró EditarProducto.html');
            modalContainer.innerHTML = await resHtml.text();

            modalContainer.querySelector('#edit-producto-id').value = producto.id;
            modalContainer.querySelector('#edit-producto-nombre').value = producto.nombreProducto;
            modalContainer.querySelector('#edit-producto-unidad').value = producto.unidad;

            const catSelect = modalContainer.querySelector('#edit-producto-categoria');
            catSelect.value = producto.categoria;
            if (!catSelect.value) {
                Array.from(catSelect.options).forEach(opt => {
                    if (opt.value.toLowerCase() === producto.categoria.toLowerCase()) catSelect.value = opt.value;
                });
            }

            const cant = producto.cantidad !== undefined ? producto.cantidad : producto.cantidadPiezas;
            modalContainer.querySelector('#edit-producto-cantidad').value = cant;
            modalContainer.querySelector('#edit-producto-ohms').value = producto.cantidadOhms || "";
            modalContainer.querySelector('#edit-producto-precio').value = producto.precioUnitario || "";

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

    // ▼▼▼ NUEVA FUNCIÓN: ABRIR EDITAR ESTADO ▼▼▼
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
    // ▲▲▲ FIN NUEVA FUNCIÓN ▲▲▲

    // ==================================================
    // === 3. MANEJO DE EVENTOS (SUBMIT) ===
    // ==================================================

    // --- MANEJO DE EVENTOS ---
    modalContainer.addEventListener('click', (e) => {
        if (e.target.id === 'btn-cerrar-modal' || e.target.id === 'btn-cancelar-modal' || e.target.classList.contains('modal-backdrop')) {
            cerrarModal();
        }
    });

    modalContainer.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        const formId = form.getAttribute('id');
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

            // ... (Lógica de submit de registros y edición) ...
            if (formId === 'form-editar-estado') {
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

            if (formId === 'form-editar-producto') {
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
            // ... (Resto de los submits) ...
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
            else if (formId === 'form-registro-finalizado') {
                const select = form.querySelector('#finalizado-asignar-tecnico');
                const payload = {
                    registroTarjetaId: datos.registroTarjetaId, nombreCliente: datos.clienteNombre,
                    numeroCelular: datos.clienteCelular, marca: datos.marca, modelo: datos.modelo,
                    problemaCambiado: datos.problemaCambiado, tecnicoId: datos.tecnicoId,
                    tecnicoNombre: select.options[select.selectedIndex].text,
                    fechaEntrega: datos.fechaEntrega, costoReparacion: datos.costoReparacion
                };
                await sendRequest(`${auth.API_URL}/finalizado`, 'POST', payload, token);
                mostrarAlerta('success', 'Pedido finalizado');
                exito = true;
            }
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