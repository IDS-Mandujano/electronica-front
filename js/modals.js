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
            const res = await fetch('assets/modals/RegistroTarjeta.html');
            modalContainer.innerHTML = await res.text();
            await poblarTecnicos('#asignar-tecnico', '#form-registro-tarjeta .btn-submit');

            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

            // Validación de fecha: solo permitir desde hace 1 semana hasta hoy
            const fechaInput = modalContainer.querySelector('#fecha-registro');
            if (fechaInput) {
                const hoy = new Date();
                const haceSemana = new Date();
                haceSemana.setDate(hoy.getDate() - 7);

                // Formatear fechas a YYYY-MM-DD
                const hoyStr = hoy.toISOString().split('T')[0];
                const haceSemanaStr = haceSemana.toISOString().split('T')[0];

                // Establecer límites
                fechaInput.min = haceSemanaStr;
                fechaInput.max = hoyStr;

                // Establecer fecha actual por defecto
                fechaInput.value = hoyStr;

                // Validación adicional en el input
                fechaInput.addEventListener('change', (e) => {
                    const fechaSeleccionada = new Date(e.target.value);
                    if (fechaSeleccionada < haceSemana) {
                        mostrarAlerta('warning', 'La fecha no puede ser mayor a 1 semana atrás');
                        e.target.value = haceSemanaStr;
                    } else if (fechaSeleccionada > hoy) {
                        mostrarAlerta('warning', 'La fecha no puede ser futura');
                        e.target.value = hoyStr;
                    }
                });
            }

            // Attach Close Listeners
            const btnClose = modalContainer.querySelector('#btn-cerrar-modal');
            const btnCancel = modalContainer.querySelector('#btn-cancelar-modal');

            if (btnClose) btnClose.addEventListener('click', cerrarModal);
            if (btnCancel) btnCancel.addEventListener('click', cerrarModal);
        });
    }

    const btnFinalizado = document.getElementById('btn-abrir-modal-finalizado');
    if (btnFinalizado) {
        btnFinalizado.addEventListener('click', async () => {
            if (modalContainer.innerHTML !== '') return;
            const res = await fetch('assets/modals/RegistroFinalizado.html');
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

            // Attach Close Listeners
            const btnClose = modalContainer.querySelector('#btn-cerrar-modal');
            const btnCancel = modalContainer.querySelector('#btn-cancelar-modal');

            if (btnClose) btnClose.addEventListener('click', cerrarModal);
            if (btnCancel) btnCancel.addEventListener('click', cerrarModal);
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
            const res = await fetch('assets/modals/RegistroProducto.html');
            modalContainer.innerHTML = await res.text();

            const fechaInput = modalContainer.querySelector('#producto-fecha');
            if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

            // Attach Close Listeners
            const btnClose = modalContainer.querySelector('#btn-cerrar-modal');
            const btnCancel = modalContainer.querySelector('#btn-cancelar-modal');

            if (btnClose) btnClose.addEventListener('click', cerrarModal);
            if (btnCancel) btnCancel.addEventListener('click', cerrarModal);

            // Validación del nombre del producto: debe contener al menos 3 letras
            const nombreProductoInput = modalContainer.querySelector('#producto-nombre');
            if (nombreProductoInput) {
                nombreProductoInput.addEventListener('input', (e) => {
                    const value = e.target.value;
                    // Contar las letras (a-z, A-Z, incluyendo acentos)
                    const letras = (value.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) || []).length;

                    if (value && letras < 3) {
                        e.target.setCustomValidity('El nombre debe contener al menos 3 letras');
                    } else {
                        e.target.setCustomValidity('');
                    }
                });

                // También validar en el submit
                const form = modalContainer.querySelector('#form-registro-producto');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        const value = nombreProductoInput.value;
                        const letras = (value.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) || []).length;

                        if (letras < 3) {
                            e.preventDefault();
                            mostrarAlerta('warning', 'El nombre del producto debe contener al menos 3 letras');
                            nombreProductoInput.focus();
                        }
                    }, true); // Captura en fase de captura para ejecutarse antes del handler general
                }
            }
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

        // Obtenemos el rol del usuario
        const userRole = auth.getUserData().type.toLowerCase(); // 'tecnico' o 'gerente'

        try {
            // 1. Obtener datos
            const resProd = await fetch(`${auth.API_URL}/productos/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!resProd.ok) throw new Error('Error al obtener producto');
            const jsonProd = await resProd.json();
            const producto = jsonProd.data;

            // 2. Cargar HTML
            const resHtml = await fetch('assets/modals-actions/EditarProducto.html');
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

            // Attach Close Listeners
            const btnClose = modalContainer.querySelector('#btn-cerrar-modal');
            const btnCancel = modalContainer.querySelector('#btn-cancelar-modal');

            if (btnClose) btnClose.addEventListener('click', cerrarModal);
            if (btnCancel) btnCancel.addEventListener('click', cerrarModal);

            // Validación del nombre del producto: debe contener al menos 3 letras
            const nombreProductoInput = modalContainer.querySelector('#edit-producto-nombre');
            if (nombreProductoInput) {
                nombreProductoInput.addEventListener('input', (e) => {
                    const value = e.target.value;
                    // Contar las letras (a-z, A-Z, incluyendo acentos)
                    const letras = (value.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) || []).length;

                    if (value && letras < 3) {
                        e.target.setCustomValidity('El nombre debe contener al menos 3 letras');
                    } else {
                        e.target.setCustomValidity('');
                    }
                });
            }

            // Attach Submit Listener
            const formEditarProducto = modalContainer.querySelector('#form-editar-producto');
            if (formEditarProducto) {
                formEditarProducto.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(formEditarProducto);

                    // Validar que el nombre contenga al menos 3 letras
                    const nombreProducto = formData.get('nombreProducto');
                    const letras = (nombreProducto.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) || []).length;

                    if (letras < 3) {
                        mostrarAlerta('warning', 'El nombre del producto debe contener al menos 3 letras');
                        nombreProductoInput.focus();
                        return;
                    }

                    const payload = {
                        nombreProducto: nombreProducto,
                        categoria: formData.get('categoria'),
                        unidad: formData.get('unidad'),
                        cantidadPiezas: parseInt(formData.get('cantidadPiezas') || 0, 10),
                        cantidadOhms: formData.get('cantidadOhms') ? parseFloat(formData.get('cantidadOhms')) : null,
                        precioUnitario: formData.get('precioUnitario') ? parseFloat(formData.get('precioUnitario')) : null
                    };
                    const productoId = formData.get('id');

                    try {
                        const response = await fetch(`${auth.API_URL}/productos/${productoId}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': 'Bearer ' + token,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(payload)
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Error al actualizar producto');
                        }

                        mostrarAlerta('success', 'Producto actualizado correctamente');
                        cerrarModal();
                        document.dispatchEvent(new CustomEvent('datosActualizados'));
                    } catch (error) {
                        console.error("❌ Error:", error);
                        mostrarAlerta('error', error.message);
                    }
                });
            }

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

            const resHtml = await fetch('assets/modals-actions/EditarFinalizado.html');
            if (!resHtml.ok) throw new Error('No se encontró EditarFinalizado.html');
            modalContainer.innerHTML = await resHtml.text();

            modalContainer.querySelector('#edit-finalizado-id').value = data.id;
            modalContainer.querySelector('#edit-finalizado-cliente').value = data.nombreCliente;
            const equipoInput = modalContainer.querySelector('#edit-finalizado-equipo');
            if (equipoInput) equipoInput.value = `${data.marca} - ${data.modelo}`;
            modalContainer.querySelector('#edit-finalizado-problema').value = data.problemaReportado || data.diagnosticoTecnico || '';
            modalContainer.querySelector('#edit-finalizado-costo').value = data.costoReparacion;

            let fecha = data.fechaEntrega;
            if (fecha && fecha.length >= 10) {
                modalContainer.querySelector('#edit-finalizado-fecha').value = fecha.substring(0, 10);
            }

            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

            // Attach Close Listeners
            const btnClose = modalContainer.querySelector('#btn-cerrar-modal');
            const btnCancel = modalContainer.querySelector('#btn-cancelar-modal');

            if (btnClose) btnClose.addEventListener('click', cerrarModal);
            if (btnCancel) btnCancel.addEventListener('click', cerrarModal);

            // Attach Submit Listener directly to form
            const formEditar = modalContainer.querySelector('#form-editar-finalizado');
            if (formEditar) {
                formEditar.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const fData = new FormData(formEditar);
                    const payload = {
                        problemaCambiado: fData.get('problemaCambiado'),
                        fechaEntrega: fData.get('fechaEntrega'),
                        costoReparacion: parseFloat(fData.get('costoReparacion'))
                    };
                    const idFin = fData.get('id');

                    try {
                        const resp = await fetch(`${auth.API_URL}/finalizado/${idFin}`, {
                            method: 'PUT',
                            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (!resp.ok) throw new Error('Error al actualizar');
                        mostrarAlerta('success', 'Pedido actualizado');
                        cerrarModal();
                        document.dispatchEvent(new CustomEvent('datosActualizados'));
                    } catch (err) {
                        mostrarAlerta('error', err.message);
                    }
                });
            }

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
                <p><strong>Folio:</strong> ${registro.registroTarjetaId ? registro.registroTarjetaId.substring(0, 8) : 'N/A'}...</p>
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

    // --- ELIMINAR CLIENTE (USANDO CONFIRMACIÓN CUSTOM) ---
    window.modalActions.eliminarCliente = async function (numeroCelular) {
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        let detalles = '';
        try {
            const res = await fetch(`${auth.API_URL}/clientes/${numeroCelular}`, { headers: { 'Authorization': 'Bearer ' + token } });
            const json = await res.json();
            const c = json.data;
            detalles = `
                <strong>Cliente:</strong> ${c.nombre} ${c.apellidos}<br>
                <strong>Teléfono:</strong> ${c.numeroCelular}
            `;
        } catch (err) {
            detalles = 'El cliente podría no existir o hay un error de conexión.';
        }

        const confirmado = await mostrarConfirmacion('Eliminar Cliente', '¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.', detalles);

        if (!confirmado) return;

        try {
            await sendRequest(`${auth.API_URL}/clientes/${numeroCelular}`, 'DELETE', {}, token);
            mostrarAlerta('success', 'Cliente eliminado correctamente.');
            document.dispatchEvent(new CustomEvent('datosActualizados'));
        } catch (e) {
            mostrarAlerta('error', e.message);
        }
    };

    // --- ABRIR: EDITAR CLIENTE ---
    window.modalActions.abrirModalEditarCliente = async function (numeroCelular) {
        if (modalContainer.innerHTML !== '') return;
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        try {
            // 1. Obtener datos del cliente
            const resCliente = await fetch(`${auth.API_URL}/clientes/${numeroCelular}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!resCliente.ok) throw new Error('Error al obtener datos del cliente');
            const jsonCliente = await resCliente.json();
            const cliente = jsonCliente.data;

            // 2. Cargar HTML del modal
            const resHtml = await fetch('assets/modals-actions/EditarCliente.html');
            if (!resHtml.ok) throw new Error('No se encontró EditarCliente.html');
            modalContainer.innerHTML = await resHtml.text();

            // 3. Llenar formulario
            modalContainer.querySelector('#edit-cliente-numero-original').value = cliente.numeroCelular;
            modalContainer.querySelector('#edit-cliente-nombre').value = cliente.nombre;
            modalContainer.querySelector('#edit-cliente-apellidos').value = cliente.apellidos;
            modalContainer.querySelector('#edit-cliente-celular').value = cliente.numeroCelular;

            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';

            // Close listeners
            const btnClose = modalContainer.querySelector('#btn-cerrar-modal');
            const btnCancel = modalContainer.querySelector('#btn-cancelar-modal');

            if (btnClose) btnClose.addEventListener('click', cerrarModal);
            if (btnCancel) btnCancel.addEventListener('click', cerrarModal);

        } catch (e) {
            console.error("Error al abrir modal editar cliente:", e);
            mostrarAlerta('error', e.message);
        }
    };

    // --- ABRIR: EDITAR ESTADO ---
    window.modalActions.abrirModalEditarEstado = async function (id) {
        console.log("🔓 abrirModalEditarEstado called with ID:", id);
        if (modalContainer.innerHTML !== '') return;
        const auth = window.authUtils;
        const token = auth.getUserData().token;

        try {
            console.log("📡 Paso 1: Obteniendo datos de la tarjeta...");
            // 1. Obtener datos de la tarjeta
            const resData = await fetch(`${auth.API_URL}/tarjetas/${id}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            console.log("📡 Respuesta del servidor:", resData.status, resData.statusText);

            if (!resData.ok) {
                const errorText = await resData.text();
                console.error("❌ Error del servidor:", errorText);
                throw new Error('Error al obtener datos de la tarjeta.');
            }

            const json = await resData.json();
            const tarjeta = json.data || json;
            console.log("✅ Datos de tarjeta recibidos:", tarjeta);

            console.log("📄 Paso 2: Cargando HTML del modal...");
            // 2. Cargar tu HTML específico
            const resHtml = await fetch('assets/modals-actions/EditarEstado.html');
            if (!resHtml.ok) throw new Error('No se encontró EditarEstado.html');
            modalContainer.innerHTML = await resHtml.text();
            console.log("✅ HTML del modal cargado");

            console.log("✏️ Paso 3: Llenando campos del formulario...");
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

            console.log("👁️ Paso 4: Mostrando modal...");
            modalContainer.querySelector('.modal-backdrop').style.display = 'flex';
            console.log("✅ Modal abierto exitosamente");

            // Attach Close Listeners
            const btnClose = modalContainer.querySelector('#btn-cerrar-modal');
            const btnCancel = modalContainer.querySelector('#btn-cancelar-modal');

            if (btnClose) btnClose.addEventListener('click', cerrarModal);
            if (btnCancel) btnCancel.addEventListener('click', cerrarModal);

            // --- DIRECT SUBMIT LISTENER (Fix for button not working) ---
            const formEditar = modalContainer.querySelector('#form-editar-estado');
            if (formEditar) {
                console.log("✅ Formulario encontrado, adjuntando listener directo...");

                // Remove any existing submit listeners and add a new one
                formEditar.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🚀 DIRECT SUBMIT from form-editar-estado!");

                    // Get form data
                    const formData = new FormData(formEditar);
                    const datos = Object.fromEntries(formData.entries());
                    console.log("📋 Datos capturados:", datos);

                    // Validate
                    if (!datos.estado) {
                        mostrarAlerta('error', 'Por favor selecciona un estado');
                        return;
                    }

                    // Get stored data
                    const tarjetaCompleta = JSON.parse(formEditar.dataset.tarjetaCompleta || '{}');
                    console.log("📋 Tarjeta completa:", tarjetaCompleta);

                    const payload = {
                        id: datos.id,
                        nombreCliente: tarjetaCompleta.nombreCliente,
                        numeroCelular: tarjetaCompleta.numeroCelular,
                        marca: tarjetaCompleta.marca,
                        modelo: tarjetaCompleta.modelo,
                        problemaDescrito: tarjetaCompleta.problemaDescrito,
                        diagnosticoTecnico: tarjetaCompleta.diagnosticoTecnico || '',
                        estado: datos.estado,
                        tecnicoId: tarjetaCompleta.tecnicoId,
                        tecnicoNombre: tarjetaCompleta.tecnicoNombre,
                        fechaRegistro: tarjetaCompleta.fechaRegistro
                    };

                    if (datos.estado === 'FINALIZADO' && !tarjetaCompleta.fechaFinalizacion) {
                        payload.fechaFinalizacion = new Date().toISOString().split('T')[0];
                    }

                    console.log("📦 Payload a enviar:", payload);
                    console.log(`🌐 URL: ${auth.API_URL}/tarjetas/${datos.id}`);

                    // Send request
                    try {
                        await sendRequest(`${auth.API_URL}/tarjetas/${datos.id}`, 'PUT', payload, token);
                        mostrarAlerta('success', 'Estado actualizado correctamente');
                        cerrarModal();
                        document.dispatchEvent(new CustomEvent('datosActualizados'));
                    } catch (error) {
                        console.error("❌ Error al actualizar:", error);
                        mostrarAlerta('error', error.message);
                    }
                });
            }

        } catch (e) {
            console.error("❌ Error en abrirModalEditarEstado:", e);
            console.error("❌ Stack:", e.stack);
            mostrarAlerta('error', `Error al abrir modal: ${e.message}`);
        }
    };

    // --- MANEJO GENERAL DE SUBMIT (POST/PUT) ---
    modalContainer.addEventListener('submit', async (e) => {
        console.log("🚀 SUBMIT EVENT DETECTED on modalContainer");
        e.preventDefault();
        const form = e.target;
        const formId = form.id;
        console.log("📋 Form ID:", formId);
        console.log("📝 Form element:", form);
        const submitButton = form.querySelector('button[type="submit"]');

        const auth = window.authUtils;
        const token = auth.getUserData().token;

        if (submitButton) auth.setButtonLoading(submitButton, true);

        try {
            const formData = new FormData(form);
            const datos = Object.fromEntries(formData.entries());
            let exito = false;

            // --- EDICIÓN DE ESTADO ---
            if (formId === 'form-editar-estado') {
                console.log("📝 Enviando formulario editar estado...");
                const tarjetaCompleta = JSON.parse(form.dataset.tarjetaCompleta || '{}');
                console.log("📋 Tarjeta completa:", tarjetaCompleta);
                console.log("📋 Datos del formulario:", datos);

                const payload = {
                    id: datos.id,
                    nombreCliente: tarjetaCompleta.nombreCliente,
                    numeroCelular: tarjetaCompleta.numeroCelular,
                    marca: tarjetaCompleta.marca,
                    modelo: tarjetaCompleta.modelo,
                    problemaDescrito: tarjetaCompleta.problemaDescrito,
                    diagnosticoTecnico: tarjetaCompleta.diagnosticoTecnico || '', // Preserve diagnosis safely
                    estado: datos.estado,
                    tecnicoId: tarjetaCompleta.tecnicoId,
                    tecnicoNombre: tarjetaCompleta.tecnicoNombre,
                    fechaRegistro: tarjetaCompleta.fechaRegistro
                };

                console.log("📦 Payload a enviar:", payload);

                if (datos.estado === 'FINALIZADO' && !tarjetaCompleta.fechaFinalizacion) {
                    payload.fechaFinalizacion = new Date().toISOString().split('T')[0];
                }

                console.log(`🌐 Llamando a: ${auth.API_URL}/tarjetas/${datos.id}`);
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

            // --- EDICIÓN DE CLIENTE ---
            else if (formId === 'form-editar-cliente') {
                const numeroOriginal = datos.numeroOriginal;
                const payload = {
                    nombre: datos.nombre,
                    apellidos: datos.apellidos,
                    numeroCelular: datos.numeroCelular
                };
                await sendRequest(`${auth.API_URL}/clientes/${numeroOriginal}`, 'PUT', payload, token);
                mostrarAlerta('success', 'Cliente actualizado correctamente');
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

            // --- REGISTRO DE TARJETA (SERVICIO) ---
            else if (formId === 'form-registro-tarjeta') {
                // 1. GESTIÓN DE CLIENTE
                let clienteId = null;
                const celular = datos.clienteCelular;

                // Buscar cliente por celular
                try {
                    const resCliente = await fetch(`${auth.API_URL}/clientes/${celular}`, { headers: { 'Authorization': 'Bearer ' + token } });
                    if (resCliente.ok) {
                        const jsonCliente = await resCliente.json();
                        clienteId = (jsonCliente.data || jsonCliente).id;
                    }
                } catch (e) { console.warn("Cliente no encontrado, se creará uno nuevo."); }

                // Si no existe, crear cliente
                if (!clienteId) {
                    const payloadCliente = {
                        nombre: datos.clienteNombre,
                        apellidos: datos.clienteApellidos || '',
                        numeroCelular: celular,
                        email: '' // Opcional
                    };
                    const resNewCliente = await sendRequest(`${auth.API_URL}/clientes`, 'POST', payloadCliente, token);
                    clienteId = (resNewCliente.data || resNewCliente).id;
                }

                // 2. GESTIÓN DE MARCA
                let marcaId = null;
                const nombreMarca = datos.equipoMarca.trim();

                // Obtener todas las marcas y buscar por nombre (optimizar esto en backend luego)
                const resMarcas = await fetch(`${auth.API_URL}/marcas`, { headers: { 'Authorization': 'Bearer ' + token } });
                const jsonMarcas = await resMarcas.json();
                const marcas = jsonMarcas.data || jsonMarcas;
                // Backend returns 'nombreMarca', so we check that property
                const marcaExistente = marcas.find(m => m.nombreMarca.toLowerCase() === nombreMarca.toLowerCase());

                if (marcaExistente) {
                    marcaId = marcaExistente.id;
                } else {
                    // Backend expects 'nombreMarca' in body
                    const resNewMarca = await sendRequest(`${auth.API_URL}/marcas`, 'POST', { nombreMarca: nombreMarca }, token);
                    marcaId = (resNewMarca.data || resNewMarca).id;
                }

                // 3. CREAR EQUIPO
                const payloadEquipo = {
                    clienteId: clienteId,
                    marcaId: marcaId,
                    tipoEquipo: datos.equipoTipo,
                    modelo: datos.equipoModelo,
                    numeroSerie: datos.equipoSerie || ''
                };
                const resEquipo = await sendRequest(`${auth.API_URL}/equipos`, 'POST', payloadEquipo, token);
                const equipoId = (resEquipo.data || resEquipo).id;

                // 4. CREAR SERVICIO (TARJETA)
                const tecnicoId = datos.asignarTecnico; // Get tecnicoId from form data
                const payloadServicio = {
                    equipoId: equipoId,
                    tecnicoId: tecnicoId, // Send as string (UUID or whatever)
                    problemaReportado: datos.equipoProblema,
                    fechaRecepcion: datos.fechaRegistro // O usar new Date()
                };
                await sendRequest(`${auth.API_URL}/servicios`, 'POST', payloadServicio, token);

                mostrarAlerta('success', 'Servicio registrado exitosamente');
                exito = true;
            }

            // --- REGISTRO FINALIZADO ---
            else if (formId === 'form-registro-finalizado') {
                const tarjetaIdInput = form.querySelector('#finalizado-tarjeta-id');
                const nombreInput = form.querySelector('#finalizado-cliente-nombre');
                const celularInput = form.querySelector('#finalizado-cliente-celular');
                const marcaInput = form.querySelector('#finalizado-equipo-marca');
                const modeloInput = form.querySelector('#finalizado-equipo-modelo');
                const problemaInput = form.querySelector('#finalizado-equipo-problema');
                const selectTecnico = form.querySelector('#finalizado-asignar-tecnico');

                const payload = {
                    registroTarjetaId: tarjetaIdInput ? tarjetaIdInput.value : datos.registroTarjetaId,
                    nombreCliente: nombreInput ? nombreInput.value : datos.clienteNombre,
                    numeroCelular: celularInput ? celularInput.value : datos.clienteCelular,
                    marca: marcaInput ? marcaInput.value : datos.marca,
                    modelo: modeloInput ? modeloInput.value : datos.modelo,
                    problemaCambiado: problemaInput ? problemaInput.value : datos.problemaCambiado,
                    tecnicoId: selectTecnico ? selectTecnico.value : datos.tecnicoId,
                    tecnicoNombre: selectTecnico && selectTecnico.selectedIndex >= 0
                        ? selectTecnico.options[selectTecnico.selectedIndex].text
                        : '',
                    fechaEntrega: datos.fechaEntrega,
                    costoReparacion: parseFloat(datos.costoReparacion)
                };

                await sendRequest(`${auth.API_URL}/finalizado`, 'POST', payload, token);
                mostrarAlerta('success', 'Pedido finalizado exitosamente');
                exito = true;
            }

            // --- EDICIÓN DE FINALIZADO ---
            else if (formId === 'form-editar-finalizado') {
                console.log("📝 Editar finalizado - datos:", datos);
                const payload = {
                    problemaCambiado: datos.problemaCambiado,
                    fechaEntrega: datos.fechaEntrega,
                    costoReparacion: parseFloat(datos.costoReparacion)
                };
                console.log("📦 Payload PUT:", payload);
                console.log("🌐 URL PUT:", `${auth.API_URL}/finalizado/${datos.id}`);
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