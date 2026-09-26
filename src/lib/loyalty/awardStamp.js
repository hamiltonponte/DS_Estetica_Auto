import { api } from '@/api/apiClient';

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ao finalizar serviço: se a campanha estiver ativa e o cliente inscrito no programa de selos,
 * adiciona 1 selo automaticamente.
 * @returns {Promise<object|null>} snapshot para exibir na nota
 */
export async function awardStampOnServiceComplete({ clientId, clientName } = {}) {
  const configs = await api.entities.LoyaltyConfig.list();
  const config = configs[0];
  if (!config || config.active === false) return null;

  const required = Number(config.services_required) || 10;
  const loyalties = await api.entities.ClientLoyalty.list();

  let loyalty = null;
  if (clientId) {
    loyalty = loyalties.find((l) => l.client_id === clientId) || null;
  }
  if (!loyalty && clientName) {
    const target = normalizeName(clientName);
    loyalty = loyalties.find((l) => normalizeName(l.client_name) === target) || null;
  }

  // Só clientes já inscritos no programa
  if (!loyalty) return null;

  const before = Number(loyalty.stamps) || 0;
  const after = before + 1;
  const justCompleted = after >= required;

  if (justCompleted) {
    await api.entities.ClientLoyalty.update(loyalty.id, {
      stamps: 0,
      total_redeemed: (Number(loyalty.total_redeemed) || 0) + 1,
    });
  } else {
    await api.entities.ClientLoyalty.update(loyalty.id, {
      stamps: after,
    });
  }

  return {
    client_id: loyalty.client_id,
    client_name: loyalty.client_name || clientName,
    stamps: justCompleted ? required : after,
    stamps_before: before,
    required,
    just_completed: justCompleted,
    total_redeemed: justCompleted
      ? (Number(loyalty.total_redeemed) || 0) + 1
      : (Number(loyalty.total_redeemed) || 0),
    reward_description: config.reward_description || 'Recompensa',
    campaign_name: config.campaign_name || 'Programa de Selos',
  };
}

/** Representação em texto dos selos (WhatsApp / copiar nota). */
export function formatStampsText(snapshot) {
  if (!snapshot) return '';
  const { stamps, required, just_completed, reward_description, campaign_name } = snapshot;
  const filled = '★'.repeat(Math.min(stamps, required));
  const empty = '☆'.repeat(Math.max(0, required - stamps));
  const lines = [
    `*${campaign_name || 'Programa de Selos'}*`,
    `Selos: ${stamps}/${required}`,
    `${filled}${empty}`,
  ];
  if (just_completed) {
    lines.push(`🎉 Cartão completo! Recompensa: ${reward_description}`);
  } else {
    lines.push(`Faltam ${required - stamps} selo(s) para: ${reward_description}`);
  }
  return lines.join('\n');
}
