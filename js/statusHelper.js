/**
 * Helper centralizado para manejo de estados de tarjetas
 * Proporciona sincronización consistente entre Gerente y Técnico
 */

window.statusHelper = {
    /**
     * Mapea un estado a su clase CSS correspondiente
     * @param {string} estado - El estado de la tarjeta
     * @returns {string} - La clase CSS a usar
     */
    getEstadoClass: function(estado) {
        const estadoUpper = (estado || '').toUpperCase();
        
        switch (estadoUpper) {
            case 'EN_PROCESO':
            case 'DIAGNOSTICO':
                return 'status-proceso';
            
            case 'PENDIENTE':
                return 'status-pendiente';
            
            case 'FINALIZADO':
                return 'status-finalizado';
            
            case 'ENTREGADO':
            case 'PENDIENTE_ENTREGA':
                return 'status-pendiente';
            
            case 'CANCELADO':
                return 'status-cancelado';
            
            default:
                return 'status-default';
        }
    },

    /**
     * Obtiene el color hexadecimal para un estado
     * @param {string} estado - El estado de la tarjeta
     * @returns {string} - Color hexadecimal
     */
    getEstadoColor: function(estado) {
        const estadoUpper = (estado || '').toUpperCase();
        
        switch (estadoUpper) {
            case 'EN_PROCESO':
            case 'DIAGNOSTICO':
                return '#ffc107'; // Amarillo/Naranja
            
            case 'PENDIENTE':
                return '#007bff'; // Azul
            
            case 'FINALIZADO':
                return '#28a745'; // Verde
            
            case 'ENTREGADO':
            case 'PENDIENTE_ENTREGA':
                return '#007bff'; // Azul
            
            case 'CANCELADO':
                return '#dc3545'; // Rojo
            
            default:
                return '#6c757d'; // Gris
        }
    },

    /**
     * Obtiene la etiqueta visual para un estado (compatibilidad con CSS status-badge)
     * @param {string} estado - El estado de la tarjeta
     * @returns {Object} - Objeto con clase y color
     */
    getEstadoStyle: function(estado) {
        return {
            class: this.getEstadoClass(estado),
            color: this.getEstadoColor(estado),
            estado: estado
        };
    },

    /**
     * Crea un elemento span de estado con clase CSS
     * @param {string} estado - El estado de la tarjeta
     * @returns {string} - HTML del span
     */
    createEstadoBadge: function(estado) {
        const style = this.getEstadoStyle(estado);
        return `<span class="status-badge ${style.class}">${estado}</span>`;
    },

    /**
     * Crea un elemento span de estado con color inline (fallback)
     * @param {string} estado - El estado de la tarjeta
     * @returns {string} - HTML del span con estilos inline
     */
    createEstadoInline: function(estado) {
        const color = this.getEstadoColor(estado);
        return `<span style="color: ${color}; font-weight: bold;">${estado}</span>`;
    },

    /**
     * Retorna las configuraciones de contadores para que coincidan
     * @returns {Object} - Mapeo de estados a grupos de contadores
     */
    getCounterConfig: function() {
        return {
            'PENDIENTE': ['count-pendientes'],
            'DIAGNOSTICO': ['count-pendientes'],
            'EN_PROCESO': ['count-proceso'],
            'FINALIZADO': ['count-finalizadas'],
            'ENTREGADO': ['count-finalizadas'],
            'PENDIENTE_ENTREGA': ['count-finalizadas'],
            'CANCELADO': ['count-cancelados']
        };
    },

    /**
     * Obtiene la clase CSS en formato lowercase compatible con pedidos.js
     * @param {string} estado - El estado de la tarjeta
     * @returns {string} - Clase CSS lowercase (ej: status-en_proceso)
     */
    getEstadoClassLowercase: function(estado) {
        return `status-${(estado || '').toLowerCase()}`;
    }
};
