# ProfZOR

Личный рабочий инструмент эксперта для ведения интервью по 7 радикалам.

Не ставит диагнозы и не определяет личность автоматически. Все оценки и итоговые выводы подтверждает пользователь.

## Стек

HTML, CSS и чистый JavaScript. Интервью в LocalStorage. Подсказка ИИ — serverless `POST /api/ai` (ключ только на сервере).

## Запуск (PowerShell)

Без ИИ (только интерфейс):

```powershell
cd C:\Work\ProfZOR
Invoke-Item .\index.html
```

С кнопкой «Подсказка ИИ» нужен локальный прокси:

```powershell
cd C:\Work\ProfZOR
Copy-Item .env.example .env.local
# впишите OPENROUTER_API_KEY в .env.local
npx vercel dev
```

## Деплой на Vercel

Статический сайт плюс serverless `POST /api/ai`. Ключ только в переменной `OPENROUTER_API_KEY` (не в браузере). Данные интервью — LocalStorage.

На Vercel: Project Settings → Environment Variables → `OPENROUTER_API_KEY`.

### Через сайт Vercel

1. Залейте репозиторий на GitHub.
2. На [vercel.com](https://vercel.com) → Add New… → Project → импортируйте репозиторий.
3. Framework Preset: **Other**. Команды Install/Build можно не заполнять — они заданы в `vercel.json`.
4. Deploy.

### Через CLI (PowerShell)

```powershell
cd C:\Work\ProfZOR
npm i -g vercel
vercel login
vercel
```

Прод-выкладка:

```powershell
vercel --prod
```

## Файлы

| Файл | Назначение |
|------|------------|
| `index.html` | Разметка: вкладки «Интервью» и «Карточка профиля» |
| `styles.css` | Спокойный профессиональный интерфейс |
| `app.js` | Логика, LocalStorage, черновик карточки, копирование и скачивание |
| `api/ai.js` | Сервер: OpenRouter по `OPENROUTER_API_KEY`, ответ без ключа |

## Данные

Все данные хранятся локально в LocalStorage браузера. Очистка данных браузера может удалить сохранённые интервью.
