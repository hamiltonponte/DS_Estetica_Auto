/**
 * Gerador de payload PIX (BR Code / EMV) — portado do Motora PixQRCodeGenerator.kt
 * Padrão Banco Central do Brasil.
 */

function parseHex(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function removeAccents(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
}

export function formatPixKey(key, type) {
  const t = (type || '').toLowerCase();
  const raw = (key || '').trim();

  switch (t) {
    case 'telefone': {
      const digits = raw.replace(/[^0-9+]/g, '');
      if (digits.startsWith('+55')) return digits;
      if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
      if (digits.length === 11) return `+55${digits}`;
      return `+55${digits.replace(/^\+/, '')}`;
    }
    case 'cpf':
    case 'cnpj':
      return raw.replace(/[^0-9]/g, '');
    case 'email':
      return raw.toLowerCase();
    case 'aleatoria':
    default:
      return raw;
  }
}

function createEmvField(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function calculateCRC16(payload) {
  const bytes = new TextEncoder().encode(payload);
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] & 0xff) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * @param {Object} params
 * @param {string} params.pixKey
 * @param {string} params.pixKeyType - cpf|cnpj|telefone|email|aleatoria
 * @param {number} params.amount - valor em reais
 * @param {string} params.receiverName - nome do recebedor (max 25)
 * @param {string} params.city - cidade (max 15)
 * @param {string} [params.txid] - identificador (max 25)
 */
export function buildPixPayload({
  pixKey,
  pixKeyType,
  amount,
  receiverName,
  city,
  txid = `DSEST${Date.now().toString().slice(-18)}`,
}) {
  const chave = formatPixKey(pixKey, pixKeyType);
  if (!chave) throw new Error('Chave PIX inválida');

  const valor = Number(amount);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('Valor do pagamento deve ser maior que zero');
  }

  const valorFormatado = valor.toFixed(2);
  const nome = removeAccents(receiverName || 'RECEBEDOR').toUpperCase().slice(0, 25);
  const cidade = removeAccents(city || 'BRASIL').toUpperCase().slice(0, 15);
  const txidSafe = removeAccents(txid).replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);

  let payload = '';
  payload += createEmvField('00', '01');
  payload += createEmvField('01', '12');

  const merchantAccount =
    createEmvField('00', 'BR.GOV.BCB.PIX') +
    createEmvField('01', chave);
  payload += createEmvField('26', merchantAccount);

  payload += createEmvField('52', '0000');
  payload += createEmvField('53', '986');
  payload += createEmvField('54', valorFormatado);
  payload += createEmvField('58', 'BR');
  payload += createEmvField('59', nome);
  payload += createEmvField('60', cidade);

  const additional = createEmvField('05', txidSafe);
  payload += createEmvField('62', additional);

  payload += '6304';
  payload += calculateCRC16(payload);

  return payload;
}

export function extractCityFromAddress(address) {
  if (!address?.trim()) return 'BRASIL';
  const parts = address.split(/[,|-]/).map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || 'BRASIL';
  return removeAccents(last).toUpperCase().slice(0, 15) || 'BRASIL';
}
