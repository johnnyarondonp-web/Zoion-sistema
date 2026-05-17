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
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\EmailVerificationController;
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
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,60');
Route::get('/about', fn () => Inertia::render('About'))->name('about');

// ── Rutas de Recuperación de Contraseña ───────────────────────────────
Route::get('/forgot-password', [PasswordResetController::class, 'showLinkRequestForm'])->name('password.request');
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLinkEmail'])->name('password.email');
Route::get('/reset-password/{token}', [PasswordResetController::class, 'showResetForm'])->name('password.reset');
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])->name('password.update');

/*
|--------------------------------------------------------------------------
| 2. Rutas Protegidas — Vistas cliente + APIs generales
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    // Logout
    Route::post('/logout', [AuthController::class, 'logout']);

    // General APIs (Backward compatibility + versioning)
    Route::get('/api/user/clinic-info', [UserController::class, 'clinicInfo']);
    Route::get('/api/v1/user/clinic-info', [UserController::class, 'clinicInfo']);

    // ── Verificación de Email ───────────────────────────────────────────
    Route::get('/email/verify', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])->middleware(['signed'])->name('verification.verify');
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])->middleware(['throttle:6,1'])->name('verification.send');

    // ── Vistas cliente ───────────────────────────────────────────────────
    Route::prefix('client')->middleware(['role:client', 'verified'])->group(function () {
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

    // ── APIs Generales (Compatibilidad /api/ y /api/v1/) ──────────────────
    $registerGeneralApis = function () {
        // API: Mascotas
        Route::get('/pets',                              [PetController::class, 'index']);
        Route::post('/pets',                             [PetController::class, 'store']);
        Route::get('/pets/{id}',                         [PetController::class, 'show']);
        Route::patch('/pets/{id}/toggle',                [PetController::class, 'toggleActive']);
        Route::patch('/pets/{id}',                       [PetController::class, 'update']);
        Route::put('/pets/{id}',                         [PetController::class, 'update']);
        Route::delete('/pets/{id}',                      [PetController::class, 'destroy']);
        Route::get('/pets/{id}/weight',                  [PetController::class, 'getWeight']);
        Route::post('/pets/{id}/weight',                 [PetController::class, 'addWeight']);
        Route::get('/pets/{id}/vaccinations',            [PetController::class, 'getVaccinations']);
        Route::post('/pets/{id}/vaccinations',           [PetController::class, 'addVaccination']);
        Route::get('/pets/{id}/health-summary',          [PetController::class, 'healthSummary']);

        // API: Servicios
        Route::get('/services',                     [ServiceController::class, 'index']);
        Route::get('/services/{id}',                [ServiceController::class, 'show']);

        // API: Fechas bloqueadas (lectura para cliente)
        Route::get('/blocked-dates',                [BlockedDateController::class, 'index']);
        Route::get('/special-open-dates',           [\App\Http\Controllers\SpecialOpenDateController::class, 'index']);

        // API: Disponibilidad de horarios
        Route::get('/availability',                 [AvailabilityController::class, 'index']);
        Route::get('/availability/schedule',        [AvailabilityController::class, 'schedule']);
        Route::get('/schedules',                    [ScheduleController::class, 'index']);

        // API: Citas
        Route::get('/appointments',                 [AppointmentController::class, 'index']);
        Route::post('/appointments',                [AppointmentController::class, 'store']);
        Route::get('/appointments/{id}',            [AppointmentController::class, 'show']);
        Route::patch('/appointments/{id}',          [AppointmentController::class, 'update']);
        Route::delete('/appointments/{id}',         [AppointmentController::class, 'destroy']);
        Route::post('/appointments/{id}/rating',    [AppointmentController::class, 'rate']);

        // API: Mensajes de citas
        Route::get('/appointments/{appointmentId}/messages',  [AppointmentMessageController::class, 'index']);
        Route::post('/appointments/{appointmentId}/messages', [AppointmentMessageController::class, 'store']);
        Route::patch('/appointments/{appointmentId}/messages/read', [AppointmentMessageController::class, 'markAsRead']);

        // API: Notas clínicas
        Route::get('/appointments/{appointmentId}/clinical-notes', [ClinicalNoteController::class, 'index']);
        Route::post('/appointments/{appointmentId}/clinical-notes',        [ClinicalNoteController::class, 'store']);
        Route::patch('/appointments/{appointmentId}/clinical-notes/{id}',  [ClinicalNoteController::class, 'update']);
        Route::delete('/appointments/{appointmentId}/clinical-notes/{id}', [ClinicalNoteController::class, 'destroy']);

        // API: Notificaciones
        Route::get('/notifications',                         [NotificationController::class, 'index']);
        Route::post('/notifications/read-all',               [NotificationController::class, 'markAllAsRead']);
        Route::post('/notifications/{id}/read',              [NotificationController::class, 'markAsRead']);

        // API: Perfil de usuario
        Route::get('/user/profile',                          [UserController::class, 'profile']);
        Route::patch('/user/profile',                        [UserController::class, 'updateProfile']);
        Route::post('/user/change-password',                 [UserController::class, 'changePassword']);

        // API: Preferencias de usuario
        Route::get('/user/preferences',                      [UserPreferenceController::class, 'index']);
        Route::put('/user/preferences',                      [UserPreferenceController::class, 'update']);

        // API: Upload
        Route::post('/upload',                               [UploadController::class, 'upload']);
    };

    Route::prefix('api')->group($registerGeneralApis);
    Route::prefix('api/v1')->group($registerGeneralApis);
});

/*
|--------------------------------------------------------------------------
| 3. Rutas de Administración (auth + ensure.staff)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'ensure.staff'])->group(function () {
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

    Route::get('/admin/calendar',      fn () => Inertia::render('Admin/Calendar'));
    Route::get('/admin/schedules',     fn () => Inertia::render('Admin/Schedules'));
    Route::get('/admin/blocked-dates', fn () => Inertia::render('Admin/BlockedDates'));
    Route::get('/admin/doctors',        fn () => Inertia::render('Admin/Doctors'));
    Route::get('/admin/receptionists',  fn () => Inertia::render('Admin/Receptionists'));
    Route::get('/admin/walk-in',        fn () => Inertia::render('Admin/WalkIn'));

    // ── APIs Administrativas (Compatibilidad /api/ y /api/v1/) ────────────
    $registerAdminApis = function () {
        Route::middleware('role:admin')->group(function () {
            Route::delete('/admin/clients/{id}',    [AdminClientController::class, 'destroy']);
            Route::delete('/blocked-dates/{id}',    [BlockedDateController::class, 'destroy']);

            // Gestión de servicios (Solo admin)
            Route::post('/services',                    [ServiceController::class, 'store']);
            Route::patch('/services/{id}',              [ServiceController::class, 'update']);
            Route::delete('/services/{id}',             [ServiceController::class, 'destroy']);

            // Gestión de médicos (Solo admin)
            Route::get('/admin/doctors',                      [DoctorController::class, 'index']);
            Route::post('/admin/doctors',                     [DoctorController::class, 'store']);
            Route::patch('/admin/doctors/{id}',               [DoctorController::class, 'update']);
            Route::delete('/admin/doctors/{id}',              [DoctorController::class, 'destroy']);
            Route::patch('/admin/doctors/{id}/toggle',        [DoctorController::class, 'toggleActive']);

            // Gestión de recepcionistas (Solo admin)
            Route::get('/admin/receptionists',                      [\App\Http\Controllers\ReceptionistController::class, 'index']);
            Route::post('/admin/receptionists',                     [\App\Http\Controllers\ReceptionistController::class, 'store']);
            Route::patch('/admin/receptionists/{id}',               [\App\Http\Controllers\ReceptionistController::class, 'update']);
            Route::delete('/admin/receptionists/{id}',              [\App\Http\Controllers\ReceptionistController::class, 'destroy']);
        });

        // API Admin: Dashboard & Reports
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/reports', [DashboardController::class, 'reports']);

        // API Admin: Clientes
        Route::get('/admin/clients',         [AdminClientController::class, 'index']);
        Route::get('/admin/clients/{id}',    [AdminClientController::class, 'show']);
        Route::patch('/admin/clients/{id}',  [AdminClientController::class, 'update']);

        // API Admin: Horarios
        Route::put('/schedules',  [ScheduleController::class, 'update']);

        // API Admin: Fechas bloqueadas
        Route::post('/blocked-dates',         [BlockedDateController::class, 'store']);
        Route::post('/special-open-dates',    [\App\Http\Controllers\SpecialOpenDateController::class, 'store']);
        Route::delete('/special-open-dates/{id}', [\App\Http\Controllers\SpecialOpenDateController::class, 'destroy']);

        // API Admin: Atención presencial (walk-in)
        Route::get('/admin/walk-in',                      [WalkInController::class, 'index']);
        Route::get('/admin/walk-in/search',               [WalkInController::class, 'search']);
        Route::post('/admin/walk-in',                     [WalkInController::class, 'store']);
        Route::patch('/admin/walk-in/{id}/payment',       [WalkInController::class, 'confirmPayment']);
    };

    Route::prefix('api')->group($registerAdminApis);
    Route::prefix('api/v1')->group($registerAdminApis);
});

// ── Panel del médico (rutas propias, solo role:doctor) ───────────────────────
Route::middleware(['auth', 'role:doctor'])->group(function () {
    Route::get('/doctor/agenda', fn () => Inertia::render('Doctor/Agenda'));
    Route::get('/doctor/agenda/{id}', fn () => Inertia::render('Doctor/Agenda', ['selectedAppointmentId' => request()->route('id')]));
    Route::get('/doctor/notifications', fn () => Inertia::render('Doctor/Notifications'));
    Route::get('/doctor/profile', fn () => Inertia::render('Doctor/Profile'));
});