document.addEventListener('DOMContentLoaded', function () {
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        document.body.appendChild(alertContainer);
    }

    async function _loadAlert(filePath, title, message) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Error 404: No se encontró el archivo ${filePath}`);
            }

            alertContainer.innerHTML = await response.text();

            if (title) {
                alertContainer.querySelector('#alert-title').textContent = title;
            }
            if (message) {
                alertContainer.querySelector('#alert-message').textContent = message;
            }

            alertContainer.querySelector('#alert-ok-btn').addEventListener('click', () => {
                alertContainer.innerHTML = '';
            });

        } catch (error) {
            console.error('Error al mostrar la alerta:', error);
        }
    }

    window.alerts = {
        /**
         * Muestra una alerta de éxito.
         * @param {string} message - El mensaje principal.
         * @param {string} [title="¡Éxito!"] - (Opcional) El título.
         */

        showSuccess: function (message, title = "¡Éxito!") {
            // Detecta automáticamente si estamos en una ruta profunda (usa rutas absolutas)
            const alertPath = 'assets/alerts/succesfull.html';
            _loadAlert(alertPath, title, message);
        },

        /**
         * Muestra una alerta de error.
         * @param {string} message - El mensaje de error.
         * @param {string} [title="Error"] - (Opcional) El título.
         */
        showError: function (message, title = "Error") {
            const alertPath = 'assets/alerts/error.html';
            _loadAlert(alertPath, title, message);
        },

        /**
         * Muestra una alerta de advertencia.
         * @param {string} message - El mensaje de advertencia.
         * @param {string} [title="Advertencia"] - (Opcional) El título.
         */
        showWarning: function (message, title = "Advertencia") {
            const alertPath = 'assets/alerts/warning.html';
            _loadAlert(alertPath, title, message);
        }
    };

    if (window.authUtils) {
        window.authUtils.showAlert = window.alerts.showError;
    }

});