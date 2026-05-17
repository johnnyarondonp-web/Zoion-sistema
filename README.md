# Zoion — Sistema de Gestión Veterinaria

<p align="center">
  <img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="300" alt="Zoion Logo">
</p>

Zoion es una plataforma integral diseñada para optimizar la gestión de clínicas veterinarias. Construida con tecnologías de vanguardia, ofrece una experiencia de usuario fluida, segura y visualmente impactante tanto para administradores como para clientes.

---

## 🚀 Tecnologías Principales

| Capa | Tecnología |
|---|---|
| Backend | Laravel 13 (PHP 8.3+) |
| Frontend | React 19 + TypeScript 6 |
| Comunicación | Inertia.js |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Animaciones | Framer Motion |
| Base de Datos | PostgreSQL (principal) · MySQL · SQLite (tests) |
| Autenticación | Laravel Sanctum + verificación de email |
| Caché / Locks | Redis (producción) · driver database (desarrollo) |

---

## ✨ Módulos del Sistema

### 👨‍⚕️ Panel de Administración
- **Dashboard Inteligente:** Métricas en tiempo real de citas, ingresos, tasa de cancelación y mensajes.
- **Calendario Avanzado:** Vista mensual/diaria con drag-and-drop y estados dinámicos.
- **Equipo Médico:** Alta, edición y activación/desactivación de doctores con asignación de servicios.
- **Recepcionistas:** Gestión de personal de recepción con roles y contraseñas.
- **Reportes:** Gráficos de citas por estado, ingresos por periodo y distribución de servicios.
- **Walk-in:** Registro de citas presenciales con asignación automática de médico por round-robin.
- **Configuración:** Horarios, datos de clínica, fechas bloqueadas y preferencias de notificación.

### 🐕 Portal del Cliente
- **Mis Mascotas:** Galería visual con ficha médica completa, historial de pesos y vacunaciones.
- **Wizard de Citas:** Agendamiento en 3 pasos con validación de disponibilidad en tiempo real.
- **Historial de Citas:** Acceso a registros de visitas anteriores con notas del médico.
- **Perfil:** Gestión de datos de contacto y seguridad de cuenta.

### 🩺 Portal del Médico
- **Agenda:** Vista de citas asignadas del día con acceso a ficha de la mascota.
- **Notas Clínicas:** Registro de observaciones por cita directamente desde la agenda.

### 💬 Comunicación
- **Chat interno:** Mensajería entre cliente y clínica.
- **Notificaciones:** Avisos de cambios de estado de citas y mensajes nuevos.

---

## 🛠️ Instalación y Configuración Local

### Requisitos Previos

- PHP >= 8.3 con extensiones: `gd`, `pdo_pgsql` (o `pdo_mysql`), `redis` (opcional)
- Composer >= 2.x
- Node.js >= 20 + NPM
- PostgreSQL >= 14 (o MySQL 8)

### Pasos para el Despliegue Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/johnnyarondonp-web/Zoion-sistema.git
cd Zoion-sistema

# 2. Instalar dependencias PHP
composer install

# 3. Instalar dependencias JavaScript
npm install

# 4. Configurar el entorno
cp .env.example .env
```

### Configuración del archivo `.env`

Edita el `.env` generado con tus valores locales. Las variables críticas son:

```env
APP_NAME="Zoion"
APP_URL=http://localhost:8000

# Base de Datos (PostgreSQL)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=zoion
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña

# Correo (Mailtrap para desarrollo, SMTP real para producción)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=tu_usuario_mailtrap
MAIL_PASSWORD=tu_password_mailtrap

# Sesiones (Para Producción)
SESSION_DOMAIN=null # Al deployar: SESSION_DOMAIN=.tu-dominio.com para restringir cookies al dominio.
MAIL_FROM_ADDRESS="noreply@zoion.app"
MAIL_FROM_NAME="Zoion"

# Caché y Colas (Redis opcional, cae a 'database' sin él)
CACHE_DRIVER=database
QUEUE_CONNECTION=sync
SESSION_DRIVER=database

# Redis (solo si está instalado)
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
```

### Finalizar la Instalación

```bash
# 5. Generar la clave de aplicación
php artisan key:generate

# 6. Crear las tablas y poblar con datos de prueba
php artisan migrate --seed

# 7. Enlazar el storage público (para fotos de mascotas y médicos)
php artisan storage:link

# 8. Compilar los assets del frontend
npm run build

# 9. Iniciar el servidor de desarrollo
php artisan serve
```

El sistema estará disponible en `http://localhost:8000`.

### Credenciales de Prueba (Seeder)

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@zoion.app | password |
| Cliente demo | cliente@zoion.app | password |
| Doctor demo | doctor@zoion.app | password |

