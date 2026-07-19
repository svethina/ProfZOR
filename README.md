# ProfZOR

Минимальный стек: **Next.js (App Router) + Prisma + Neon (PostgreSQL)**, готовый к деплою на Vercel.

## Быстрый старт (PowerShell)

### 1. Установка зависимостей

```powershell
npm install
```

### 2. Настройка `.env`

Скопируйте пример и подставьте строки из [Neon Console](https://console.neon.tech) → Connect:

```powershell
Copy-Item .env.example .env
```

В `.env` должны быть:

```env
# Pooled (с `-pooler` в хосте) — для runtime на Vercel
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# Direct (без `-pooler`) — для миграций Prisma
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"
```

### 3. Миграция и seed

```powershell
npx prisma migrate deploy
npx prisma db seed
```

Локально при изменении схемы:

```powershell
npx prisma migrate dev --name your_change
```

### 4. Запуск

```powershell
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) — главная страница читает `Note` из Neon.

## Структура

| Путь | Назначение |
|------|------------|
| `prisma/schema.prisma` | Модель `Note` |
| `prisma/migrations/` | SQL-миграции |
| `prisma/seed.ts` | Минимальный seed (3 заметки) |
| `src/lib/prisma.ts` | Singleton Prisma Client |
| `src/app/page.tsx` | Server Component с `findMany` |

## Модель Note

- `id` — UUID
- `title` — string
- `createdAt` — DateTime

## Деплой на Vercel

1. Запушьте репозиторий в GitHub.
2. Import project в [Vercel](https://vercel.com).
3. В Project Settings → Environment Variables добавьте `DATABASE_URL` и `DIRECT_URL` (те же, что в `.env`).
4. Build Command по умолчанию: `npm run build` (`prisma generate && next build`).
5. После первого деплоя примените миграции к production-БД локально:

```powershell
npx prisma migrate deploy
npx prisma db seed
```

Либо добавьте в Vercel Build Command:

```powershell
npx prisma migrate deploy; npm run build
```

## Полезные команды

```powershell
npm run db:studio   # GUI для БД
npm run db:seed     # повторный seed (пропускает, если записи уже есть)
npm run lint
```
