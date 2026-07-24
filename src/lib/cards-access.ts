/**
 * Правила видимости карточек (аналог «приватных промтов» из PROMPT.md).
 */
export function publicCardWhere(viewerId?: string | null) {
  // Публичная лента: не скрытые и не приватные
  // (свои приватные смотрим на /my-prompts)
  return {
    isHidden: false,
    isPrivate: false,
    ...(viewerId
      ? {}
      : {}),
  };
}

/**
 * Можно ли зрителю видеть карточку.
 */
export function canViewCard(
  card: { authorId: string; isPrivate: boolean; isHidden: boolean },
  viewerId?: string | null,
  viewerRole?: string | null,
) {
  const isOwner = viewerId === card.authorId;
  const isStaff = viewerRole === "MODERATOR" || viewerRole === "ADMIN";

  if (card.isHidden && !isOwner && !isStaff) return false;
  if (card.isPrivate && !isOwner && !isStaff) return false;
  return true;
}
