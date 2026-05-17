<?php

namespace App\Http\Controllers;

use App\Models\SpecialOpenDate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SpecialOpenDateController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => SpecialOpenDate::orderBy('date')->get()]);
    }

    public function store(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403);
        $request->validate([
            'date'       => 'required|date_format:Y-m-d|after_or_equal:today|unique:special_open_dates,date',
            'open_time'  => 'required|date_format:H:i',
            'close_time' => 'required|date_format:H:i|after:open_time',
            'reason'     => 'nullable|string|max:200',
        ]);

        $special = SpecialOpenDate::create([
            'id'         => (string) Str::ulid(),
            'date'       => $request->date,
            'open_time'  => $request->open_time,
            'close_time' => $request->close_time,
            'reason'     => $request->reason ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $special], 201);
    }

    public function destroy(Request $request, $id)
    {
        abort_if($request->user()->role !== 'admin', 403);
        SpecialOpenDate::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}
