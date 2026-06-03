(function () {
  const DATA_URL = "./data/schools.json";
  const FILTERS_URL = "./data/filters.json";
  const SOURCES_URL = "./data/admission-sources.json";
  const SNAPSHOTS_URL = "./data/source-snapshots.json";
  const COMPARE_KEY = "candyCompareIds";
  const DATE_PENDING_TEXT = "待官方公布，请查看右侧官方募集要项链接";
  const DATE_NOTICE_TEXT = "时间以官方公告为准";
  const today = startOfDay(new Date());
  const page = document.body.dataset.page;

  const state = {
    schools: [],
    filters: null,
    sources: {},
    snapshots: {},
    query: "",
    view: "timeline",
    calendarMonth: startOfMonth(today),
    selected: {
      tier: new Set(),
      school_type: new Set(),
      direction: new Set(),
      region: new Set()
    }
  };

  const eventConfig = [
    { key: "application_window_end", type: "出愿截止", className: "apply", target: "出愿" },
    { key: "exam_date", type: "校内考", className: "exam", target: "校内考" },
    { key: "result_date", type: "合格发表", className: "result", target: "合格发表" }
  ];

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[·・,，/｜|()（）【】\[\]\s]/g, "")
      .trim();
  }

  function queryTerms(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKC")
      .split(/\s+/)
      .map((term) => normalize(term))
      .filter(Boolean);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function parseDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return DATE_PENDING_TEXT;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function formatFullDate(value) {
    const date = parseDate(value);
    if (!date) return DATE_PENDING_TEXT;
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function monthLabel(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  function daysUntil(value) {
    const date = parseDate(value);
    if (!date) return null;
    return Math.ceil((startOfDay(date) - today) / 86400000);
  }

  function countdownText(type, date) {
    const diff = daysUntil(date);
    if (diff === null) return "";
    if (diff < 0) return `${type}已过`;
    if (diff === 0) return `${type}就在今天`;
    return `距离${type}还有 ${diff} 天`;
  }

  function tierLabel(tier) {
    return `${["", "第一档", "第二档", "第三档"][Number(tier)] || `第${tier}档`}`;
  }

  function schoolInitial(school) {
    const clean = String(school.school_name_cn || "C")
      .replace(/（.*?）/g, "")
      .replace(/\s/g, "");
    if (clean.includes("ICU")) return "ICU";
    return clean.slice(0, 2).toUpperCase();
  }

  function flattenText(school) {
    return normalize(
      [
        school.id,
        school.school_name_cn,
        school.school_name_jp,
        school.school_type,
        tierLabel(school.tier),
        school.region,
        school.direction,
        school.faculty,
        school.major,
        school.major_category,
        school.exam_subjects,
        school.exam_description,
        school.exam_tips,
        school.candy_review,
        ...(school.subject_tags || []),
        ...(school.eju_subjects_required || []),
        ...(school.exam_form || []),
        ...(school.required_documents || []),
        ...(school.candy_tags || [])
      ].join(" ")
    );
  }

  function deriveEvents(schools) {
    return schools
      .flatMap((school) =>
        eventConfig.map((config) => ({
          id: `${school.id}-${config.key}`,
          schoolId: school.id,
          school,
          type: config.type,
          className: config.className,
          target: config.target,
          date: school[config.key]
        }))
      )
      .filter((event) => event.date)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }

  function hasAnyDate(school) {
    return Boolean(school.application_window_start || school.application_window_end || school.exam_date || school.result_date);
  }

  function getCompareIds() {
    try {
      const raw = localStorage.getItem(COMPARE_KEY);
      return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw).slice(0, 3) : [];
    } catch {
      return [];
    }
  }

  function saveCompareIds(ids) {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, 3)));
    updateCompareBadge();
  }

  function updateCompareBadge() {
    const badge = $("#compareBadge");
    if (badge) badge.textContent = getCompareIds().length;
  }

  function addToCompare(id) {
    const ids = getCompareIds();
    if (ids.includes(id)) {
      showToast("已经在对比清单里");
      return ids;
    }
    if (ids.length >= 3) {
      showToast("最多同时对比 3 所");
      return ids;
    }
    const next = [...ids, id];
    saveCompareIds(next);
    showToast("已加入对比");
    return next;
  }

  function removeFromCompare(id) {
    const next = getCompareIds().filter((item) => item !== id);
    saveCompareIds(next);
    return next;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function openWeChatModal() {
    const modal = $("#wechatModal");
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeWeChatModal() {
    const modal = $("#wechatModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  async function loadAppData() {
    const [schoolsResponse, filtersResponse, sourcesResponse, snapshotsResponse] = await Promise.all([
      fetch(DATA_URL),
      fetch(FILTERS_URL),
      fetch(SOURCES_URL),
      fetch(SNAPSHOTS_URL).catch(() => null)
    ]);
    if (!schoolsResponse.ok || !filtersResponse.ok || !sourcesResponse.ok) throw new Error("数据加载失败");
    state.schools = await schoolsResponse.json();
    state.filters = await filtersResponse.json();
    state.sources = await sourcesResponse.json();
    state.snapshots = snapshotsResponse?.ok ? await snapshotsResponse.json() : {};
  }

  function renderChips(container, values, groupKey, formatter = (value) => value) {
    if (!container) return;
    container.innerHTML = values
      .map((value) => {
        const active = state.selected[groupKey].has(String(value));
        return `<button class="chip${active ? " active" : ""}" type="button" data-filter-group="${groupKey}" data-filter-value="${escapeHtml(
          value
        )}">${escapeHtml(formatter(value))}</button>`;
      })
      .join("");
  }

  function setupHome() {
    state.calendarMonth = firstEventMonth(state.schools);
    renderChips($("#tierChips"), state.filters.tiers.map((item) => item.value), "tier", (value) => tierLabel(value));
    renderChips($("#typeChips"), state.filters.school_types, "school_type");
    renderChips($("#directionChips"), state.filters.directions, "direction");
    renderChips($("#regionChips"), state.filters.regions, "region");

    const searchInput = $("#searchInput");
    searchInput.addEventListener("input", () => {
      state.query = searchInput.value.trim();
      renderHome();
    });

    $("#resetFilters").addEventListener("click", () => {
      state.query = "";
      searchInput.value = "";
      Object.values(state.selected).forEach((set) => set.clear());
      state.calendarMonth = firstEventMonth(state.schools);
      renderHome();
    });

    $("#prevMonth").addEventListener("click", () => {
      state.calendarMonth = addMonths(state.calendarMonth, -1);
      renderHome();
    });

    $("#nextMonth").addEventListener("click", () => {
      state.calendarMonth = addMonths(state.calendarMonth, 1);
      renderHome();
    });

    $("#todayMonth").addEventListener("click", () => {
      state.calendarMonth = firstEventMonth(getFilteredSchools());
      renderHome();
    });

    $$(".segmented [data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.view = button.dataset.view;
        renderHome();
      });
    });

    document.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-filter-group]");
      if (!chip) return;
      const group = chip.dataset.filterGroup;
      const value = chip.dataset.filterValue;
      const selected = state.selected[group];
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
      renderHome();
    });

    renderHome();
  }

  function getFilteredSchools() {
    const terms = queryTerms(state.query);
    return state.schools.filter((school) => {
      const selectedMatch =
        (!state.selected.tier.size || state.selected.tier.has(String(school.tier))) &&
        (!state.selected.school_type.size || state.selected.school_type.has(school.school_type)) &&
        (!state.selected.direction.size || state.selected.direction.has(school.direction)) &&
        (!state.selected.region.size || state.selected.region.has(school.region));

      if (!selectedMatch) return false;
      if (!terms.length) return true;
      const text = flattenText(school);
      return terms.every((term) => text.includes(term));
    });
  }

  function renderHome() {
    renderChips($("#tierChips"), state.filters.tiers.map((item) => item.value), "tier", (value) => tierLabel(value));
    renderChips($("#typeChips"), state.filters.school_types, "school_type");
    renderChips($("#directionChips"), state.filters.directions, "direction");
    renderChips($("#regionChips"), state.filters.regions, "region");

    const schools = getFilteredSchools();
    const allEvents = deriveEvents(state.schools);
    const uniqueSchools = new Set(state.schools.map((school) => school.school_name_cn)).size;

    $("#schoolCount").textContent = uniqueSchools;
    $("#majorCount").textContent = state.schools.length;
    $("#eventCount").textContent = allEvents.length;
    $("#resultTitle").textContent = state.view === "timeline" ? `校内考时间轴 · ${schools.length} 条` : `学校列表 · ${schools.length} 条`;
    renderActiveFilters();
    renderCalendar(schools);

    $("#timelineButton").classList.toggle("active", state.view === "timeline");
    $("#listButton").classList.toggle("active", state.view === "list");
    $("#timelineView").classList.toggle("hidden", state.view !== "timeline");
    $("#listView").classList.toggle("hidden", state.view !== "list");

    renderTimeline(schools);
    renderSchoolList(schools);
    updateCompareBadge();
  }

  function addMonths(date, count) {
    return new Date(date.getFullYear(), date.getMonth() + count, 1);
  }

  function firstEventMonth(schools) {
    const first = deriveEvents(schools).find((event) => daysUntil(event.date) >= 0);
    return first ? startOfMonth(parseDate(first.date)) : startOfMonth(today);
  }

  function sameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function renderCalendar(schools) {
    const root = $("#calendarView");
    if (!root) return;

    const ids = new Set(schools.map((school) => school.id));
    const month = state.calendarMonth;
    const monthStart = startOfMonth(month);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const events = deriveEvents(state.schools).filter((event) => {
      const date = parseDate(event.date);
      return ids.has(event.schoolId) && date >= monthStart && date <= monthEnd;
    });
    const eventsByDate = new Map();

    events.forEach((event) => {
      const date = parseDate(event.date);
      const key = dateKey(date);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key).push(event);
    });

    $("#calendarTitle").textContent = `${monthLabel(month)} 考试日历`;

    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dayEvents = eventsByDate.get(dateKey(date)) || [];
      const outside = date.getMonth() !== month.getMonth();
      const todayClass = sameDate(date, today) ? " today" : "";
      return `
        <div class="calendar-day${outside ? " outside" : ""}${todayClass}">
          <div class="calendar-date">${date.getDate()}</div>
          <div class="calendar-events">
            ${dayEvents.slice(0, 3).map(renderCalendarEvent).join("")}
            ${dayEvents.length > 3 ? `<span class="calendar-more">+${dayEvents.length - 3}</span>` : ""}
          </div>
        </div>
      `;
    });

    root.innerHTML = `
      <div class="calendar-weekdays">
        ${["日", "一", "二", "三", "四", "五", "六"].map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="calendar-grid">${days.join("")}</div>
      <div class="calendar-summary">
        <strong>${events.length}</strong>
        <span>个本月关键节点</span>
      </div>
    `;
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  function renderCalendarEvent(event) {
    return `
      <a class="calendar-event ${event.className}" href="./school.html?id=${encodeURIComponent(event.schoolId)}">
        <span>${escapeHtml(event.type.replace("截止", ""))}</span>
        <strong>${escapeHtml(event.school.school_name_cn.replace("（现东京科学大学）", ""))}</strong>
      </a>
    `;
  }

  function renderActiveFilters() {
    const parts = [];
    if (state.query) parts.push(`搜索：${state.query}`);
    Object.entries(state.selected).forEach(([key, values]) => {
      values.forEach((value) => parts.push(key === "tier" ? tierLabel(value) : value));
    });
    $("#activeFilters").textContent = parts.length ? parts.join(" / ") : "全部学校";
  }

  function renderTimeline(schools) {
    const timeline = $("#timelineView");
    const ids = new Set(schools.map((school) => school.id));
    const monthStart = startOfMonth(today);
    const events = deriveEvents(state.schools).filter((event) => ids.has(event.schoolId) && parseDate(event.date) >= monthStart);

    if (!events.length) {
      timeline.innerHTML = renderPendingTimelineByTier(schools);
      return;
    }

    const groups = new Map();
    events.forEach((event) => {
      const date = parseDate(event.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups.has(key)) groups.set(key, { date, events: [] });
      groups.get(key).events.push(event);
    });

    timeline.innerHTML = Array.from(groups.values())
      .map(
        (group) => `
          <section class="month-section">
            <div class="month-title">
              <h3>${escapeHtml(monthLabel(group.date))}</h3>
              <span>${group.events.length} 个节点</span>
            </div>
            <div class="event-list">
              ${group.events.map(renderEventCard).join("")}
            </div>
          </section>
        `
      )
      .join("");
  }

  function renderPendingTimelineByTier(schools) {
    if (!schools.length) return `<div class="empty-state">没有匹配的学校专业</div>`;

    const sorted = [...schools].sort((a, b) => Number(a.tier) - Number(b.tier) || a.school_name_cn.localeCompare(b.school_name_cn, "zh-Hans-CN"));
    const groups = new Map();
    sorted.forEach((school) => {
      const key = tierLabel(school.tier);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(school);
    });

    return Array.from(groups.entries())
      .map(
        ([tier, items]) => `
          <section class="tier-section">
            <h3 class="tier-heading">${escapeHtml(tier)} · 待官方日期</h3>
            <div class="tier-list">
              ${items.map(renderPendingTimelineCard).join("")}
            </div>
          </section>
        `
      )
      .join("");
  }

  function renderPendingTimelineCard(school) {
    const source = getSource(school);
    return `
      <a class="school-card pending-date-card" href="./school.html?id=${encodeURIComponent(school.id)}">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(school.school_name_cn)}</h3>
            <p class="card-meta">${escapeHtml(school.school_name_jp)} · ${escapeHtml(school.faculty)} · ${escapeHtml(school.major)}</p>
          </div>
          <span class="school-logo">${escapeHtml(schoolInitial(school))}</span>
        </div>
        <div class="badge-row">
          <span class="badge">${escapeHtml(tierLabel(school.tier))}</span>
          <span class="badge">${escapeHtml(school.school_type)}</span>
          <span class="badge">${escapeHtml(school.direction)}</span>
          <span class="badge source-badge">${escapeHtml(source ? sourceLabel(source.status) : "来源待补")}</span>
        </div>
        <p class="pending-date-note">
          <strong>${escapeHtml(DATE_NOTICE_TEXT)}</strong>
          <span>${escapeHtml(DATE_PENDING_TEXT)}</span>
        </p>
      </a>
    `;
  }

  function renderEventCard(event) {
    const school = event.school;
    const source = getSource(school);
    return `
      <a class="event-card" href="./school.html?id=${encodeURIComponent(school.id)}">
        <span class="school-logo">${escapeHtml(schoolInitial(school))}</span>
        <div class="event-main">
          <div class="event-top">
            <div>
              <h3>${escapeHtml(school.school_name_cn)}</h3>
              <p class="event-school">${escapeHtml(school.faculty)} · ${escapeHtml(school.major)}</p>
            </div>
            <div class="event-date">
              <strong>${escapeHtml(formatDate(event.date))}</strong>
              <span>${escapeHtml(formatFullDate(event.date))}</span>
            </div>
          </div>
          <div class="badge-row">
            <span class="badge event-type ${event.className}">${escapeHtml(event.type)}</span>
            <span class="badge">${escapeHtml(tierLabel(school.tier))}</span>
            <span class="badge">${escapeHtml(school.school_type)}</span>
            <span class="badge">${escapeHtml(school.direction)}</span>
            <span class="badge source-badge">${escapeHtml(source ? sourceLabel(source.status) : "来源待补")}</span>
          </div>
          <p class="countdown">${escapeHtml(countdownText(event.target, event.date))}</p>
        </div>
      </a>
    `;
  }

  function renderSchoolList(schools) {
    const list = $("#listView");
    if (!schools.length) {
      list.innerHTML = `<div class="empty-state">没有匹配的学校专业</div>`;
      return;
    }

    const sorted = [...schools].sort((a, b) => Number(a.tier) - Number(b.tier) || a.school_name_cn.localeCompare(b.school_name_cn, "zh-Hans-CN"));
    const groups = new Map();
    sorted.forEach((school) => {
      const key = tierLabel(school.tier);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(school);
    });

    list.innerHTML = Array.from(groups.entries())
      .map(
        ([tier, items]) => `
          <section class="tier-section">
            <h3 class="tier-heading">${escapeHtml(tier)} · ${items.length} 条</h3>
            <div class="tier-list">
              ${items.map(renderSchoolCard).join("")}
            </div>
          </section>
        `
      )
      .join("");
  }

  function renderSchoolCard(school) {
    const source = getSource(school);
    return `
      <article class="school-card">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(school.school_name_cn)}</h3>
            <p class="card-meta">${escapeHtml(school.school_name_jp)} · ${escapeHtml(school.faculty)} · ${escapeHtml(school.major)}</p>
          </div>
          <span class="school-logo">${escapeHtml(schoolInitial(school))}</span>
        </div>
        <div class="badge-row">
          <span class="badge">${escapeHtml(tierLabel(school.tier))}</span>
          <span class="badge">${escapeHtml(school.school_type)}</span>
          <span class="badge">${escapeHtml(school.region)}</span>
          <span class="badge">${escapeHtml(school.direction)}</span>
          <span class="badge source-badge">${escapeHtml(source ? sourceLabel(source.status) : "来源待补")}</span>
        </div>
        <div class="date-row">
          ${
            hasAnyDate(school)
              ? `
                <span><strong>出愿</strong> ${escapeHtml(formatDate(school.application_window_end))}</span>
                <span><strong>校内考</strong> ${escapeHtml(formatDate(school.exam_date))}</span>
                <span><strong>形式</strong> ${escapeHtml((school.exam_form || []).join(" / "))}</span>
              `
              : `<span><strong>日期</strong> ${escapeHtml(DATE_PENDING_TEXT)}</span>`
          }
        </div>
        <p class="card-review">${escapeHtml(school.exam_tips || school.candy_review)}</p>
        <div class="action-row">
          <a class="primary-button" href="./school.html?id=${encodeURIComponent(school.id)}">查看详情</a>
          <button class="secondary-button" type="button" data-add-compare="${escapeHtml(school.id)}">加入对比</button>
        </div>
      </article>
    `;
  }

  function setupDetail() {
    const id = new URLSearchParams(window.location.search).get("id");
    const school = state.schools.find((item) => item.id === id);
    const root = $("#schoolDetail");
    if (!school) {
      root.innerHTML = `<div class="empty-state">没有找到这条学校专业数据</div>`;
      return;
    }

    document.title = `日本大学校内考 · ${school.school_name_cn} ${school.faculty}${school.major}`;
    const description = $("meta[name='description']");
    if (description) description.setAttribute("content", `${school.school_name_cn}${school.faculty}${school.major} 校内考时间、出愿要求、考试形式和 Candy 点评。`);

    root.innerHTML = renderDetail(school, "requirements");
    bindDetailTabs(school);
    updateCompareBadge();
  }

  function renderDetail(school, activeTab) {
    const nextEvent = getNextEvent(school);
    const source = getSource(school);
    return `
      <section class="detail-hero">
        <div class="detail-title-row">
          <div>
            <p class="eyebrow">${escapeHtml(school.school_name_jp)}</p>
            <h1>${escapeHtml(school.school_name_cn)}</h1>
            <p class="detail-subtitle">${escapeHtml(school.faculty)} · ${escapeHtml(school.major)}</p>
          </div>
          <span class="school-logo">${escapeHtml(schoolInitial(school))}</span>
        </div>
        <div class="badge-row">
          <span class="badge">${escapeHtml(school.school_type)}</span>
          <span class="badge">${escapeHtml(tierLabel(school.tier))}</span>
          <span class="badge">${escapeHtml(school.region)}</span>
          <span class="badge">${escapeHtml(school.direction)}</span>
          <span class="badge source-badge">${escapeHtml(source ? sourceLabel(source.status) : "来源待补")}</span>
          ${(school.candy_tags || []).map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </section>

      <section class="time-grid">
        ${renderTimeCard("出愿时间窗口", formatApplicationWindow(school), "出愿", school.application_window_end, nextEvent)}
        ${renderTimeCard("校内考日期", formatFullDate(school.exam_date), "校内考", school.exam_date, nextEvent)}
        ${renderTimeCard("合格发表日", formatFullDate(school.result_date), "合格发表", school.result_date, nextEvent)}
        ${!hasAnyDate(school) ? renderOfficialRequirementCta(school, source) : ""}
      </section>

      <nav class="tabs" aria-label="详情页标签">
        <button class="tab-button ${activeTab === "requirements" ? "active" : ""}" type="button" data-tab="requirements">📋 准入要求</button>
        <button class="tab-button ${activeTab === "exam" ? "active" : ""}" type="button" data-tab="exam">📝 校内考</button>
        <button class="tab-button ${activeTab === "candy" ? "active" : ""}" type="button" data-tab="candy">💡 Candy 说</button>
      </nav>

      <section class="detail-card" id="tabContent">
        ${renderTabContent(school, activeTab)}
      </section>

      <section class="detail-card source-card">
        ${renderSourceCard(source, getSnapshot(school))}
      </section>

      <section class="detail-card">
        <h2>必交材料</h2>
        <ul class="doc-list">
          ${(school.required_documents || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <div class="detail-actions">
        <button class="secondary-button" type="button" data-add-compare="${escapeHtml(school.id)}">➕ 加入对比</button>
        <button class="primary-button" type="button" data-open-wechat>📱 微信咨询</button>
      </div>
    `;
  }

  function formatApplicationWindow(school) {
    if (!school.application_window_start && !school.application_window_end) return DATE_PENDING_TEXT;
    return `${formatFullDate(school.application_window_start)} - ${formatFullDate(school.application_window_end)}`;
  }

  function getOfficialRequirementLink(source) {
    if (!source?.links?.length) return null;
    return (
      source.links.find((link) => /pdf/i.test(link.url) || /pdf|募集要項|入試要項|要项/i.test(link.label)) ||
      source.links[0]
    );
  }

  function renderOfficialRequirementCta(school, source) {
    const link = getOfficialRequirementLink(source);
    if (!link) return "";
    return `
      <a class="official-time-cta" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">
        <span>官方日期未公布</span>
        <strong>📎 查看 ${escapeHtml(school.school_name_cn)} 2026 年度官方募集要项</strong>
      </a>
    `;
  }

  function getSource(school) {
    return state.sources[school.school_name_cn] || state.sources[String(school.school_name_cn || "").replace(/（.*?）/g, "")] || null;
  }

  function getSnapshot(school) {
    return state.snapshots[school.school_name_cn] || state.snapshots[String(school.school_name_cn || "").replace(/（.*?）/g, "")] || null;
  }

  function sourceLabel(status) {
    if (status?.includes("schedule")) return "2027发布予定";
    if (status?.includes("official_2027")) return "2027官方入口";
    if (status?.includes("official_2026")) return "2026官方原文";
    if (status?.includes("partial")) return "部分已核";
    if (status?.includes("merger")) return "合并后官网";
    if (status?.includes("official")) return "官方入口";
    return "待核验";
  }

  function renderSourceCard(source, snapshot) {
    if (!source) {
      return `
        <h2>官方原文</h2>
        <p class="source-note">还没有录入官方募集要項来源。上线前必须补齐。</p>
      `;
    }

    return `
      <h2>官方原文 / 募集要項</h2>
      <p class="source-note">${escapeHtml(source.verification_note)}</p>
      <div class="source-meta">
        <span>${escapeHtml(source.source_year || "年度待确认")}</span>
        <span>核对：${escapeHtml(source.checked_at || "待确认")}</span>
      </div>
      ${
        source.original_snippets?.length
          ? `
            <div class="source-snippets">
              <span>原文摘录</span>
              ${source.original_snippets.map((snippet) => `<blockquote>${escapeHtml(snippet)}</blockquote>`).join("")}
            </div>
          `
          : ""
      }
      ${renderSnapshot(snapshot)}
      <div class="source-links">
        ${(source.links || [])
          .map(
            (link) => `
              <a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">
                <span>${escapeHtml(link.label)}</span>
                <strong>打开原文</strong>
              </a>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderSnapshot(snapshot) {
    if (!snapshot?.links?.length) return "";
    const okCount = snapshot.links.filter((link) => link.ok).length;
    return `
      <div class="source-snapshot">
        <span>爬取快照：${okCount}/${snapshot.links.length} 个官方链接可访问</span>
        ${snapshot.links
          .slice(0, 4)
          .map((link) => {
            const label = link.ok ? "已抓取" : link.status === 403 ? "官网拒绝爬虫" : "待人工打开";
            const title = link.title || link.label;
            return `<p><strong>${escapeHtml(label)}</strong>${escapeHtml(title)}</p>`;
          })
          .join("")}
      </div>
    `;
  }

  function renderTimeCard(title, value, eventType, eventDate, nextEvent) {
    const isNext = nextEvent && nextEvent.type === eventType;
    const countdown = countdownText(eventType, eventDate);
    return `
      <article class="time-card ${isNext ? "next" : ""} ${eventDate ? "" : "pending"}">
        <span>${escapeHtml(title)}</span>
        <strong>${escapeHtml(value)}</strong>
        ${countdown ? `<em>${escapeHtml(countdown)}</em>` : ""}
      </article>
    `;
  }

  function getNextEvent(school) {
    return deriveEvents([school]).find((event) => daysUntil(event.date) >= 0) || null;
  }

  function renderTabContent(school, tab) {
    if (tab === "exam") {
      return `
        <h2>校内考</h2>
        <div class="info-grid">
          <div class="info-item"><span>考试形式</span><strong>${escapeHtml((school.exam_form || []).join(" / "))}</strong></div>
          <div class="info-item"><span>考试科目</span><strong>${escapeHtml(school.exam_subjects || "待确认")}</strong></div>
          <div class="info-item"><span>详细说明</span><p>${escapeHtml(school.exam_description || "待补充")}</p></div>
          <div class="info-item"><span>备考建议</span><p>${escapeHtml(school.exam_tips || "待补充")}</p></div>
        </div>
      `;
    }

    if (tab === "candy") {
      return `
        <h2>Candy 说</h2>
        <div class="info-grid">
          <div class="info-item"><span>独家点评</span><p>${escapeHtml(school.candy_review || "待补充")}</p></div>
          <div class="info-item"><span>Candy 推荐度</span><strong>${"★".repeat(Number(school.candy_rating || 0))}${"☆".repeat(5 - Number(school.candy_rating || 0))}</strong></div>
          <div class="info-item"><span>标签</span><strong>${escapeHtml((school.candy_tags || []).join(" / "))}</strong></div>
          <div class="info-item"><span>官网</span><p>${school.official_url ? `<a href="${escapeHtml(school.official_url)}" target="_blank" rel="noreferrer">${escapeHtml(school.official_url)}</a>` : "待补充"}</p></div>
        </div>
      `;
    }

    return `
      <h2>准入要求</h2>
      <div class="info-grid">
        <div class="info-item"><span>EJU 科目</span><strong>${escapeHtml((school.eju_subjects_required || []).join(" / "))}</strong></div>
        <div class="info-item"><span>日语参考分</span><strong>${escapeHtml(school.eju_japanese_min ? `${school.eju_japanese_min}+` : "待确认")}</strong></div>
        <div class="info-item"><span>英语要求</span><strong>${escapeHtml(school.english_required ? school.english_min : `非必交｜${school.english_min || "待确认"}`)}</strong></div>
        <div class="info-item"><span>其他要求</span><p>${escapeHtml(school.other_requirements || "待补充")}</p></div>
      </div>
    `;
  }

  function bindDetailTabs(school) {
    $$(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
        $("#tabContent").innerHTML = renderTabContent(school, button.dataset.tab);
      });
    });
  }

  function setupCompare() {
    const paramIds = new URLSearchParams(window.location.search).get("ids");
    const ids = paramIds ? paramIds.split(",").filter(Boolean).slice(0, 3) : getCompareIds();
    const validIds = ids.filter((id) => state.schools.some((school) => school.id === id));
    saveCompareIds(validIds);
    renderCompare(validIds);
  }

  function renderCompare(ids = getCompareIds()) {
    const schools = ids.map((id) => state.schools.find((school) => school.id === id)).filter(Boolean);
    const title = $("#compareTitle");
    if (title) title.textContent = `学校对比 (${schools.length}/3)`;
    const addLink = $("#addSchoolLink");
    if (addLink) addLink.classList.toggle("hidden", schools.length >= 3);
    syncCompareUrl(schools.map((school) => school.id));

    const root = $("#compareView");
    if (!schools.length) {
      root.innerHTML = `<div class="empty-state">还没有加入对比的学校专业</div>`;
      return;
    }

    const rows = getCompareRows(schools);
    root.innerHTML = `
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>字段</th>
              ${schools
                .map(
                  (school) => `
                    <th>
                      <div class="compare-school-head">
                        <strong>${escapeHtml(school.school_name_cn)}</strong>
                        <span>${escapeHtml(school.faculty)} · ${escapeHtml(school.major)}</span>
                        <button class="remove-button" type="button" data-remove-compare="${escapeHtml(school.id)}">× 移除</button>
                      </div>
                    </th>
                  `
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.label)}</td>
                    ${row.values
                      .map((value) => `<td class="${row.diff ? "diff" : ""}">${escapeHtml(value)}</td>`)
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function getCompareRows(schools) {
    const definitions = [
      ["档位", (s) => tierLabel(s.tier)],
      ["类型", (s) => s.school_type],
      ["地区", (s) => s.region],
      ["方向", (s) => s.direction],
      ["EJU科目", (s) => (s.eju_subjects_required || []).join(" / ")],
      ["日语参考", (s) => (s.eju_japanese_min ? `${s.eju_japanese_min}+` : "待确认")],
      ["英语要求", (s) => (s.english_required ? s.english_min : `非必交｜${s.english_min || "待确认"}`)],
      ["出愿截止", (s) => formatFullDate(s.application_window_end)],
      ["校内考", (s) => `${formatFullDate(s.exam_date)}｜${(s.exam_form || []).join(" / ")}`],
      ["合格发表", (s) => formatFullDate(s.result_date)],
      ["考试科目", (s) => s.exam_subjects || "待确认"],
      ["Candy推荐", (s) => `${s.candy_rating || "-"}星｜${(s.candy_tags || []).join(" / ")}`]
    ];

    return definitions.map(([label, getter]) => {
      const values = schools.map(getter);
      const normalizedValues = values.map((value) => normalize(value));
      return {
        label,
        values,
        diff: new Set(normalizedValues).size > 1
      };
    });
  }

  function syncCompareUrl(ids) {
    if (page !== "compare") return;
    const query = ids.length ? `?ids=${ids.map(encodeURIComponent).join(",")}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  }

  function setupGlobalEvents() {
    setupFloatingCta();

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-open-wechat]")) openWeChatModal();
      if (event.target.closest("[data-close-wechat]")) closeWeChatModal();

      const modal = event.target.closest("#wechatModal");
      if (event.target.id === "wechatModal" && modal) closeWeChatModal();

      const addButton = event.target.closest("[data-add-compare]");
      if (addButton) {
        addToCompare(addButton.dataset.addCompare);
        if (page === "compare") renderCompare();
      }

      const removeButton = event.target.closest("[data-remove-compare]");
      if (removeButton) {
        const next = removeFromCompare(removeButton.dataset.removeCompare);
        renderCompare(next);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeWeChatModal();
    });
  }

  function setupFloatingCta() {
    const cta = $(".floating-cta");
    if (!cta) return;

    const update = () => {
      const threshold = window.innerWidth >= 720 ? 80 : 160;
      cta.classList.toggle("is-visible", window.scrollY > threshold);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  async function init() {
    setupGlobalEvents();
    updateCompareBadge();
    try {
      await loadAppData();
      if (page === "home") setupHome();
      if (page === "school") setupDetail();
      if (page === "compare") setupCompare();
    } catch (error) {
      const fallback = `<div class="empty-state">数据暂时加载失败，请稍后再试。</div>`;
      const target = $("#timelineView") || $("#schoolDetail") || $("#compareView");
      if (target) target.innerHTML = fallback;
      console.error(error);
    }
  }

  init();
})();
