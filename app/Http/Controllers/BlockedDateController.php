<?php

namespace App\Http\Controllers;

use App\Models\BlockedDate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlockedDateController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => BlockedDate::orderBy('date')->get()]);
    }

    public function store(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403);
        $request->validate(['date' => 'required|date_format:Y-m-d']);

        $blocked = BlockedDate::create([
            'id'     => (string) Str::ulid(),
            'date'   => $request->date,
            'reason' => $request->reason ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $blocked], 201);
    }

    public function destroy(Request $request, $id)
    {
        abort_if($request->user()->role !== 'admin', 403);
        BlockedDate::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}