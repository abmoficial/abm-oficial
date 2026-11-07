import './globals.css';
import type { Metadata } from 'next';

const siteUrl = 'https://www.associacaomanancial.org.br';
const title = 'Associação Manancial | Juntos transformamos vidas';
const description = 'Cada gesto de solidariedade transforma histórias. Conheça nossos projetos e faça parte dessa transformação.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: 'Associação Beneficente Manancial',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'Associação Beneficente Manancial',
    title,
    description,
    images: [{ url: '/compartilhamento-manancial.jpg', width: 1200, height: 630, alt: 'Associação Manancial — Juntos transformamos vidas' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/compartilhamento-manancial.jpg'],
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
