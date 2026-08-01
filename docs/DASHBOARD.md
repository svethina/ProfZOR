# Личный кабинет (PROMPT)

## ENV
Нужны уже существующие переменные: `DATABASE_URL`, `DIRECT_URL`, auth (`AUTH_SECRET`, Google).

## Миграция

```powershell
cd c:\Work\ProfZOR
npx prisma migrate deploy
```

Для локальной БД:

```powershell
$env:DATABASE_URL = $env:LOCAL_DATABASE_URL
$env:DIRECT_URL = $env:LOCAL_DATABASE_URL
npx prisma migrate deploy
```

## Запуск

```powershell
npm run dev
```

Откройте http://localhost:3000/login → войдите → http://localhost:3000/dashboard
