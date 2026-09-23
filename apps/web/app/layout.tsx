import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Finanças — controle local',
  description: 'Dashboard pessoal e local para organizar gastos com privacidade.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
