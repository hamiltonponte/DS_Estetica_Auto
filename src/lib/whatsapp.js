/**
 * Abre o WhatsApp com a mensagem pronta.
 * Sem telefone: abre o seletor de contatos do app.
 */
export function openWhatsApp({ phone, message } = {}) {
  const text = encodeURIComponent(message || '');
  const clean = String(phone || '').replace(/\D/g, '');

  if (clean) {
    const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
    window.open(`https://wa.me/${withCountry}?text=${text}`, '_blank', 'noopener,noreferrer');
    return;
  }

  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
}

export function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte string mascarada (ex: 1.234,56) em número. */
export function parseMoneyInput(raw) {
  if (raw === '' || raw == null) return 0;
  const str = String(raw).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

/** Máscara monetária BR enquanto digita (centavos a partir dos dígitos). */
export function maskMoneyInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const cents = Number(digits);
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Máscara de porcentagem (0–100, até 2 casas). */
export function maskPercentInput(raw) {
  let cleaned = String(raw || '').replace(/[^\d,]/g, '');
  const parts = cleaned.split(',');
  if (parts.length > 2) cleaned = `${parts[0]},${parts.slice(1).join('')}`;
  const [intPart = '', decPart] = cleaned.split(',');
  const intLimited = intPart.slice(0, 3);
  const decLimited = decPart != null ? decPart.slice(0, 2) : null;
  const result = decLimited != null ? `${intLimited},${decLimited}` : intLimited;
  const n = parseMoneyInput(result);
  if (n > 100) return '100';
  return result;
}

export function parsePercentInput(raw) {
  const n = parseMoneyInput(raw);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export function calcDiscount({ subtotal, type, value }) {
  const base = Math.max(0, Number(subtotal) || 0);
  const amount = Math.max(0, Number(value) || 0);
  let discount = 0;
  if (type === 'percent') {
    discount = (base * Math.min(amount, 100)) / 100;
  } else {
    discount = amount;
  }
  discount = Math.min(discount, base);
  const total = Math.max(0, base - discount);
  return {
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
