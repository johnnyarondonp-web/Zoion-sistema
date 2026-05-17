<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado a realizar esta solicitud.
     * En este caso, permitimos a todos los usuarios autenticados realizar la petición,
     * ya que la lógica fina de roles se valida dentro de la lógica del servicio.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Define las reglas de validación que se aplicarán a la solicitud de creación.
     * Centralizar esto aquí desacopla la capa de presentación de la capa de datos.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'petId'         => 'required|string',
            'serviceId'     => 'required|string',
            'date'          => 'required|date_format:Y-m-d|after_or_equal:today|before_or_equal:+3 months',
            'startTime'     => 'required|date_format:H:i',
            'userId'        => 'nullable|string|exists:users,id',
            'paymentMethod' => 'nullable|string|in:cash,transfer,card,pago_movil',
        ];
    }
}
