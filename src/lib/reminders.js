import { api } from '@/api/apiClient';

/**
 * Cria lembrete local de cobrança (pagamento a prazo).
 */
export async function createPaymentDueReminder({
  clientName,
  clientPhone,
  clientWhatsapp,
  amount,
  dueDate,
  serviceNames,
  appointmentId,
  executionId,
  message,
}) {
  if (!dueDate) return null;

  return api.entities.Reminder.create({
    type: 'payment_due',
    status: 'pending',
    scheduled_date: dueDate,
    client_name: clientName || 'Cliente',
    client_phone: clientPhone || '',
    client_whatsapp: clientWhatsapp || clientPhone || '',
    value: amount,
    service_names: serviceNames || '',
    message_template: message || '',
    appointment_id: appointmentId || null,
    execution_id: executionId || null,
    reference_date: new Date().toISOString().slice(0, 10),
  });
}
