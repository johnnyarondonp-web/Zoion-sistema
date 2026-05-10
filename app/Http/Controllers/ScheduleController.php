<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ScheduleController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => Schedule::orderBy('day_of_week')->get()]);
    }

    public function update(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403);

        foreach ($request->schedules as $s) {
            Schedule::updateOrCreate(
                ['day_of_week' => $s['dayOfWeek']],
                [
                    'id'           => Schedule::where('day_of_week', $s['dayOfWeek'])->value('id') ?? (string) Str::ulid(),
                    'open_time'    => $s['openTime'],
                    'close_time'   => $s['closeTime'],
                    'is_available' => $s['isAvailable'],
                ]
            );
        }

        return response()->json(['success' => true, 'data' => Schedule::orderBy('day_of_week')->get()]);
    }
}