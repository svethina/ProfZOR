(function () {
  "use strict";

  var STORAGE_KEY = "profzor_last_interview_v2";
  var STORAGE_KEY_LEGACY = "profzor_last_interview_v1";
  var RAW_DRAFT_KEY = "profzor_raw_draft_v1";
  var CHECK_BANK_RESET_KEY = "profzor_check_bank_reset_v1";
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

  var RADICALS = [
    {
      id: "hysteroid",
      name: "Истероид",
      color: "#e091b8",
      textColor: "#c45a8f",
      questions: [],
    },
    {
      id: "epileptoid",
      name: "Эпилептоид",
      color: "#8b919a",
      textColor: "#5f666f",
      questions: [],
    },
    {
      id: "paranoid",
      name: "Паранойал",
      color: "#1a3f7a",
      textColor: "#1a3f7a",
      questions: [],
    },
    {
      id: "schizoid",
      name: "Шизоид",
      color: "#7a5ea8",
      textColor: "#654d91",
      questions: [],
    },
    {
      id: "hyperthym",
      name: "Гипертим",
      color: "#e08a3c",
      textColor: "#c46f24",
      questions: [],
    },
    {
      id: "emotive",
      name: "Эмотив",
      color: "#3d9a64",
      textColor: "#2f7a4e",
      questions: [],
    },
    {
      id: "anxious",
      name: "Тревожный",
      color: "#d6c4a8",
      textColor: "#9a8568",
      questions: [],
    },
  ];

  var els = {};
  var radicalsData = {};
  var generalQuestions = [];
  var checkQuestionsBank = [];
  var activeRadicalId = RADICALS[0].id;
  var interviewSessionId = "";
  var storedGoal = "";
  var lastAssignedRawNotes = "";
  var hierarchyOrder = RADICALS.map(function (r) {
    return r.id;
  });
  var hierarchyManual = false;
  var detailRadicalId = null;
  var toastTimers = {};
  var draftTimer = null;
  var idSeq = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function uid(prefix) {
    idSeq += 1;
    return (
      (prefix || "id") +
      "_" +
      Date.now().toString(36) +
      "_" +
      idSeq +
      "_" +
      Math.floor(Math.random() * 1000)
    );
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

  function radicalName(id) {
    var found = RADICALS.find(function (r) {
      return r.id === id;
    });
    return found ? found.name : id;
  }

  function radicalById(id) {
    return RADICALS.find(function (r) {
      return r.id === id;
    });
  }

  function reindexOrders(list) {
    list.forEach(function (item, index) {
      item.order = index + 1;
    });
    return list;
  }

  function sortByOrder(list) {
    return list.slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  }

  function buildDefaultCheckBank() {
    return [];
  }

  var DEFAULT_GENERAL_QUESTION_TEXTS = [
    "Расскажите немного о себе",
    "Какой профессией можно описать ваш характер",
    "Какие три профессии вам нравятся",
    "Назовите три качества, которые вам нравятся в себе",
    "Назовите три качества, которые вам не нравятся в себе",
    "Расскажите, как вы общаетесь с людьми",
    "Расскажите о своей работе, ее сильных сторонах и о том, что вам лучше всего удается. С примерами",
    "Что вам нравится в том, что вы делаете",
    "Что вам в этом не нравится",
    "Расскажите о вашем хобби",
    "Расскажите о ваших родителях",
    "Что выводит вас из равновесия",
  ];

  function buildDefaultGeneralQuestions() {
    return DEFAULT_GENERAL_QUESTION_TEXTS.map(function (text, i) {
      return {
        id: uid("gq"),
        text: text,
        order: i + 1,
      };
    });
  }

  function normalizeGeneralQuestions(raw) {
    if (!Array.isArray(raw) || !raw.length) return buildDefaultGeneralQuestions();
    return raw
      .map(function (q, i) {
        if (typeof q === "string") {
          return { id: uid("gq"), text: q, order: i + 1 };
        }
        if (!q || typeof q !== "object") return null;
        return {
          id: q.id || uid("gq"),
          text: typeof q.text === "string" ? q.text : String(q.text || ""),
          order: q.order || i + 1,
        };
      })
      .filter(function (q) {
        return q && String(q.text || "").trim();
      });
  }

  function persistInterviewSilent() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectInterview()));
    } catch (err) {}
  }

  function normalizeObservation(item, radicalId, index) {
    var rid = item.radicalId || radicalId;
    return {
      id: item.id || uid("obs"),
      order: item.order || index + 1,
      radicalId: rid,
      radicalName: item.radicalName || radicalName(rid),
      text: item.text || "",
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }

  function migrateObservations(raw) {
    if (Array.isArray(raw)) {
      return reindexOrders(
        raw.map(function (item, index) {
          return normalizeObservation(item, item.radicalId, index);
        })
      );
    }
    if (typeof raw === "string" && raw.trim()) {
      return [
        normalizeObservation(
          {
            text: raw.trim(),
            createdAt: new Date().toISOString(),
          },
          activeRadicalId,
          0
        ),
      ];
    }
    return [];
  }

  function emptyRadicalData() {
    return {
      observations: [],
      intensity: "none",
      expertComment: "",
    };
  }

  function cloneRadicalData(src, radicalId) {
    var base = emptyRadicalData();
    if (!src) return base;
    return {
      observations: migrateObservations(src.observations).map(function (item, i) {
        return normalizeObservation(item, radicalId || item.radicalId, i);
      }),
      intensity: src.intensity || "none",
      expertComment: typeof src.expertComment === "string" ? src.expertComment : "",
    };
  }

  function obsCount(data) {
    return data && data.observations ? data.observations.length : 0;
  }

  function hasRadicalNotes(data) {
    return obsCount(data) > 0;
  }

  function hasIntensitySet(data) {
    return Boolean(data && data.intensity && data.intensity !== "none");
  }

  function isRankableRadical(id) {
    var data = radicalsData[id] || emptyRadicalData();
    return hasRadicalNotes(data) || hasIntensitySet(data);
  }

  function radicalStatus(data) {
    var count = obsCount(data);
    if (count > 0) return "Есть данные";
    if (hasIntensitySet(data)) return "Нет опоры на наблюдения";
    return "Нужна проверка";
  }

  function getNeedsCheckIds() {
    return RADICALS.filter(function (r) {
      var data = radicalsData[r.id] || emptyRadicalData();
      return obsCount(data) === 0;
    }).map(function (r) {
      return r.id;
    });
  }

  function emptyInterview() {
    var radicals = {};
    RADICALS.forEach(function (r) {
      radicals[r.id] = emptyRadicalData();
    });
    return {
      interviewId: uid("iv"),
      respondent: "",
      date: todayISO(),
      goal: "",
      rawNotes: "",
      lastAssignedRawNotes: "",
      generalQuestions: buildDefaultGeneralQuestions(),
      checkQuestionsBank: buildDefaultCheckBank(),
      radicals: radicals,
      hierarchyOrder: RADICALS.map(function (r) {
        return r.id;
      }),
      hierarchyManual: false,
      conclusionText: "",
      activeRadicalId: RADICALS[0].id,
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
    }, ms || 2800);
  }

  function getActiveData() {
    if (!radicalsData[activeRadicalId]) {
      radicalsData[activeRadicalId] = emptyRadicalData();
    }
    return radicalsData[activeRadicalId];
  }

  function flushEditorToState() {
    /* Выраженность на вкладке «Интервью» больше не редактируется.
       Поле intensity в radicalsData сохраняется для вкладки «Карточка профиля». */
  }

  function updateDraftHint(visible) {
    if (!els.rawDraftHint) return;
    els.rawDraftHint.hidden = !visible;
  }

  function clearRawDraftStorage() {
    try {
      localStorage.removeItem(RAW_DRAFT_KEY);
    } catch (err) {}
    updateDraftHint(false);
  }

  function saveRawDraftStorage() {
    var text = els.rawNotes ? els.rawNotes.value : "";
    if (!String(text).trim()) {
      clearRawDraftStorage();
      return;
    }
    try {
      localStorage.setItem(
        RAW_DRAFT_KEY,
        JSON.stringify({
          interviewId: interviewSessionId,
          text: text,
        })
      );
      updateDraftHint(true);
    } catch (err) {
      updateDraftHint(false);
    }
  }

  function scheduleRawDraftSave() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(saveRawDraftStorage, 350);
  }

  function restoreRawDraftStorage() {
    try {
      var raw = localStorage.getItem(RAW_DRAFT_KEY);
      if (!raw) {
        updateDraftHint(false);
        return;
      }
      var data = JSON.parse(raw);
      if (!data || data.interviewId !== interviewSessionId) {
        updateDraftHint(false);
        return;
      }
      if (typeof data.text === "string" && data.text.trim()) {
        els.rawNotes.value = data.text;
        updateDraftHint(true);
      } else {
        updateDraftHint(false);
      }
    } catch (err) {
      updateDraftHint(false);
    }
  }

  function updateSelectedLabel() {
    var radical = radicalById(activeRadicalId);
    if (els.selectedRadicalName) {
      els.selectedRadicalName.textContent = radicalName(activeRadicalId);
    }
    if (els.selectedRadicalLabel && radical) {
      els.selectedRadicalLabel.style.setProperty("--radical-color", radical.color);
      els.selectedRadicalLabel.style.setProperty(
        "--radical-text",
        radical.textColor || radical.color
      );
    }
  }

  function extractChunkToAssign(rawText) {
    var trimmed = String(rawText || "").trim();
    return trimmed || null;
  }

  function assignRawNotesToRadical(radicalId) {
    var raw = els.rawNotes.value;
    var chunk = extractChunkToAssign(raw);
    if (!chunk) {
      showToast("save-toast", "Сначала запишите ответ в «Сырые заметки»");
      return false;
    }

    if (!radicalsData[radicalId]) {
      radicalsData[radicalId] = emptyRadicalData();
    }

    var list = radicalsData[radicalId].observations || [];
    list.push(
      normalizeObservation(
        {
          text: chunk,
          createdAt: new Date().toISOString(),
        },
        radicalId,
        list.length
      )
    );
    radicalsData[radicalId].observations = reindexOrders(list);

    els.rawNotes.value = "";
    lastAssignedRawNotes = "";
    clearRawDraftStorage();
    return true;
  }

  function onRadicalChipClick(radicalId) {
    flushEditorToState();
    var assigned = assignRawNotesToRadical(radicalId);
    activeRadicalId = radicalId;
    loadEditorFromState();
    if (assigned) {
      showToast(
        "save-toast",
        "Добавлено в наблюдения: " + radicalName(radicalId)
      );
    }
    els.rawNotes.focus();
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
        onRadicalChipClick(btn.getAttribute("data-radical"));
      });
    });
  }

  function updateSwitcherMeta() {
    RADICALS.forEach(function (r) {
      var data = radicalsData[r.id] || emptyRadicalData();
      var chip = els.switcher.querySelector('[data-radical="' + r.id + '"]');
      if (!chip) return;
      var meta = chip.querySelector('[data-role="chip-meta"]');
      var count = (data.observations || []).length;
      meta.textContent = count ? "записей: " + count : "";
      chip.classList.toggle("is-active", r.id === activeRadicalId);
      chip.classList.toggle("has-notes", hasRadicalNotes(data));
      chip.classList.remove("is-strong", "is-moderate");
      chip.setAttribute("aria-selected", r.id === activeRadicalId ? "true" : "false");
    });
  }

  function updateActiveMeta() {
    var data = getActiveData();
    var count = (data.observations || []).length;
    els.activeMeta.textContent = count ? "записей: " + count : "записей нет";
  }

  var generalAddOpen = false;

  function hideGeneralAddForm() {
    generalAddOpen = false;
    if (els.generalAddForm) els.generalAddForm.hidden = true;
    if (els.generalAddInput) els.generalAddInput.value = "";
    if (els.generalAddError) els.generalAddError.hidden = true;
  }

  function showGeneralAddForm() {
    generalAddOpen = true;
    if (els.generalAddForm) els.generalAddForm.hidden = false;
    if (els.generalAddError) els.generalAddError.hidden = true;
    if (els.generalAddInput) {
      els.generalAddInput.value = "";
      els.generalAddInput.focus();
    }
  }

  function renderGeneralQuestions() {
    generalQuestions = reindexOrders(sortByOrder(generalQuestions));

    if (!generalQuestions.length) {
      els.generalList.innerHTML =
        '<li class="list-empty">Пока нет общих вопросов. Нажмите «Добавить».</li>';
      return;
    }

    var html = "";
    generalQuestions.forEach(function (item, index) {
      html +=
        '<li class="check-item general-q-item">' +
        '<span class="check-num">' +
        (index + 1) +
        ".</span>" +
        '<span class="check-text">' +
        escapeHtml(item.text) +
        "</span></li>";
    });
    els.generalList.innerHTML = html;
  }

  function addGeneralQuestion() {
    showGeneralAddForm();
  }

  function saveGeneralAddForm() {
    var text = els.generalAddInput ? String(els.generalAddInput.value).trim() : "";
    if (!text) {
      if (els.generalAddError) els.generalAddError.hidden = false;
      if (els.generalAddInput) els.generalAddInput.focus();
      return;
    }
    generalQuestions.push({
      id: uid("gq"),
      text: text,
      order: generalQuestions.length + 1,
    });
    hideGeneralAddForm();
    renderGeneralQuestions();
    persistInterviewSilent();
  }

  function renderCheckQuestions() {
    checkQuestionsBank = sortByOrder(checkQuestionsBank);
    reindexOrders(checkQuestionsBank);

    var visible = checkQuestionsBank.filter(function (item) {
      return item.radicalId === activeRadicalId;
    });

    if (!visible.length) {
      els.checkList.innerHTML =
        '<li class="list-empty">Нет вопросов для этого радикала. Нажмите «Добавить».</li>';
      return;
    }

    var html = "";
    visible.forEach(function (item, index) {
      html +=
        '<li class="check-item">' +
        '<span class="check-num">' +
        (index + 1) +
        ".</span>" +
        '<span class="check-text">' +
        escapeHtml(item.text) +
        "</span></li>";
    });
    els.checkList.innerHTML = html;
  }

  function renderObservations() {
    var data = getActiveData();
    var list = reindexOrders(sortByOrder(data.observations || []));
    data.observations = list;

    if (!list.length) {
      els.observationsList.innerHTML =
        '<p class="list-empty">Пока нет записей. Запишите ответ слева и нажмите радикал.</p>';
      return;
    }

    var texts = list
      .map(function (item) {
        return String(item.text || "").trim();
      })
      .filter(Boolean);

    els.observationsList.innerHTML =
      '<p class="observations-plain">' + escapeHtml(texts.join(", ")) + "</p>";
  }

  function bindEditableList(container, api) {
    container.querySelectorAll(".list-item").forEach(function (row) {
      var id = row.getAttribute("data-id");
      var list = api.getList();
      var item = list.find(function (q) {
        return q.id === id;
      });
      if (!item) return;
      var text = row.querySelector(".list-text");
      if (text) {
        text.addEventListener("input", function (e) {
          item.text = e.target.value;
        });
      }
      row.querySelectorAll("[data-act]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handleListAction(api.getList(), id, btn.getAttribute("data-act"), function () {
            api.setList(api.getList());
            api.rerender();
          });
        });
      });
    });
  }

  function handleListAction(list, id, act, rerender) {
    var index = list.findIndex(function (item) {
      return item.id === id;
    });
    if (index < 0) return;
    if (act === "del") {
      list.splice(index, 1);
    } else if (act === "up" && index > 0) {
      var prev = list[index - 1];
      list[index - 1] = list[index];
      list[index] = prev;
    } else if (act === "down" && index < list.length - 1) {
      var next = list[index + 1];
      list[index + 1] = list[index];
      list[index] = next;
    }
    reindexOrders(list);
    rerender();
  }

  function addCheckQuestion() {
    var text = window.prompt("Введите вопрос для проверки:");
    if (text === null) return;
    text = String(text).trim();
    if (!text) {
      showToast("save-toast", "Пустой вопрос не добавлен");
      return;
    }
    checkQuestionsBank.push({
      id: uid("cq"),
      text: text,
      radicalId: activeRadicalId,
      order: checkQuestionsBank.length + 1,
    });
    renderCheckQuestions();
    showToast("save-toast", "Вопрос добавлен");
  }

  function loadEditorFromState() {
    var radical = radicalById(activeRadicalId);
    els.activeTitle.textContent = radicalName(activeRadicalId);
    if (els.radicalEditor && radical) {
      els.radicalEditor.style.setProperty("--radical-color", radical.color);
      els.radicalEditor.style.setProperty(
        "--radical-text",
        radical.textColor || radical.color
      );
    }
    updateActiveMeta();
    updateSwitcherMeta();
    updateSelectedLabel();
    renderCheckQuestions();
    renderObservations();
  }

  function collectInterview() {
    flushEditorToState();
    var radicals = {};
    RADICALS.forEach(function (r) {
      radicals[r.id] = cloneRadicalData(radicalsData[r.id], r.id);
    });
    return {
      interviewId: interviewSessionId,
      respondent: els.respondent.value.trim(),
      date: els.interviewDate.value || "",
      goal: storedGoal || "",
      rawNotes: els.rawNotes.value,
      lastAssignedRawNotes: lastAssignedRawNotes,
      generalQuestions: sortByOrder(generalQuestions).map(function (q, i) {
        return { id: q.id, text: q.text || "", order: i + 1 };
      }),
      checkQuestionsBank: sortByOrder(checkQuestionsBank).map(function (q, i) {
        return {
          id: q.id,
          text: q.text || "",
          radicalId: q.radicalId || null,
          order: i + 1,
        };
      }),
      radicals: radicals,
      hierarchyOrder: hierarchyOrder.slice(),
      hierarchyManual: hierarchyManual,
      conclusionText: els.cardDraft ? els.cardDraft.value : "",
      activeRadicalId: activeRadicalId,
      savedAt: new Date().toISOString(),
    };
  }

  function applyInterview(data, options) {
    var opts = options || {};
    var src = data || emptyInterview();
    interviewSessionId = src.interviewId || uid("iv");
    storedGoal = src.goal || "";
    els.respondent.value = src.respondent || "";
    els.interviewDate.value = src.date || todayISO();
    els.rawNotes.value = src.rawNotes || "";
    lastAssignedRawNotes = src.lastAssignedRawNotes || "";

    if (opts.keepLibraries) {
      // generalQuestions / checkQuestionsBank уже в памяти
    } else {
      if (Object.prototype.hasOwnProperty.call(src, "generalQuestions")) {
        generalQuestions = normalizeGeneralQuestions(src.generalQuestions);
      } else {
        generalQuestions = buildDefaultGeneralQuestions();
      }
      checkQuestionsBank =
        Array.isArray(src.checkQuestionsBank) && src.checkQuestionsBank.length
          ? src.checkQuestionsBank.map(function (q, i) {
              return {
                id: q.id || uid("cq"),
                text: q.text || "",
                radicalId: q.radicalId || null,
                order: q.order || i + 1,
              };
            })
          : buildDefaultCheckBank();
    }

    radicalsData = {};
    RADICALS.forEach(function (r) {
      radicalsData[r.id] = cloneRadicalData(src.radicals && src.radicals[r.id], r.id);
    });

    if (Array.isArray(src.hierarchyOrder) && src.hierarchyOrder.length) {
      hierarchyOrder = normalizeOrder(src.hierarchyOrder);
    } else {
      hierarchyOrder = sortOrderByIntensity(radicalsData);
    }
    hierarchyManual = Boolean(src.hierarchyManual);

    activeRadicalId =
      src.activeRadicalId && radicalsData[src.activeRadicalId]
        ? src.activeRadicalId
        : RADICALS[0].id;

    renderGeneralQuestions();
    loadEditorFromState();
    restoreRawDraftStorage();
    if (els.cardDraft) {
      els.cardDraft.value = typeof src.conclusionText === "string" ? src.conclusionText : "";
    }
    detailRadicalId = null;
    refreshProfileViews();

    if (
      !opts.keepLibraries &&
      (!Array.isArray(src.generalQuestions) || !src.generalQuestions.length) &&
      generalQuestions.length
    ) {
      persistInterviewSilent();
    }
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
    var base = hierarchyManual && hierarchyOrder.length
      ? hierarchyOrder.slice()
      : RADICALS.map(function (r) {
          return r.id;
        });
    return base.slice().sort(function (a, b) {
      var ra = INTENSITY_RANK[(radicalsMap[a] && radicalsMap[a].intensity) || "none"] || 0;
      var rb = INTENSITY_RANK[(radicalsMap[b] && radicalsMap[b].intensity) || "none"] || 0;
      if (rb !== ra) return rb - ra;
      return base.indexOf(a) - base.indexOf(b);
    });
  }

  function resetHierarchyToIntensity() {
    hierarchyManual = false;
    hierarchyOrder = sortOrderByIntensity(radicalsData);
    refreshHierarchy();
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
        raw = localStorage.getItem(STORAGE_KEY_LEGACY);
      }
      if (!raw) {
        applyInterview(emptyInterview());
      } else {
        applyInterview(JSON.parse(raw));
      }
    } catch (err) {
      applyInterview(emptyInterview());
    }

    // Однократно очищаем зашитые проверочные вопросы — эксперт заполнит список сама
    try {
      if (!localStorage.getItem(CHECK_BANK_RESET_KEY)) {
        checkQuestionsBank = [];
        renderCheckQuestions();
        persistInterviewSilent();
        localStorage.setItem(CHECK_BANK_RESET_KEY, "1");
      }
    } catch (err2) {
      checkQuestionsBank = [];
      renderCheckQuestions();
    }
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function newInterview() {
    if (
      !confirmAction(
        "Создать новое интервью? Заметки и наблюдения будут очищены. Общие и проверочные вопросы сохранятся."
      )
    ) {
      return;
    }
    var keepGeneral = generalQuestions.slice();
    var keepBank = checkQuestionsBank.slice();
    hierarchyOrder = RADICALS.map(function (r) {
      return r.id;
    });
    clearRawDraftStorage();
    hierarchyManual = false;
    applyInterview(emptyInterview(), { keepLibraries: true });
    generalQuestions = keepGeneral;
    checkQuestionsBank = keepBank.length ? keepBank : buildDefaultCheckBank();
    renderGeneralQuestions();
    renderCheckQuestions();
    showToast("save-toast", "Новое интервью. Вопросы-шпаргалки сохранены.");
  }

  function clearForm() {
    if (!confirmAction("Очистить все поля текущей формы, включая списки вопросов?")) {
      return;
    }
    hierarchyOrder = RADICALS.map(function (r) {
      return r.id;
    });
    clearRawDraftStorage();
    hierarchyManual = false;
    applyInterview(emptyInterview());
    showToast("save-toast", "Форма очищена");
  }

  function refreshReadiness() {
    flushEditorToState();
    var totalObs = 0;
    var withData = 0;
    var withIntensity = 0;
    RADICALS.forEach(function (r) {
      var data = radicalsData[r.id] || emptyRadicalData();
      var count = obsCount(data);
      totalObs += count;
      if (count > 0) withData += 1;
      if (hasIntensitySet(data)) withIntensity += 1;
    });

    var needs = getNeedsCheckIds();
    els.readinessStats.innerHTML =
      '<span>Наблюдений: <strong>' +
      totalObs +
      "</strong></span>" +
      '<span>Радикалов с данными: <strong>' +
      withData +
      " из 7</strong></span>" +
      '<span>Радикалов с указанной выраженностью: <strong>' +
      withIntensity +
      " из 7</strong></span>";

    if (needs.length) {
      els.readinessNeeds.hidden = false;
      els.readinessNeeds.textContent =
        "Требуют проверки: " +
        needs
          .map(function (id) {
            return radicalName(id);
          })
          .join(", ");
      els.readinessEnough.hidden = true;
    } else {
      els.readinessNeeds.hidden = true;
      els.readinessNeeds.textContent = "";
      els.readinessEnough.hidden = !(withData === 7 && withIntensity === 7);
    }
  }

  function refreshSummaryTable() {
    flushEditorToState();
    var rows = "";
    RADICALS.forEach(function (r) {
      var data = radicalsData[r.id] || emptyRadicalData();
      var count = obsCount(data);
      var status = radicalStatus(data);
      var muted = count === 0 ? " is-muted" : "";
      var active = detailRadicalId === r.id ? " is-selected" : "";
      var obsLabel =
        count > 0
          ? '<button type="button" class="linkish" data-open="' +
            r.id +
            '">' +
            count +
            (count === 1 ? " запись" : count < 5 ? " записи" : " записей") +
            "</button>"
          : "Нет записей";
      rows +=
        '<tr class="summary-row' +
        muted +
        active +
        '" data-radical="' +
        r.id +
        '" style="--radical-color: ' +
        r.color +
        "; --radical-text: " +
        (r.textColor || r.color) +
        '">' +
        '<td><span class="radical-icon" aria-hidden="true"></span><span class="summary-radical-name">' +
        escapeHtml(r.name) +
        "</span></td>" +
        "<td>" +
        escapeHtml(labelByValue(INTENSITY_OPTIONS, data.intensity)) +
        "</td>" +
        "<td>" +
        obsLabel +
        "</td>" +
        '<td><span class="status-pill status-' +
        (count > 0 ? "ok" : hasIntensitySet(data) ? "warn" : "check") +
        '">' +
        escapeHtml(status) +
        "</span></td>" +
        "</tr>";
    });
    els.summaryBody.innerHTML = rows;
    els.summaryBody.querySelectorAll(".summary-row").forEach(function (row) {
      row.addEventListener("click", function (e) {
        if (e.target.closest("button")) return;
        openRadicalDetail(row.getAttribute("data-radical"));
      });
    });
    els.summaryBody.querySelectorAll("[data-open]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openRadicalDetail(btn.getAttribute("data-open"));
      });
    });
  }

  function openRadicalDetail(id) {
    detailRadicalId = id;
    renderRadicalDetail();
    refreshSummaryTable();
    if (els.radicalDetail) {
      els.radicalDetail.hidden = false;
      els.radicalDetail.scrollIntoView({ block: "nearest" });
    }
  }

  function closeRadicalDetail() {
    detailRadicalId = null;
    if (els.radicalDetail) els.radicalDetail.hidden = true;
    refreshSummaryTable();
  }

  function renderRadicalDetail() {
    if (!detailRadicalId || !els.radicalDetailBody) return;
    var radical = radicalById(detailRadicalId);
    var data = radicalsData[detailRadicalId] || emptyRadicalData();
    var list = sortByOrder(data.observations || []);
    var questions = sortByOrder(checkQuestionsBank).filter(function (q) {
      return q.radicalId === detailRadicalId && (q.text || "").trim();
    });

    var obsHtml = "";
    if (!list.length) {
      obsHtml =
        '<p class="list-empty">По этому радикалу пока нет зафиксированных наблюдений. Добавьте заметки на вкладке «Интервью»</p>';
    } else {
      obsHtml = '<ol class="detail-obs-list">';
      list.forEach(function (item, index) {
        obsHtml +=
          "<li><span class=\"detail-obs-num\">" +
          (index + 1) +
          ".</span> " +
          escapeHtml(item.text || "") +
          "</li>";
      });
      obsHtml += "</ol>";
    }

    var qHtml = "";
    if (!questions.length) {
      qHtml = '<p class="hint tight">Нет связанных вопросов для проверки</p>';
    } else {
      qHtml = '<ul class="detail-questions">';
      questions.forEach(function (q, i) {
        qHtml += "<li>" + (i + 1) + ". " + escapeHtml(q.text) + "</li>";
      });
      qHtml += "</ul>";
    }

    els.radicalDetailBody.innerHTML =
      '<div class="detail-title" style="--radical-color: ' +
      (radical ? radical.color : "#8b919a") +
      "; --radical-text: " +
      (radical ? radical.textColor || radical.color : "#5f666f") +
      '">' +
      '<span class="radical-icon" aria-hidden="true"></span>' +
      "<strong>" +
      escapeHtml(radicalName(detailRadicalId)) +
      "</strong></div>" +
      '<p class="detail-meta">Выраженность: <strong>' +
      escapeHtml(labelByValue(INTENSITY_OPTIONS, data.intensity)) +
      "</strong> · Наблюдений: <strong>" +
      list.length +
      "</strong></p>" +
      "<h4 class=\"detail-subtitle\">Наблюдения и цитаты</h4>" +
      obsHtml +
      "<h4 class=\"detail-subtitle\">Вопросы для проверки</h4>" +
      qHtml +
      '<label class="field"><span class="field-label">Комментарий эксперта по радикалу</span>' +
      '<textarea id="expert-comment" rows="3" placeholder="Рабочий комментарий эксперта (необязательно)…">' +
      escapeHtml(data.expertComment || "") +
      "</textarea></label>";

    var comment = $("expert-comment");
    if (comment) {
      comment.addEventListener("input", function () {
        if (!radicalsData[detailRadicalId]) {
          radicalsData[detailRadicalId] = emptyRadicalData();
        }
        radicalsData[detailRadicalId].expertComment = comment.value;
      });
    }
  }

  function renderHierarchyItem(id, index, total, options) {
    var opts = options || {};
    var data = radicalsData[id] || emptyRadicalData();
    var radical = radicalById(id);
    var color = radical ? radical.color : "#8b919a";
    var textColor = radical ? radical.textColor || radical.color : "#5f666f";
    var upDisabled = index === 0 ? " disabled" : "";
    var downDisabled = index >= total - 1 ? " disabled" : "";
    var controls = opts.noMove
      ? ""
      : '<span class="hierarchy-controls">' +
        '<button type="button" class="btn btn-up" aria-label="Выше" data-dir="up"' +
        upDisabled +
        ">↑</button>" +
        '<button type="button" class="btn btn-down" aria-label="Ниже" data-dir="down"' +
        downDisabled +
        ">↓</button>" +
        "</span>";

    return (
      '<li class="hierarchy-item' +
      (detailRadicalId === id ? " is-selected" : "") +
      '" data-id="' +
      id +
      '" style="--radical-color: ' +
      color +
      "; --radical-text: " +
      textColor +
      '">' +
      '<button type="button" class="hierarchy-open">' +
      '<span class="radical-icon" aria-hidden="true"></span>' +
      (opts.showRank
        ? '<span class="hierarchy-rank">' + (index + 1) + "</span>"
        : "") +
      '<span class="hierarchy-name">' +
      escapeHtml(radicalName(id)) +
      "</span>" +
      '<span class="hierarchy-intensity">' +
      escapeHtml(labelByValue(INTENSITY_OPTIONS, data.intensity)) +
      "</span>" +
      "</button>" +
      controls +
      "</li>"
    );
  }

  function refreshHierarchy() {
    flushEditorToState();
    var ranked = hierarchyOrder.filter(isRankableRadical);
    var weak = hierarchyOrder.filter(function (id) {
      return !isRankableRadical(id);
    });

    if (!ranked.length && !weak.length) {
      ranked = [];
    }

    if (!ranked.length) {
      els.hierarchyEmpty.hidden = false;
      els.hierarchyEmpty.textContent =
        "Для построения предварительной иерархии добавьте хотя бы одно наблюдение или укажите выраженность радикала";
      els.hierarchyList.innerHTML = "";
    } else {
      els.hierarchyEmpty.hidden = true;
      var html = "";
      ranked.forEach(function (id, index) {
        html += renderHierarchyItem(id, index, ranked.length, { showRank: true });
      });
      els.hierarchyList.innerHTML = html;
    }

    els.hierarchyWeakSummary.textContent =
      "Нет достаточных данных — " + weak.length;
    if (!weak.length) {
      els.hierarchyWeak.hidden = true;
      els.hierarchyWeakList.innerHTML = "";
    } else {
      els.hierarchyWeak.hidden = false;
      var weakHtml = "";
      weak.forEach(function (id, index) {
        weakHtml += renderHierarchyItem(id, index, weak.length, {
          showRank: false,
          noMove: true,
        });
      });
      els.hierarchyWeakList.innerHTML = weakHtml;
    }

    bindHierarchyEvents(els.hierarchyList, ranked);
    bindHierarchyEvents(els.hierarchyWeakList, null);
  }

  function bindHierarchyEvents(container, rankedIds) {
    if (!container) return;
    container.querySelectorAll(".hierarchy-open").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openRadicalDetail(btn.closest(".hierarchy-item").dataset.id);
      });
    });
    if (!rankedIds) return;
    container.querySelectorAll(".btn-up, .btn-down").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (btn.disabled) return;
        moveHierarchyInRanked(
          btn.closest(".hierarchy-item").dataset.id,
          btn.dataset.dir,
          rankedIds
        );
      });
    });
  }

  function moveHierarchyInRanked(id, dir, rankedIds) {
    var ranked = rankedIds.slice();
    var index = ranked.indexOf(id);
    if (index < 0) return;
    var target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ranked.length) return;
    var tmp = ranked[index];
    ranked[index] = ranked[target];
    ranked[target] = tmp;

    var weak = hierarchyOrder.filter(function (rid) {
      return ranked.indexOf(rid) === -1;
    });
    hierarchyOrder = ranked.concat(weak);
    hierarchyManual = true;
    refreshHierarchy();
  }

  function moveHierarchy(id, dir) {
    moveHierarchyInRanked(
      id,
      dir,
      hierarchyOrder.filter(isRankableRadical)
    );
  }

  function refreshProfileViews() {
    refreshReadiness();
    refreshSummaryTable();
    refreshHierarchy();
    if (detailRadicalId) renderRadicalDetail();
  }

  function observationsToText(list) {
    if (!list || !list.length) return "";
    return sortByOrder(list)
      .map(function (item) {
        return (item.text || "").trim();
      })
      .filter(Boolean)
      .join(", ");
  }

  function observationsNumbered(list) {
    if (!list || !list.length) return "";
    return sortByOrder(list)
      .map(function (item, i) {
        return i + 1 + ". " + (item.text || "").trim();
      })
      .filter(function (line) {
        return !/^\d+\.\s*$/.test(line);
      })
      .join("\n");
  }

  function buildDraft() {
    var data = collectInterview();
    var order = hierarchyOrder.filter(isRankableRadical);
    var radicalsMap = data.radicals || {};
    var totalObs = 0;
    RADICALS.forEach(function (r) {
      totalObs += obsCount(radicalsMap[r.id] || emptyRadicalData());
    });

    var lines = [
      "Предварительное заключение по материалам интервью.",
      "",
      "Данный документ отражает рабочую экспертную оценку, основанную на зафиксированных наблюдениях и требует профессионального подтверждения.",
      "",
    ];

    if (data.respondent) lines.push("Респондент: " + data.respondent);
    if (data.date) lines.push("Дата интервью: " + data.date);
    if (data.respondent || data.date) lines.push("");

    if (!order.length || totalObs === 0) {
      lines.push(
        "На текущем этапе данных недостаточно для содержательного предварительного заключения. Рекомендуется продолжить интервью и зафиксировать дополнительные наблюдения."
      );
      lines.push("");
      lines.push(
        "Ограничение: материал не является диагнозом и не определяет личность автоматически."
      );
      els.cardDraft.value = lines.join("\n");
      return;
    }

    lines.push("Ведущие особенности, требующие дальнейшего анализа:");
    order.forEach(function (id, i) {
      var item = radicalsMap[id] || emptyRadicalData();
      var count = obsCount(item);
      lines.push(
        i +
          1 +
          ". " +
          radicalName(id) +
          " — " +
          labelByValue(INTENSITY_OPTIONS, item.intensity).toLowerCase() +
          ". Зафиксировано наблюдений: " +
          count +
          "."
      );
    });
    lines.push("");

    order.forEach(function (id) {
      var item = radicalsMap[id] || emptyRadicalData();
      var numbered = observationsNumbered(item.observations);
      var comment = (item.expertComment || "").trim();
      if (!numbered && !comment) return;
      lines.push(radicalName(id) + ":");
      if (numbered) {
        lines.push("Наблюдения и цитаты:");
        lines.push(numbered);
      }
      if (comment) {
        lines.push("Комментарий эксперта: " + comment);
      }
      lines.push("");
    });

    lines.push(
      "Ограничение: заключение предварительное, основано на данных конкретного интервью и требует экспертного подтверждения. Не является диагнозом."
    );

    els.cardDraft.value = lines.join("\n");
  }

  function copyDraft() {
    var text = els.cardDraft.value.trim();
    if (!text) {
      showToast("copy-toast", "Сначала сформируйте или введите заключение");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast("copy-toast", "Заключение скопировано");
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
      showToast("copy-toast", "Заключение скопировано");
    } catch (err) {
      showToast("copy-toast", "Не удалось скопировать автоматически");
    }
  }

  function downloadDraft() {
    var text = els.cardDraft.value.trim();
    if (!text) {
      showToast("copy-toast", "Сначала сформируйте или введите заключение");
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
      if (!hierarchyManual) {
        hierarchyOrder = sortOrderByIntensity(radicalsData);
      }
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
    els.btnAddGeneral.addEventListener("click", addGeneralQuestion);
    if (els.btnGeneralSave) {
      els.btnGeneralSave.addEventListener("click", saveGeneralAddForm);
    }
    if (els.btnGeneralCancel) {
      els.btnGeneralCancel.addEventListener("click", function () {
        hideGeneralAddForm();
        renderGeneralQuestions();
      });
    }
    if (els.generalAddInput) {
      els.generalAddInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          saveGeneralAddForm();
        }
      });
    }
    els.btnAddCheck.addEventListener("click", addCheckQuestion);
    els.rawNotes.addEventListener("input", scheduleRawDraftSave);
    if (els.btnCloseDetail) {
      els.btnCloseDetail.addEventListener("click", closeRadicalDetail);
    }
    if (els.btnResetHierarchy) {
      els.btnResetHierarchy.addEventListener("click", resetHierarchyToIntensity);
    }
  }

  function cacheElements() {
    els.switcher = $("radical-switcher");
    els.respondent = $("respondent");
    els.interviewDate = $("interview-date");
    els.rawNotes = $("raw-notes");
    els.rawDraftHint = $("raw-draft-hint");
    els.selectedRadicalLabel = $("selected-radical-label");
    els.selectedRadicalName = $("selected-radical-name");
    els.generalList = $("general-questions-list");
    els.generalAddForm = $("general-add-form");
    els.generalAddInput = $("general-add-input");
    els.generalAddError = $("general-add-error");
    els.btnGeneralSave = $("btn-general-save");
    els.btnGeneralCancel = $("btn-general-cancel");
    els.checkList = $("check-questions-list");
    els.observationsList = $("observations-list");
    els.btnAddGeneral = $("btn-add-general");
    els.btnAddCheck = $("btn-add-check");
    els.activeTitle = $("active-radical-title");
    els.activeMeta = $("active-radical-meta");
    els.radicalEditor = document.querySelector(".radical-editor");
    els.btnSave = $("btn-save");
    els.btnNew = $("btn-new");
    els.btnClear = $("btn-clear");
    els.tabInterview = $("tab-interview");
    els.tabProfile = $("tab-profile");
    els.panelInterview = $("panel-interview");
    els.panelProfile = $("panel-profile");
    els.summaryBody = $("summary-body");
    els.hierarchyList = $("hierarchy-list");
    els.hierarchyWeak = $("hierarchy-weak");
    els.hierarchyWeakList = $("hierarchy-weak-list");
    els.hierarchyWeakSummary = $("hierarchy-weak-summary");
    els.hierarchyEmpty = $("hierarchy-empty");
    els.readinessStats = $("readiness-stats");
    els.readinessNeeds = $("readiness-needs");
    els.readinessEnough = $("readiness-enough");
    els.radicalDetail = $("radical-detail");
    els.radicalDetailBody = $("radical-detail-body");
    els.btnCloseDetail = $("btn-close-detail");
    els.btnResetHierarchy = $("btn-reset-hierarchy");
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
    generalQuestions = buildDefaultGeneralQuestions();
    checkQuestionsBank = buildDefaultCheckBank();
    renderSwitcher();
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
