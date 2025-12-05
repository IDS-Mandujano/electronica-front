// =========================================
// CONFIGURACIÓN DE LA API
// =========================================
const API_URL = 'http://52.21.162.65:7000/api';

// =========================================
// UTILIDADES
// =========================================

// Guardar datos de usuario en localStorage
function saveUserData(userData) {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userId', userData.userId);
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('userName', userData.nombreCompleto);
    localStorage.setItem('userType', userData.tipo);
}

// Obtener datos de usuario de localStorage
function getUserData() {
    return {
        token: localStorage.getItem('token'),
        userId: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail'),
        name: localStorage.getItem('userName'),
        type: localStorage.getItem('userType')
    };
}

// Limpiar datos de usuario
function clearUserData() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType');
}

// Verificar si el usuario está autenticado
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return token !== null && token !== '';
}

// Cerrar sesión completamente
function logout() {
    localStorage.clear();
    sessionStorage.clear();

    alert('Has cerrado sesión correctamente.');

    window.location.href = 'index.html';
}

// Mostrar alerta bonita
function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.className = `alert-box ${type}`;
    alertBox.style.display = 'block';
    alertBox.style.opacity = '1';

    setTimeout(() => {
        alertBox.style.opacity = '0';
        setTimeout(() => (alertBox.style.display = 'none'), 300);
    }, 3000);
}

// Reemplazar showError y alert
function showError(message, elementId = 'errorMessage') {
    showAlert(message, 'error');
}


// Ocultar mensaje de error
function hideError(elementId = 'errorMessage') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Mostrar loading en botón
function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = 'Cargando...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

// =========================================
// MANEJO DEL LOGIN
// =========================================
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = event.target.querySelector('button[type="submit"]');

    // Validaciones básicas
    if (!email || !password) {
        showError('Por favor, completa todos los campos');
        return;
    }

    hideError();
    setButtonLoading(submitButton, true);

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                correoElectronico: email,
                contrasena: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al iniciar sesión');
        }

        if (data.success && data.data) {
            // Guardar datos del usuario
            saveUserData(data.data);

            // Redireccionar según el tipo de usuario
            redirectByUserType(data.data.tipo);
        } else {
            throw new Error('Respuesta inválida del servidor');
        }

    } catch (error) {
        console.error('Error en login:', error);
        showError(error.message || 'Error al conectar con el servidor');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// =========================================
// MANEJO DEL REGISTRO
// =========================================
async function handleRegister(event) {
    event.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const tipo = document.getElementById('tipo').value;
    const submitButton = event.target.querySelector('button[type="submit"]');

    // Validaciones básicas
    if (!fullname || !email || !password || !tipo) {
        showError('Por favor, completa todos los campos', 'errorMessage');
        return;
    }

    if (password.length < 8) {
        showError('La contraseña debe tener al menos 8 caracteres', 'errorMessage');
        return;
    }

    hideError('errorMessage');
    setButtonLoading(submitButton, true);

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nombreCompleto: fullname,
                correoElectronico: email,
                contrasena: password,
                tipo: tipo
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al registrarse');
        }

        if (data.success && data.data) {
            alert('Registro exitoso. Ahora puedes iniciar sesión.');
            window.location.href = 'login.html';
        } else {
            throw new Error('Respuesta inválida del servidor');
        }

    } catch (error) {
        console.error('Error en registro:', error);
        showError(error.message || 'Error al conectar con el servidor', 'errorMessage');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// =========================================
// REDIRECCIÓN POR TIPO DE USUARIO
// =========================================
function redirectByUserType(userType) {
    switch (userType.toLowerCase()) {
        case 'gerente':
        case 'administrador':
            window.location.href = 'HomeGerente.html';
            break;
        case 'tecnico':
        case 'estudiante':
            window.location.href = 'HomeTecnico.html';
            break;
        case 'docente':
            // Puedes elegir a qué vista va el docente
            window.location.href = 'HomeTecnico.html';
            break;
        default:
            // Por defecto, ir a vista de técnico
            window.location.href = 'HomeTecnico.html';
            break;
    }
}

// =========================================
// PROTECCIÓN DE PÁGINAS
// =========================================
function protectPage(allowedTypes = []) {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }

    const userData = getUserData();

    // Si se especifican tipos permitidos, verificar
    if (allowedTypes.length > 0) {
        const userTypeNormalized = userData.type.toLowerCase();
        const allowed = allowedTypes.some(type =>
            type.toLowerCase() === userTypeNormalized
        );

        if (!allowed) {
            // Redirigir a la página correcta según su tipo
            redirectByUserType(userData.type);
            return false;
        }
    }

    return true;
}

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', function () {

    // === MANEJO DEL LOGIN ===
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // === MANEJO DEL REGISTRO ===
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // === MANEJO DE LOGOUT ===
    const logoutButtons = document.querySelectorAll('.logout, .cerrar-sesion');

    logoutButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('¿Deseas cerrar sesión y salir del sistema?')) {
                logout();
            }
        });
    });


    // === MOSTRAR DATOS DE USUARIO ===
    if (isAuthenticated()) {
        const userData = getUserData();

        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = userData.name;
        });

        const userTypeElements = document.querySelectorAll('.user-type-display');
        userTypeElements.forEach(element => {
            element.textContent = userData.type.charAt(0).toUpperCase() + userData.type.slice(1);
        });
    }

    // === REDIRECCIONAR SI YA ESTÁ AUTENTICADO ===
    const currentPage = window.location.pathname;
    // Check if we are on login or register page
    // Note: window.location.pathname might be full path in file:// protocol, so we check inclusion
    if ((currentPage.includes('login.html') || currentPage.includes('register.html')) && isAuthenticated()) {
        const userData = getUserData();
        redirectByUserType(userData.type);
    }
});

// =========================================
// EXPORTAR FUNCIONES GLOBALES
// =========================================
window.authUtils = {
    saveUserData,
    getUserData,
    clearUserData,
    isAuthenticated,
    logout,
    protectPage,
    redirectByUserType,
    API_URL,
    setButtonLoading,
    showAlert
};