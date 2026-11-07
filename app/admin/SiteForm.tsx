'use client';

import { saveSite } from './actions';
import ImageUploadField from './ImageUploadField';

const inp = {
  background: '#fff',
  color: 'var(--texto)',
  border: '1px solid #c9d4ce',
} as const;

function Field({
  name,
  label,
  defaultValue = '',
  textarea,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  textarea?: boolean;
}) {
  return (
    <label className="field" style={{ color: 'var(--texto)' }}>
      <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} rows={3} style={inp} />
      ) : (
        <input name={name} defaultValue={defaultValue} style={inp} />
      )}
    </label>
  );
}

function ColorField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  const id = `color-${name}`;
  return (
    <label className="field" style={{ color: 'var(--texto)' }}>
      <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>{label}</span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="color"
          defaultValue={defaultValue}
          onChange={(e) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el) el.value = e.target.value;
          }}
          style={{
            width: 56,
            height: 40,
            border: '1px solid #c9d4ce',
            borderRadius: 8,
            padding: 2,
            cursor: 'pointer',
          }}
        />
        <input
          id={id}
          name={name}
          type="text"
          defaultValue={defaultValue}
          pattern="#[0-9A-Fa-f]{6}"
          placeholder="#1a4d42"
          style={{
            flex: 1,
            background: '#fff',
            color: 'var(--texto)',
            border: '1px solid #c9d4ce',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        />
      </div>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h4
        style={{
          color: 'var(--verde)',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 14,
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function SiteForm({ s }: { s: Record<string, any> }) {
  return (
    <form action={saveSite}>
      <Group title="Identidade">
        <Field name="site_name" label="Nome da associacao" defaultValue={s.site_name} />
        <ImageUploadField name="logo_url" label="Logo da associacao" defaultUrl={s.logo_url || ''} />
        <ImageUploadField name="hero_image" label="Imagem do banner (hero)" defaultUrl={s.hero_image || ''} />
      </Group>

      <Group title="Cores do site">
        <ColorField
          name="primary_color"
          label="Cor principal (titulos e destaques)"
          defaultValue={s.primary_color || '#1a4d42'}
        />
        <ColorField
          name="color_header"
          label="Cor do cabecalho"
          defaultValue={s.color_header || s.primary_color || '#0f2e28'}
        />
        <ColorField
          name="color_footer"
          label="Cor do rodape"
          defaultValue={s.color_footer || s.primary_color || '#0f2e28'}
        />
        <ColorField
          name="color_button"
          label="Cor dos botoes"
          defaultValue={s.color_button || s.primary_color || '#1a4d42'}
        />
        <ColorField
          name="color_button_text"
          label="Cor do texto dos botoes"
          defaultValue={s.color_button_text || '#ffffff'}
        />
      </Group>

      <Group title="Banner principal">
        <Field name="hero_title" label="Titulo" defaultValue={s.hero_title} />
        <Field name="hero_text" label="Texto" defaultValue={s.hero_text} textarea />
        <Field name="button_text" label="Texto do botao" defaultValue={s.button_text} />
      </Group>

      <Group title="Secao Sobre">
        <Field name="about_title" label="Titulo" defaultValue={s.about_title} />
        <Field name="about_text" label="Texto" defaultValue={s.about_text} textarea />
      </Group>

      <Group title="Titulos das secoes">
        <Field name="stories_title" label="Titulo Historias" defaultValue={s.stories_title} />
        <Field name="stories_subtitle" label="Subtitulo Historias" defaultValue={s.stories_subtitle} textarea />
        <Field name="impact_title" label="Titulo Impacto" defaultValue={s.impact_title} />
        <Field name="impact_subtitle" label="Subtitulo Impacto" defaultValue={s.impact_subtitle} textarea />
        <Field name="donate_title" label="Titulo Doacao" defaultValue={s.donate_title} />
        <Field name="donate_subtitle" label="Subtitulo Doacao" defaultValue={s.donate_subtitle} textarea />
        <Field name="cta_title" label="Titulo CTA final" defaultValue={s.cta_title} />
        <Field name="cta_text" label="Texto CTA final" defaultValue={s.cta_text} textarea />
      </Group>

      <Group title="Rodape e contato">
        <Field name="footer_text" label="Texto do rodape" defaultValue={s.footer_text} />
        <Field name="contact_email" label="E-mail de contato" defaultValue={s.contact_email} />
        <Field name="contact_whatsapp" label="WhatsApp (so numeros)" defaultValue={s.contact_whatsapp} />
        <Field name="youtube_url" label="Link YouTube" defaultValue={s.youtube_url} />
        <Field name="instagram_url" label="Link Instagram" defaultValue={s.instagram_url} />
      </Group>

      <button className="btn btn-primary" type="submit" style={{ marginTop: 8 }}>
        Salvar tudo
      </button>
    </form>
  );
}
