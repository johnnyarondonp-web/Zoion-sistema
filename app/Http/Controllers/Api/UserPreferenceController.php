<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserPreferenceController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        
        return response()->json([
            'success' => true,
            'data' => [
                'emailNotifications' => $user->email_notifications ?? true,
                'appointmentReminders' => $user->appointment_reminders ?? true,
                'dailySummary' => $user->daily_summary ?? false,
                'theme' => $user->theme_preference ?? 'system',
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'emailNotifications' => 'nullable|boolean',
            'appointmentReminders' => 'nullable|boolean',
            'dailySummary' => 'nullable|boolean',
            'theme' => 'nullable|in:light,dark,system',
        ]);

        $user->update([
            'email_notifications' => $validated['emailNotifications'] ?? $user->email_notifications,
            'appointment_reminders' => $validated['appointmentReminders'] ?? $user->appointment_reminders,
            'daily_summary' => $validated['dailySummary'] ?? $user->daily_summary,
            'theme_preference' => $validated['theme'] ?? $user->theme_preference,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Preferencias actualizadas',
            'data' => [
                'emailNotifications' => $user->email_notifications,
                'appointmentReminders' => $user->appointment_reminders,
                'dailySummary' => $user->daily_summary,
                'theme' => $user->theme_preference,
            ],
        ]);
    }
}