> Las credenciales exactas dependen del contenido actual de `database/seeders/`.

---

## 🧪 Ejecutar las Pruebas

El proyecto usa **PHPUnit** con una base de datos SQLite en memoria, lo que garantiza que los tests no afectan tu base de datos de desarrollo.

```bash
# Ejecutar toda la suite de pruebas
php artisan test

# Alternativamente, con PHPUnit directamente
vendor/bin/phpunit

# Ejecutar un archivo de test específico
php artisan test --filter ZoionBugFixesTest
```

> La suite actual cubre: autenticación, ciclo de vida de citas, notificaciones, walk-in, asignación de médicos y protecciones de mass assignment. Los tests marcan como `skipped` los casos que dependen de infraestructura externa (Redis real).

---

## 📡 Documentación de la API

El sistema expone **~40 endpoints REST** bajo `/api/*`, protegidos con autenticación Sanctum + middleware de roles (`admin`, `receptionist`, `doctor`, `client`).

Una colección de Postman con todos los endpoints, ejemplos de payload y variables de entorno está disponible en:

```
/docs/Zoion_API.postman_collection.json
```

Importa ese archivo en Postman y configura la variable `{{base_url}}` apuntando a tu instancia local (`http://localhost:8000`).

### Grupos de Endpoints Principales

| Prefijo | Descripción | Roles |
|---|---|---|
| `POST /api/auth/*` | Registro, login, verificación de email, reset de contraseña | Público |
| `GET/POST /api/pets` | CRUD de mascotas, historial de pesos y vacunaciones | client, admin |
| `GET/POST /api/appointments` | Ciclo de vida de citas (crear, confirmar, cancelar, completar) | Todos autenticados |
| `GET /api/availability` | Slots libres por fecha y servicio | Todos autenticados |
| `GET/POST /api/admin/*` | Dashboard, clientes, médicos, recepcionistas, reportes, walk-in | admin, receptionist |
| `GET /api/doctor/appointments` | Agenda del médico autenticado | doctor |
| `POST /api/walk-in/*` | Citas presenciales y confirmación de pago | admin, receptionist |

---

## 🏗️ Estructura del Proyecto

```
app/
├── Http/
│   ├── Controllers/        # Lógica HTTP segmentada por rol y dominio
│   └── Middleware/         # RBAC: RoleMiddleware, EnsureEmailVerified
├── Models/                 # Eloquent: Pet, User, Appointment, Doctor, Service…
├── Services/               # AppointmentService: reglas de negocio centralizadas
resources/
├── js/
│   ├── pages/
│   │   ├── Admin/          # Componentes del panel de administración
│   │   ├── Client/         # Portal del cliente (citas, mascotas, perfil)
│   │   └── Doctor/         # Agenda y perfil del médico
│   └── components/ui/      # Componentes reutilizables (shadcn/ui)
routes/
├── web.php                 # Rutas Inertia protegidas por rol
└── api.php                 # Rutas REST de la API
database/
├── migrations/             # Historial completo del esquema
└── seeders/                # Datos de prueba y rol inicial de admin
```

---

## ⚙️ Reglas de Negocio Clave

| Regla | Implementación |
|---|---|
| **Asignación de médico (round-robin)** | `AppointmentService::assignDoctor()` — elige el médico activo con menos citas confirmadas hoy para el servicio solicitado |
| **Bloqueo de anticipación (2h)** | `AppointmentService` rechaza citas nuevas cuando quedan menos de 2 horas para el slot seleccionado |
| **Prevención de doble-booking** | `Cache::lock($slotKey, 10)` serializa peticiones concurrentes al mismo slot; re-verifica capacidad dentro del lock |
| **Walk-in sin cuenta** | `WalkInController::store()` hace upsert de `WalkInClient` por teléfono, garantizando que los datos del cliente se actualizan en visitas recurrentes sin duplicar registros |
| **Verificación de email** | Los clientes no pueden agendar citas hasta verificar su correo electrónico post-registro |

---

## 🔒 Seguridad

- **RBAC con Middleware:** Cada grupo de rutas está protegido por `RoleMiddleware` que verifica el campo `role` del usuario autenticado.
- **Mass Assignment:** Todos los modelos declaran `$fillable` explícito. Ningún modelo usa `$guarded = []`.
- **Sanitización de Entradas:** Validaciones Laravel (`FormRequest` + reglas inline) en todos los endpoints de escritura.
- **ULID como Primary Key:** Todos los modelos usan ULIDs en lugar de IDs enteros secuenciales para evitar enumeración de recursos.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**.


