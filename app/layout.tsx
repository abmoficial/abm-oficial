import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Associação Manancial | Transformando vidas com dignidade',
  description:
    'Ajudamos famílias com cestas básicas e oferecemos cursos para a melhor idade. Sua doação muda histórias reais.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
