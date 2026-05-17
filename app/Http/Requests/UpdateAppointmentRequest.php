<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado a realizar esta solicitud.
     * En este caso, permitimos a todos los usuarios autenticados realizar la petición,
     * ya que la validación detallada de políticas y roles se ejecuta dentro del controlador/servicio.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Define las reglas de validación para la solicitud de actualización.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'notes'         => 'nullable|string|max:1000',
            'rating'        => 'nullable|integer|min:1|max:5',
            'review'        => 'nullable|string|max:1000',
            'status'        => 'nullable|string|in:pending,confirmed,cancelled,completed',
            'paymentMethod' => 'nullable|string|in:cash,transfer,card,pago_movil',
            'paymentStatus' => 'nullable|string|in:pending,paid,refunded',
            'paymentAmount' => 'nullable|numeric|min:0',
            'cancelReason'  => 'nullable|string|max:500',
        ];
    }
}
