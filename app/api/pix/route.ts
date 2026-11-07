
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { makePix } from '../../../lib/pix';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // 1. Verificar a configuração do Pix.
    if (
      !process.env.PIX_KEY?.trim() ||
      !process.env.PIX_RECEIVER_NAME?.trim()
    ) {
      console.error('PIX_CONFIG_MISSING');

      return NextResponse.json(
        {
          error:
            'Pix indisponível: configuração do servidor incompleta.',
        },
        { status: 503 }
      );
    }

    // 2. Ler os dados enviados pelo formulário.
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

    // 3. Validar o valor da doação.
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

    // 4. Dados opcionais do doador.
    const name = String(body.name || '')
      .trim()
      .slice(0, 80);

    const message = String(body.message || '')
      .trim()
      .slice(0, 500);

    // 5. Validar a campanha selecionada.
    const campaignId =
      body.campaignId === null ||
      body.campaignId === undefined ||
      body.campaignId === ''
        ? null
        : Number(body.campaignId);

    if (
      campaignId !== null &&
      (
        !Number.isSafeInteger(campaignId) ||
        campaignId <= 0
      )
    ) {
      return NextResponse.json(
        { error: 'Campanha inválida.' },
        { status: 400 }
      );
    }

    if (campaignId !== null) {
      const campaign = await pool.query(
        `SELECT 1
         FROM campaigns
         WHERE id = $1 AND active = true`,
        [campaignId]
      );

      if (!campaign.rowCount) {
        return NextResponse.json(
          { error: 'Campanha inválida.' },
          { status: 400 }
        );
      }
    }

    // 6. Gerar um identificador único para a doação.
    const txid = randomBytes(12)
      .toString('hex')
      .toUpperCase();

    // 7. Gerar o Pix com a configuração atual.
    const code = makePix(cents, txid);

    // 8. Gerar a imagem do QR Code.
    const qr = await QRCode.toDataURL(code, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M',
    });

    // 9. Registrar a contribuição no banco.
    // O pagamento permanece pendente.
    await pool.query(
      `INSERT INTO contributions
       (
         amount_cents,
         donor_name,
         message,
         campaign_id,
         pix_txid
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        cents,
        name,
        message,
        campaignId,
        txid,
      ]
    );

    // 10. Retornar o Pix e sua referência.
    return NextResponse.json(
      {
        code,
        qr,
        receiver: process.env.PIX_RECEIVER_NAME,

        // Referência para a futura comunicação
        // de pagamento pelo doador.
        txid,

        // Não representa pagamento recebido.
        status: 'awaiting_manual_verification',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    // Evitar expor dados financeiros ou
    // informações internas ao visitante.
    const err = error as Error & {
      code?: string;
    };

    const category =
      err.message?.startsWith('PIX_')
        ? 'PIX_CONFIGURATION'
        : err.code &&
            (
              err.code.startsWith('08') ||
              err.code.startsWith('23') ||
              err.code.startsWith('42')
            )
          ? 'DATABASE_ERROR'
          : 'PIX_INTERNAL_ERROR';

    console.error('PIX API error:', {
      category,
      code: err.code || null,
      message:
        err.message || 'Erro desconhecido',
    });

    return NextResponse.json(
      {
        error:
          'Não foi possível gerar Pix. Tente novamente.',
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
