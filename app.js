(function () {
  "use strict";

  function isDemoMode() {
    if (typeof window === "undefined") return false;
    if (window.PROFZOR_DEMO === true) return true;
    try {
      var q = String(window.location.search || "");
      if (/(?:^|[?&])demo=1(?:&|$)/.test(q)) return true;
      var path = String(window.location.pathname || "");
      if (/demo\.html$/i.test(path) || /\/demo\/?$/i.test(path)) return true;
    } catch (err) {}
    return false;
  }

  var IS_DEMO = isDemoMode();
  var STORAGE_KEY = IS_DEMO
    ? "profzor_demo_interview_v2"
    : "profzor_last_interview_v2";
  var STORAGE_KEY_LEGACY = "profzor_last_interview_v1";
  var RAW_DRAFT_KEY = IS_DEMO ? "profzor_demo_raw_draft_v1" : "profzor_raw_draft_v1";
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
  var lastTransferredLength = 0;
  var activeAsk = { kind: null, id: null };
  var noteSourceMode = "answer";
  var interviewAi = null;
  var interviewMotivation = null;
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
    return ProfzorLogic.reindexOrders(list);
  }

  function sortByOrder(list) {
    return ProfzorLogic.sortByOrder(list);
  }

  function buildDefaultCheckBank() {
    if (
      typeof ProfzorKnowledge === "undefined" ||
      !ProfzorKnowledge.buildDefaultChecks
    ) {
      return [];
    }
    return ProfzorKnowledge.buildDefaultChecks(uid);
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
      return ProfzorLogic.normalizeProtocolQuestion(
        { id: uid("gq"), text: text, order: i + 1 },
        i
      );
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
        return ProfzorLogic.normalizeProtocolQuestion(
          {
            id: q.id || uid("gq"),
            text: typeof q.text === "string" ? q.text : String(q.text || ""),
            order: q.order || i + 1,
            asked: q.asked,
            askedAt: q.askedAt,
            answerId: q.answerId,
          },
          i
        );
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
    var frag = ProfzorLogic.normalizeObservationFragment(
      item || {},
      radicalId,
      index
    );
    if (!item || !item.id) frag.id = uid("obs");
    if (!frag.createdAt) frag.createdAt = new Date().toISOString();
    frag.radicalName = (item && item.radicalName) || radicalName(frag.radicalId);
    return frag;
  }

  function migrateObservations(raw, radicalId) {
    return ProfzorLogic.migrateObservationsList(
      raw,
      radicalId || activeRadicalId
    ).map(function (item, index) {
      return normalizeObservation(item, item.radicalId || radicalId, index);
    });
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
      observations: migrateObservations(src.observations, radicalId),
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
      lastTransferredLength: 0,
      generalQuestions: buildDefaultGeneralQuestions(),
      checkQuestionsBank: buildDefaultCheckBank(),
      radicals: radicals,
      hierarchyOrder: RADICALS.map(function (r) {
        return r.id;
      }),
      hierarchyManual: false,
      conclusionText: "",
      activeRadicalId: RADICALS[0].id,
      ai: ProfzorLogic.emptyAiState(),
      motivation: ProfzorLogic.emptyMotivation(),
      activeAsk: { kind: null, id: null },
      noteSourceMode: "answer",
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
        lastTransferredLength = clampTransferredLength(
          els.rawNotes.value,
          lastTransferredLength
        );
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

  function clampTransferredLength(rawText, pointer) {
    return ProfzorLogic.clampTransferredLength(rawText, pointer);
  }

  function extractDeltaSinceTransfer(rawText, pointer) {
    return ProfzorLogic.extractDeltaSinceTransfer(rawText, pointer);
  }

  function assignRawNotesToRadical(radicalId) {
    var raw = els.rawNotes.value;
    var result = ProfzorLogic.applyTransferDelta(
      raw,
      lastTransferredLength,
      radicalId
    );
    lastTransferredLength = result.lastTransferredLength;

    if (!result.assigned) {
      showToast("save-toast", "Нет нового текста для переноса в наблюдения");
      return false;
    }

    if (!radicalsData[radicalId]) {
      radicalsData[radicalId] = emptyRadicalData();
    }

    var now = new Date().toISOString();
    var obsId = uid("obs");
    var source = "free_note";
    var questionId = null;
    if (noteSourceMode === "behavior") {
      source = "behavior";
    } else if (activeAsk && activeAsk.id) {
      source =
        activeAsk.kind === "check" ? "check_question" : "general_question";
      questionId = activeAsk.id;
    }

    var list = radicalsData[radicalId].observations || [];
    var observation = normalizeObservation(
      {
        id: obsId,
        text: result.observation.text,
        createdAt: now,
        source: source,
        questionId: questionId,
      },
      radicalId,
      list.length
    );
    list.push(observation);
    radicalsData[radicalId].observations = reindexOrders(list);

    if (questionId) {
      if (activeAsk.kind === "check") {
        checkQuestionsBank = ProfzorLogic.linkAnswerToQuestion(
          checkQuestionsBank,
          questionId,
          obsId,
          now
        );
      } else {
        generalQuestions = ProfzorLogic.linkAnswerToQuestion(
          generalQuestions,
          questionId,
          obsId,
          now
        );
      }
    }

    persistInterviewSilent();
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
      chip.classList.toggle("no-support", !hasRadicalNotes(data));
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

  function sourceLabel(source) {
    if (source === "general_question") return "общий вопрос";
    if (source === "check_question") return "проверка";
    if (source === "behavior") return "поведение";
    return "заметка";
  }

  function markQuestionAsking(kind, id) {
    var now = new Date().toISOString();
    if (kind === "check") {
      checkQuestionsBank = checkQuestionsBank.map(function (q, i) {
        var item = ProfzorLogic.normalizeProtocolQuestion(q, i);
        if (item.id === id) {
          return ProfzorLogic.markQuestionAsked(item, now);
        }
        return item;
      });
    } else {
      generalQuestions = generalQuestions.map(function (q, i) {
        var item = ProfzorLogic.normalizeProtocolQuestion(q, i);
        if (item.id === id) {
          return ProfzorLogic.markQuestionAsked(item, now);
        }
        return item;
      });
    }
    activeAsk = { kind: kind, id: id };
    renderGeneralQuestions();
    renderCheckQuestions();
    persistInterviewSilent();
  }

  function renderCoverageLine() {
    if (!els.coverageLine) return;
    var missing = ProfzorLogic.radicalsWithoutSupport(
      radicalsData,
      RADICALS.map(function (r) {
        return r.id;
      })
    );
    if (!missing.length) {
      els.coverageLine.textContent = "Опора есть по всем радикалам";
      els.coverageLine.classList.remove("is-warn");
      return;
    }
    els.coverageLine.textContent =
      "Нет опоры: " + missing.map(radicalName).join(", ");
    els.coverageLine.classList.add("is-warn");
  }

  function syncNoteSourceToggle() {
    if (!els.noteSourceAnswer || !els.noteSourceBehavior) return;
    els.noteSourceAnswer.classList.toggle("is-active", noteSourceMode === "answer");
    els.noteSourceBehavior.classList.toggle(
      "is-active",
      noteSourceMode === "behavior"
    );
  }

  function renderWhisper() {
    if (!els.whisperLine) return;
    var ai = interviewAi || ProfzorLogic.emptyAiState();
    if (ai.status === "pending") {
      els.whisperLine.textContent = "ИИ: запрос…";
      els.whisperLine.hidden = false;
      return;
    }
    if (ai.status === "error") {
      els.whisperLine.textContent = "ИИ: нет ответа (интервью не сломано)";
      els.whisperLine.hidden = false;
      return;
    }
    if (ai.status === "ready" && ai.radicalHypotheses && ai.radicalHypotheses[0]) {
      var h = ai.radicalHypotheses[0];
      var name = radicalName(h.radicalId);
      els.whisperLine.innerHTML =
        "ИИ: скорее " +
        escapeHtml(name) +
        (h.confidence ? " (" + escapeHtml(String(h.confidence)) + ")" : "") +
        ' — <button type="button" class="btn-inline" data-ai-act="accept">принять</button> / ' +
        '<button type="button" class="btn-inline" data-ai-act="other">другой</button> / ' +
        '<button type="button" class="btn-inline" data-ai-act="hide">скрыть</button>';
      els.whisperLine.hidden = false;
      return;
    }
    els.whisperLine.hidden = true;
    els.whisperLine.textContent = "";
  }

  function renderNextQuestions() {
    if (!els.nextQuestions) return;
    var ai = interviewAi || ProfzorLogic.emptyAiState();
    var qs = ai.nextQuestions || [];
    if (!qs.length) {
      els.nextQuestions.innerHTML = "";
      els.nextQuestions.hidden = true;
      return;
    }
    els.nextQuestions.hidden = false;
    els.nextQuestions.innerHTML =
      "<p class=\"next-q-label\">Что спросить дальше</p><ul>" +
      qs
        .slice(0, 3)
        .map(function (q, i) {
          var text = typeof q === "string" ? q : q.text || "";
          return (
            '<li><button type="button" class="btn-inline next-q-copy" data-q="' +
            escapeHtml(text) +
            '">' +
            escapeHtml(text) +
            "</button></li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function renderMotivationSection() {
    if (!els.motivationBody) return;
    var mot = Object.assign(
      ProfzorLogic.emptyMotivation(),
      interviewMotivation || {}
    );
    var declared = (mot.declared || [])
      .map(function (d) {
        return typeof d === "string" ? d : d.text || "";
      })
      .filter(Boolean);
    var hyp = mot.hypothesized;
    var hypText = "";
    if (hyp && typeof hyp === "object") {
      hypText =
        (hyp.summary || "") +
        (hyp.confidence ? " (уверенность: " + hyp.confidence + ")" : "");
    } else if (typeof hyp === "string") {
      hypText = hyp;
    }
    var confirmed = mot.confirmed;
    var confText =
      confirmed && typeof confirmed === "object"
        ? confirmed.summary || confirmed.text || ""
        : typeof confirmed === "string"
          ? confirmed
          : "";
    var tensions = (mot.tensions || [])
      .map(function (t) {
        return typeof t === "string" ? t : t.whatDeclared || t.text || "";
      })
      .filter(Boolean);

    els.motivationBody.innerHTML =
      "<div class=\"mot-block\"><h4>Заявленное</h4>" +
      (declared.length
        ? "<ul>" +
          declared.map(function (t) {
            return "<li>" + escapeHtml(t) + "</li>";
          }).join("") +
          "</ul>"
        : "<p class=\"hint tight\">Пока нет цитат заявленного мотива</p>") +
      "</div>" +
      "<div class=\"mot-block\"><h4>Гипотеза ИИ</h4>" +
      (hypText
        ? "<p>" + escapeHtml(hypText) + "</p>"
        : "<p class=\"hint tight\">Нет гипотезы. Соберите пакет или нажмите «Подсказка ИИ».</p>") +
      "</div>" +
      "<div class=\"mot-block\"><h4>Расхождения</h4>" +
      (tensions.length
        ? "<ul>" +
          tensions.map(function (t) {
            return "<li>" + escapeHtml(t) + "</li>";
          }).join("") +
          "</ul>"
        : "<p class=\"hint tight\">Нет зафиксированных расхождений</p>") +
      "</div>" +
      "<div class=\"mot-actions\">" +
      '<button type="button" class="btn btn-small btn-primary" id="btn-mot-confirm">Подтвердить гипотезу</button>' +
      '<button type="button" class="btn btn-small" id="btn-mot-edit">Править</button>' +
      '<button type="button" class="btn btn-small" id="btn-mot-reject">Отклонить</button>' +
      "</div>" +
      "<div class=\"mot-block\"><h4>Подтверждено экспертом</h4>" +
      (confText
        ? "<p>" + escapeHtml(confText) + "</p>"
        : "<p class=\"hint tight\">Пока не подтверждено — в заключение не попадёт как факт</p>") +
      "</div>";

    var btnC = $("btn-mot-confirm");
    var btnE = $("btn-mot-edit");
    var btnR = $("btn-mot-reject");
    if (btnC) btnC.addEventListener("click", confirmMotivationHypothesis);
    if (btnE) btnE.addEventListener("click", editMotivationHypothesis);
    if (btnR) btnR.addEventListener("click", rejectMotivationHypothesis);
  }

  function confirmMotivationHypothesis() {
    var mot = Object.assign(
      ProfzorLogic.emptyMotivation(),
      interviewMotivation || {}
    );
    if (!mot.hypothesized) {
      showToast("copy-toast", "Нет гипотезы ИИ, чтобы подтвердить");
      return;
    }
    mot.confirmed = mot.hypothesized;
    interviewMotivation = mot;
    persistInterviewSilent();
    renderMotivationSection();
    showToast("copy-toast", "Гипотеза подтверждена экспертом");
  }

  function editMotivationHypothesis() {
    var mot = Object.assign(
      ProfzorLogic.emptyMotivation(),
      interviewMotivation || {}
    );
    var current =
      mot.confirmed && mot.confirmed.summary
        ? mot.confirmed.summary
        : mot.hypothesized && mot.hypothesized.summary
          ? mot.hypothesized.summary
          : "";
    var text = window.prompt("Формулировка подтверждённой мотивации:", current || "");
    if (text === null) return;
    text = String(text).trim();
    if (!text) return;
    mot.confirmed = { summary: text, source: "expert" };
    interviewMotivation = mot;
    persistInterviewSilent();
    renderMotivationSection();
  }

  function rejectMotivationHypothesis() {
    var mot = Object.assign(
      ProfzorLogic.emptyMotivation(),
      interviewMotivation || {}
    );
    mot.hypothesized = null;
    interviewMotivation = mot;
    persistInterviewSilent();
    renderMotivationSection();
    renderWhisper();
    showToast("copy-toast", "Гипотеза отклонена");
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
      var asked = Boolean(item.asked);
      var covered = ProfzorLogic.isQuestionCovered(item);
      var active = activeAsk.kind === "general" && activeAsk.id === item.id;
      var cls = "check-item general-q-item is-askable";
      if (asked) cls += " is-asked";
      if (covered) cls += " is-covered";
      if (active) cls += " is-active-ask";
      var mark = covered ? "●" : asked ? "○" : "·";
      html +=
        '<li class="' +
        cls +
        '" data-qid="' +
        escapeHtml(item.id) +
        '" role="button" tabindex="0" title="Нажмите: задаю этот вопрос">' +
        '<span class="check-mark" aria-hidden="true">' +
        mark +
        "</span>" +
        '<span class="check-num">' +
        (index + 1) +
        ".</span>" +
        '<span class="check-text">' +
        escapeHtml(item.text) +
        "</span></li>";
    });
    els.generalList.innerHTML = html;
    els.generalList.querySelectorAll("[data-qid]").forEach(function (row) {
      row.addEventListener("click", function () {
        markQuestionAsking("general", row.getAttribute("data-qid"));
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          markQuestionAsking("general", row.getAttribute("data-qid"));
        }
      });
    });
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
      asked: false,
      askedAt: null,
      answerId: null,
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
      var asked = Boolean(item.asked);
      var covered = ProfzorLogic.isQuestionCovered(item);
      var active = activeAsk.kind === "check" && activeAsk.id === item.id;
      var cls = "check-item is-askable";
      if (asked) cls += " is-asked";
      if (covered) cls += " is-covered";
      if (active) cls += " is-active-ask";
      var mark = covered ? "●" : asked ? "○" : "·";
      html +=
        '<li class="' +
        cls +
        '" data-qid="' +
        escapeHtml(item.id) +
        '" role="button" tabindex="0" title="Нажмите: задаю этот вопрос">' +
        '<span class="check-mark" aria-hidden="true">' +
        mark +
        "</span>" +
        '<span class="check-num">' +
        (index + 1) +
        ".</span>" +
        '<span class="check-text">' +
        escapeHtml(item.text) +
        "</span></li>";
    });
    els.checkList.innerHTML = html;
    els.checkList.querySelectorAll("[data-qid]").forEach(function (row) {
      row.addEventListener("click", function () {
        markQuestionAsking("check", row.getAttribute("data-qid"));
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          markQuestionAsking("check", row.getAttribute("data-qid"));
        }
      });
    });
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

    els.observationsList.innerHTML =
      '<ol class="observations-protocol">' +
      list
        .filter(function (item) {
          return String(item.text || "").trim();
        })
        .map(function (item, index) {
          return (
            "<li><span class=\"obs-num\">" +
            (index + 1) +
            ".</span> " +
            escapeHtml(String(item.text || "").trim()) +
            "</li>"
          );
        })
        .join("") +
      "</ol>";
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
      asked: false,
      askedAt: null,
      answerId: null,
    });
    renderCheckQuestions();
    persistInterviewSilent();
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
    renderGeneralQuestions();
    renderCoverageLine();
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
      lastTransferredLength: lastTransferredLength,
      generalQuestions: sortByOrder(generalQuestions).map(function (q, i) {
        return ProfzorLogic.normalizeProtocolQuestion(q, i);
      }),
      checkQuestionsBank: sortByOrder(checkQuestionsBank).map(function (q, i) {
        return ProfzorLogic.normalizeProtocolQuestion(q, i);
      }),
      radicals: radicals,
      hierarchyOrder: hierarchyOrder.slice(),
      hierarchyManual: hierarchyManual,
      conclusionText: els.cardDraft ? els.cardDraft.value : "",
      activeRadicalId: activeRadicalId,
      ai: ProfzorLogic.mergeAiState(interviewAi, null),
      motivation: Object.assign(
        ProfzorLogic.emptyMotivation(),
        interviewMotivation || {}
      ),
      activeAsk: { kind: activeAsk.kind, id: activeAsk.id },
      noteSourceMode: noteSourceMode,
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
    if (typeof src.lastTransferredLength === "number" && isFinite(src.lastTransferredLength)) {
      lastTransferredLength = src.lastTransferredLength;
    } else {
      // Миграция со старых сохранений: не переносить уже лежащий в поле текст заново
      lastTransferredLength = String(els.rawNotes.value || "").length;
    }
    lastTransferredLength = clampTransferredLength(
      els.rawNotes.value,
      lastTransferredLength
    );

    if (opts.keepLibraries) {
      // generalQuestions / checkQuestionsBank уже в памяти
    } else {
      if (Object.prototype.hasOwnProperty.call(src, "generalQuestions")) {
        generalQuestions = normalizeGeneralQuestions(src.generalQuestions);
      } else {
        generalQuestions = buildDefaultGeneralQuestions();
      }
      checkQuestionsBank = Array.isArray(src.checkQuestionsBank)
        ? src.checkQuestionsBank.map(function (q, i) {
            return ProfzorLogic.normalizeProtocolQuestion(
              {
                id: q.id || uid("cq"),
                text: q.text || "",
                radicalId: q.radicalId || null,
                order: q.order || i + 1,
                asked: q.asked,
                askedAt: q.askedAt,
                answerId: q.answerId,
              },
              i
            );
          })
        : buildDefaultCheckBank();
      if (!checkQuestionsBank.length) {
        checkQuestionsBank = buildDefaultCheckBank();
      }
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

    interviewAi = ProfzorLogic.mergeAiState(src.ai, null);
    interviewMotivation = Object.assign(
      ProfzorLogic.emptyMotivation(),
      src.motivation && typeof src.motivation === "object" ? src.motivation : {}
    );
    if (src.activeAsk && src.activeAsk.id) {
      activeAsk = { kind: src.activeAsk.kind || "general", id: src.activeAsk.id };
    } else {
      activeAsk = { kind: null, id: null };
    }
    noteSourceMode = src.noteSourceMode === "behavior" ? "behavior" : "answer";
    syncNoteSourceToggle();

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
    renderCoverageLine();
    renderMotivationSection();

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
    return sortOrderByObservationCount(radicalsMap);
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

  function mountDemoBanner() {
    if (!IS_DEMO || $("demo-banner")) return;
    document.title = "ProfZOR — демоверсия";
    document.body.classList.add("is-demo");
    var bar = document.createElement("div");
    bar.id = "demo-banner";
    bar.className = "demo-banner";
    bar.setAttribute("role", "status");
    bar.innerHTML =
      "<p><strong>Демоверсия.</strong> Вымышленный респондент Р-DEMO. Рабочие интервью не трогаются. «Подсказка ИИ» здесь без OpenRouter.</p>" +
      '<p class="demo-banner-actions">' +
      '<button type="button" class="btn btn-small" id="btn-demo-reset">Сбросить демо</button>' +
      '<a class="btn btn-small" href="index.html">Рабочая версия</a>' +
      "</p>";
    var app = document.querySelector(".app");
    if (app) app.insertBefore(bar, app.firstChild);
    var reset = $("btn-demo-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(RAW_DRAFT_KEY);
        } catch (err) {}
        window.location.reload();
      });
    }
  }

  function runDemoAiHint() {
    interviewAi = ProfzorLogic.mergeAiState(interviewAi, { status: "pending" });
    renderWhisper();
    if (els.btnAiHint) els.btnAiHint.disabled = true;
    aiToast("Демо: имитация ответа, OpenRouter не вызывается.", 5000);
    window.setTimeout(function () {
      var parsed =
        typeof ProfzorDemo !== "undefined"
          ? ProfzorDemo.hintResponse()
          : { insufficientEvidence: true, radicalHypotheses: [] };
      applyParsedAi(parsed);
      aiToast("Демо-гипотеза получена. Радикал и заключение не изменены.");
      if (els.btnAiHint) els.btnAiHint.disabled = false;
    }, 700);
  }

  function loadInterview() {
    if (IS_DEMO) {
      try {
        var demoRaw = localStorage.getItem(STORAGE_KEY);
        if (demoRaw) {
          applyInterview(JSON.parse(demoRaw));
        } else if (typeof ProfzorDemo !== "undefined") {
          applyInterview(ProfzorDemo.buildInterview());
          persistInterviewSilent();
        } else {
          applyInterview(emptyInterview());
        }
      } catch (err) {
        applyInterview(emptyInterview());
      }
      mountDemoBanner();
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      localStorage.removeItem(RAW_DRAFT_KEY);
    } catch (err) {}
    applyInterview(emptyInterview());
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function newInterview() {
    if (
      !confirmAction(
        "Очистить форму? Заметки и наблюдения будут очищены. Общие и проверочные вопросы сохранятся."
      )
    ) {
      return;
    }
    var keepGeneral = generalQuestions.map(function (q, i) {
      var item = ProfzorLogic.normalizeProtocolQuestion(q, i);
      item.asked = false;
      item.askedAt = null;
      item.answerId = null;
      return item;
    });
    var keepBank = checkQuestionsBank.map(function (q, i) {
      var item = ProfzorLogic.normalizeProtocolQuestion(q, i);
      item.asked = false;
      item.askedAt = null;
      item.answerId = null;
      return item;
    });
    hierarchyOrder = RADICALS.map(function (r) {
      return r.id;
    });
    clearRawDraftStorage();
    hierarchyManual = false;
    applyInterview(emptyInterview(), { keepLibraries: true });
    generalQuestions = keepGeneral;
    checkQuestionsBank = keepBank.length ? keepBank : buildDefaultCheckBank();
    activeAsk = { kind: null, id: null };
    noteSourceMode = "answer";
    interviewAi = ProfzorLogic.emptyAiState();
    interviewMotivation = ProfzorLogic.emptyMotivation();
    renderGeneralQuestions();
    renderCheckQuestions();
    renderCoverageLine();
    syncNoteSourceToggle();
    renderWhisper();
    renderNextQuestions();
    renderMotivationSection();
    showToast("save-toast", "Форма очищена. Вопросы-шпаргалки сохранены.");
  }

  function sortOrderByObservationCount(radicalsMap) {
    return ProfzorLogic.sortOrderByObservationCount(
      radicalsMap,
      RADICALS.map(function (r) {
        return r.id;
      })
    );
  }

  function getProfileHierarchyOrder() {
    return sortOrderByObservationCount(radicalsData);
  }

  function formatObservationsCell(list) {
    var items = sortByOrder(list || []).filter(function (item) {
      return String(item.text || "").trim();
    });
    if (!items.length) {
      return '<span class="summary-obs-empty">Нет записей</span>';
    }
    var html = '<ol class="summary-obs-list">';
    items.forEach(function (item, index) {
      html +=
        "<li><span class=\"summary-obs-num\">" +
        (index + 1) +
        ".</span> " +
        escapeHtml(String(item.text || "").trim()) +
        "</li>";
    });
    html += "</ol>";
    return html;
  }

  function refreshReadiness() {
    flushEditorToState();
    var totalObs = 0;
    var withData = 0;
    RADICALS.forEach(function (r) {
      var data = radicalsData[r.id] || emptyRadicalData();
      var count = obsCount(data);
      totalObs += count;
      if (count > 0) withData += 1;
    });

    var needs = getNeedsCheckIds();
    els.readinessStats.innerHTML =
      '<span>Наблюдений: <strong>' +
      totalObs +
      "</strong></span>" +
      '<span>Радикалов с данными: <strong>' +
      withData +
      " из 7</strong></span>";

    if (needs.length) {
      els.readinessNeeds.hidden = false;
      var motLine = "";
      var mot = Object.assign(
        ProfzorLogic.emptyMotivation(),
        interviewMotivation || {}
      );
      if (!mot.confirmed) {
        motLine =
          " Для вывода об истинной мотивации данных недостаточно, пока эксперт не подтвердит гипотезу.";
      }
      els.readinessNeeds.textContent =
        "Требуют проверки: " +
        needs
          .map(function (id) {
            return radicalName(id);
          })
          .join(", ") +
        motLine;
      els.readinessEnough.hidden = true;
    } else {
      els.readinessNeeds.hidden = true;
      els.readinessNeeds.textContent = "";
      els.readinessEnough.hidden = withData !== 7;
    }
  }

  function refreshSummaryTable() {
    flushEditorToState();
    hierarchyOrder = getProfileHierarchyOrder();
    hierarchyManual = false;

    var rows = "";
    hierarchyOrder.forEach(function (id, index) {
      var r = radicalById(id);
      if (!r) return;
      var data = radicalsData[id] || emptyRadicalData();
      var count = obsCount(data);
      var muted = count === 0 ? " is-muted" : "";
      var active = detailRadicalId === id ? " is-selected" : "";
      rows +=
        '<tr class="summary-row' +
        muted +
        active +
        '" data-radical="' +
        id +
        '" style="--radical-color: ' +
        r.color +
        "; --radical-text: " +
        (r.textColor || r.color) +
        '">' +
        '<td class="summary-rank">' +
        (index + 1) +
        "</td>" +
        '<td class="summary-radical-cell"><span class="radical-icon" aria-hidden="true"></span><span class="summary-radical-name">' +
        escapeHtml(r.name) +
        "</span></td>" +
        '<td class="summary-obs-cell">' +
        formatObservationsCell(data.observations) +
        "</td>" +
        "</tr>";
    });
    els.summaryBody.innerHTML = rows;
    els.summaryBody.querySelectorAll(".summary-row").forEach(function (row) {
      row.addEventListener("click", function () {
        openRadicalDetail(row.getAttribute("data-radical"));
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
      '<p class="detail-meta">Наблюдений: <strong>' +
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

  function refreshProfileViews() {
    refreshReadiness();
    refreshSummaryTable();
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
    var radicalsMap = data.radicals || {};
    var order = sortOrderByObservationCount(radicalsMap).filter(function (id) {
      return obsCount(radicalsMap[id] || emptyRadicalData()) > 0;
    });
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

    var mot = Object.assign(
      ProfzorLogic.emptyMotivation(),
      data.motivation || {}
    );
    var motLines = ProfzorLogic.motivationDraftLines(mot);
    if (motLines.length) {
      motLines.forEach(function (line) {
        lines.push(line);
      });
      lines.push("");
    }

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
          " — зафиксировано наблюдений: " +
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

  var AI_SETTINGS_KEY = "profzor_ai_settings_v1";

  function loadAiSettings() {
    var def = {
      autoOff: true,
      sendRaw: false,
    };
    try {
      var raw = localStorage.getItem(AI_SETTINGS_KEY);
      if (!raw) return def;
      var parsed = JSON.parse(raw);
      return Object.assign(def, parsed || {});
    } catch (err) {
      return def;
    }
  }

  function saveAiSettingsFromForm() {
    var cur = loadAiSettings();
    var next = {
      autoOff: els.aiAutoOff ? els.aiAutoOff.checked : cur.autoOff !== false,
      sendRaw: els.aiSendRaw ? els.aiSendRaw.checked : Boolean(cur.sendRaw),
    };
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
    } catch (err) {}
    return next;
  }

  function bindAiSettings() {
    var s = loadAiSettings();
    if (els.aiAutoOff) els.aiAutoOff.checked = s.autoOff !== false;
    if (els.aiSendRaw) els.aiSendRaw.checked = Boolean(s.sendRaw);
    ["aiAutoOff", "aiSendRaw"].forEach(function (key) {
      if (!els[key]) return;
      els[key].addEventListener("change", saveAiSettingsFromForm);
      els[key].addEventListener("blur", saveAiSettingsFromForm);
    });
  }

  function knowledgeRef() {
    return typeof ProfzorKnowledge !== "undefined" ? ProfzorKnowledge : null;
  }

  function aiToast(message, ms) {
    showToast("ai-toast", message, ms || 5000);
  }

  function copyTextFallback(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function copyAiPacket() {
    if (typeof ProfzorAiPacket === "undefined" || typeof ProfzorAiPrompts === "undefined") {
      aiToast("Модуль пакета ИИ не загружен");
      return;
    }
    var text;
    try {
      var interview = collectInterview();
      var settings = loadAiSettings();
      var packet = ProfzorAiPacket.buildPacket(interview, {
        includeRawNotes: Boolean(settings.sendRaw),
      });
      var payload = ProfzorAiPrompts.buildCopyPayload(packet, knowledgeRef());
      text = payload.system + "\n\n---\n\n" + payload.user;
    } catch (err) {
      aiToast("Не удалось собрать пакет");
      return;
    }
    function ok() {
      aiToast("Пакет скопирован. Вставьте в модель вручную.");
    }
    function fail() {
      window.prompt("Скопируйте пакет:", text);
    }
    if (navigator.clipboard && window.isSecureContext && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        if (copyTextFallback(text)) ok();
        else fail();
      });
      return;
    }
    if (copyTextFallback(text)) ok();
    else fail();
  }

  function applyParsedAi(parsed) {
    var patch =
      typeof ProfzorAiClient !== "undefined"
        ? ProfzorAiClient.applyModelJsonToAi(parsed)
        : parsed;
    interviewAi = ProfzorLogic.mergeAiState(interviewAi, patch);
    interviewAi.status = "ready";
    var mot = Object.assign(
      ProfzorLogic.emptyMotivation(),
      interviewMotivation || {}
    );
    mot.declared = parsed.declaredMotives || mot.declared;
    if (parsed.insufficientEvidence) {
      mot.hypothesized = null;
    } else {
      mot.hypothesized = parsed.trueMotiveHypothesis || mot.hypothesized;
    }
    mot.tensions = parsed.contradictions || mot.tensions;
    interviewMotivation = mot;
    persistInterviewSilent();
    renderWhisper();
    renderNextQuestions();
    renderMotivationSection();
  }

  function runAiHint() {
    if (IS_DEMO) {
      runDemoAiHint();
      return;
    }
    if (typeof ProfzorAiPacket === "undefined" || typeof ProfzorAiPrompts === "undefined") {
      aiToast("Модуль ИИ не загружен");
      return;
    }
    if (typeof ProfzorAiClient === "undefined") {
      aiToast("Клиент ИИ не загружен");
      return;
    }
    var settings = saveAiSettingsFromForm();
    var interview;
    var packet;
    var payload;
    try {
      interview = collectInterview();
      packet = ProfzorAiPacket.buildPacket(interview, {
        includeRawNotes: Boolean(settings.sendRaw),
      });
      payload = ProfzorAiPrompts.buildCopyPayload(packet, knowledgeRef());
    } catch (err) {
      aiToast("Не удалось собрать пакет для подсказки");
      return;
    }

    interviewAi = ProfzorLogic.mergeAiState(interviewAi, { status: "pending" });
    renderWhisper();
    if (els.btnAiHint) els.btnAiHint.disabled = true;
    aiToast("Запрос к ИИ…", 12000);

    ProfzorAiClient.requestHint([
      { role: "system", content: payload.system },
      { role: "user", content: payload.user },
    ])
      .then(function (parsed) {
        applyParsedAi(parsed);
        aiToast("Гипотеза получена. Радикал и заключение не изменены.");
      })
      .catch(function (err) {
        interviewAi = ProfzorLogic.mergeAiState(interviewAi, {
          status: "error",
        });
        renderWhisper();
        var msg = err && err.message ? String(err.message) : "Подсказка недоступна";
        aiToast(msg + ". Радикал и заключение не тронуты.", 7000);
      })
      .then(function () {
        if (els.btnAiHint) els.btnAiHint.disabled = false;
      });
  }

  function handleWhisperAct(act) {
    if (act === "hide") {
      if (els.whisperLine) els.whisperLine.hidden = true;
      return;
    }
    if (act === "other") {
      var ai = interviewAi || ProfzorLogic.emptyAiState();
      if (ai.radicalHypotheses && ai.radicalHypotheses.length > 1) {
        ai.radicalHypotheses = ai.radicalHypotheses.slice(1);
        interviewAi = ai;
        renderWhisper();
      }
      return;
    }
    if (act === "accept") {
      var ai2 = interviewAi || ProfzorLogic.emptyAiState();
      var h = ai2.radicalHypotheses && ai2.radicalHypotheses[0];
      if (!h) return;
      var mot = Object.assign(
        ProfzorLogic.emptyMotivation(),
        interviewMotivation || {}
      );
      mot.hypothesized = Object.assign({}, mot.hypothesized || {}, {
        leadingRadicals: [h.radicalId],
        summary:
          "Гипотеза ИИ: " +
          radicalName(h.radicalId) +
          (h.confidence ? " (" + h.confidence + ")" : ""),
        confidence: h.confidence || "low",
      });
      interviewMotivation = mot;
      persistInterviewSilent();
      renderMotivationSection();
      showToast(
        "save-toast",
        "Принято как гипотеза, не как назначение радикала"
      );
    }
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
      refreshProfileViews();
      renderMotivationSection();
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
    els.btnDraft.addEventListener("click", buildDraft);
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
    if (els.noteSourceAnswer) {
      els.noteSourceAnswer.addEventListener("click", function () {
        noteSourceMode = "answer";
        syncNoteSourceToggle();
      });
    }
    if (els.noteSourceBehavior) {
      els.noteSourceBehavior.addEventListener("click", function () {
        noteSourceMode = "behavior";
        syncNoteSourceToggle();
      });
    }
    if (els.btnAiPacket) {
      els.btnAiPacket.addEventListener("click", copyAiPacket);
    }
    if (els.btnAiHint) {
      els.btnAiHint.addEventListener("click", runAiHint);
    }
    if (els.nextQuestions) {
      els.nextQuestions.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-q]");
        if (!btn) return;
        var q = btn.getAttribute("data-q") || "";
        if (els.rawNotes && q) {
          var cur = els.rawNotes.value;
          els.rawNotes.value = cur && !/\n$/.test(cur) ? cur + "\n" + q : cur + q;
          els.rawNotes.focus();
        }
      });
    }
    if (els.whisperLine) {
      els.whisperLine.addEventListener("click", function (e) {
        var act = e.target.getAttribute("data-ai-act");
        if (!act) return;
        handleWhisperAct(act);
      });
    }
    bindAiSettings();
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
    els.tabInterview = $("tab-interview");
    els.tabProfile = $("tab-profile");
    els.panelInterview = $("panel-interview");
    els.panelProfile = $("panel-profile");
    els.summaryBody = $("summary-body");
    els.readinessStats = $("readiness-stats");
    els.readinessNeeds = $("readiness-needs");
    els.readinessEnough = $("readiness-enough");
    els.radicalDetail = $("radical-detail");
    els.radicalDetailBody = $("radical-detail-body");
    els.btnCloseDetail = $("btn-close-detail");
    els.btnDraft = $("btn-draft");
    els.btnDownload = $("btn-download");
    els.coverageLine = $("coverage-line");
    els.whisperLine = $("whisper-line");
    els.nextQuestions = $("next-questions");
    els.noteSourceAnswer = $("note-source-answer");
    els.noteSourceBehavior = $("note-source-behavior");
    els.btnAiPacket = $("btn-ai-packet");
    els.btnAiHint = $("btn-ai-hint");
    els.aiToast = $("ai-toast");
    els.motivationBody = $("motivation-body");
    els.aiAutoOff = $("ai-auto-off");
    els.aiSendRaw = $("ai-send-raw");
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
