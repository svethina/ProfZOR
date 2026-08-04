/** Относительная дата на русском (без внешних зависимостей). */
export function formatRelativeRu(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
