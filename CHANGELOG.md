# CHANGELOG — Zoion sistema

Este archivo registra de forma estructurada y cronológica todos los cambios significativos, optimizaciones de rendimiento, parches de seguridad y mejoras en la documentación introducidas en la plataforma **Zoion**.

El proyecto sigue una convención de **Versionamiento Semántico Adaptado**:
*   **Mayor (`V4.0.0`)**: Cambios de gran escala, actualizaciones mayores del framework o rediseños de la arquitectura.
*   **Menor (`V3.9.0`)**: Nuevas funcionalidades mayores, optimizaciones críticas de rendimiento, adición de índices compuestos o capas de servicios.
*   **Parche (`V3.9.1`)**: Correcciones de bugs menores, parches rápidos, y mejoras menores en la documentación o tipografía.

---

## [V3.9.4] - 2026-05-17

### Añadido
- **API**: Creación de la colección de endpoints en `/docs/Zoion_API.postman_collection.json` conteniendo la estructura completa de rutas públicas, de clientes y de administración.
- **Documentación**: Incorporación de *docblocks* descriptivos a nivel de clase y método en los controladores `DashboardController`, `UploadController` y `WalkInController` para clarificar parámetros, flujos concurrentes, exclusión de N+1 y manejo de almacenamiento.

### Corregido
- **Documentación**: Corrección de discrepancia tecnológica en la tabla del `README.md` actualizando el stack frontend a **React 19** y **TypeScript 6** (en concordancia con las dependencias declaradas en `package.json`).

---

## [V3.9.3] - 2026-05-17

### Documentación
- **Dashboard**: Documentación del fix estratégico para solucionar el loop interno de 20 queries consecutivas en la carga inicial, garantizando que el equipo comprenda la optimización de agregación y el caching.

---

## [V3.9.2] - 2026-05-17

### Corregido
- **Modelos/Traits**: Corrección de la nomenclatura del Trait de ULIDs para estandarizar el nombrado consistente de clases generadoras de llaves en los modelos Eloquent.

---

## [V3.9.1] - 2026-05-17

### Optimizado
- **Procesos en Cola**: Optimización de la ejecución del sistema de Jobs para un procesamiento más ligero y eficiente.
- **Modelos**: Depuración y limpieza de campos redundantes en los modelos principales del sistema para evitar sobrecarga en la hidratación de datos.

---

## [V3.9.0] - 2026-05-16

### Añadido
- **Auditoría**: Culminación exitosa del primer audit completo de documentación técnica e infraestructura de la base de datos.

### Corregido
- **Finanzas**: Corrección en las consultas de cálculo de ingresos mensuales para contemplar estados atómicos de transacciones y estados de pago reales.

---

## [V3.8.9] - 2026-05-16

### Añadido
- **Documentación**: Resolución completa del primer lote de inconsistencias de documentación y alineación de guías de estilo para portafolio.

### Optimizado
- **Dashboard/UI**: Refactorización dinámica del comportamiento responsivo de los gráficos estadísticos del panel administrativo, asegurando visualización nativa y fluida en terminales móviles.

---

## [V3.8.8] - 2026-05-16

### Añadido
- **Pruebas**: Implementación de suites de prueba dedicadas para verificar la robustez de los flujos de autenticación (`auth`), aserciones para la subida segura de imágenes (`uploads`) y comprobación de lógica para impedir el solapamiento concurrente de citas médicas (`doctor availability`).
