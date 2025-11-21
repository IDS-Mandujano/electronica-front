# 📋 Guía de Sincronización de Estados - Status Helper

## Resumen
Se ha centralizado la gestión de indicadores de estado en `statusHelper.js` para garantizar **coherencia visual** entre Técnico, Gerente y todas las páginas de la aplicación.

## Estados Unificados

| Estado | Clase CSS | Color | Uso |
|--------|-----------|-------|-----|
| `EN_PROCESO` | `status-proceso` | Amarillo (#ffc107) | Reparación en progreso |
| `DIAGNOSTICO` | `status-proceso` | Amarillo (#ffc107) | En diagnóstico inicial |
| `PENDIENTE` | `status-pendiente` | Azul (#007bff) | Esperando acción |
| `PENDIENTE_ENTREGA` | `status-pendiente` | Azul (#007bff) | Pendiente de entregar |
| `FINALIZADO` | `status-finalizado` | Verde (#28a745) | Reparación completada |
| `ENTREGADO` | `status-pendiente` | Azul (#007bff) | Entregado al cliente |
| `CANCELADO` | `status-cancelado` | Rojo (#dc3545) | Reparación cancelada |

## Métodos Disponibles en `statusHelper`

### 1. `getEstadoClass(estado)`
Obtiene la clase CSS correspondiente a un estado.

```javascript
const clase = window.statusHelper.getEstadoClass('EN_PROCESO');
// Retorna: 'status-proceso'
```

### 2. `getEstadoColor(estado)`
Obtiene el color hexadecimal para un estado.

```javascript
const color = window.statusHelper.getEstadoColor('FINALIZADO');
// Retorna: '#28a745'
```

### 3. `getEstadoStyle(estado)`
Obtiene un objeto con clase y color.

```javascript
const style = window.statusHelper.getEstadoStyle('EN_PROCESO');
// Retorna: { class: 'status-proceso', color: '#ffc107', estado: 'EN_PROCESO' }
```

### 4. `createEstadoBadge(estado)`
Crea un span HTML con clase CSS (recomendado para tablas con `status-badge`).

```javascript
// Para usar con .status-badge en CSS
const html = window.statusHelper.createEstadoBadge('FINALIZADO');
// Retorna: '<span class="status-badge status-finalizado">FINALIZADO</span>'
```

### 5. `createEstadoInline(estado)`
Crea un span HTML con estilos inline (fallback).

```javascript
// Para uso directo sin dependencia de CSS
const html = window.statusHelper.createEstadoInline('FINALIZADO');
// Retorna: '<span style="color: #28a745; font-weight: bold;">FINALIZADO</span>'
```

### 6. `getEstadoClassLowercase(estado)`
Obtiene la clase CSS en formato lowercase (para compatibilidad con `status-container`).

```javascript
const clase = window.statusHelper.getEstadoClassLowercase('EN_PROCESO');
// Retorna: 'status-en_proceso'
```

## Ejemplos de Uso

### Ejemplo 1: En Tecnico.js (Usando colores inline)
```javascript
tarjetas.forEach(t => {
    const estadoStyle = window.statusHelper.getEstadoStyle(t.estado);
    const colorEstado = estadoStyle.color;
    
    row.innerHTML = `
        <td><span style="color: ${colorEstado}; font-weight: bold;">${t.estado}</span></td>
    `;
});
```

### Ejemplo 2: En Gerente.js (Usando status-badge)
```javascript
tarjetas.forEach(tarjeta => {
    const estadoClass = window.statusHelper.getEstadoClass(tarjeta.estado);
    
    row.innerHTML = `
        <td><span class="status-badge ${estadoClass}">${tarjeta.estado}</span></td>
    `;
});
```

### Ejemplo 3: En Pedidos.js (Usando status-container)
```javascript
pedidos.forEach(pedido => {
    const estadoClase = window.statusHelper.getEstadoClassLowercase(pedido.estado);
    
    row.innerHTML = `
        <div class="status-container">
            <span class="status ${estadoClase}"></span>
            <span>${pedido.estado}</span>
        </div>
    `;
});
```

## Cómo Integrar en Nuevas Páginas

1. **Incluir el script** en el HTML:
```html
<script src="/js/statusHelper.js"></script>
```

2. **Asegúrate de que cargue ANTES** que los scripts que lo usan:
```html
<script src="/js/auth.js"></script>
<script src="/js/statusHelper.js"></script>
<script src="/js/miPagina.js"></script>
```

3. **Usa uno de los métodos** en tu JavaScript:
```javascript
const estadoClass = window.statusHelper.getEstadoClass(estado);
```

## Páginas Actualizadas ✅

- `HomeTecnico.html` - Usa colores inline
- `HomeGerente.html` - Usa clases CSS con status-badge
- `Pedidos.html` - Usa status-container
- `tecnico.js` - Sincronizado ✓
- `gerente.js` - Sincronizado ✓
- `pedidos.js` - Sincronizado ✓

## Notas Importantes

- **Consistencia Visual**: Todos los estados ahora tienen los mismos colores en toda la aplicación
- **Mantenibilidad**: Cambiar un color o una clase ahora se hace en UN solo lugar
- **Flexibilidad**: Soporta múltiples formatos de presentación (inline, CSS classes, status-container)

## ¿Cómo Probar?

1. Abre el inspector de elementos (F12)
2. Ve a la consola y ejecuta:
```javascript
// Prueba el helper
console.log(window.statusHelper.getEstadoClass('EN_PROCESO'));
console.log(window.statusHelper.createEstadoBadge('FINALIZADO'));
```

3. Verifica que los colores de estado sean iguales en:
   - HomeTecnico.html
   - HomeGerente.html
   - Pedidos.html
