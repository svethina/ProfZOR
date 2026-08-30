# Деплой ProfZOR на Vercel и подключение ИИ

Сейчас программа — статические `index.html` + `app.js`. На Vercel она открывается как сайт. **Кнопок ИИ в коде ещё нет:** один деплой сайт покажет, модель не вызовет.

Ключ API **нельзя** вставлять в `app.js` и выкладывать на Vercel: любой посетитель его украдёт. Ключ живёт только в Environment Variables, вызов идёт через функцию `/api/ai`.

Порядок: сначала задеплоить сайт → потом ключ → потом код ИИ → снова деплой.

---

## Шаг 1. Подготовить GitHub

Локальные `docs/marker-dictionary.json` и `docs/ai-implementation-prompt.md` помечены **U** — Vercel их не увидит, пока не закоммитите и не запушите.

```powershell
cd C:\Work\ProfZOR
git status
git add docs\marker-dictionary.json docs\ai-implementation-prompt.md
git commit -m "Словарь маркеров и промпт ИИ"
git push origin HEAD
```

Если `git push` просит задать ветку:

```powershell
$branch = git branch --show-current
git push -u origin $branch
```

Проверка: на GitHub в репозитории ProfZOR в папке `docs` видны оба файла.

---

## Шаг 2. Задеплоить сайт на Vercel (пока без ИИ)

1. Откройте [https://vercel.com](https://vercel.com) и войдите через GitHub.
2. **Add New… → Project**.
3. Выберите репозиторий `ProfZOR`.
4. Настройки:
   - **Framework Preset:** `Other` (не Next.js — это уже не тот старый кабинет).
   - **Root Directory:** `.`
   - **Build Command:** пусто.
   - **Output Directory:** пусто.
5. **Deploy**.

Проверка: открывается `https://….vercel.app`, видны вкладки «Интервью» и «Карточка профиля».

Заметки с `Invoke-Item .\index.html` на этот адрес **не переедут**: у Vercel другой origin, LocalStorage другой.

Через CLI (если удобнее, чем сайт):

```powershell
cd C:\Work\ProfZOR
npm install -g vercel
vercel login
vercel
vercel --prod
```

На вопросы: линковать к существующему проекту или создать новый; для этой программы — **новый** проект, фреймворк не Next.js.

---

## Шаг 3. Ключ OpenRouter

1. Зарегистрируйтесь на [https://openrouter.ai](https://openrouter.ai).
2. **Keys → Create Key**. Имя, например `profzor-vercel`.
3. Скопируйте ключ (`sk-or-v1-…`). На экране он показывается один раз.
4. Пополните баланс (без кредитов будет 402).

Ключ не класть в git, не слать в чат, не вставлять в HTML.

---

## Шаг 4. Положить ключ в Vercel, не в браузер

В проекте Vercel: **Settings → Environment Variables**.

| Name | Value | Environment |
|---|---|---|
| `OPENROUTER_API_KEY` | ваш ключ | Production, Preview, Development |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | все три (модель можно сменить позже) |

**Save**. После добавления переменных нужен **новый деплой** (Redeploy), иначе функция ключа не увидит.

Проверка: в Settings переменная есть, значение скрыто точками. В репозитории файла `.env` нет.

---

## Шаг 5. Добавить серверную функцию `/api/ai`

В корне проекта папка `api`, файл `api/ai.js`. Браузер вызывает **свой** сайт `/api/ai`, а функция уже ходит в OpenRouter с ключом из среды.

Минимальный каркас (Node на Vercel):

```javascript
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Только POST" });
    return;
  }

  var key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    res.status(500).json({ error: "На сервере нет OPENROUTER_API_KEY" });
    return;
  }

  var body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  var messages = body.messages;
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: "Нужен массив messages" });
    return;
  }

  var upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://profzor.vercel.app",
      "X-Title": "ProfZOR",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      temperature: 0.2,
      messages: messages,
    }),
  });

  var data = await upstream.json();
  if (!upstream.ok) {
    res.status(upstream.status).json({ error: "OpenRouter", detail: data });
    return;
  }

  res.status(200).json(data);
};
```

Рядом можно положить `vercel.json`:

```json
{
  "rewrites": []
}
```

Для статики он не обязателен: `index.html` отдаётся сам, `/api/ai` — как функция.

Не вызывайте `https://openrouter.ai/...` из `app.js`. Только `fetch("/api/ai", …)`.

---

## Шаг 6. Кнопка в интерфейсе

Пока нет протокола слоёв, минимум такой:

- на вкладке «Интервью» кнопка **«Подсказка ИИ»**;
- по клику собрать наблюдения + (если есть) словарь маркеров;
- `POST /api/ai` с `messages` (системная роль + пакет интервью);
- ответ показать одной строкой (шёпот), не подставлять в заключение и не кликать радикал за эксперта.

Это как раз работа для Cursor:

```text
@docs/ai-implementation-prompt.md
@docs/marker-dictionary.json

Сайт уже на Vercel. Ключ только в OPENROUTER_API_KEY.
Сделай api/ai.js (вызов OpenRouter с сервера) и кнопку «Подсказка ИИ»,
которая шлёт POST /api/ai, а не ключ из браузера.
Автоклик радикала запрещён. Заключение само не переписывать.
```

После правок:

```powershell
cd C:\Work\ProfZOR
git add api\ai.js index.html app.js
git commit -m "Серверная функция ИИ и кнопка подсказки"
git push origin HEAD
```

Vercel с GitHub подхватит пуш сам. Если деплоили только CLI:

```powershell
vercel --prod
```

---

## Шаг 7. Проверить, что ИИ живой

1. Откройте **Production** URL (не старый localhost и не `file://`).
2. Введите тестовую заметку, нажмите «Подсказка ИИ».
3. Если 500 «нет OPENROUTER_API_KEY» — переменная не попала в этот деплой: Redeploy после Save.
4. Если 401/402 — ключ или баланс OpenRouter.
5. Проверка функции без UI:

```powershell
$uri = "https://ВАШ-ПРОЕКТ.vercel.app/api/ai"
$body = '{"messages":[{"role":"user","content":"Ответь одним словом: пинг"}]}'
Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json; charset=utf-8" -Body $body
```

В ответе должно быть поле `choices` (как у Chat Completions). Если HTML главной страницы — путь `/api/ai` не задеплоился.

---

## Чего не делать

- Не коммитить `.env` и ключ.
- Не писать ключ в `localStorage` на публичном Vercel (для личного файла на диске — другое дело; в интернете ключ утечёт).
- Не ждать, что деплой сам «подключит ИИ»: без `/api/ai` и кнопки модель молчит.
- Не выбирать Framework **Next.js** для текущей программы — сломается сборка.
- Не путать проекты: старый ProfZOR с кабинетом промтов — отдельный Vercel-проект.

---

## Короткая последовательность

1. `git add` / `commit` / `push` словаря и промпта.  
2. Vercel → Import → Framework Other → Deploy.  
3. OpenRouter → ключ.  
4. Vercel → Environment Variable `OPENROUTER_API_KEY` → Redeploy.  
5. Код: `api/ai.js` + кнопка, вызов только `/api/ai`.  
6. `git push` → открыть production URL и нажать «Подсказка ИИ».
