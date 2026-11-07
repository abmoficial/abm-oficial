// Carrega .env / .env.local automaticamente (Node 20.12+). Não sobrescreve variáveis já definidas
// no terminal, então use "set DATABASE_URL=" (vazio) se tiver deixado alguma errada por engano.
import { existsSync } from 'fs';
for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) {
    try { process.loadEnvFile(f); } catch { /* Node antigo: ignore */ }
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não encontrada. Crie o arquivo .env com DATABASE_URL=postgresql://usuario:senha@localhost:5432/banco');
  process.exit(1);
}
const u = process.env.DATABASE_URL;
if (/\s/.test(u.split('/').pop() || '')) {
  console.error('DATABASE_URL parece errada (o nome do banco tem espaço): ' + u.split('/').pop());
  console.error('No Windows, limpe com:  set DATABASE_URL=   e rode de novo.');
  process.exit(1);
}
