<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->take(30)
            ->get()
            ->map(fn($n) => [
                'id'        => $n->id,
                'type'      => $n->type,
                'title'     => $n->title,
                'message'   => $n->message,
                'read'      => !is_null($n->read_at),
                'timestamp' => $n->created_at->toISOString(),
            ]);

        $unreadCount = $notifications->where('read', false)->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'notifications' => $notifications->values(),
                'unreadCount'   => $unreadCount,
            ],
        ]);
    }

    public function markAsRead(Request $request, string $id)
    {
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if (is_null($notification->read_at)) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}