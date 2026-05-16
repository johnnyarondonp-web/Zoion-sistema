<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PetController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\BlockedDateController;
use App\Http\Controllers\AvailabilityController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ClinicalNoteController;
use App\Http\Controllers\AppointmentMessageController;
use App\Http\Controllers\AdminClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\WalkInController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Api\UserPreferenceController;
use App\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| 1. Rutas Públicas (No requieren Login)
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    if (auth()->check()) {
        $role = auth()->user()->role;
        if ($role === 'admin' || $role === 'receptionist') {
            return redirect('/admin/dashboard');
        }
        if ($role === 'doctor') {
            return redirect('/doctor/agenda');
        }
        return redirect('/client/pets');
    }
    return Inertia::render('Home');
});
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::get('/register', [AuthController::class, 'showRegister']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/about', fn () => Inertia::render('About'))->name('about');

/*
|--------------------------------------------------------------------------
| 2. Rutas Protegidas — Vistas cliente + APIs generales
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    // Logout
    Route::post('/logout', [AuthController::class, 'logout']);

    // General APIs
    Route::get('/api/user/clinic-info', [UserController::class, 'clinicInfo']);

    // ── Vistas cliente ───────────────────────────────────────────────────
    Route::prefix('client')->group(function () {
        Route::get('/home',                               fn () => Inertia::render('Client/Home'));
        Route::get('/pets',                               fn () => Inertia::render('Client/Pets'));
        Route::get('/pets/new',                           fn () => Inertia::render('Client/PetForm', ['mode' => 'create']));
        Route::get('/pets/{id}',                          fn () => Inertia::render('Client/PetDetail', ['petId' => request()->route('id')]));
        Route::get('/pets/{id}/edit',                     fn () => Inertia::render('Client/PetForm', ['mode' => 'edit', 'petId' => request()->route('id')]));
        Route::get('/appointments',                       fn () => Inertia::render('Client/Appointments'));
        Route::get('/appointments/new',                   fn () => Inertia::render('Client/BookingWizard'));
        Route::get('/appointments/{id}',                  fn () => Inertia::render('Client/AppointmentDetail', [
            'appointmentId' => request()->route('id'),
        ]));
        Route::get('/appointments/reschedule/{id}',       fn () => Inertia::render('Client/Reschedule'));
        Route::get('/profile',                            fn () => Inertia::render('Client/Profile'));
        Route::get('/services',                           fn () => Inertia::render('Client/Services'));
        Route::get('/booking',                            fn () => Inertia::render('Client/BookingWizard'));
        Route::get('/emergency',                          fn () => Inertia::render('Client/Emergency'));
        Route::get('/about',                              fn () => Inertia::render('About'));
    });

    // ── API: Mascotas ────────────────────────────────────────────────────
    Route::get('/api/pets',                              [PetController::class, 'index']);
    Route::post('/api/pets',                             [PetController::class, 'store']);
    Route::get('/api/pets/{id}',                         [PetController::class, 'show']);
    
    // ✅ CAMBIO 3: Ruta específica para toggle ANTES del PATCH genérico
    Route::patch('/api/pets/{id}/toggle',                [PetController::class, 'toggleActive']);
    
    Route::patch('/api/pets/{id}',                       [PetController::class, 'update']);
    Route::put('/api/pets/{id}',                         [PetController::class, 'update']);
    Route::delete('/api/pets/{id}',                      [PetController::class, 'destroy']);
    Route::get('/api/pets/{id}/weight',                  [PetController::class, 'getWeight']);
    Route::post('/api/pets/{id}/weight',                 [PetController::class, 'addWeight']);
    Route::get('/api/pets/{id}/vaccinations',            [PetController::class, 'getVaccinations']);
    Route::post('/api/pets/{id}/vaccinations',           [PetController::class, 'addVaccination']);
    Route::get('/api/pets/{id}/health-summary',          [PetController::class, 'healthSummary']);

    // ── API: Servicios ───────────────────────────────────────────────────
    Route::get('/api/services',                     [ServiceController::class, 'index']);
    Route::get('/api/services/{id}',                [ServiceController::class, 'show']);

    // ── API: Fechas bloqueadas (lectura para cliente) ─────────────────────
    Route::get('/api/blocked-dates',                [BlockedDateController::class, 'index']);

    // ── API: Disponibilidad de horarios ──────────────────────────────────
    Route::get('/api/availability',                 [AvailabilityController::class, 'index']);
    Route::get('/api/availability/schedule',        [AvailabilityController::class, 'schedule']);
    Route::get('/api/schedules',                    [ScheduleController::class, 'index']);

    // ── API: Citas ───────────────────────────────────────────────────────
    Route::get('/api/appointments',                 [AppointmentController::class, 'index']);
    Route::post('/api/appointments',                [AppointmentController::class, 'store']);
    Route::get('/api/appointments/{id}',            [AppointmentController::class, 'show']);
    Route::patch('/api/appointments/{id}',          [AppointmentController::class, 'update']);
    Route::delete('/api/appointments/{id}',         [AppointmentController::class, 'destroy']);
    Route::post('/api/appointments/{id}/rating',    [AppointmentController::class, 'rate']);

    // ── API: Mensajes de citas ───────────────────────────────────────────
    Route::get('/api/appointments/{appointmentId}/messages',  [AppointmentMessageController::class, 'index']);
    Route::post('/api/appointments/{appointmentId}/messages', [AppointmentMessageController::class, 'store']);
    Route::patch('/api/appointments/{appointmentId}/messages/read', [AppointmentMessageController::class, 'markAsRead']);

    // ── API: Notas clínicas ───────────────────────
    Route::get('/api/appointments/{appointmentId}/clinical-notes', [ClinicalNoteController::class, 'index']);
    Route::post('/api/appointments/{appointmentId}/clinical-notes',        [ClinicalNoteController::class, 'store']);
    Route::patch('/api/appointments/{appointmentId}/clinical-notes/{id}',  [ClinicalNoteController::class, 'update']);
    Route::delete('/api/appointments/{appointmentId}/clinical-notes/{id}', [ClinicalNoteController::class, 'destroy']);

    // ── API: Notificaciones ──────────────────────────────────────────────
    Route::get('/api/notifications',                         [NotificationController::class, 'index']);
    Route::post('/api/notifications/read-all',               [NotificationController::class, 'markAllAsRead']);
    Route::post('/api/notifications/{id}/read',              [NotificationController::class, 'markAsRead']);

    // ── API: Perfil de usuario ───────────────────────────────────────────
    Route::get('/api/user/profile',                          [UserController::class, 'profile']);
    Route::patch('/api/user/profile',                        [UserController::class, 'updateProfile']);
    Route::post('/api/user/change-password',                 [UserController::class, 'changePassword']);

    // ── API: Preferencias de usuario ─────────────────────────────────────
    Route::get('/api/user/preferences',                      [UserPreferenceController::class, 'index']);
    Route::put('/api/user/preferences',                      [UserPreferenceController::class, 'update']);

    // ── API: Upload ──────────────────────────────────────────────────────
    Route::post('/api/upload',                               [UploadController::class, 'upload']);
});

/*
|--------------------------------------------------------------------------
| 3. Rutas de Administración (auth + ensure.admin)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'ensure.admin'])->group(function () {
    // ── Vistas admin ─────────────────────────────────────────────────────
    Route::get('/admin/dashboard',     fn () => Inertia::render('Admin/Dashboard'));
    Route::get('/admin/notifications', fn () => Inertia::render('Admin/Notifications'));
    Route::get('/admin/profile',       fn () => Inertia::render('Admin/Profile'));
    Route::get('/admin/appointments',               fn () => Inertia::render('Admin/Appointments'));
    Route::get('/admin/appointments/{id}',          fn () => Inertia::render('Admin/Appointments', ['selectedAppointmentId' => request()->route('id')]));
    Route::get('/admin/pets',                       fn () => Inertia::render('Admin/Pets'));
    Route::get('/admin/clients',                    fn () => Inertia::render('Admin/Clients'));
    Route::get('/admin/clients/{id}',  fn () => Inertia::render('Admin/ClientDetail', ['clientId' => request()->route('id')]));
    Route::get('/admin/services',      fn () => Inertia::render('Admin/Services'));
    Route::get('/admin/services/new',  fn () => Inertia::render('Admin/ServiceForm', ['mode' => 'create']));
    Route::get('/admin/services/{id}/edit', fn () => Inertia::render('Admin/ServiceForm', ['mode' => 'edit', 'serviceId' => request()->route('id')]));
    Route::get('/admin/reports',       fn () => Inertia::render('Admin/Reports'));
    Route::get('/admin/settings',      fn () => Inertia::render('Admin/Settings'));

    // ── API Admin: Acciones Críticas (Admin Only) ───────────────────────
    Route::middleware('role:admin')->group(function () {
        Route::delete('/api/admin/clients/{id}',    [AdminClientController::class, 'destroy']);
        Route::delete('/api/blocked-dates/{id}',    [BlockedDateController::class, 'destroy']);
    });
    Route::get('/admin/calendar',      fn () => Inertia::render('Admin/Calendar'));
    Route::get('/admin/schedules',     fn () => Inertia::render('Admin/Schedules'));
    Route::get('/admin/blocked-dates', fn () => Inertia::render('Admin/BlockedDates'));

    // ── API Admin: Dashboard & Reports ───────────────────────────────────
    Route::get('/api/dashboard', [DashboardController::class, 'index']);
    Route::get('/api/reports', [DashboardController::class, 'reports']);

    // ── API Admin: Servicios ─────────────────────────────────────────────
    Route::post('/api/services',                    [ServiceController::class, 'store']);
    Route::patch('/api/services/{id}',              [ServiceController::class, 'update']);
    Route::delete('/api/services/{id}',             [ServiceController::class, 'destroy']);

    // ── API Admin: Clientes ──────────────────────────────────────────────
    Route::get('/api/admin/clients',         [AdminClientController::class, 'index']);
    Route::get('/api/admin/clients/{id}',    [AdminClientController::class, 'show']);
    Route::patch('/api/admin/clients/{id}',  [AdminClientController::class, 'update']);

    // ── API Admin: Horarios ──────────────────────────────────────────────
    Route::put('/api/schedules',  [ScheduleController::class, 'update']);

    // ── API Admin: Fechas bloqueadas ─────────────────────────────────────
    Route::post('/api/blocked-dates',         [BlockedDateController::class, 'store']);

    // ── Vista + API Admin: Médicos ────────────────────────────────────────
    Route::get('/admin/doctors',                          fn () => Inertia::render('Admin/Doctors'));
    Route::get('/api/admin/doctors',                      [DoctorController::class, 'index']);
    Route::post('/api/admin/doctors',                     [DoctorController::class, 'store']);
    Route::patch('/api/admin/doctors/{id}',               [DoctorController::class, 'update']);
    Route::delete('/api/admin/doctors/{id}',              [DoctorController::class, 'destroy']);
    Route::patch('/api/admin/doctors/{id}/toggle',        [DoctorController::class, 'toggleActive']);

    // ── Vista + API Admin: Recepcionistas ─────────────────────────────────
    Route::get('/admin/receptionists',                          fn () => Inertia::render('Admin/Receptionists'));
    Route::get('/api/admin/receptionists',                      [\App\Http\Controllers\ReceptionistController::class, 'index']);
    Route::post('/api/admin/receptionists',                     [\App\Http\Controllers\ReceptionistController::class, 'store']);
    Route::patch('/api/admin/receptionists/{id}',               [\App\Http\Controllers\ReceptionistController::class, 'update']);
    Route::delete('/api/admin/receptionists/{id}',              [\App\Http\Controllers\ReceptionistController::class, 'destroy']);

    // ── Vista + API Admin: Atención presencial (walk-in) ─────────────────
    Route::get('/admin/walk-in',                          fn () => Inertia::render('Admin/WalkIn'));
    Route::get('/api/admin/walk-in',                      [WalkInController::class, 'index']);
    Route::get('/api/admin/walk-in/search',               [WalkInController::class, 'search']);
    Route::post('/api/admin/walk-in',                     [WalkInController::class, 'store']);
    Route::patch('/api/admin/walk-in/{id}/payment',       [WalkInController::class, 'confirmPayment']);
});

// ── Panel del médico (rutas propias, solo role:doctor) ───────────────────────
Route::middleware(['auth', 'role:doctor'])->group(function () {
    Route::get('/doctor/agenda', fn () => Inertia::render('Doctor/Agenda'));
    Route::get('/doctor/agenda/{id}', fn () => Inertia::render('Doctor/Agenda', ['selectedAppointmentId' => request()->route('id')]));
    Route::get('/doctor/notifications', fn () => Inertia::render('Doctor/Notifications'));
    Route::get('/doctor/profile', fn () => Inertia::render('Doctor/Profile'));
});