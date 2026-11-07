
function tlv(id: string, value: string): string {
  const length = Buffer.byteLength(value, 'utf8');

  if (length > 99) {
    throw new Error('Campo PIX excede o limite permitido');
  }

  return id + String(length).padStart(2, '0') + value;
}

function ascii(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, maxLength);
}

function crc16(value: string): string {
  let crc = 0xffff;

  const bytes = Buffer.from(value, 'utf8');

  for (const byte of bytes) {
    crc ^= byte << 8;

    for (let i = 0; i < 8; i++) {
      crc =
        crc & 0x8000
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizePixKey(raw: string): string {
  const value = raw.trim();

  // Telefone brasileiro com DDD e 9 dígitos.
  if (/^\d{11}$/.test(value)) {
    return '+55' + value;
  }

  // Telefone já informado com código do Brasil.
  if (/^55\d{11}$/.test(value)) {
    return '+' + value;
  }

  return value;
}

export function makePix(
  cents: number,
  txid: string
): string {
  const rawKey = process.env.PIX_KEY?.trim();
  const receiverName =
    process.env.PIX_RECEIVER_NAME?.trim();

  const receiverCity =
    process.env.PIX_RECEIVER_CITY?.trim() || 'BRASILIA';

  if (!rawKey || !receiverName) {
    throw new Error(
      'PIX_CONFIG_MISSING: PIX_KEY ou PIX_RECEIVER_NAME ausente'
    );
  }

  if (
    !Number.isInteger(cents) ||
    cents < 100 ||
    cents > 100000000
  ) {
    throw new Error('PIX_INVALID_AMOUNT');
  }

  const key = normalizePixKey(rawKey);
  const name = ascii(receiverName, 25);
  const city = ascii(receiverCity, 15);
  const reference = ascii(txid, 25);

  if (!key || !name || !city || !reference) {
    throw new Error('PIX_INVALID_CONFIG');
  }

  const account =
    tlv('00', 'BR.GOV.BCB.PIX') +
    tlv('01', key);

  const payload =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('26', account) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', (cents / 100).toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', tlv('05', reference)) +
    '6304';

  return payload + crc16(payload);
}
