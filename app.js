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
      color: "#e091b8",
      textColor: "#c45a8f",
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
      color: "#8b919a",
      textColor: "#5f666f",
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
      color: "#1a3f7a",
      textColor: "#1a3f7a",
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
      color: "#7a5ea8",
      textColor: "#654d91",
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
      color: "#e08a3c",
      textColor: "#c46f24",
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
      color: "#3d9a64",
      textColor: "#2f7a4e",
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
      color: "#d6c4a8",
      textColor: "#9a8568",
      questions: [
        "В каких ситуациях вам особенно важно заранее всё продумать?",
        "Как вы обычно готовитесь к важным разговорам или решениям?",
        "Что помогает вам снизить напряжение перед неопределённым исходом?",
        "Как вы относитесь к ошибкам — своим и чужим — в ответственной работе?",
      ],
    },
  ];

  var els = {};
  var radicalsData = {};
  var activeRadicalId = RADICALS[0].id;
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

  function cloneRadicalData(src) {
    var base = emptyRadicalData();
    if (!src) return base;
    return {
      observations: src.observations || "",
      arguments: src.arguments || "",
      contradictions: src.contradictions || "",
      checkQuestions: src.checkQuestions || "",
      intensity: src.intensity || "none",
      confidence: src.confidence || "medium",
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

  function radicalName(id) {
    var found = RADICALS.find(function (r) {
      return r.id === id;
    });
    return found ? found.name : id;
  }

  function getActiveData() {
    return radicalsData[activeRadicalId] || emptyRadicalData();
  }

  function flushEditorToState() {
    if (!activeRadicalId) return;
    radicalsData[activeRadicalId] = {
      observations: els.observations.value,
      arguments: els.arguments.value,
      contradictions: els.contradictions.value,
      checkQuestions: els.checkQuestions.value,
      intensity: getSelectedSegment(els.intensitySegments) || "none",
      confidence: getSelectedSegment(els.confidenceSegments) || "medium",
    };
  }

  function getSelectedSegment(container) {
    var active = container.querySelector(".segment.is-active");
    return active ? active.getAttribute("data-value") : null;
  }

  function setSegmentValue(container, value) {
    container.querySelectorAll(".segment").forEach(function (btn) {
      var on = btn.getAttribute("data-value") === value;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function buildSegments(container, options, selected, onChange) {
    var html = "";
    options.forEach(function (opt) {
      html +=
        '<button type="button" class="segment' +
        (opt.value === selected ? " is-active" : "") +
        '" data-value="' +
        opt.value +
        '" aria-pressed="' +
        (opt.value === selected ? "true" : "false") +
        '">' +
        escapeHtml(opt.label) +
        "</button>";
    });
    container.innerHTML = html;
    container.querySelectorAll(".segment").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setSegmentValue(container, btn.getAttribute("data-value"));
        flushEditorToState();
        updateSwitcherMeta();
        updateActiveMeta();
        if (onChange) onChange();
      });
    });
  }

  function renderSwitcher() {
    var html = "";
    RADICALS.forEach(function (radical) {
      html +=
        '<button type="button" class="radical-chip radical-chip--' +
        radical.id +
        '" data-radical="' +
        radical.id +
        '" role="tab" style="--radical-color: ' +
        radical.color +
        "; --radical-text: " +
        (radical.textColor || radical.color) +
        '">' +
        '<span class="radical-chip-top">' +
        '<span class="radical-icon" aria-hidden="true"></span>' +
        '<span class="radical-chip-name">' +
        escapeHtml(radical.name) +
        "</span>" +
        "</span>" +
        '<span class="radical-chip-meta" data-role="chip-meta"></span>' +
        "</button>";
    });
    els.switcher.innerHTML = html;
    els.switcher.querySelectorAll(".radical-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectRadical(btn.getAttribute("data-radical"), true);
      });
    });
  }

  function updateSwitcherMeta() {
    RADICALS.forEach(function (r) {
      var data = radicalsData[r.id] || emptyRadicalData();
      var chip = els.switcher.querySelector('[data-radical="' + r.id + '"]');
      if (!chip) return;
      var meta = chip.querySelector('[data-role="chip-meta"]');
      var shortIntensity = labelByValue(INTENSITY_OPTIONS, data.intensity);
      var argsCount = countFilledArguments(data.arguments);
      meta.textContent = shortIntensity + (argsCount ? " · арг. " + argsCount : "");
      chip.classList.toggle("is-active", r.id === activeRadicalId);
      chip.classList.toggle("has-notes", Boolean(
        (data.observations && data.observations.trim()) ||
          (data.arguments && data.arguments.trim()) ||
          (data.contradictions && data.contradictions.trim()) ||
          (data.checkQuestions && data.checkQuestions.trim())
      ));
      chip.classList.toggle("is-strong", data.intensity === "strong");
      chip.classList.toggle("is-moderate", data.intensity === "moderate");
      chip.setAttribute("aria-selected", r.id === activeRadicalId ? "true" : "false");
    });
  }

  function updateActiveMeta() {
    var data = getActiveData();
    els.activeMeta.textContent =
      labelByValue(INTENSITY_OPTIONS, data.intensity) +
      " · уверенность: " +
      labelByValue(CONFIDENCE_OPTIONS, data.confidence) +
      " · аргументов: " +
      countFilledArguments(data.arguments);
  }

  function loadEditorFromState() {
    var data = getActiveData();
    var radical = RADICALS.find(function (r) {
      return r.id === activeRadicalId;
    });
    els.activeTitle.textContent = radicalName(activeRadicalId);
    if (els.radicalEditor && radical) {
      els.radicalEditor.style.setProperty("--radical-color", radical.color);
      els.radicalEditor.style.setProperty(
        "--radical-text",
        radical.textColor || radical.color
      );
    }
    els.observations.value = data.observations || "";
    els.arguments.value = data.arguments || "";
    els.contradictions.value = data.contradictions || "";
    els.checkQuestions.value = data.checkQuestions || "";
    setSegmentValue(els.intensitySegments, data.intensity || "none");
    setSegmentValue(els.confidenceSegments, data.confidence || "medium");
    els.clarifyBlock.hidden = true;
    els.clarifyBlock.innerHTML = "";
    updateActiveMeta();
    updateSwitcherMeta();
  }

  function selectRadical(id, focusField) {
    if (!RADICALS.some(function (r) { return r.id === id; })) return;
    flushEditorToState();
    activeRadicalId = id;
    loadEditorFromState();
    if (focusField) {
      els.observations.focus();
    }
  }

  function maybeAutoSortHierarchy() {
    var isDefault = hierarchyOrder.every(function (id, i) {
      return id === RADICALS[i].id;
    });
    if (isDefault) {
      hierarchyOrder = sortOrderByIntensity(radicalsData);
    }
  }

  function showClarify() {
    var radical = RADICALS.find(function (r) {
      return r.id === activeRadicalId;
    });
    if (!radical) return;

    var items = radical.questions
      .slice(0, 4)
      .map(function (q, index) {
        return (
          '<li class="clarify-item">' +
          '<span class="clarify-text">' +
          escapeHtml(q) +
          "</span>" +
          '<button type="button" class="btn btn-small btn-insert" data-q-index="' +
          index +
          '">Вставить</button>' +
          "</li>"
        );
      })
      .join("");

    els.clarifyBlock.innerHTML =
      "<h3>Открытые вопросы для проверки гипотезы</h3>" +
      '<ul class="clarify-list">' +
      items +
      "</ul>" +
      '<button type="button" class="btn btn-small" id="btn-insert-all">Вставить все</button>';
    els.clarifyBlock.hidden = false;

    els.clarifyBlock.querySelectorAll(".btn-insert").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = Number(btn.getAttribute("data-q-index"));
        insertQuestion(radical.questions[idx]);
      });
    });

    var insertAll = $("btn-insert-all");
    if (insertAll) {
      insertAll.addEventListener("click", function () {
        radical.questions.slice(0, 4).forEach(function (q) {
          insertQuestion(q);
        });
      });
    }
  }

  function insertQuestion(question) {
    if (!question) return;
    var current = els.checkQuestions.value;
    var trimmed = current.trim();
    var line = "• " + question;
    if (trimmed.indexOf(question) !== -1) {
      showToast("save-toast", "Этот вопрос уже есть в поле");
      els.checkQuestions.focus();
      return;
    }
    els.checkQuestions.value = trimmed ? trimmed + "\n" + line : line;
    flushEditorToState();
    updateSwitcherMeta();
    updateActiveMeta();
    els.checkQuestions.focus();
    showToast("save-toast", "Вопрос добавлен в поле проверки");
  }

  function collectInterview() {
    flushEditorToState();
    var radicals = {};
    RADICALS.forEach(function (r) {
      radicals[r.id] = cloneRadicalData(radicalsData[r.id]);
    });
    return {
      respondent: els.respondent.value.trim(),
      date: els.interviewDate.value || "",
      goal: els.interviewGoal.value.trim(),
      rawNotes: els.rawNotes.value,
      radicals: radicals,
      hierarchyOrder: hierarchyOrder.slice(),
      activeRadicalId: activeRadicalId,
      savedAt: new Date().toISOString(),
    };
  }

  function applyInterview(data) {
    var src = data || emptyInterview();
    els.respondent.value = src.respondent || "";
    els.interviewDate.value = src.date || todayISO();
    els.interviewGoal.value = src.goal || "";
    els.rawNotes.value = src.rawNotes || "";

    radicalsData = {};
    RADICALS.forEach(function (r) {
      radicalsData[r.id] = cloneRadicalData(src.radicals && src.radicals[r.id]);
    });

    if (Array.isArray(src.hierarchyOrder) && src.hierarchyOrder.length) {
      hierarchyOrder = normalizeOrder(src.hierarchyOrder);
    } else {
      hierarchyOrder = sortOrderByIntensity(radicalsData);
    }

    activeRadicalId =
      src.activeRadicalId && radicalsData[src.activeRadicalId]
        ? src.activeRadicalId
        : RADICALS[0].id;

    loadEditorFromState();
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

  function refreshSummaryTable() {
    flushEditorToState();
    var rows = "";
    RADICALS.forEach(function (r) {
      var data = radicalsData[r.id] || emptyRadicalData();
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
    flushEditorToState();
    var html = "";
    hierarchyOrder.forEach(function (id, index) {
      var data = radicalsData[id] || emptyRadicalData();
      var radical = RADICALS.find(function (r) {
        return r.id === id;
      });
      var color = radical ? radical.color : "#8b919a";
      var textColor = radical ? radical.textColor || radical.color : "#5f666f";
      html +=
        '<li class="hierarchy-item" data-id="' +
        id +
        '" style="--radical-color: ' +
        color +
        "; --radical-text: " +
        textColor +
        '">' +
        '<span class="radical-icon" aria-hidden="true"></span>' +
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
      flushEditorToState();
      var isDefault = hierarchyOrder.every(function (id, i) {
        return id === RADICALS[i].id;
      });
      if (isDefault) hierarchyOrder = sortOrderByIntensity(radicalsData);
      refreshProfileViews();
    }
  }

  function onEditorInput() {
    flushEditorToState();
    updateSwitcherMeta();
    updateActiveMeta();
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
    els.btnClarify.addEventListener("click", showClarify);

    ["observations", "arguments", "contradictions", "checkQuestions"].forEach(
      function (key) {
        els[key].addEventListener("input", onEditorInput);
      }
    );
  }

  function cacheElements() {
    els.switcher = $("radical-switcher");
    els.respondent = $("respondent");
    els.interviewDate = $("interview-date");
    els.interviewGoal = $("interview-goal");
    els.rawNotes = $("raw-notes");
    els.observations = $("field-observations");
    els.arguments = $("field-arguments");
    els.contradictions = $("field-contradictions");
    els.checkQuestions = $("field-check-questions");
    els.intensitySegments = $("intensity-segments");
    els.confidenceSegments = $("confidence-segments");
    els.activeTitle = $("active-radical-title");
    els.activeMeta = $("active-radical-meta");
    els.radicalEditor = document.querySelector(".radical-editor");
    els.btnClarify = $("btn-clarify");
    els.clarifyBlock = $("clarify-block");
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
    RADICALS.forEach(function (r) {
      radicalsData[r.id] = emptyRadicalData();
    });
    renderSwitcher();
    buildSegments(els.intensitySegments, INTENSITY_OPTIONS, "none", maybeAutoSortHierarchy);
    buildSegments(els.confidenceSegments, CONFIDENCE_OPTIONS, "medium");
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
