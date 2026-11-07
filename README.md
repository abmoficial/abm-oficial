# Associação PIX — landing page e painel administrativo

Projeto independente inspirado no mecanismo **PIX Só Presente** do TicketGuri. Implementa landing page institucional, conteúdo editável, campanhas, upload de imagens, painel com login e PIX estático gerado exclusivamente no servidor.

## Requisitos
- Node.js 20.9+ e PostgreSQL 15+
- Hospedagem Node com disco persistente para `public/uploads` (ou adaptar upload para S3/R2)
- HTTPS e domínio oficial em produção

## Instalação
1. Crie o banco PostgreSQL: `createdb associacao_pix` (ou use o seu provedor).
2. `cp .env.example .env.local` e preencha `DATABASE_URL`, `SESSION_SECRET`, `PIX_KEY`, `PIX_RECEIVER_NAME`, `PIX_RECEIVER_CITY`.
3. `npm install`
4. Carregue as variáveis: `set -a; . ./.env.local; set +a` (Linux/macOS) e execute `npm run db:setup` e `npm run admin:create`. No Windows, use variáveis de ambiente no terminal ou execute os scripts com `node --env-file=.env.local scripts/setup.mjs` e `node --env-file=.env.local scripts/create-admin.mjs`.
5. `npm run dev`, acesse `http://localhost:3000` e `/login`.
6. Produção: `npm run build` e `npm start` com TLS reverso e segredos na hospedagem.

## PostgreSQL
Arquivo completo: `db/schema.sql`. Tabelas: `admins`, `site_settings`, `campaigns`, `media`, `contributions`, `audit_logs`. Migração inicial idempotente. Backup periódico obrigatório.

## Operação e limitações de segurança
- **PIX estático**: gera BR Code com valor e identificador. O registro é uma solicitação gerada, **não é comprovante de recebimento**. Não existe webhook, conciliação automática nem PIX dinâmico de PSP nesta versão.
- A conta PIX só pode ser modificada na configuração do servidor. O painel não edita chave, nome do recebedor ou segredos.
- O editor de conteúdo e publicador usam papéis diferentes no banco; esta primeira interface só oferece criação de administrador por CLI, não gestão completa de usuários.
- Autenticação: senha scrypt, cookie HttpOnly SameSite=Lax, JWT assinado e expiração de 8 horas. **MFA, bloqueio progressivo de login e aprovação dupla não estão implementados**. Adicione antes de operação financeira sensível.
- Upload limitado a 5 MB e a JPEG/PNG/WEBP/GIF, com checagem de assinatura e nome aleatório. Em produção, recomenda-se reprocessar imagens, usar object storage e configurar CSP/antimalware.
- Textos são renderizados pelo React (escapados). URLs de imagens só aceitam HTTPS ou caminho local `/uploads/`.
- Antes de lançar: revisão de segurança, rate limiting distribuído nos endpoints de login/PIX/upload, monitoramento, backups, LGPD, termos, política de privacidade, proteção DDoS e testes de PIX em apps bancários.
- **Não inclui** editor drag-and-drop, prévia ao vivo com autosave, aprovação dupla, agendamento de campanhas, confirmação automática PIX ou relatório de valores efetivamente recebidos. Essas funcionalidades exigem uma fase adicional.
- Não confunda este pacote funcional inicial com sistema financeiro auditado e pronto para operar sem validação.

## Estrutura
`app/` páginas e rotas, `lib/` autenticação/banco/PIX, `db/schema.sql` SQL, `scripts/` inicialização e administrador, `public/uploads/` imagens.

## Atualização (correção de banco)
- Copie `.env.example` para `.env` e preencha. Os scripts em `scripts/` leem o `.env` sozinhos (não precisa de `set`).
- `npm run db:migrate` aplica conteúdo, cores e loja (idempotente, não apaga dados).
- `npm run admin:create` cria/atualiza um administrador.
- `lib/db.ts` trata conexões resetadas (ECONNRESET): descarta ociosas, captura erros do pool e repete SELECTs uma vez.
- Se o login disser que o banco não existe, feche o terminal e confira se há `DATABASE_URL` definida por `set` (limpe com `set DATABASE_URL=`).

## Lojinha: arquivos digitais (upload)
- No admin → **Lojinha → Novo produto digital**, envie o arquivo do computador (PDF, imagem, MP3, MP4, ZIP, DOCX, XLSX, PPTX ou TXT, até 25 MB). Não é mais preciso colar URL.
- Os arquivos ficam em `storage/digital` (fora de `public/`) e só são entregues em `/api/shop/download/<token>` depois que o pedido é confirmado.
- Em produção, mantenha a pasta `storage/` em disco persistente e inclua no backup (variável `PRIVATE_UPLOAD_DIR`).
- O site cria/atualiza as tabelas sozinho na primeira visita; `npm run db:migrate` continua disponível.
