"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DbTarget = "local" | "working";

type FieldDef = {
  name: string;
  type: "string" | "int" | "boolean" | "datetime" | "enum";
  optional?: boolean;
  enumValues?: string[];
  autoOnCreate?: boolean;
  readOnly?: boolean;
};

type TableMeta = {
  name: string;
  label: string;
  idField: string;
  fields: FieldDef[];
};

type TargetMeta = {
  target: DbTarget;
  label: string;
  configured: boolean;
};

type RowsResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: Record<string, unknown>[];
};

type FormMode = "create" | "edit" | null;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  return String(value);
}

export default function ViewDbPage() {
  const [targets, setTargets] = useState<TargetMeta[]>([]);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [target, setTarget] = useState<DbTarget>("working");
  const [openTable, setOpenTable] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsData, setRowsData] = useState<RowsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeTable = useMemo(
    () => tables.find((t) => t.name === openTable) ?? null,
    [tables, openTable],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const res = await fetch("/api/view-db/meta");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка meta");
        if (cancelled) return;

        setTargets(data.targets);
        setTables(data.tables);

        const preferred =
          data.targets.find((t: TargetMeta) => t.target === "working" && t.configured) ??
          data.targets.find((t: TargetMeta) => t.configured);
        if (preferred) setTarget(preferred.target);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRows = useCallback(async () => {
    if (!openTable) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        target,
        page: String(page),
        pageSize: "15",
      });
      const res = await fetch(`/api/view-db/${openTable}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
      setRowsData(data);
    } catch (err) {
      setRowsData(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [openTable, target, page]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  function openTableView(name: string) {
    setOpenTable(name);
    setPage(1);
    setFormMode(null);
    setEditingId(null);
  }

  function startCreate() {
    if (!activeTable) return;
    const values: Record<string, string> = {};
    for (const field of activeTable.fields) {
      if (field.autoOnCreate) continue;
      if (field.type === "boolean") values[field.name] = "false";
      else if (field.type === "enum" && field.enumValues?.[0]) {
        values[field.name] = field.enumValues[0];
      } else {
        values[field.name] = "";
      }
    }
    setFormValues(values);
    setEditingId(null);
    setFormMode("create");
  }

  function startEdit(row: Record<string, unknown>) {
    if (!activeTable) return;
    const values: Record<string, string> = {};
    for (const field of activeTable.fields) {
      const v = row[field.name];
      if (v === null || v === undefined) values[field.name] = "";
      else if (typeof v === "boolean") values[field.name] = v ? "true" : "false";
      else values[field.name] = String(v);
    }
    setFormValues(values);
    setEditingId(String(row[activeTable.idField]));
    setFormMode("edit");
  }

  async function submitForm() {
    if (!activeTable || !formMode) return;
    setLoading(true);
    setError(null);

    const data: Record<string, unknown> = {};
    for (const field of activeTable.fields) {
      if (formMode === "create" && field.autoOnCreate) continue;
      if (formMode === "edit" && field.readOnly) continue;
      if (!(field.name in formValues)) continue;

      const raw = formValues[field.name];
      if (field.type === "boolean") data[field.name] = raw === "true";
      else if (field.type === "int") data[field.name] = Number(raw);
      else if (field.optional && raw === "") data[field.name] = null;
      else data[field.name] = raw;
    }

    try {
      if (formMode === "create") {
        const res = await fetch(`/api/view-db/${activeTable.name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, data }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Ошибка создания");
      } else if (editingId) {
        const res = await fetch(`/api/view-db/${activeTable.name}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, data }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Ошибка обновления");
      }

      setFormMode(null);
      setEditingId(null);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function deleteRow(id: string) {
    if (!activeTable) return;
    if (!window.confirm(`Удалить запись ${id}?`)) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ target });
      const res = await fetch(`/api/view-db/${activeTable.name}/${id}?${params}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка удаления");
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">view-db</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Тестовый просмотрщик БД: выбор базы, таблицы, пагинация и CRUD.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">База данных</h2>
        <div className="flex flex-wrap gap-4">
          {targets.map((t) => (
            <label
              key={t.target}
              className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
                target === t.target
                  ? "border-zinc-900 dark:border-zinc-100"
                  : "border-zinc-300 dark:border-zinc-700"
              } ${!t.configured ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="db-target"
                value={t.target}
                checked={target === t.target}
                disabled={!t.configured}
                onChange={() => {
                  setTarget(t.target);
                  setPage(1);
                  setFormMode(null);
                }}
              />
              <span>
                {t.label}
                {!t.configured ? " (не настроена)" : ""}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Таблицы</h2>
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tables.map((table) => (
            <li
              key={table.name}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span className="font-medium">{table.label}</span>
              <button
                type="button"
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                onClick={() => openTableView(table.name)}
              >
                Открыть
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {activeTable && rowsData ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">
              {activeTable.label}{" "}
              <span className="text-sm font-normal text-zinc-500">
                ({rowsData.total} записей)
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                onClick={() => void loadRows()}
                disabled={loading}
              >
                Обновить
              </button>
              <button
                type="button"
                className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white"
                onClick={startCreate}
                disabled={loading}
              >
                Создать
              </button>
            </div>
          </div>

          {formMode ? (
            <div className="space-y-3 rounded border border-zinc-300 p-4 dark:border-zinc-700">
              <h3 className="font-medium">
                {formMode === "create" ? "Новая запись" : `Редактирование ${editingId}`}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeTable.fields
                  .filter((f) =>
                    formMode === "create" ? !f.autoOnCreate : true,
                  )
                  .map((field) => (
                    <label key={field.name} className="flex flex-col gap-1 text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {field.name}
                        {field.optional ? " (опц.)" : ""}
                      </span>
                      {field.type === "boolean" ? (
                        <select
                          className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
                          value={formValues[field.name] ?? "false"}
                          disabled={field.readOnly && formMode === "edit"}
                          onChange={(e) =>
                            setFormValues((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                        >
                          <option value="false">false</option>
                          <option value="true">true</option>
                        </select>
                      ) : field.type === "enum" ? (
                        <select
                          className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
                          value={formValues[field.name] ?? ""}
                          disabled={field.readOnly && formMode === "edit"}
                          onChange={(e) =>
                            setFormValues((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                        >
                          {field.enumValues?.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
                          value={formValues[field.name] ?? ""}
                          disabled={field.readOnly && formMode === "edit"}
                          onChange={(e) =>
                            setFormValues((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </label>
                  ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                  onClick={() => void submitForm()}
                  disabled={loading}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                  onClick={() => {
                    setFormMode(null);
                    setEditingId(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  {activeTable.fields.map((field) => (
                    <th key={field.name} className="px-3 py-2 font-medium whitespace-nowrap">
                      {field.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rowsData.rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-4 text-zinc-500"
                      colSpan={activeTable.fields.length + 1}
                    >
                      Нет записей
                    </td>
                  </tr>
                ) : (
                  rowsData.rows.map((row) => {
                    const id = String(row[activeTable.idField]);
                    return (
                      <tr
                        key={id}
                        className="border-t border-zinc-200 dark:border-zinc-800"
                      >
                        {activeTable.fields.map((field) => (
                          <td
                            key={field.name}
                            className="max-w-[240px] truncate px-3 py-2 align-top"
                            title={cellText(row[field.name])}
                          >
                            {cellText(row[field.name])}
                          </td>
                        ))}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="text-sm text-blue-700 underline dark:text-blue-300"
                              onClick={() => startEdit(row)}
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              className="text-sm text-red-700 underline dark:text-red-300"
                              onClick={() => void deleteRow(id)}
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              Страница {rowsData.page} из {rowsData.totalPages}
              {loading ? " · загрузка…" : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </button>
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
                disabled={page >= rowsData.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
