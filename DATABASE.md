# DATABASE.md — ProfZOR (сообщество по 7 радикалам)

## Продукт (MVP)

Публичное сообщество с регистрацией: пользователи публикуют **карточки вопросов** для профайлингового интервью по системе **7 радикалов Пономаренко**.

- **Гости** читают ленту и карточки.
- **Писать, лайкать и комментировать** можно только после входа.
- **Автор** полностью владеет своей карточкой (CRUD своих карточек).
- **Остальные** — только комментарии и лайки.
- **Модератор** скрывает/удаляет контент.
- **Admin** выдаёт роль `MODERATOR` через UI (`/admin/users`).

**Оплата / тарифы в MVP не входят** (учебный фокус: community + auth + роли).

---

## Стек (зафиксирован)

| Слой | Технология |
|------|------------|
| UI + API | Next.js (App Router) — UI, API routes / server actions |
| Хостинг | Vercel |
| БД | Neon — PostgreSQL |
| ORM | Prisma — схема, миграции, seed |
| Auth | Auth.js (NextAuth) — email + пароль (Credentials); сессии JWT или database sessions |
| UI | Tailwind + простой собственный UI (без тяжёлой дизайн-системы) |
| Язык интерфейса | русский |

---

## Роли и доступ

| Роль | Права |
|------|--------|
| **Гость** | Читать ленту, карточку, фильтры |
| **USER** | Создавать / редактировать / удалять **свои** карточки; комментировать; лайкать |
| **MODERATOR** | Скрывать / удалять **чужие** карточки и комментарии |
| **ADMIN** | Всё модератора + UI назначения `MODERATOR` |

Назначение модератора: страница `/admin/users` — **только для ADMIN**.

Роль хранится в `User.role` (`USER` | `MODERATOR` | `ADMIN`). Гость — не запись в БД (нет сессии).

---

## Справочник радикалов (фиксированный seed)

CRUD «добавить тип радикала» **нет**. Семь записей создаются seed’ом и не меняются через UI:

1. Истероид  
2. Эпилептоид  
3. Паранойял  
4. Эмотив  
5. Шизоид  
6. Гипертим  
7. Тревожный  

Карточка привязана к одному радикалу (`radicalId`). Фильтры ленты — по `radicalId` / slug.

---

## Сущности

| Сущность | Назначение |
|----------|------------|
| **User** | Аккаунт: email/пароль, роль, профиль |
| **Radical** | Справочник 7 радикалов (seed) |
| **Card** | Карточка вопроса интервью (автор + радикал) |
| **Comment** | Комментарий к карточке |
| **Like** | Лайк пользователя к карточке (один на пару user+card) |
| **Account / Session / VerificationToken** | *(опц.)* таблицы Auth.js при database sessions |

---

## Ключевые правила

1. Гость только читает; create/update/delete карточек, комментарии и лайки — только авторизованным.
2. Автор карточки: полный CRUD **только своих** (`authorId === session.user.id`).
3. Чужой пользователь: комментарий + лайк; правка/удаление чужой карточки — запрещены (кроме модерации).
4. `MODERATOR` / `ADMIN`: скрытие (`isHidden`) и/или удаление чужих карточек и комментариев.
5. `ADMIN`: смена роли пользователя на `MODERATOR` (и снятие) на `/admin/users`.
6. Лайк уникален: `UNIQUE(userId, cardId)`.
7. Радикалы — только seed; приложение не даёт создавать/удалять типы.
8. Скрытый контент (`isHidden = true`) не показывается в публичной ленте; автор/модератор могут видеть по политике приложения.

---

## Схема базы данных (Prisma / PostgreSQL)

### Enums

```prisma
enum Role {
  USER
  MODERATOR
  ADMIN
}
```

### Radical

| Поле | Тип | Заметки |
|------|-----|---------|
| id | String (cuid/uuid) | PK |
| slug | String unique | например `hysteroid`, `epileptoid`, … |
| nameRu | String | «Истероидный», … |
| sortOrder | Int | 1…7 |
| createdAt | DateTime | |

Индекс: `sortOrder`.

### User

| Поле | Тип | Заметки |
|------|-----|---------|
| id | String (cuid/uuid) | PK |
| email | String unique | логин |
| passwordHash | String | для Credentials (bcrypt/argon2) |
| name | String? | отображаемое имя |
| role | Role | default `USER` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Связи: `cards`, `comments`, `likes`.

Индексы: `email`, `role`.

### Card

| Поле | Тип | Заметки |
|------|-----|---------|
| id | String (cuid/uuid) | PK |
| authorId | String → User | onDelete Cascade |
| radicalId | String → Radical | onDelete Restrict |
| title | String | заголовок / краткий вопрос |
| body | String | текст карточки (вопрос, пояснение) |
| isHidden | Boolean | default false; модерация |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Связи: `comments`, `likes`.

Индексы:

- `Card(createdAt)` — лента  
- `Card(radicalId, createdAt)` — фильтр по радикалу  
- `Card(authorId, updatedAt)` — «мои карточки»  
- `Card(isHidden, createdAt)` — публичная лента  

### Comment

| Поле | Тип | Заметки |
|------|-----|---------|
| id | String (cuid/uuid) | PK |
| cardId | String → Card | onDelete Cascade |
| authorId | String → User | onDelete Cascade |
| body | String | текст |
| isHidden | Boolean | default false |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Индексы: `Comment(cardId, createdAt)`, `Comment(authorId)`.

### Like

| Поле | Тип | Заметки |
|------|-----|---------|
| id | String (cuid/uuid) | PK |
| userId | String → User | onDelete Cascade |
| cardId | String → Card | onDelete Cascade |
| createdAt | DateTime | |

Ограничение: **`UNIQUE(userId, cardId)`**.

Индексы: `Like(cardId)`, `Like(userId)`.

### Auth.js (если database sessions)

При JWT-сессиях эти таблицы можно не использовать. При database sessions — стандартные модели Auth.js:

- `Account` — провайдеры (для Credentials часто не нужны отдельные OAuth-аккаунты)
- `Session` — sessionToken, userId, expires
- `VerificationToken` — при email-верификации (опционально в MVP)

Пароль хранится в `User.passwordHash`; проверка в `authorize` Credentials provider.

---

## Seed (минимальный)

1. **Radical** × 7 (фиксированный список выше, `sortOrder` 1…7, уникальные `slug`).
2. *(опц. для разработки)* один `ADMIN` с известным email/паролем из env.
3. Карточки/комментарии в seed — по желанию для демо ленты.

Повторный seed радикалов: upsert по `slug` (не дублировать).

---

## onDelete

| Связь | Поведение |
|-------|-----------|
| User → Card / Comment / Like | Cascade |
| Card → Comment / Like | Cascade |
| Radical → Card | **Restrict** (нельзя удалить радикал, пока есть карточки; в MVP радикалы не удаляют) |

---

## Проверки на уровне приложения (не только БД)

- Гость: запрет мутаций (server actions / API).
- USER: `card.authorId === session.user.id` для edit/delete своей карточки.
- Лайк/комментарий: только при `session`.
- MODERATOR/ADMIN: `isHidden` / delete чужого контента.
- ADMIN: `PATCH` роли пользователя; UI только на `/admin/users`.
- Публичные списки: `where: { isHidden: false }` (кроме модераторских экранов).

---

## Вне MVP (не моделировать сейчас)

- Оплата, подписки, тарифы  
- CRUD радикалов через UI  
- Приватные карточки / visibility  
- Вложенные ответы на комментарии (threads)  
- Жалобы (reports) как отдельная сущность — при необходимости позже  
