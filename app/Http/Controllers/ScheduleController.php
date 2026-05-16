<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ScheduleController extends Controller
{
    public function index()
    {
        $schedules = Schedule::orderBy('day_of_week')->get();

        if ($schedules->isEmpty()) {
            // Horario predeterminado en memoria: L-V 09:00-18:00, fines de semana cerrado.
            $schedules = collect(range(0, 6))->map(fn($day) => (object)[
                'day_of_week'  => $day,
                'open_time'    => '09:00',
                'close_time'   => '18:00',
                'is_available' => $day >= 1 && $day <= 5,
            ]);
        }

        return response()->json(['success' => true, 'data' => $schedules]);
    }

    public function update(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403);

        $items = $request->input('schedules') ?? $request->json()->all();

        foreach ($items as $s) {
            $existing = Schedule::where('day_of_week', $s['dayOfWeek'])->first();

            Schedule::updateOrCreate(
                ['day_of_week' => $s['dayOfWeek']],
                [
                    'id'           => $existing?->id ?? (string) Str::ulid(),
                    'open_time'    => $s['openTime'],
                    'close_time'   => $s['closeTime'],
                    'is_available' => $s['isAvailable'],
                ]
            );
        }

        return response()->json(['success' => true, 'data' => Schedule::orderBy('day_of_week')->get()]);
    }
}