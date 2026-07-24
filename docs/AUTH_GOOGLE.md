# Auth.js — Google OAuth (PROMPT.md)

Кратко: вход через Google, database sessions, страницы `/login`, `/dashboard`, `/my-prompts`.

## Переменные в `.env`

Добавьте (или скопируйте из `.env.example`):

```env
AUTH_SECRET="сгенерируйте командой ниже"
AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="из Google Cloud Console"
GOOGLE_CLIENT_SECRET="из Google Cloud Console"
```

Секрет:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Google Cloud Console

1. APIs & Services → Credentials → OAuth 2.0 Client ID (Web)
2. Authorized redirect URI:
   - `http://localhost:3000/api/auth/callback/google`
   - (prod) `https://YOUR_DOMAIN/api/auth/callback/google`

## Миграция

```powershell
npx prisma migrate deploy
npx prisma generate
```

Для локальной БД сначала выставьте:

```powershell
$env:DATABASE_URL = $env:LOCAL_DATABASE_URL
$env:DIRECT_URL = $env:LOCAL_DATABASE_URL
npx prisma migrate deploy
```

## Страницы

| URL | Назначение |
|-----|------------|
| `/login` | Кнопка «Войти через Google» |
| `/dashboard` | Кабинет (выход, userId) |
| `/my-prompts` | Карточки текущего пользователя |

Защита: `src/proxy.ts` (Next.js 16).
