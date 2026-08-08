(function () {
  "use strict";

  var STORAGE_KEY = "profzor_last_interview_v1";
  var EMPTY_HINT = "Недостаточно данных";

  var INTENSITY_OPTIONS = [
    { value: "none", label: "Нет данных" },
    { value: "weak", label: "Слабый" },
    { value: "moderate", label: "Умеренный" },
    { value: "strong", label: "Выраженный" },
  ];

  var INTENSITY_RANK = {
    strong: 3,
    moderate: 2,
    weak: 1,
    none: 0,
  };

  var CONFIDENCE_OPTIONS = [
    { value: "low", label: "Низкая" },
    { value: "medium", label: "Средняя" },
    { value: "high", label: "Высокая" },
  ];

  var RADICALS = [
    {
      id: "hysteroid",
      name: "Истероид",
      questions: [
        "В каких ситуациях вам особенно важно, как вас воспринимают окружающие?",
        "Как вы обычно привлекаете внимание к своей точке зрения?",
        "Что для вас значит поддержка или одобрение со стороны других?",
        "Как вы реагируете, когда ваши усилия остаются незамеченными?",
      ],
    },
    {
      id: "epileptoid",
      name: "Эпилептоид",
      questions: [
        "Насколько для вас важны порядок, правила и предсказуемость?",
        "Как вы обычно относитесь к изменениям планов в последний момент?",
        "В каких ситуациях вам проще опираться на чёткие критерии?",
        "Как вы реагируете, когда кто-то нарушает договорённости?",
      ],
    },
    {
      id: "paranoid",
      name: "Паранойал",
      questions: [
        "Какая цель сейчас для вас наиболее значима и почему?",
        "Как вы обычно отстаиваете свою позицию в долгих обсуждениях?",
        "Что помогает вам сохранять направление при сопротивлении?",
        "В каких ситуациях вы готовы настойчиво добиваться результата?",
      ],
    },
    {
      id: "schizoid",
      name: "Шизоид",
      questions: [
        "В каких задачах вам комфортнее работать самостоятельно?",
        "Как вы предпочитаете осмыслять новую информацию — через практику или через схемы?",
        "Что для вас важно в общении: близость или сохранение дистанции?",
        "В каких ситуациях вам особенно нужна возможность подумать в тишине?",
      ],
    },
    {
      id: "hyperthym",
      name: "Гипертим",
      questions: [
        "Как вы обычно восстанавливаете темп после неудачи?",
        "В каких ситуациях вам легче проявлять инициативу?",
        "Что помогает вам поддерживать интерес к нескольким делам сразу?",
        "Как вы относитесь к риску и неопределённости в работе?",
      ],
    },
    {
      id: "emotive",
      name: "Эмотив",
      questions: [
        "Как вы обычно понимаете, что человеку сейчас нужна поддержка?",
        "В каких ситуациях чужие эмоции сильнее всего на вас влияют?",
        "Что для вас важно в атмосфере команды или близкого круга?",
        "Как вы обычно реагируете на чужую боль или несправедливость?",
      ],
    },
    {
      id: "anxious",
      name: "Тревожный",
      questions: [
        "В каких ситуациях вам особенно важно заранее всё продумать?",
        "Как вы обычно готовитесь к важным разговорам или решениям?",
        "Что помогает вам снизить напряжение перед неопределённым исходом?",
        "Как вы относитесь к ошибкам — своим и чужим — в ответственной работе?",
      ],
    },
  ];

  var els = {};
  var hierarchyOrder = RADICALS.map(function (r) {
    return r.id;
  });
  var toastTimers = {};

  function $(id) {
    return document.getElementById(id);
  }

  function labelByValue(options, value) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === value) return options[i].label;
    }
    return options[0].label;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function countFilledArguments(text) {
    if (!text || !String(text).trim()) return 0;
    var lines = String(text).split(/\r?\n/);
    var count = 0;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim()) count += 1;
    }
    return count;
  }

  function emptyRadicalData() {
    return {
      observations: "",
      arguments: "",
      contradictions: "",
      checkQuestions: "",
      intensity: "none",
      confidence: "medium",
    };
  }

  function emptyInterview() {
    var radicals = {};
    RADICALS.forEach(function (r) {
      radicals[r.id] = emptyRadicalData();
    });
    return {
      respondent: "",
      date: todayISO(),
      goal: "",
      rawNotes: "",
      radicals: radicals,
      hierarchyOrder: RADICALS.map(function (r) {
        return r.id;
      }),
    };
  }

  function showToast(id, message, ms) {
    var node = $(id);
    if (!node) return;
    if (message) node.textContent = message;
    node.hidden = false;
    if (toastTimers[id]) clearTimeout(toastTimers[id]);
    toastTimers[id] = setTimeout(function () {
      node.hidden = true;
    }, ms || 2500);
  }

  function buildSelect(options, value, className) {
    var html = '<select class="' + className + '">';
    options.forEach(function (opt) {
      html +=
        '<option value="' +
        opt.value +
        '"' +
        (opt.value === value ? " selected" : "") +
        ">" +
        escapeHtml(opt.label) +
        "</option>";
    });
    html += "</select>";
    return html;
  }

  function renderRadicals() {
    var html = "";
    RADICALS.forEach(function (radical) {
      html +=
        '<details class="radical-card" data-radical="' +
        radical.id +
        '">' +
        '<summary class="radical-summary">' +
        '<span class="radical-title">' +
        escapeHtml(radical.name) +
        ' <span class="radical-chevron" aria-hidden="true">▾</span></span>' +
        '<span class="radical-meta" data-role="meta"></span>' +
        "</summary>" +
        '<div class="radical-body">' +
        '<label class="field"><span class="field-label">Наблюдения и цитаты</span>' +
        '<textarea data-field="observations" rows="4" placeholder="Факты, формулировки респондента…"></textarea></label>' +
        '<label class="field"><span class="field-label">Аргументы</span>' +
        '<textarea data-field="arguments" rows="3" placeholder="Почему эта гипотеза кажется уместной…"></textarea></label>' +
        '<label class="field"><span class="field-label">Противоречия</span>' +
        '<textarea data-field="contradictions" rows="3" placeholder="Что не сходится или требует проверки…"></textarea></label>' +
        '<label class="field"><span class="field-label">Вопросы для проверки</span>' +
        '<textarea data-field="checkQuestions" rows="3" placeholder="Ваши вопросы для уточнения…"></textarea></label>' +
        '<div class="controls-row">' +
        '<label class="field"><span class="field-label">Выраженность</span>' +
        buildSelect(INTENSITY_OPTIONS, "none", "intensity-select") +
        "</label>" +
        '<label class="field"><span class="field-label">Уверенность</span>' +
        buildSelect(CONFIDENCE_OPTIONS, "medium", "confidence-select") +
        "</label>" +
        "</div>" +
        '<button type="button" class="btn btn-small btn-clarify">Что уточнить?</button>' +
        '<div class="clarify-block" data-role="clarify" hidden></div>' +
        "</div></details>";
    });
    els.radicals.innerHTML = html;

    els.radicals.querySelectorAll(".radical-card").forEach(function (card) {
      card.addEventListener("toggle", function () {
        card.classList.toggle("is-open", card.open);
      });

      card.querySelector(".btn-clarify").addEventListener("click", function () {
        showClarify(card.dataset.radical);
      });

      ["observations", "arguments", "contradictions", "checkQuestions"].forEach(
        function (field) {
          card
            .querySelector('[data-field="' + field + '"]')
            .addEventListener("input", updateRadicalMeta);
        }
      );
      card
        .querySelector(".intensity-select")
        .addEventListener("change", function () {
          updateRadicalMeta();
          refreshProfileViews();
        });
      card
        .querySelector(".confidence-select")
        .addEventListener("change", updateRadicalMeta);
    });
  }

  function getCard(id) {
    return els.radicals.querySelector('[data-radical="' + id + '"]');
  }

  function readRadicalFromDom(id) {
    var card = getCard(id);
    if (!card) return emptyRadicalData();
    return {
      observations: card.querySelector('[data-field="observations"]').value,
      arguments: card.querySelector('[data-field="arguments"]').value,
      contradictions: card.querySelector('[data-field="contradictions"]').value,
      checkQuestions: card.querySelector('[data-field="checkQuestions"]').value,
      intensity: card.querySelector(".intensity-select").value || "none",
      confidence: card.querySelector(".confidence-select").value || "medium",
    };
  }

  function writeRadicalToDom(id, data) {
    var card = getCard(id);
    if (!card) return;
    var src = data || emptyRadicalData();
    card.querySelector('[data-field="observations"]').value = src.observations || "";
    card.querySelector('[data-field="arguments"]').value = src.arguments || "";
    card.querySelector('[data-field="contradictions"]').value =
      src.contradictions || "";
    card.querySelector('[data-field="checkQuestions"]').value =
      src.checkQuestions || "";
    card.querySelector(".intensity-select").value = src.intensity || "none";
    card.querySelector(".confidence-select").value = src.confidence || "medium";
  }

  function collectInterview() {
    var radicals = {};
    RADICALS.forEach(function (r) {
      radicals[r.id] = readRadicalFromDom(r.id);
    });
    return {
      respondent: els.respondent.value.trim(),
      date: els.interviewDate.value || "",
      goal: els.interviewGoal.value.trim(),
      rawNotes: els.rawNotes.value,
      radicals: radicals,
      hierarchyOrder: hierarchyOrder.slice(),
      savedAt: new Date().toISOString(),
    };
  }

  function applyInterview(data) {
    var src = data || emptyInterview();
    els.respondent.value = src.respondent || "";
    els.interviewDate.value = src.date || todayISO();
    els.interviewGoal.value = src.goal || "";
    els.rawNotes.value = src.rawNotes || "";

    RADICALS.forEach(function (r) {
      writeRadicalToDom(r.id, (src.radicals && src.radicals[r.id]) || emptyRadicalData());
    });

    if (Array.isArray(src.hierarchyOrder) && src.hierarchyOrder.length) {
      hierarchyOrder = normalizeOrder(src.hierarchyOrder);
    } else {
      hierarchyOrder = sortOrderByIntensity(src.radicals || {});
    }

    updateRadicalMeta();
    els.cardDraft.value = "";
    refreshProfileViews();
  }

  function normalizeOrder(order) {
    var seen = {};
    var result = [];
    order.forEach(function (id) {
      if (!seen[id] && RADICALS.some(function (r) { return r.id === id; })) {
        seen[id] = true;
        result.push(id);
      }
    });
    RADICALS.forEach(function (r) {
      if (!seen[r.id]) result.push(r.id);
    });
    return result;
  }

  function sortOrderByIntensity(radicalsMap) {
    return RADICALS.map(function (r) {
      return r.id;
    }).sort(function (a, b) {
      var ra = INTENSITY_RANK[(radicalsMap[a] && radicalsMap[a].intensity) || "none"] || 0;
      var rb = INTENSITY_RANK[(radicalsMap[b] && radicalsMap[b].intensity) || "none"] || 0;
      if (rb !== ra) return rb - ra;
      var ia = RADICALS.findIndex(function (r) { return r.id === a; });
      var ib = RADICALS.findIndex(function (r) { return r.id === b; });
      return ia - ib;
    });
  }

  function updateRadicalMeta() {
    RADICALS.forEach(function (r) {
      var data = readRadicalFromDom(r.id);
      var card = getCard(r.id);
      if (!card) return;
      var meta = card.querySelector('[data-role="meta"]');
      var argsCount = countFilledArguments(data.arguments);
      meta.textContent =
        labelByValue(INTENSITY_OPTIONS, data.intensity) +
        " · " +
        labelByValue(CONFIDENCE_OPTIONS, data.confidence) +
        " · аргум.: " +
        argsCount;
    });
  }

  function showClarify(radicalId) {
    var radical = RADICALS.find(function (r) {
      return r.id === radicalId;
    });
    var card = getCard(radicalId);
    if (!radical || !card) return;
    var block = card.querySelector('[data-role="clarify"]');
    var list = radical.questions
      .slice(0, 4)
      .map(function (q) {
        return "<li>" + escapeHtml(q) + "</li>";
      })
      .join("");
    block.innerHTML =
      "<h3>Открытые вопросы для проверки гипотезы</h3><ol>" + list + "</ol>";
    block.hidden = false;
  }

  function saveInterview() {
    var data = collectInterview();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      showToast("save-toast", "Интервью сохранено локально");
    } catch (err) {
      showToast("save-toast", "Не удалось сохранить: переполнен LocalStorage");
    }
  }

  function loadInterview() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        applyInterview(emptyInterview());
        return;
      }
      applyInterview(JSON.parse(raw));
    } catch (err) {
      applyInterview(emptyInterview());
    }
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function newInterview() {
    if (
      !confirmAction(
        "Создать новое интервью? Текущие несохранённые изменения будут потеряны. Рекомендуется сначала сохранить."
      )
    ) {
      return;
    }
    hierarchyOrder = RADICALS.map(function (r) {
      return r.id;
    });
    applyInterview(emptyInterview());
    showToast("save-toast", "Новая форма готова. Сохраните, когда заполните.");
  }

  function clearForm() {
    if (!confirmAction("Очистить все поля текущей формы?")) return;
    hierarchyOrder = RADICALS.map(function (r) {
      return r.id;
    });
    applyInterview(emptyInterview());
    showToast("save-toast", "Форма очищена");
  }

  function radicalName(id) {
    var found = RADICALS.find(function (r) {
      return r.id === id;
    });
    return found ? found.name : id;
  }

  function refreshSummaryTable() {
    var rows = "";
    RADICALS.forEach(function (r) {
      var data = readRadicalFromDom(r.id);
      rows +=
        "<tr>" +
        "<td>" +
        escapeHtml(r.name) +
        "</td>" +
        "<td>" +
        escapeHtml(labelByValue(INTENSITY_OPTIONS, data.intensity)) +
        "</td>" +
        "<td>" +
        escapeHtml(labelByValue(CONFIDENCE_OPTIONS, data.confidence)) +
        "</td>" +
        "<td>" +
        countFilledArguments(data.arguments) +
        "</td>" +
        "</tr>";
    });
    els.summaryBody.innerHTML = rows;
  }

  function refreshHierarchy() {
    var interview = collectInterview();
    // Если пользователь ещё не менял порядок вручную в этой сессии профиля —
    // при открытии профиля подтягиваем сортировку по выраженности,
    // но сохраняем уже заданный hierarchyOrder (в т.ч. после ↑↓).
    var html = "";
    hierarchyOrder.forEach(function (id, index) {
      var data = interview.radicals[id] || emptyRadicalData();
      html +=
        '<li class="hierarchy-item" data-id="' +
        id +
        '">' +
        '<span class="hierarchy-rank">' +
        (index + 1) +
        "</span>" +
        '<span class="hierarchy-name">' +
        escapeHtml(radicalName(id)) +
        "</span>" +
        '<span class="hierarchy-intensity">' +
        escapeHtml(labelByValue(INTENSITY_OPTIONS, data.intensity)) +
        "</span>" +
        '<span class="hierarchy-controls">' +
        '<button type="button" class="btn btn-up" aria-label="Выше" data-dir="up">↑</button>' +
        '<button type="button" class="btn btn-down" aria-label="Ниже" data-dir="down">↓</button>' +
        "</span></li>";
    });
    els.hierarchyList.innerHTML = html;

    els.hierarchyList.querySelectorAll(".btn-up, .btn-down").forEach(function (btn) {
      btn.addEventListener("click", function () {
        moveHierarchy(btn.closest(".hierarchy-item").dataset.id, btn.dataset.dir);
      });
    });
  }

  function moveHierarchy(id, dir) {
    var index = hierarchyOrder.indexOf(id);
    if (index < 0) return;
    var target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= hierarchyOrder.length) return;
    var copy = hierarchyOrder.slice();
    var tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    hierarchyOrder = copy;
    refreshHierarchy();
  }

  function refreshProfileViews() {
    refreshSummaryTable();
    refreshHierarchy();
  }

  function textOrInsufficient(value) {
    var t = (value || "").trim();
    return t ? t : EMPTY_HINT;
  }

  function collectSectionTexts(order, radicalsMap, field) {
    var parts = [];
    order.forEach(function (id) {
      var data = radicalsMap[id] || emptyRadicalData();
      var value = (data[field] || "").trim();
      if (!value) return;
      parts.push(radicalName(id) + ":\n" + value);
    });
    return parts.length ? parts.join("\n\n") : EMPTY_HINT;
  }

  function buildDraft() {
    var data = collectInterview();
    var order = hierarchyOrder.slice();
    var radicalsMap = data.radicals || {};

    var hierarchyLines = order.map(function (id, i) {
      var item = radicalsMap[id] || emptyRadicalData();
      return (
        i +
        1 +
        ". " +
        radicalName(id) +
        " — " +
        labelByValue(INTENSITY_OPTIONS, item.intensity) +
        " (уверенность: " +
        labelByValue(CONFIDENCE_OPTIONS, item.confidence) +
        ")"
      );
    });

    var leading = order.filter(function (id) {
      var item = radicalsMap[id] || emptyRadicalData();
      return item.intensity === "strong" || item.intensity === "moderate";
    });

    var argsLeading = [];
    leading.forEach(function (id) {
      var item = radicalsMap[id] || emptyRadicalData();
      var args = (item.arguments || "").trim();
      if (args) argsLeading.push(radicalName(id) + ":\n" + args);
    });

    var clarifyParts = [];
    order.forEach(function (id) {
      var item = radicalsMap[id] || emptyRadicalData();
      var contra = (item.contradictions || "").trim();
      var checks = (item.checkQuestions || "").trim();
      if (!contra && !checks) return;
      var lines = [];
      if (contra) lines.push(contra);
      if (checks) lines.push("Вопросы для проверки:\n" + checks);
      clarifyParts.push(radicalName(id) + ":\n" + lines.join("\n"));
    });

    var observations = collectSectionTexts(order, radicalsMap, "observations");

    // Отдельных полей для ресурсов и особенностей взаимодействия нет:
    // не интерпретируем другие записи — только «Недостаточно данных».
    var draft = [
      "Карточка профиля (черновик)",
      "Респондент: " + (data.respondent || EMPTY_HINT),
      "Дата интервью: " + (data.date || EMPTY_HINT),
      "Цель интервью: " + (data.goal || EMPTY_HINT),
      "",
      "Предварительная иерархия профиля:",
      hierarchyLines.join("\n"),
      "",
      "Наблюдаемые проявления:",
      observations,
      "",
      "Аргументы по ведущим особенностям:",
      argsLeading.length ? argsLeading.join("\n\n") : EMPTY_HINT,
      "",
      "Противоречия и данные для уточнения:",
      clarifyParts.length ? clarifyParts.join("\n\n") : EMPTY_HINT,
      "",
      "Возможные ресурсы и сильные стороны:",
      EMPTY_HINT,
      "",
      "Особенности взаимодействия:",
      EMPTY_HINT,
      "",
      "Ограничения вывода:",
      "Карточка является рабочим экспертным черновиком, основанным на данных конкретного интервью. Она не является диагнозом",
    ];

    els.cardDraft.value = draft.join("\n");
  }

  function copyDraft() {
    var text = els.cardDraft.value.trim();
    if (!text) {
      showToast("copy-toast", "Сначала сформируйте черновик карточки");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast("copy-toast", "Текст скопирован");
        },
        function () {
          fallbackCopy(text);
        }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    els.cardDraft.focus();
    els.cardDraft.select();
    try {
      document.execCommand("copy");
      showToast("copy-toast", "Текст скопирован");
    } catch (err) {
      showToast("copy-toast", "Не удалось скопировать автоматически");
    }
  }

  function downloadDraft() {
    var text = els.cardDraft.value.trim();
    if (!text) {
      showToast("copy-toast", "Сначала сформируйте черновик карточки");
      return;
    }
    var data = collectInterview();
    var code = (data.respondent || "interview").replace(/[\\/:*?"<>|]+/g, "_");
    var filename = "profzor_" + code + "_" + (data.date || todayISO()) + ".txt";
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("copy-toast", "Файл .txt скачан");
  }

  function switchTab(tabName) {
    var isInterview = tabName === "interview";
    els.tabInterview.classList.toggle("is-active", isInterview);
    els.tabProfile.classList.toggle("is-active", !isInterview);
    els.tabInterview.setAttribute("aria-selected", isInterview ? "true" : "false");
    els.tabProfile.setAttribute("aria-selected", isInterview ? "false" : "true");

    els.panelInterview.classList.toggle("is-active", isInterview);
    els.panelProfile.classList.toggle("is-active", !isInterview);
    els.panelInterview.hidden = !isInterview;
    els.panelProfile.hidden = isInterview;

    if (!isInterview) {
      // При переходе на профиль обновляем сводку и
      // пересобираем иерархию по выраженности, сохраняя ручной порядок,
      // если пользователь уже менял его (hierarchyOrder уже в памяти).
      var current = collectInterview();
      var auto = sortOrderByIntensity(current.radicals);
      // Если порядок совпадает с исходным порядком радикалов — применяем автосортировку.
      var isDefault = hierarchyOrder.every(function (id, i) {
        return id === RADICALS[i].id;
      });
      if (isDefault) hierarchyOrder = auto;
      refreshProfileViews();
    }
  }

  function bindEvents() {
    els.tabInterview.addEventListener("click", function () {
      switchTab("interview");
    });
    els.tabProfile.addEventListener("click", function () {
      switchTab("profile");
    });

    els.btnSave.addEventListener("click", saveInterview);
    els.btnNew.addEventListener("click", newInterview);
    els.btnClear.addEventListener("click", clearForm);
    els.btnDraft.addEventListener("click", buildDraft);
    els.btnCopy.addEventListener("click", copyDraft);
    els.btnDownload.addEventListener("click", downloadDraft);

    // При смене выраженности на экране интервью — помечаем,
    // что автоматическая пересортировка при входе в профиль уместна,
    // если порядок ещё «дефолтный».
    els.radicals.addEventListener("change", function (event) {
      if (event.target && event.target.classList.contains("intensity-select")) {
        var current = collectInterview();
        var isDefault = hierarchyOrder.every(function (id, i) {
          return id === RADICALS[i].id;
        });
        if (isDefault) {
          hierarchyOrder = sortOrderByIntensity(current.radicals);
        }
      }
    });
  }

  function cacheElements() {
    els.radicals = $("radicals");
    els.respondent = $("respondent");
    els.interviewDate = $("interview-date");
    els.interviewGoal = $("interview-goal");
    els.rawNotes = $("raw-notes");
    els.btnSave = $("btn-save");
    els.btnNew = $("btn-new");
    els.btnClear = $("btn-clear");
    els.tabInterview = $("tab-interview");
    els.tabProfile = $("tab-profile");
    els.panelInterview = $("panel-interview");
    els.panelProfile = $("panel-profile");
    els.summaryBody = $("summary-body");
    els.hierarchyList = $("hierarchy-list");
    els.btnDraft = $("btn-draft");
    els.btnCopy = $("btn-copy");
    els.btnDownload = $("btn-download");
    els.cardDraft = $("card-draft");
  }

  function init() {
    cacheElements();
    renderRadicals();
    bindEvents();
    loadInterview();
    switchTab("interview");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
