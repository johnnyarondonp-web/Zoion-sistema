# 🐾 Zoion - Sistema de Gestión Veterinaria Premium

<p align="center">
  <img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="300" alt="Zoion Logo">
</p>

Zoion es una plataforma integral y moderna diseñada para revolucionar la gestión de clínicas veterinarias y el cuidado de mascotas. Construida con tecnologías de vanguardia, ofrece una experiencia de usuario fluida, segura y visualmente impactante tanto para administradores como para clientes.

## 🚀 Tecnologías Principales

- **Backend:** Laravel 13 (PHP 8.3+)
- **Frontend:** React 18 con TypeScript
- **Comunicación:** Inertia.js (SPA sin APIs complejas)
- **Estilos:** Tailwind CSS con componentes de Shadcn/ui
- **Animaciones:** Framer Motion (Micro-interacciones premium)
- **Iconografía:** Lucide React
- **Base de Datos:** PostgreSQL / MySQL / SQLite (Soporta múltiples drivers)

---

## ✨ Características Principales

### 👨‍⚕️ Panel de Administración (Veterinario)
- **Dashboard Inteligente:** Visualización en tiempo real de citas, ingresos, tasa de cancelación y mensajes pendientes.
- **Gestión de Clientes:** Control total sobre los perfiles de propietarios y sus mascotas asociadas.
- **Calendario Avanzado:** Vista mensual y diaria de citas con drag-and-drop y estados dinámicos.
- **Ficha Médica Detallada:** Acceso inmediato a historiales, pesos, vacunas y notas clínicas.
- **Control de Horarios:** Gestión flexible de aperturas, cierres y fechas bloqueadas (vacaciones, feriados).

### 🐕 Portal del Cliente (Propietario)
- **Mis Mascotas:** Galería visual de mascotas con detalles de salud y seguimiento de peso.
- **Wizard de Citas:** Proceso de agendamiento en 3 pasos con validación de disponibilidad en tiempo real.
- **Historial de Salud:** Acceso a registros de vacunación y resumen de visitas anteriores.
- **Perfil Personalizado:** Gestión de datos de contacto y seguridad.

### 💬 Comunicación y Notificaciones
- **Chat en Tiempo Real:** Sistema de mensajería interna entre el cliente y la clínica.
- **Notificaciones Dinámicas:** Avisos sobre cambios en el estado de citas y nuevos mensajes.

---

## 🛠️ Instalación y Configuración

### Requisitos Previos
- PHP >= 8.3
- Composer
- Node.js & NPM
- Servidor de Base de Datos

### Pasos para el despliegue local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/zoion-sistema.git
   cd zoion-sistema
   ```

2. **Instalar dependencias de PHP:**
   ```bash
   composer install
   ```

3. **Instalar dependencias de JavaScript:**
   ```bash
   npm install
   ```

4. **Configurar el entorno:**
   ```bash
   copy .env.example .env
   # Configura tus credenciales de base de datos en el archivo .env
   ```

5. **Generar la clave de aplicación:**
   ```bash
   php artisan key:generate
   ```

6. **Ejecutar migraciones y seeders:**
   ```bash
   php artisan migrate --seed
   ```

7. **Compilar assets:**
   ```bash
   npm run build
   ```

8. **Iniciar servidor:**
   ```bash
   php artisan serve
   ```

---

## 🏗️ Estructura del Proyecto

- `app/Models`: Modelos de Eloquent con relaciones robustas (Pet, User, Appointment, Service).
- `app/Http/Controllers`: Lógica de negocio segmentada por roles (Admin, Client, Auth).
- `resources/js/pages`: Componentes de React organizados por módulos de la aplicación.
- `resources/js/components/ui`: Componentes de interfaz reutilizables basados en Shadcn.
- `routes/web.php`: Definición de rutas protegidas por middleware de roles.

---

## 🔒 Seguridad y Validaciones

- **Validación en Tiempo Real:** Filtros inteligentes en formularios de registro para evitar datos inválidos (Nombres sin números, teléfonos con formato internacional).
- **Control de Acceso (RBAC):** Middleware personalizado para asegurar que los clientes no accedan a funciones administrativas.
- **Sanitización de Datos:** Implementación estricta de validaciones en el backend para integridad de la base de datos.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**.

---

<p align="center"> Desarrollado con ❤️ para amantes de los animales. </p>
