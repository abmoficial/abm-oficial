
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { makePix } from '../../../lib/pix';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // 1. Validar configuração antes de processar.
    if (
      !process.env.PIX_KEY?.trim() ||
      !process.env.PIX_RECEIVER_NAME?.trim()
    ) {
      console.error('PIX_CONFIG_MISSING');

      return NextResponse.json(
        {
          error:
            'PIX indisponível: configuração do servidor incompleta.',
        },
        { status: 503 }
      );
    }

    // 2. Ler solicitação.
    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Dados da solicitação inválidos.' },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: 'Dados da solicitação inválidos.' },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    const cents = Math.round(amount * 100);

    if (
      !Number.isFinite(amount) ||
      Math.abs(amount * 100 - cents) > 0.001 ||
      cents < 100 ||
      cents > 100000000
    ) {
      return NextResponse.json(
        { error: 'Valor fora do limite permitido.' },
        { status: 400 }
      );
    }

    const name = String(body.name || '').slice(0, 80);
    const message = String(body.message || '').slice(0, 500);

    const campaignId =
      body.campaignId === null ||
      body.campaignId === undefined ||
      body.campaignId === ''
        ? null
        : Number(body.campaignId);

    if (
      campaignId !== null &&
      (!Number.isSafeInteger(campaignId) || campaignId <= 0)
    ) {
      return NextResponse.json(
        { error: 'Campanha inválida.' },
        { status: 400 }
      );
    }

    // 3. Verificar campanha.
    if (campaignId !== null) {
      const campaign = await pool.query(
        'SELECT 1 FROM campaigns WHERE id=$1 AND active=true',
        [campaignId]
      );

      if (!campaign.rowCount) {
        return NextResponse.json(
          { error: 'Campanha inválida.' },
          { status: 400 }
        );
      }
    }

    // 4. Criar identificador único.
    const txid = randomBytes(12)
      .toString('hex')
      .toUpperCase();

    // 5. Gerar código PIX.
    const code = makePix(cents, txid);

    // 6. Gerar QR Code.
    const qr = await QRCode.toDataURL(code, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M',
    });

    // 7. Registrar contribuição no PostgreSQL.
    await pool.query(
      `INSERT INTO contributions
       (amount_cents, donor_name, message, campaign_id, pix_txid)
       VALUES ($1, $2, $3, $4, $5)`,
      [cents, name, message, campaignId, txid]
    );

    // 8. Retornar os mesmos campos esperados
    // pelo formulário atual.
    return NextResponse.json(
      {
        code,
        qr,
        receiver: process.env.PIX_RECEIVER_NAME,
        status: 'awaiting_manual_verification',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    // Não registrar chaves PIX, códigos copia e cola
    // nem dados pessoais nos logs.
    const err = error as Error & { code?: string };

    const category =
      err.message?.startsWith('PIX_')
        ? 'PIX_CONFIGURATION'
        : err.code && (
            err.code.startsWith('08') ||
            err.code.startsWith('23') ||
            err.code.startsWith('42')
          )
          ? 'DATABASE_ERROR'
          : 'PIX_INTERNAL_ERROR';

    console.error('PIX API error:', {
      category,
      code: err.code || null,
      message: err.message || 'Erro desconhecido',
    });

    return NextResponse.json(
      {
        error:
          'Não foi possível gerar PIX. Tente novamente.',
        category,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
