'use client';

interface PaymentProcessorProps {
  amount: number;
  reservationId: string;
  onSuccess: () => void;
  onCancel: () => void;
  description?: string;
}

export default function PaymentProcessor({
  amount,
  reservationId,
  onSuccess,
  onCancel,
  description = 'Оплата бронирования парковки',
}: PaymentProcessorProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Оплата</h2>

      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-4">
        <p>Функция оплаты временно отключена.</p>
      </div>

      <div className="mb-4">
        <p className="text-base md:text-lg font-medium">Сумма к оплате: {amount} ₸</p>
        {description && <p className="text-sm md:text-base text-gray-600">{description}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
