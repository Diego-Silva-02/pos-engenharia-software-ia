# Demo Better Auth + GitHub

Demo Next.js com login social pelo GitHub e armazenamento local de usuários e sessões em SQLite.

## Requisitos

- Node.js 20.9 ou superior
- npm
- Uma aplicação OAuth do GitHub

Crie uma OAuth App em [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**. Configure:

- **Homepage URL:** `http://localhost:3000`
- **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`

## Configuração

1. Instale as dependências e crie as variáveis locais (se `.env.local` ainda não existir):

   ```bash
   npm install
   if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
   ```

2. Edite `.env.local` e informe `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`. Gere também um segredo aleatório para `BETTER_AUTH_SECRET` (mínimo de 32 caracteres). Não compartilhe nem versione esse arquivo.

3. Crie as tabelas do Better Auth:

   ```bash
   npx @better-auth/cli migrate
   ```

4. Inicie o projeto:

   ```bash
   npm run dev
   ```

Abra [http://localhost:3000](http://localhost:3000). A base SQLite `better-auth.sqlite` é criada localmente na raiz do projeto.
