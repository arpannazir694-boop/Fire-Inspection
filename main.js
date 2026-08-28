const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw7NY8Lxr2pL877LbSoch1eeugGaOI7PJulODyApCIU_4tBfe-t6Nb4LorBsYgUc5qFjA/exec';
// Apps Script can take several seconds to wake up and read Google Sheets.
// Keep read requests below the browser's practical connection limit while
// allowing enough time for a cold start or a larger report sheet.
const READ_REQUEST_TIMEOUT_MS = 30000;
const today = formatLocalDate(new Date());
const yesNo = ['YES', 'NO'];
const floors = ['1st', '2nd', '3rd', '4th', '5th', 'OUTSIDE', 'ALL'];
const locations = ['KASBA', 'BANTALA', 'SEALDAH'];
const statuses = ['Good', 'Average', 'Poor'];
const savedTheme = localStorage.getItem('fireAuditTheme');
let downloadFrame;

const state = {
  factories: [],
  extinguisherTypes: [],
  submittedCount: 0
};

const sections = [
  {
    id: 'basicDetails',
    title: 'Basic Details',
    fields: [
      field('factoryName', 'Factory Name', 'factory', { required: true }),
      field('location', 'Location', locations, { required: true }),
      field('auditDate', 'Audit Date', 'date', { required: true, defaultToday: true }),
      field('inspectorName', 'Inspector Name', 'text', { required: true }),
      field('department', 'Department', 'text')
    ]
  },
  {
    id: 'fireEquipmentAvailability',
    title: 'Fire Equipment Availability',
    items: [
      item('fireExtinguishersAvailable', 'Fire extinguishers available?', [
        field('floor', 'Floor', floors),
        field('quantity', 'Quantity', 'number'),
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      {
        key: 'typesOfExtinguishers',
        question: 'Types of extinguishers',
        noAvailability: true,
        fields: [
          field('type', 'Extinguisher Type', 'extinguisher'),
          field('expiredDate', 'Expired Date', 'date', { defaultToday: true })
        ]
      },
      item('fireHydrantSystemAvailable', 'Fire hydrant system available?', [
        field('floor', 'Floor', floors),
        field('quantity', 'Quantity', 'number'),
        field('lastCheckedDate', 'Last Checked Date', 'date', { defaultToday: true }),
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      item('sprinklerSystemInstalledWorking', 'Sprinkler system installed or working?', [
        field('floor', 'Floor', floors),
        field('installedQuantity', 'Installed Quantity', 'number'),
        field('workingQuantity', 'Working Quantity', 'number'),
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      item('fireAlarmSystemInstalledWorking', 'Fire alarm system installed or working?', [
        field('floor', 'Floor', floors),
        field('installedQuantity', 'Installed Quantity', 'number'),
        field('workingQuantity', 'Working Quantity', 'number'),
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      item('emergencyExitSignsAvailable', 'Emergency exit signs available?', [
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      item('smokeDetectorsInstalledWorking', 'Smoke Detectors installed or working?', [
        field('floor', 'Floor', floors),
        field('installedQuantity', 'Installed Quantity', 'number'),
        field('workingQuantity', 'Working Quantity', 'number'),
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      item('firePumpInstalledWorking', 'Fire Pump installed or working?', [
        field('installedQuantity', 'Installed Quantity', 'number'),
        field('workingQuantity', 'Working Quantity', 'number'),
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      item('hosePipeChecked', 'Hose Pipe checked (pressure, leakage, coupling, etc.)?', [
        field('floor', 'Floor', floors),
        field('installedQuantity', 'Installed Quantity', 'number'),
        field('checkedQuantity', 'Checked Quantity', 'number'),
        field('remarks', 'Remarks', 'textarea', { always: true })
      ]),
      item('waterReserveTankChecked', 'Water reserve/tank checked (level, pump, leakage, etc.)?', [
        field('remarks', 'Remarks', 'textarea', { always: true })
      ])
    ]
  },
  {
    id: 'emergencyPreparedness',
    title: 'Emergency Preparedness',
    items: [
      item('emergencyExitsClearlyMarked', 'Emergency Exits clearly marked?', [field('floor', 'Floor', floors), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('exitDoorsUnlocked', 'Exit doors unlocked during working hours?', [field('floor', 'Floor', floors), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('emergencyLightingAvailable', 'Emergency lighting available?', [field('floor', 'Floor', floors), field('installedQuantity', 'Installed Quantity', 'number'), field('checkedQuantity', 'Checked Quantity', 'number'), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('assemblyPointDefined', 'Assembly point defined?', [field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('fireDrillLastSixMonths', 'Fire drill conducted in last 6 months?', [field('remarks', 'Remarks', 'textarea', { always: true })])
    ]
  },
  {
    id: 'electricalSafety',
    title: 'Electrical Safety',
    items: [
      item('electricalPanelsMaintained', 'Electrical panels properly maintained?', [field('lastCheckedDate', 'Last Checked Date', 'date', { defaultToday: true }), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('firePanelChecked', 'Fire panel checked (alarm, indicators, battery, etc.)?', [field('lastCheckedDate', 'Last Checked Date', 'date', { defaultToday: true }), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('noLooseWiring', 'No loose wiring?', [field('lastCheckedDate', 'Last Checked Date', 'date', { defaultToday: true }), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('overloadingAvoided', 'Overloading avoided?', [field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('earthingSystemAvailable', 'Earthing system available?', [field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('regularElectricalInspectionDone', 'Regular electrical inspection done?', [field('lastCheckedDate', 'Last Checked Date', 'date', { defaultToday: true }), field('remarks', 'Remarks', 'textarea', { always: true })])
    ]
  },
  {
    id: 'storageHousekeeping',
    title: 'Storage & Housekeeping',
    items: [
      item('flammableMaterialsStoredSafely', 'Flammable materials store safely?', [field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('noObstructionInWalkways', 'No obstruction in walkways?', [field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('buildingExternalCommonAreaChecked', 'Building external/common area checked (color, maintenance, cleanliness, etc.)?', [field('remarks', 'Remarks', 'textarea', { always: true })])
    ]
  },
  {
    id: 'trainingAwareness',
    title: 'Training & Awareness',
    items: [
      item('employeesTrainedFireSafety', 'Employees trained in fire safety?', [field('floor', 'Floor', floors), field('lastTrainedDate', 'Last Trained Date', 'date', { defaultToday: true }), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('fireExtinguisherUsageTraining', 'Fire extinguishers usage training given?', [field('floor', 'Floor', floors), field('lastTrainedDate', 'Last Trained Date', 'date', { defaultToday: true }), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('safetyInstructionsDisplayed', 'Safety instructions displayed?', [field('floor', 'Floor', floors), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('fireSafetyOfficerAppointed', 'Fire safety officer appointed?', [field('remarks', 'Remarks', 'textarea', { always: true })])
    ]
  },
  {
    id: 'complianceDocumentation',
    title: 'Compliance & Documentation',
    items: [
      item('fireLicenseAvailableValid', 'Fire license available and valid?', [field('fromDate', 'From Date', 'date', { defaultToday: true }), field('toDate', 'To Date', 'date', { defaultToday: true }), field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('nocFromFireDepartment', 'NOC from fire department?', [field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('maintenanceRecordAvailable', 'Maintenance record available?', [field('remarks', 'Remarks', 'textarea', { always: true })]),
      item('incidentRegisterMaintained', 'Incident register maintained?', [field('remarks', 'Remarks', 'textarea', { always: true })])
    ]
  },
  {
    id: 'riskObservation',
    title: 'Risk Observation',
    fields: [
      field('fireHazardsIdentified', 'Any fire hazards identified?', yesNo),
      field('highRiskAreas', 'High risk areas', 'textarea', { full: true }),
      field('suggestionForImprovement', 'Suggestion for improvement', 'textarea', { full: true })
    ]
  },
  {
    id: 'finalAssessment',
    title: 'Final Assessment',
    fields: [
      field('overallStatus', 'Overall Fire Safety status', statuses, { required: true }),
      field('immediateActionRequired', 'Immediate action required?', yesNo, { required: true })
    ]
  }
];

function field(key, label, type, options = {}) {
  return { key, label, type, ...options };
}

function item(key, question, fields) {
  return { key, question, fields, availability: true };
}

function render() {
  const container = document.getElementById('sections');
  const nav = document.getElementById('sectionNav');
  container.innerHTML = sections.map((section, index) => renderSection(section, index)).join('');
  nav.innerHTML = sections.map((section, index) => `
        <li><a href="#${section.id}"><span class="nav-index">${index + 1}</span>${escapeHtml(section.title)}</a></li>
      `).join('');
  attachConditionalHandlers();
  attachProgressHandlers();
}

function renderSection(section, index) {
  const content = section.items
    ? section.items.map(itemConfig => renderItem(section.id, itemConfig)).join('')
    : `<div class="grid">${section.fields.map(itemField => renderField(section.id, itemField)).join('')}</div>`;

  const count = section.items ? `${section.items.length} checkpoints` : `${section.fields.length} fields`;
  return `
        <section class="section" id="${section.id}">
          <div class="section-title">
            <h2>${escapeHtml(section.title)}</h2>
            <span class="section-count">${index + 1} / ${sections.length} - ${count}</span>
          </div>
          <div class="section-body">${content}</div>
        </section>
      `;
}

function renderItem(sectionId, itemConfig) {
  if (itemConfig.noAvailability) {
    return `
        <article class="audit-item">
          <div class="item-head">
            <p class="question">${escapeHtml(itemConfig.question)}</p>
          </div>
            <div class="item-fields">
              ${itemConfig.fields.map(itemField => renderField(sectionId, itemField, itemConfig.key)).join('')}
            </div>
          </article>
        `;
  }

  return `
        <article class="audit-item" data-item="${sectionId}.${itemConfig.key}">
          <div class="item-head">
            <p class="question">${escapeHtml(itemConfig.question)}</p>
          </div>
          <div class="item-fields">
            ${renderField(sectionId, field('available', 'Status', yesNo, { required: true }), itemConfig.key, true)}
            ${itemConfig.fields.map(itemField => renderField(sectionId, itemField, itemConfig.key)).join('')}
          </div>
        </article>
      `;
}

function renderField(sectionId, itemField, itemKey = '', compact = false) {
  const path = itemKey ? `${sectionId}.${itemKey}.${itemField.key}` : `${sectionId}.${itemField.key}`;
  const classes = ['field'];
  if (compact) classes.push('compact');
  if (itemField.full || itemField.type === 'textarea') classes.push('full');
  if (!itemField.full && itemField.type !== 'textarea' && !compact) classes.push('span-2');
  const conditionalAttr = itemKey && !itemField.always && itemField.key !== 'available' ? ' data-conditional="true"' : '';
  const required = itemField.required ? ' required' : '';
  const labelClass = itemField.required ? ' class="required"' : '';

  return `
        <div class="${classes.join(' ')}"${conditionalAttr}>
          <label${labelClass} for="${path}">${escapeHtml(itemField.label)}</label>
          ${renderControl(path, itemField, required)}
        </div>
      `;
}

function renderControl(path, itemField, required) {
  if (Array.isArray(itemField.type)) {
    return renderSelect(path, itemField.type, required);
  }

  if (itemField.type === 'factory') {
    return renderSelect(path, state.factories, required, 'Select factory', 'factory');
  }

  if (itemField.type === 'extinguisher') {
    return renderMultiSelect(path, state.extinguisherTypes, required, 'extinguisher');
  }

  if (itemField.type === 'textarea') {
    return `<textarea id="${path}" name="${path}" placeholder="Write details here"${required}></textarea>`;
  }

  if (itemField.type === 'number') {
    return `<input id="${path}" name="${path}" type="number" inputmode="numeric" min="0" step="1" placeholder="0"${required}>`;
  }

  if (itemField.type === 'date') {
    const value = itemField.defaultToday ? ` value="${today}"` : '';
    return `<input id="${path}" name="${path}" type="date"${value}${required}>`;
  }

  return `<input id="${path}" name="${path}" type="text" autocomplete="off"${required}>`;
}

function renderSelect(path, options, required, placeholder = 'Select', dataType = '') {
  const optionHtml = options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
  const typeAttr = dataType ? ` data-type="${dataType}"` : '';
  return `<select id="${path}" name="${path}"${typeAttr}${required}><option value="">${placeholder}</option>${optionHtml}</select>`;
}

function renderMultiSelect(path, options, required, dataType = '') {
  const size = Math.min(Math.max(options.length, 3), 7);
  const optionHtml = options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
  const typeAttr = dataType ? ` data-type="${dataType}"` : '';
  return `<select id="${path}" name="${path}[]" multiple size="${size}"${typeAttr}${required}>${optionHtml}</select><span class="multi-select-hint">Hold Ctrl (Windows) or âŒ˜ Cmd (Mac) to select multiple types</span>`;
}

function attachConditionalHandlers() {
  document.querySelectorAll('[data-item]').forEach(itemEl => {
    const select = itemEl.querySelector('select[name$=".available"]');
    const conditionalFields = itemEl.querySelectorAll('[data-conditional="true"]');
    const update = () => {
      const show = select.value === 'YES';
      conditionalFields.forEach(fieldEl => fieldEl.classList.toggle('is-hidden', !show));
    };
    select.addEventListener('change', update);
    update();
  });
}

function attachProgressHandlers() {
  const inputs = [...document.querySelectorAll('input:not([type="file"]), select, textarea')];
  const update = () => {
    const visibleInputs = inputs.filter(input => input.offsetParent !== null);
    const filled = visibleInputs.filter(input => String(input.value || '').trim()).length;
    const percent = visibleInputs.length ? Math.round((filled / visibleInputs.length) * 100) : 0;
    document.getElementById('progressText').textContent = `${percent}%`;
    document.getElementById('progressBar').style.width = `${percent}%`;
    updateKpis(visibleInputs, filled);
  };
  inputs.forEach(input => input.addEventListener('input', update));
  inputs.forEach(input => input.addEventListener('change', update));
  update();
}

function animateKpiValue(el, newText) {
  if (!el) return;
  const oldText = el.textContent.trim();
  if (oldText === newText) return;

  const newNums = (newText.match(/\d+/g) || []).map(Number);
  const oldNums = (oldText.match(/\d+/g) || []).map(Number);
  const sameShape = newNums.length && newNums.length === oldNums.length &&
    oldText.replace(/\d+/g, '#') === newText.replace(/\d+/g, '#');

  el.classList.remove('kpi-pulse');
  void el.offsetWidth; // restart animation
  el.classList.add('kpi-pulse');

  if (!sameShape) {
    el.textContent = newText;
    return;
  }

  const parts = newText.split(/\d+/);
  const duration = 400;
  const start = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    let result = parts[0];
    newNums.forEach((target, i) => {
      const from = oldNums[i];
      const val = Math.round(from + (target - from) * eased);
      result += val + (parts[i + 1] ?? '');
    });
    el.textContent = result;
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = newText;
  }
  requestAnimationFrame(frame);
}

function updateKpis(visibleInputs, filled) {
  const yesNoSelects = visibleInputs.filter(input => {
    if (input.tagName !== 'SELECT') return false;
    return [...input.options].some(option => option.value === 'YES') && [...input.options].some(option => option.value === 'NO');
  });
  const yesCount = yesNoSelects.filter(input => input.value === 'YES').length;
  const noCount = yesNoSelects.filter(input => input.value === 'NO').length;
  const actionValue = document.querySelector('[name="finalAssessment.immediateActionRequired"]')?.value || '-';
  const attachmentCount = document.getElementById('attachments')?.files.length || 0;

  animateKpiValue(document.getElementById('kpiCompleted'), `${filled}/${visibleInputs.length}`);
  animateKpiValue(document.getElementById('kpiYesNo'), `${yesCount}/${noCount}`);
  animateKpiValue(document.getElementById('kpiAttachments'), `${attachmentCount}`);
  const actionEl = document.getElementById('kpiAction');
  if (actionEl && actionEl.textContent.trim() !== (actionValue || '-')) {
    actionEl.textContent = actionValue || '-';
    actionEl.classList.remove('kpi-pulse');
    void actionEl.offsetWidth;
    actionEl.classList.add('kpi-pulse');
  }
}

function initTheme() {
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
  updateThemeButton();
  document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('fireAuditTheme', document.body.classList.contains('dark') ? 'dark' : 'light');
    updateThemeButton();
  });
}

function updateThemeButton() {
  const isDark = document.body.classList.contains('dark');
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.setAttribute('title', isDark ? 'Switch to Light mode' : 'Switch to Dark mode');
    themeBtn.setAttribute('aria-label', isDark ? 'Switch to Light mode' : 'Switch to Dark mode');
  }
}

function initHeaderMorePanel() {
  const moreBtn = document.getElementById('moreBtn');
  const panel = document.getElementById('headerMorePanel');
  const overlay = document.getElementById('headerMoreOverlay');
  const closeBtn = document.getElementById('headerMoreClose');
  if (!moreBtn || !panel || !overlay) return;

  function openPanel() {
    panel.classList.add('open');
    overlay.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    moreBtn.setAttribute('aria-expanded', 'true');
    moreBtn.classList.add('active');
  }

  function closePanel() {
    panel.classList.remove('open');
    overlay.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    moreBtn.setAttribute('aria-expanded', 'false');
    moreBtn.classList.remove('active');
  }

  moreBtn.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  overlay.addEventListener('click', closePanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const amcDeletePasswordModal = document.getElementById('amcDeletePasswordModal');
      if (amcDeletePasswordModal && !amcDeletePasswordModal.classList.contains('hidden')) {
        closeAmcDeletePasswordModal();
        return;
      }
      const amcActionModal = document.getElementById('amcActionModal');
      if (amcActionModal && !amcActionModal.classList.contains('hidden')) {
        closeAmcActionModal();
        return;
      }
      const amcFormModal = document.getElementById('amcFormModal');
      if (amcFormModal && !amcFormModal.classList.contains('hidden')) {
        closeAmcForm();
        return;
      }
      const amcDetailView = document.getElementById('amcCategoryDetailView');
      if (amcDetailView && !amcDetailView.classList.contains('hidden')) {
        closeAmcCategoryDetail();
        return;
      }
      if (panel.classList.contains('open')) closePanel();
      const amcModal = document.getElementById('amcModal');
      if (amcModal && !amcModal.classList.contains('hidden')) closeAmcModal();
    }
  });

  // Close the panel once an action item is chosen (opens its own modal/view)
  ['pdfBtn', 'rptBtn', 'dailyBtn', 'dailyDashboardBtn', 'amcBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', closePanel);
  });
}

function updateGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEl = document.getElementById('greetingText');
  const dateEl = document.getElementById('currentDateTime');
  if (greetingEl) greetingEl.textContent = greeting;
  if (dateEl) dateEl.textContent = now.toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function loadDropdowns() {
  const statusPill = document.getElementById('statusPill');
  const syncStatus = document.getElementById('syncStatus');
  try {
    const data = await serverCall('getDropdownData');
    if (!data || data.error) throw new Error((data && data.error) || 'Empty dropdown response.');
    state.factories = data.factories || [];
    state.extinguisherTypes = data.extinguisherTypes || [];
    if (statusPill) {
      statusPill.setAttribute('title', 'Connected');
      const txt = document.getElementById('statusPillText');
      if (txt) txt.textContent = 'Connected';
    }
    if (syncStatus) syncStatus.textContent = 'Connected';
    // Update only factory dropdowns silently after data loads
    updateFactoryDropdowns();
  } catch (error) {
    console.error('Could not load dropdown data:', error);
    if (statusPill) {
      statusPill.setAttribute('title', 'Manual mode');
      const txt = document.getElementById('statusPillText');
      if (txt) txt.textContent = 'Manual mode';
    }
    if (syncStatus) syncStatus.textContent = 'Manual mode';
    showToast(`Dropdown data could not be loaded: ${error.message || error}`, true);
  }
}

async function loadSubmitCount() {
  const el = document.getElementById('kpiSubmitted');
  try {
    const data = await fetchJson(bustCache(`${WEB_APP_URL}?action=submitCount`), {}, READ_REQUEST_TIMEOUT_MS);
    state.submittedCount = data.count || 0;
    animateKpiValue(el, `${state.submittedCount}`);
  } catch (error) {
    if (el) el.textContent = '-';
  }
}

function updateFactoryDropdowns() {
  document.querySelectorAll('select[data-type="factory"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Select factory...</option>' +
      state.factories.map(f => `<option value="${f}"${f === cur ? ' selected' : ''}>${f}</option>`).join('');
  });
  document.querySelectorAll('select[data-type="extinguisher"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Select type...</option>' +
      state.extinguisherTypes.map(t => `<option value="${t}"${t === cur ? ' selected' : ''}>${t}</option>`).join('');
  });
}

function fetchWithTimeout(resource, options = {}, ms = READ_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(resource, { cache: 'no-store', ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

// Apps Script /exec GET responses are aggressively cached by the browser
// (and sometimes by Google's edge), so a URL that worked once can quietly
// keep returning a stale/cached result on reopen. Appending a changing
// param forces a fresh request every time.
function bustCache(url) {
  return url + (url.includes('?') ? '&' : '?') + '_ts=' + Date.now();
}

// Fetches JSON from the backend. Throws a clear error (instead of hanging
// or silently failing) if the request times out, the server errors, or
// the response isn't valid JSON (e.g. the deployed Apps Script is stale
// and doGet() fell through to returning the full HTML app page).
async function fetchJson(url, options = {}, ms = READ_REQUEST_TIMEOUT_MS) {
  let response;
  try {
    response = await fetchWithTimeout(url, options, ms);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection or the Apps Script deployment.');
    }
    throw new Error('Network error: ' + (err.message || err));
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}. ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    // The most common cause: the live deployment doesn't match the code
    // (e.g. a new "version" wasn't deployed after editing Code.gs), so
    // doGet() fell through and returned the HTML app page instead of JSON.
    throw new Error('Server did not return valid data. The Apps Script deployment may be out of date — redeploy a new version (Deploy > Manage deployments > Edit > New version).');
  }
}

// The Apps Script /exec URL normally works with fetch(). Some browsers or
// corporate networks block its cross-origin redirect, though. This GET-only
// JSONP fallback keeps dropdowns available without changing the form API.
function fetchJsonp(url, ms = READ_REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const callbackName = `fireAuditJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const cleanup = () => {
      clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Dropdown request timed out.'));
    }, ms);
    window[callbackName] = data => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Dropdown request was blocked by the Apps Script deployment.'));
    };
    script.src = bustCache(`${url}${url.includes('?') ? '&' : '?'}callback=${encodeURIComponent(callbackName)}`);
    document.head.appendChild(script);
  });
}

async function serverCall(functionName, payload) {
  if (window.google && google.script && google.script.run) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)[functionName](payload);
    });
  }

  if (functionName === 'getDropdownData') {
    const dropdownUrl = `${WEB_APP_URL}?action=dropdowns`;
    try {
      return await fetchJson(bustCache(dropdownUrl), {}, READ_REQUEST_TIMEOUT_MS);
    } catch (error) {
      // Only use JSONP for a network/CORS style failure. A valid server
      // error should still be shown rather than hidden by a second request.
      if (!/^Network error:|timed out/i.test(String(error && error.message))) throw error;
      return fetchJsonp(dropdownUrl, READ_REQUEST_TIMEOUT_MS);
    }
  }

  // Requests carrying photo attachments (main audit form or Daily Task
  // sign-out) take much longer server-side: each attachment gets
  // base64-decoded and written to Drive with a sharing call. A single
  // photo comfortably finishes in 15s, but several photos can easily
  // take 30-60s+, so those calls get a longer timeout instead of
  // failing with a false "timed out" error while the backend is still
  // working.
  const hasAttachments = Array.isArray(payload && payload.attachments) && payload.attachments.length > 0;
  const timeoutMs = hasAttachments ? Math.min(120000, 15000 + payload.attachments.length * 20000) : 15000;

  return fetchJson(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  }, timeoutMs);
}

document.getElementById('attachments').addEventListener('change', event => {
  const files = [...event.target.files];
  document.getElementById('fileList').innerHTML = files.map(file => `
        <span class="file-chip">${escapeHtml(file.name)} - ${formatBytes(file.size)}</span>
      `).join('');
  attachProgressHandlers();
});

document.getElementById('auditForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const button = document.getElementById('submitBtn');
  button.disabled = true;
  button.textContent = 'Submitting...';
  try {
    const payload = collectPayload();
    payload.attachments = await collectAttachments();
    const response = await serverCall('submitAudit', payload);
    if (response && response.ok === false) {
      throw new Error(response.message || 'Submission failed.');
    }
    const result = response && response.result ? response.result : response;
    const pdfUrl = result && result.pdfUrl ? result.pdfUrl : '';
    const pdfDownloadUrl = result && result.pdfDownloadUrl ? result.pdfDownloadUrl : pdfUrl;
    const pdfBase64 = result && result.pdfBase64 ? result.pdfBase64 : '';
    const pdfName = result && result.pdfName ? result.pdfName : 'fire-safety-audit-report.pdf';
    showToast(
      pdfUrl ? 'The audit has been submitted successfully. The PDF report has been generated.' : 'The audit has been submitted successfully.',
      false,
      pdfDownloadUrl
    );
    state.submittedCount += 1;
    animateKpiValue(document.getElementById('kpiSubmitted'), `${state.submittedCount}`);
    if (pdfDownloadUrl) {
      downloadPdf(pdfDownloadUrl);
    } else if (pdfBase64) {
      downloadPdfFromBase64(pdfBase64, pdfName);
    }
    form.reset();
    setDefaultDates();
    document.getElementById('fileList').innerHTML = '';
    attachConditionalHandlers();
    attachProgressHandlers();
  } catch (error) {
    showToast(error.message || 'Submit kora jayni. Please try again.', true);
  } finally {
    button.disabled = false;
    button.textContent = 'Submit Audit';
  }
});

function collectPayload() {
  const payload = {};
  const formData = new FormData(document.getElementById('auditForm'));
  // Collect multi-select values first (they have [] in the name)
  const multiSelectValues = {};
  for (const [name, value] of formData.entries()) {
    if (name === 'attachments') continue;
    if (name.endsWith('[]')) {
      const cleanName = name.slice(0, -2); // Remove []
      if (!multiSelectValues[cleanName]) {
        multiSelectValues[cleanName] = [];
      }
      if (value) multiSelectValues[cleanName].push(value);
    } else {
      setNested(payload, name.split('.'), value);
    }
  }
  // Convert multi-select arrays to comma-separated strings
  for (const [name, values] of Object.entries(multiSelectValues)) {
    if (values.length > 0) {
      setNested(payload, name.split('.'), values.join(', '));
    }
  }
  return payload;
}

function setNested(target, keys, value) {
  let pointer = target;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      pointer[key] = value;
      return;
    }
    pointer[key] = pointer[key] || {};
    pointer = pointer[key];
  });
}

async function collectAttachments() {
  const files = [...document.getElementById('attachments').files];
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data: String(reader.result).split(',')[1]
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

function downloadPdfFromBase64(base64, fileName) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  triggerPdfDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function downloadPdf(url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_top';
  link.rel = 'noopener';
  link.textContent = 'Download PDF';
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    try {
      window.top.location.href = url;
    } catch (error) {
      window.location.href = url;
    }
  }, 300);
}

function triggerPdfDownload(url, fileName) {
  if (!downloadFrame) {
    downloadFrame = document.createElement('iframe');
    downloadFrame.className = 'download-frame';
    downloadFrame.title = 'PDF download';
    document.body.appendChild(downloadFrame);
  }
  downloadFrame.src = url;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'fire-safety-audit-report.pdf';
  link.rel = 'noopener';
  link.textContent = 'Download PDF';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function setDefaultDates() {
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.value = today;
  });
}

function showToast(message, isError = false, linkUrl = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  if (linkUrl) {
    const link = document.createElement('a');
    link.href = linkUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = ' Download PDF';
    toast.appendChild(link);
  }
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4200);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initCompanyTicker() {
  const wrap = document.getElementById('companyTicker');
  const textEl = document.getElementById('companyTickerText');
  if (!wrap || !textEl) return;

  const items = [
    { text: 'Trio Trend Exports Pvt. Ltd.', className: 'ticker-brown' },
    { text: 'Yamai Fashions Pvt. Ltd.', className: 'ticker-blue' }
  ];

  let itemIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const TYPE_SPEED = 65;
  const DELETE_SPEED = 35;
  const HOLD_AFTER_TYPE = 1600;
  const HOLD_AFTER_DELETE = 400;

  function tick() {
    const current = items[itemIndex];
    wrap.classList.remove('ticker-brown', 'ticker-blue');
    wrap.classList.add(current.className);

    if (!deleting) {
      charIndex++;
      textEl.textContent = current.text.slice(0, charIndex);
      if (charIndex >= current.text.length) {
        deleting = true;
        setTimeout(tick, HOLD_AFTER_TYPE);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    } else {
      charIndex--;
      textEl.textContent = current.text.slice(0, charIndex);
      if (charIndex <= 0) {
        deleting = false;
        itemIndex = (itemIndex + 1) % items.length;
        setTimeout(tick, HOLD_AFTER_DELETE);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    }
  }

  tick();
}

// Hides the full-screen "Loading..." overlay shown at app open.
function hideAppLoader() {
  const loader = document.getElementById('appLoader');
  if (!loader) return;
  loader.classList.add('hidden');
  setTimeout(() => loader.remove(), 400);
}

initTheme();
initHeaderMorePanel();
updateGreeting();
setInterval(updateGreeting, 30000);
initCompanyTicker();
// Render form immediately — don't wait for API
render();
// Load dropdowns in background while the "Loading..." overlay is shown.
// The overlay hides as soon as dropdown data arrives (success or failure
// — loadDropdowns() catches its own errors), or after 4s max so the app
// never feels stuck if the network is slow.
const dropdownsReady = loadDropdowns();
const loaderSafetyTimeout = new Promise(resolve => setTimeout(resolve, 4000));
Promise.race([dropdownsReady, loaderSafetyTimeout]).then(hideAppLoader);
loadSubmitCount();
document
  .getElementById('pdfBtn')
  .addEventListener('click', loadRecentPdfs);

document
  .getElementById('dailyBtn')
  .addEventListener('click', openDailyModal);

document
  .getElementById('dailyDashboardBtn')
  .addEventListener('click', openDailyTaskDashboard);

const amcBtn = document.getElementById('amcBtn');
if (amcBtn) {
  amcBtn.addEventListener('click', openAmcModal);
}

// Live-suggest the "Next Due Date" as soon as Last Service Date /
// Frequency are filled in, mirroring the same auto-calculation the
// backend does on save (amcDeriveNextDueDate in Code.gs) — so the user
// sees the servicing status update immediately, before even saving.
const amcLastServiceEl = document.getElementById('amcFormLastService');
const amcFrequencyEl = document.getElementById('amcFormFrequency');
if (amcLastServiceEl && amcFrequencyEl) {
  const suggestAmcNextDue = () => {
    const nextDueEl = document.getElementById('amcFormNextDue');
    if (!nextDueEl || nextDueEl.value) return; // never overwrite a manual value
    const suggestion = amcCalcNextDueDate(amcLastServiceEl.value, amcFrequencyEl.value);
    if (suggestion) nextDueEl.value = suggestion;
  };
  amcLastServiceEl.addEventListener('change', suggestAmcNextDue);
  amcFrequencyEl.addEventListener('change', suggestAmcNextDue);
}

function openAmcModal() {
  const modal = document.getElementById('amcModal');
  if (modal) {
    modal.classList.remove('hidden');
    closeAmcCategoryDetail();
    loadAmcData();
  }
}

function closeAmcModal() {
  const modal = document.getElementById('amcModal');
  if (modal) modal.classList.add('hidden');
  closeAmcCategoryDetail();
  closeAmcForm();
}

function closePdfModal() {
  document
    .getElementById('pdfModal')
    .classList.add('hidden');
  stopPdfAutoRefresh();
}

let allPdfs = [];
let pdfAutoRefreshTimer = null;

// Prefetch cache â€” mirrors the report dashboard's prefetch pattern so the
// Recent PDFs list is (usually) already loaded by the time the user opens it.
let pdfDataCache = null;
let pdfDataPromise = null;
let pdfDataCachedAt = 0;
const PDF_PREFETCH_MAX_AGE_MS = 60000;

// Start fetching immediately while the main form is becoming interactive.
// Opening the PDF modal reuses this promise/result instead of firing a
// fresh request. (Placed here, right after the pdfData* declarations above,
// so it runs after they exist â€” calling it any earlier would throw
// "Cannot access before initialization" and silently break every button
// wired up after it, the same bug that hit the Report/PDF icons before.)
preloadPdfData();

function preloadPdfData() {
  fetchPdfsFromBackend().catch(() => { });
}

function fetchPdfsFromBackend(force = false) {
  const cacheIsFresh = Array.isArray(pdfDataCache) &&
    (Date.now() - pdfDataCachedAt) < PDF_PREFETCH_MAX_AGE_MS;

  if (!force && cacheIsFresh) {
    return Promise.resolve(pdfDataCache);
  }

  if (!force && pdfDataPromise) {
    return pdfDataPromise;
  }

  const request = fetchJson(bustCache(WEB_APP_URL + '?action=recentPdfs'), {}, READ_REQUEST_TIMEOUT_MS);

  pdfDataPromise = request
    .then(data => {
      pdfDataCache = Array.isArray(data) ? data : [];
      pdfDataCachedAt = Date.now();
      return pdfDataCache;
    })
    .catch(error => {
      pdfDataPromise = null;
      throw error;
    });

  return pdfDataPromise;
}

async function loadRecentPdfs() {

  document
    .getElementById('pdfModal')
    .classList.remove('hidden');

  const list = document.getElementById('pdfList');

  // Only show the loading state if nothing has been prefetched yet â€”
  // otherwise render instantly from cache while a fresh copy loads.
  if (!Array.isArray(pdfDataCache)) {
    list.innerHTML = 'Loading...';
  }

  try {

    allPdfs = await fetchPdfsFromBackend();

    renderPdfList(allPdfs);
    stampPdfUpdated();

  } catch (err) {

    list.innerHTML = `<div class="pdf-empty"><p>Failed to load PDFs: ${escapeHtml(err.message || 'Unknown error')}</p></div>`;

  }
}

// Manual refresh only now — no background timer. Click the refresh button
// (or reopen the modal) to pull fresh data.
function stopPdfAutoRefresh() {
  if (pdfAutoRefreshTimer) { clearInterval(pdfAutoRefreshTimer); pdfAutoRefreshTimer = null; }
}

// Silent refresh — re-fetches without resetting the search/date filters
async function silentPdfRefresh() {
  try {
    allPdfs = await fetchPdfsFromBackend(true);
    filterPdfList();
  } catch (_) { }
}

// Manual (or auto-triggered) refresh with a spin animation on the refresh icon
function manualPdfRefresh() {
  const btn = document.getElementById('pdfRefreshBtn');
  if (btn) btn.classList.add('spinning');
  silentPdfRefresh().finally(() => {
    if (btn) setTimeout(() => btn.classList.remove('spinning'), 500);
    stampPdfUpdated();
  });
}

function stampPdfUpdated() {
  const el = document.getElementById('pdfUpdatedAt');
  if (!el) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  el.textContent = `Updated ${hh}:${mm}:${ss}`;
}

function renderPdfList(data) {
  const list = document.getElementById('pdfList');
  if (!data.length) {
    list.innerHTML = '<div class="pdf-empty"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#cbd5e1" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>No PDFs found</p></div>';
    return;
  }
  list.innerHTML = data.map(pdf => `
    <div class="pdf-item">
      <div class="pdf-name-wrap">
        <div class="pdf-icon-sm">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
            <line x1="9" y1="11" x2="15" y2="11"/>
          </svg>
        </div>
        <span class="pdf-title" title="${pdf.name}">${pdf.name}</span>
      </div>
      <div class="pdf-factory-cell">${pdf.factory || '—'}</div>
      <div class="pdf-date-cell">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${formatPdfOnlyDate(pdf.timestamp)}
      </div>
      <div class="pdf-actions-cell">
        <button class="pdf-download" onclick="window.open('${pdf.downloadUrl}','_blank')" title="Download">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="pdf-delete" onclick="promptDeletePdf('${pdf.id}')" title="Delete">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function filterPdfList() {

  const search = document
    .getElementById('pdfSearch')
    .value
    .toLowerCase();

  const fromDate =
    document.getElementById('pdfFromDate').value;

  const toDate =
    document.getElementById('pdfToDate').value;

  let filtered = [...allPdfs];

  if (search) {

    filtered = filtered.filter(pdf =>
      pdf.name.toLowerCase().includes(search) ||
      pdf.factory.toLowerCase().includes(search)
    );
  }

  if (fromDate) {

    filtered = filtered.filter(pdf =>
      new Date(pdf.timestamp) >= new Date(fromDate)
    );
  }

  if (toDate) {

    filtered = filtered.filter(pdf =>
      new Date(pdf.timestamp) <= new Date(toDate + 'T23:59:59')
    );
  }

  renderPdfList(filtered);
}

function formatPdfOnlyDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatPdfOnlyTime(date) {

  return new Date(date).toLocaleTimeString(
    'en-US',
    {
      hour: '2-digit',
      minute: '2-digit'
    }
  );
}

function promptDeletePdf(pdfId) {
  const password = prompt('Enter password to delete this PDF:');

  if (password === null) {
    return;
  }

  if (password === 'Trio@2026') {
    deletePdf(pdfId);
  } else {
    showToast('Incorrect password. PDF not deleted.', true);
  }
}

async function deletePdf(pdfId) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deletePdf', pdfId: pdfId }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    const result = await response.json();

    if (result.ok) {
      showToast('PDF deleted successfully.', false);
      allPdfs = allPdfs.filter(pdf => pdf.id !== pdfId);
      renderPdfList(allPdfs);
    } else {
      showToast(result.message || 'Failed to delete PDF.', true);
    }
  } catch (err) {
    showToast('Error deleting PDF: ' + err.message, true);
  }
}

// â”€â”€â”€ AUDIT STATUS DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let allRptData = [], filteredRptData = [], rptPage = 1;
let rptDataCache = null;
let rptDataPromise = null;
let rptDataCachedAt = 0;
const RPT_PAGE_SIZE = 10;
const RPT_PREFETCH_MAX_AGE_MS = 60000;
let rptSortCol = 'isoDate', rptSortDir = -1;
let rptAutoRefreshTimer = null;

document.getElementById('rptBtn').addEventListener('click', loadRptData);
// Prefetch the report immediately so it is ready before the user opens it.
// (Must run after the rptData* variables above are declared â€” calling this
// earlier in the file threw a "Cannot access before initialization" error
// that silently broke every button wired up after it, including the report
// button and PDF icon.)
preloadRptData();

function closeRptModal() {
  document.getElementById('rptModal').classList.add('hidden');
  stopRptAutoRefresh();
  closeKpiDrill();
}

// Full load (shows loading state, opens modal)
async function loadRptData() {
  document.getElementById('rptModal').classList.remove('hidden');
  if (!Array.isArray(rptDataCache)) {
    document.getElementById('rptTableBody').innerHTML =
      '<tr><td colspan="9" style="text-align:center;padding:30px;color:#6b7280;">Loading\u2026</td></tr>';
  }
  try {
    const data = await fetchRptFromBackend();
    allRptData = Array.isArray(data) ? data : [];
    buildRptMonthFilter();
    initRptDefaults();
    applyRptFilter();
  } catch (err) {
    document.getElementById('rptTableBody').innerHTML =
      `<tr><td colspan="9" style="text-align:center;padding:30px;color:#b62626;">Failed to load data: ${escapeHtml(err.message || 'Please try again.')}</td></tr>`;
  }
}

// Silent refresh â€” re-fetches without resetting filters, page, or showing loading
async function silentRptRefresh() {
  try {
    const data = await fetchRptFromBackend(true);
    allRptData = Array.isArray(data) ? data : [];
    buildRptMonthFilter();
    applyRptFilter(false);
  } catch (_) { }
}

// Manual refresh only now — no background timer. Click the refresh button
// (or reopen the modal) to pull fresh data.
function stopRptAutoRefresh() {
  if (rptAutoRefreshTimer) { clearInterval(rptAutoRefreshTimer); rptAutoRefreshTimer = null; }
}

// Manual (or auto-triggered) refresh with a spin animation on the refresh icon
function manualRptRefresh() {
  const btn = document.getElementById('rptRefreshBtn');
  if (btn) btn.classList.add('spinning');
  silentRptRefresh().finally(() => {
    if (btn) setTimeout(() => btn.classList.remove('spinning'), 500);
    stampRptUpdated();
  });
}

function stampRptUpdated() {
  const el = document.getElementById('rptUpdatedAt');
  if (!el) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  el.textContent = `Updated ${hh}:${mm}:${ss}`;
}

function preloadRptData() {
  // Start while the main form is becoming interactive. Opening the report
  // reuses this promise or its completed result instead of starting another
  // Google Sheets request.
  fetchRptFromBackend().catch(() => { });
}

function fetchRptFromBackend(force = false) {
  const cacheIsFresh = Array.isArray(rptDataCache) &&
    (Date.now() - rptDataCachedAt) < RPT_PREFETCH_MAX_AGE_MS;

  if (!force && cacheIsFresh) {
    return Promise.resolve(rptDataCache);
  }

  if (!force && rptDataPromise) {
    return rptDataPromise;
  }

  let request;
  if (window.google && google.script && google.script.run) {
    request = new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getReportData());
  } else {
    request = fetchJson(
      bustCache(`${WEB_APP_URL}?action=reportData`),
      {},
      READ_REQUEST_TIMEOUT_MS
    );
  }

  rptDataPromise = request
    .then(data => {
      rptDataCache = Array.isArray(data) ? data : [];
      rptDataCachedAt = Date.now();
      return rptDataCache;
    })
    .catch(error => {
      rptDataPromise = null;
      throw error;
    });

  return rptDataPromise;
}

// Build month dropdown from actual data (year-month pairs)
function buildRptMonthFilter() {
  const months = new Map();
  allRptData.forEach(r => {
    if (!r.isoDate) return;
    const d = new Date(r.isoDate);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    if (!months.has(key)) {
      const lbl = d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear();
      months.set(key, lbl);
    }
  });
  const sel = document.getElementById('rptMonth');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Months</option>';
  [...months.entries()].sort().forEach(([k, lbl]) => {
    const o = document.createElement('option');
    o.value = k; o.textContent = lbl;
    sel.appendChild(o);
  });
  if ([...months.keys()].includes(cur)) sel.value = cur;
}

function initRptDefaults() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  document.getElementById('rptFromDate').value = formatLocalDate(first);
  document.getElementById('rptToDate').value = formatLocalDate(last);
  // Pre-select current month if available
  const curKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  const sel = document.getElementById('rptMonth');
  if ([...sel.options].some(o => o.value === curKey)) sel.value = curKey;
  else sel.value = '';
  document.getElementById('rptStatus').value = 'all';
}

function resetRptFilter() { initRptDefaults(); applyRptFilter(); }

function applyRptFilter(resetPage = true) {
  const status = document.getElementById('rptStatus').value;
  const from = document.getElementById('rptFromDate').value;
  const to = document.getElementById('rptToDate').value;
  const month = document.getElementById('rptMonth').value; // "yyyy-M" or ""

  filteredRptData = allRptData.filter(row => {
    if (status === 'Complete' && row.status !== 'Complete') return false;
    if (status === 'Pending' && row.status === 'Complete') return false;
    const d = row.isoDate ? new Date(row.isoDate) : null;
    if (d && !isNaN(d)) {
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to + 'T23:59:59')) return false;
      if (month !== '') {
        const [yr, mo] = month.split('-').map(Number);
        if (d.getFullYear() !== yr || d.getMonth() !== mo) return false;
      }
    }
    return true;
  });
  if (resetPage) rptPage = 1;
  renderRptKpis();
  renderRptTable();
  stampRptUpdated();
}

function renderRptKpis() {
  const total = filteredRptData.length;
  const complete = filteredRptData.filter(r => r.status === 'Complete').length;
  const pending = total - complete;   // Pending = Total - Complete
  const pct = total > 0 ? Math.round((pending / total) * 100) + '%' : '-';
  document.getElementById('rptKpiTotal').textContent = total;
  document.getElementById('rptKpiPending').textContent = pending;
  document.getElementById('rptKpiComplete').textContent = complete;
  document.getElementById('rptKpiElapsed').textContent = pct;
}

function sortRpt(col) {
  rptSortDir = rptSortCol === col ? rptSortDir * -1 : 1;
  rptSortCol = col;
  document.querySelectorAll('.rpt-table thead th').forEach(th => {
    th.classList.toggle('sorted', th.dataset.col === col);
    const ic = th.querySelector('.sicon');
    if (ic) ic.textContent = th.dataset.col === col ? (rptSortDir === 1 ? '\u2191' : '\u2193') : '\u2195';
  });
  renderRptTable();
}

function renderRptTable() {
  const sorted = [...filteredRptData].sort((a, b) => {
    const av = a[rptSortCol] || '', bv = b[rptSortCol] || '';
    return av < bv ? -rptSortDir : av > bv ? rptSortDir : 0;
  });
  const total = sorted.length, pages = Math.ceil(total / RPT_PAGE_SIZE) || 1;
  rptPage = Math.min(Math.max(rptPage, 1), pages);
  const start = (rptPage - 1) * RPT_PAGE_SIZE;
  const page = sorted.slice(start, start + RPT_PAGE_SIZE);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tbody = document.getElementById('rptTableBody');

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#6b7280;">No records found.</td></tr>';
  } else {
    tbody.innerHTML = page.map((row, i) => {
      const isComplete = row.status === 'Complete';
      const isPending = !isComplete;

      let badge;
      if (isPending && row.isoDate) {
        const d = new Date(row.isoDate); d.setHours(0, 0, 0, 0);
        const days = Math.max(0, Math.round((today - d) / 86400000));
        const lbl = days === 0 ? 'Pending, audited today.'
          : days === 1 ? 'Pending, 1 day has elapsed since the audit date.'
            : `Pending, ${days} days have elapsed since the audit date.`;
        badge = `<span class="rpt-badge rpt-badge-pending">${escapeHtml(lbl)}</span>`;
      } else if (isComplete) {
        badge = `<span class="rpt-badge rpt-badge-complete">Complete</span>`;
      } else {
        badge = `<span class="rpt-badge rpt-badge-default">${escapeHtml(row.status || '-')}</span>`;
      }

      const link = row.fileLink
        ? `<a class="rpt-file-link" href="${escapeHtml(row.fileLink)}" target="_blank" rel="noopener">${escapeHtml(row.fileLink.length > 28 ? row.fileLink.slice(0, 26) + '\u2026' : row.fileLink)}</a>`
        : '-';

      // Action checkbox: checked = isDone (col G has DONE), only Pending rows are clickable
      const cbChecked = row.isDone ? ' checked' : '';
      const cbDisabled = isComplete ? ' disabled' : '';
      const cbClick = isComplete ? '' : ` onclick="markRptDone(this,${row.rowIndex})"`;

      const actualDate = escapeHtml(row.actualDate || '-');

      return `<tr>
        <td>${start + i + 1}</td>
        <td>${escapeHtml(row.auditDate || '-')}</td>
        <td>${escapeHtml(row.unit || '-')}</td>
        <td>${escapeHtml(row.location || '-')}</td>
        <td>${link}</td>
        <td>${escapeHtml(row.remarks || '-')}</td>
        <td>${badge}</td>
        <td class="rpt-cb-wrap"><input type="checkbox" class="rpt-cb"${cbChecked}${cbDisabled}${cbClick}></td>
        <td>${actualDate}</td>
      </tr>`;
    }).join('');
  }

  const end = Math.min(start + RPT_PAGE_SIZE, total);
  document.getElementById('rptShowing').textContent =
    total ? `Showing ${start + 1} to ${end} of ${total} entries` : 'No entries';

  let ph = `<button class="rpt-page-btn" onclick="rptGoPage(${rptPage - 1})"${rptPage === 1 ? ' disabled' : ''}>\u2039</button>`;
  for (let p = 1; p <= pages; p++)
    ph += `<button class="rpt-page-btn${p === rptPage ? ' active' : ''}" onclick="rptGoPage(${p})">${p}</button>`;
  ph += `<button class="rpt-page-btn" onclick="rptGoPage(${rptPage + 1})"${rptPage === pages ? ' disabled' : ''}>\u203a</button>`;
  document.getElementById('rptPages').innerHTML = ph;
}

function rptGoPage(p) {
  rptPage = Math.max(1, Math.min(p, Math.ceil(filteredRptData.length / RPT_PAGE_SIZE) || 1));
  renderRptTable();
}

function markRptDone(cb, rowIndex) {
  if (cb.checked) {
    cb.disabled = true;
    cb.style.opacity = '0.45';

    const onSuccess = () => {
      cb.disabled = false;
      cb.style.opacity = '1';
      // Stamp today's date optimistically in the Actual Date cell
      const ts = new Date();
      const dd = String(ts.getDate()).padStart(2, '0');
      const mm = String(ts.getMonth() + 1).padStart(2, '0');
      const yy = String(ts.getFullYear()).slice(-2);
      const tsStr = `${dd}-${mm}-${yy}`;
      const tr = cb.closest('tr');
      if (tr) { const cells = tr.querySelectorAll('td'); if (cells.length >= 9) cells[8].textContent = tsStr; }
      allRptData.forEach(r => { if (r.rowIndex === rowIndex) { r.isDone = true; r.actualDate = tsStr; } });
      filteredRptData.forEach(r => { if (r.rowIndex === rowIndex) { r.isDone = true; r.actualDate = tsStr; } });
      showToast('Marked as Done. Refreshing\u2026', false);
      silentRptRefresh();
    };
    const onFail = () => {
      cb.checked = false;
      cb.disabled = false;
      cb.style.opacity = '1';
      showToast('Failed to update sheet. Please try again.', true);
    };

    if (window.google && google.script && google.script.run) {
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).markReportDone(rowIndex);
    } else {
      fetch(bustCache(`${WEB_APP_URL}?action=markDone&rowIndex=${rowIndex}`), { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (d && d.ok) onSuccess(); else throw 0; })
        .catch(onFail);
    }
  } else {
    cb.checked = true; // prevent unchecking
  }
}

function exportRptExcel() {
  if (!filteredRptData.length) { showToast('No data to export.', true); return; }
  const hdr = ['#', 'Audit Date', 'Unit', 'Location', 'File Link', 'Remarks', 'STATUS', 'Actual Date'];
  const rows = filteredRptData.map((r, i) => [
    i + 1, r.auditDate || '', r.unit || '', r.location || '',
    r.fileLink || '', r.remarks || '', r.status || '', r.actualDate || ''
  ]);
  const csv = [hdr, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'Audit_Status_Report.csv'; a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('Exported! Open the CSV file in Excel.', false);
}
// ─── DAILY TASK ─────────────────────────────────────────────────────────
const dailySession = { active: false, startTime: null, timerId: null };
let dailyDropdownsReady = false;

function populateDailyDropdowns() {
  if (dailyDropdownsReady) return;
  const floorSel = document.getElementById('dailyFloor');
  floors.forEach(f => {
    const o = document.createElement('option');
    o.value = f; o.textContent = f;
    floorSel.appendChild(o);
  });
  dailyDropdownsReady = true;
}

function openDailyModal() {
  populateDailyDropdowns();
  document.getElementById('dailyModal').classList.remove('hidden');
  const titleEl = document.getElementById('dailyModalTitle');
  if (titleEl) titleEl.textContent = 'Daily Task';
  loadDailyStats();
  if (dailySession.active) {
    document.getElementById('dailySigninWrap').classList.add('hidden');
    document.getElementById('dailyFormWrap').classList.remove('hidden');
    document.getElementById('dailySignOutBtn').classList.remove('hidden');
  } else {
    document.getElementById('dailySigninWrap').classList.remove('hidden');
    document.getElementById('dailyFormWrap').classList.add('hidden');
    document.getElementById('dailySignOutBtn').classList.add('hidden');
  }
}

// Opens the Daily Task modal straight into the filterable report view —
// same report as behind the report icon, just entered directly with the
// title swapped to "Daily Tasks Dashboard".
function openDailyTaskDashboard() {
  populateDailyDropdowns();
  document.getElementById('dailyModal').classList.remove('hidden');
  const titleEl = document.getElementById('dailyModalTitle');
  if (titleEl) titleEl.textContent = 'Daily Tasks Dashboard';
  loadDailyStats();
  if (dailySession.active) {
    document.getElementById('dailySigninWrap').classList.add('hidden');
    document.getElementById('dailyFormWrap').classList.remove('hidden');
    document.getElementById('dailySignOutBtn').classList.remove('hidden');
  } else {
    document.getElementById('dailySigninWrap').classList.remove('hidden');
    document.getElementById('dailyFormWrap').classList.add('hidden');
    document.getElementById('dailySignOutBtn').classList.add('hidden');
  }
  openDailyReportView();
}

function closeDailyModal() {
  document.getElementById('dailyModal').classList.add('hidden');
  closeDailyReportView();
  const titleEl = document.getElementById('dailyModalTitle');
  if (titleEl) titleEl.textContent = 'Daily Task';
}

function dailySignIn() {
  dailySession.active = true;
  dailySession.startTime = new Date();

  document.getElementById('dailySigninWrap').classList.add('hidden');
  document.getElementById('dailyFormWrap').classList.remove('hidden');
  document.getElementById('dailySignOutBtn').classList.remove('hidden');

  // Show the mail icon now that a session is active
  const mailBtn = document.getElementById('dailyMailBtn');
  if (mailBtn) mailBtn.classList.remove('hidden');

  const float = document.getElementById('dailyStopwatchFloat');
  float.classList.remove('hidden');
  tickDailyStopwatch();
  dailySession.timerId = setInterval(tickDailyStopwatch, 1000);
}

// ─── Daily Task: Attachments (Choose Photo / Take Photo) ───────────────
let dailyAttachments = [];

function toggleDailyAttachMenu(evt) {
  if (evt) evt.stopPropagation();
  document.getElementById('dailyAttachMenu').classList.toggle('hidden');
}

document.addEventListener('click', (evt) => {
  const menu = document.getElementById('dailyAttachMenu');
  const trigger = document.getElementById('dailyAttachTrigger');
  if (!menu || menu.classList.contains('hidden')) return;
  if (evt.target === trigger || trigger.contains(evt.target)) return;
  if (!menu.contains(evt.target)) menu.classList.add('hidden');
});

function triggerDailyAttachChoose() {
  document.getElementById('dailyAttachMenu').classList.add('hidden');
  document.getElementById('dailyAttachChooseInput').click();
}

function triggerDailyAttachCamera() {
  document.getElementById('dailyAttachMenu').classList.add('hidden');
  document.getElementById('dailyAttachCameraInput').click();
}

// Resizes/compresses an image file in the browser before it's turned into
// base64. Camera photos can be 3-8MB each; sending several of those as JSON
// makes the upload request slow enough to hit the network timeout, which is
// why "one photo saves fine, several photos silently fail". Shrinking each
// photo to a reasonable max dimension + JPEG quality keeps the payload small
// so multiple attachments upload reliably.
function compressImageFile(file, maxDimension = 1600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Non-image files (shouldn't normally happen since input accepts
        // image/* only) fall back to the original data below.
        const outMime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outMime, quality);
        resolve({ dataUrl, mimeType: outMime });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function handleDailyAttachFiles(evt) {
  const files = Array.from(evt.target.files || []);
  evt.target.value = ''; // allow re-selecting the same file later

  files.forEach(file => {
    compressImageFile(file)
      .then(({ dataUrl, mimeType }) => {
        dailyAttachments.push({
          name: file.name,
          mimeType,
          data: dataUrl.split(',')[1],
          previewUrl: dataUrl
        });
        renderDailyAttachList();
      })
      .catch(() => {
        // Compression failed for some reason (corrupt file, unsupported
        // format) - fall back to the original uncompressed file rather
        // than silently dropping the attachment.
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          dailyAttachments.push({
            name: file.name,
            mimeType: file.type || 'image/jpeg',
            data: dataUrl.split(',')[1],
            previewUrl: dataUrl
          });
          renderDailyAttachList();
        };
        reader.readAsDataURL(file);
      });
  });
}

function removeDailyAttachment(index) {
  dailyAttachments.splice(index, 1);
  renderDailyAttachList();
}

function renderDailyAttachList() {
  const list = document.getElementById('dailyAttachList');
  list.innerHTML = dailyAttachments.map((att, i) => `
    <div class="daily-attach-thumb">
      <img src="${att.previewUrl}" alt="${escapeHtml(att.name)}">
      <button type="button" class="daily-attach-thumb-remove" onclick="removeDailyAttachment(${i})" title="Remove">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `).join('');
}

function tickDailyStopwatch() {
  if (!dailySession.startTime) return;
  const elapsedMs = Date.now() - dailySession.startTime.getTime();
  document.getElementById('dailyStopwatchText').textContent = formatElapsed(elapsedMs);
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDailyTimestamp(date) {
  if (!date) return '—';
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}-${mo}-${yy} ${hh}:${mi}:${ss}`;
}

async function dailySignOut() {
  const unit = document.getElementById('dailyUnit').value;
  const floor = document.getElementById('dailyFloor').value;
  const observationArea = document.getElementById('dailyObservation').value.trim();
  const priority = document.getElementById('dailyPriority').value;

  if (!unit || !floor || !observationArea || !priority) {
    showToast('Please fill in Unit, Floor, Observation Area, and Priority before signing out.', true);
    return;
  }

  const button = document.getElementById('dailySignOutBtn');
  button.disabled = true;
  button.title = 'Signing Out...';

  const signInTime = dailySession.startTime || new Date();
  const signOutTime = new Date();

  const payload = {
    action: 'dailyTask',
    unit,
    floor,
    observationArea,
    priority,
    signInTime: formatDailyTimestamp(signInTime),
    signOutTime: formatDailyTimestamp(signOutTime),
    duration: formatElapsed(signOutTime.getTime() - signInTime.getTime()),
    attachments: dailyAttachments.map(a => ({ name: a.name, mimeType: a.mimeType, data: a.data }))
  };

  try {
    const response = await serverCall('dailyTask', payload);
    if (response && response.ok === false) {
      throw new Error(response.message || 'Failed to save daily task.');
    }
    showToast('Daily task signed out and saved successfully.', false);
    resetDailySession();
    loadDailyStats();
    closeDailyModal();
  } catch (error) {
    showToast(error.message || 'Failed to save daily task. Please try again.', true);
    button.disabled = false;
    button.title = 'Sign Out';
  }
}

function fetchDailyStatsFromBackend() {
  if (window.google && google.script && google.script.run) {
    return new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getDailyStats());
  }
  return fetchJson(bustCache(`${WEB_APP_URL}?action=dailyStats`), {}, READ_REQUEST_TIMEOUT_MS);
}

async function loadDailyStats() {
  try {
    const stats = await fetchDailyStatsFromBackend();
    document.getElementById('dailyStatFactories').textContent =
      (stats && stats.factoriesVisited != null) ? stats.factoriesVisited : '0';
    document.getElementById('dailyStatTime').textContent =
      (stats && stats.totalTime) ? stats.totalTime : '00:00:00';
  } catch (err) {
    document.getElementById('dailyStatFactories').textContent = '-';
    document.getElementById('dailyStatTime').textContent = '-';
  }
}

function resetDailySession() {
  clearInterval(dailySession.timerId);
  dailySession.active = false;
  dailySession.startTime = null;
  dailySession.timerId = null;

  document.getElementById('dailyStopwatchFloat').classList.add('hidden');
  document.getElementById('dailyStopwatchText').textContent = '00:00:00';

  document.getElementById('dailyUnit').value = '';
  document.getElementById('dailyFloor').value = '';
  document.getElementById('dailyObservation').value = '';
  document.getElementById('dailyPriority').value = '';
  dailyAttachments = [];
  renderDailyAttachList();

  const button = document.getElementById('dailySignOutBtn');
  button.disabled = false;
  button.title = 'Sign Out';
  button.classList.add('hidden');

  // Hide the mail icon when session ends
  const mailBtn = document.getElementById('dailyMailBtn');
  if (mailBtn) mailBtn.classList.add('hidden');

  document.getElementById('dailyFormWrap').classList.add('hidden');
  document.getElementById('dailySigninWrap').classList.remove('hidden');
}

// ── Daily Task: full report view (filterable by date range + factory) ──
let allDailyTaskData = [], filteredDailyTaskData = [];

// Prefetch cache — mirrors the PDF/Report dashboard prefetch pattern so the
// Daily Tasks Dashboard table is (usually) already loaded by the time the
// user opens it, instead of showing "Loading…" every time.
let dailyTaskDataCache = null;
let dailyTaskDataPromise = null;
let dailyTaskDataCachedAt = 0;
const DAILY_TASK_PREFETCH_MAX_AGE_MS = 60000;

// Start fetching immediately while the main form is becoming interactive.
// Opening the dashboard reuses this promise/result instead of firing a
// fresh request. (Called right after the cache vars above are declared —
// calling it earlier in the file would throw "Cannot access before
// initialization" and silently break every button wired up after it.)
preloadDailyTaskData();

function preloadDailyTaskData() {
  fetchDailyTaskDataFromBackend().catch(() => { });
}

function fetchDailyTaskDataFromBackend(force = false) {
  const cacheIsFresh = Array.isArray(dailyTaskDataCache) &&
    (Date.now() - dailyTaskDataCachedAt) < DAILY_TASK_PREFETCH_MAX_AGE_MS;

  if (!force && cacheIsFresh) {
    return Promise.resolve(dailyTaskDataCache);
  }

  if (!force && dailyTaskDataPromise) {
    return dailyTaskDataPromise;
  }

  let request;
  if (window.google && google.script && google.script.run) {
    request = new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getDailyTaskData());
  } else {
    request = fetchJson(bustCache(`${WEB_APP_URL}?action=dailyTaskData`), {}, READ_REQUEST_TIMEOUT_MS);
  }

  dailyTaskDataPromise = request
    .then(data => {
      dailyTaskDataCache = Array.isArray(data) ? data : [];
      dailyTaskDataCachedAt = Date.now();
      return dailyTaskDataCache;
    })
    .catch(error => {
      dailyTaskDataPromise = null;
      throw error;
    });

  return dailyTaskDataPromise;
}

function openDailyReportView() {
  document.getElementById('dailyBodyMain').classList.add('hidden');
  document.getElementById('dailyReportView').classList.remove('hidden');
  document.querySelector('.daily-box').classList.add('is-report');
  loadDailyReportData();
}

function closeDailyReportView() {
  document.getElementById('dailyReportView').classList.add('hidden');
  document.getElementById('dailyBodyMain').classList.remove('hidden');
  document.querySelector('.daily-box').classList.remove('is-report');
  closeKpiDrill();
}

// Manual refresh only now — no background timer. Click the refresh button
// (or reopen the dashboard) to pull fresh data.
async function manualDailyReportRefresh() {
  const btn = document.getElementById('dailyRptRefreshBtn');
  if (btn) btn.classList.add('spinning');
  try {
    const data = await fetchDailyTaskDataFromBackend(true);
    allDailyTaskData = data;
    populateDailyReportFactoryFilter();
    applyDailyReportFilter();
  } catch (err) {
    // Keep whatever was already on screen; the button stopping its spin is
    // feedback enough that the click was registered.
  } finally {
    if (btn) setTimeout(() => btn.classList.remove('spinning'), 500);
  }
}

async function loadDailyReportData() {
  // Only show the loading state if nothing has been prefetched yet —
  // otherwise render instantly from cache while a fresh copy loads.
  if (!Array.isArray(dailyTaskDataCache)) {
    document.getElementById('dailyReportBody').innerHTML =
      '<tr><td colspan="12" style="text-align:center;padding:24px;color:#6b7280;">Loading\u2026</td></tr>';
  }
  try {
    allDailyTaskData = await fetchDailyTaskDataFromBackend();
    populateDailyReportFactoryFilter();
    initDailyReportDefaults();
    applyDailyReportFilter();
  } catch (err) {
    if (!Array.isArray(allDailyTaskData) || !allDailyTaskData.length) {
      document.getElementById('dailyReportBody').innerHTML =
        `<tr><td colspan="12" style="text-align:center;padding:24px;color:#b62626;">Failed to load: ${escapeHtml(err.message || 'Please try again.')}</td></tr>`;
    }
  }
}

function populateDailyReportFactoryFilter() {
  const sel = document.getElementById('dailyRptFactory');
  const cur = sel.value;
  const factories = [...new Set(allDailyTaskData.map(r => r.unit).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">All Factories</option>' +
    factories.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
  if (factories.includes(cur)) sel.value = cur;
}

function initDailyReportDefaults() {
  const today = formatLocalDate(new Date());
  document.getElementById('dailyRptFrom').value = today;
  document.getElementById('dailyRptTo').value = today;
  document.getElementById('dailyRptFactory').value = '';
}

function resetDailyReportFilter() {
  initDailyReportDefaults();
  applyDailyReportFilter();
}

function applyDailyReportFilter() {
  const from = document.getElementById('dailyRptFrom').value;
  const to = document.getElementById('dailyRptTo').value;
  const factory = document.getElementById('dailyRptFactory').value;

  filteredDailyTaskData = allDailyTaskData.filter(row => {
    if (factory && row.unit !== factory) return false;
    if (row.isoDate) {
      const d = new Date(row.isoDate);
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to + 'T23:59:59')) return false;
    }
    return true;
  }).sort((a, b) => (b.rowIndex || 0) - (a.rowIndex || 0)); // last-added task first

  renderDailyReportKpis();
  renderDailyReportTable();
}

function renderDailyReportKpis() {
  const total = filteredDailyTaskData.length;
  const factories = new Set(filteredDailyTaskData.map(r => r.unit).filter(Boolean)).size;
  const totalSeconds = filteredDailyTaskData.reduce((sum, r) => sum + parseDurationToSeconds(r.duration), 0);
  const pending = filteredDailyTaskData.filter(r => !r.actionDone).length;

  document.getElementById('dailyRptKpiTotal').textContent = total;
  document.getElementById('dailyRptKpiFactories').textContent = factories;
  document.getElementById('dailyRptKpiTime').textContent = formatElapsed(totalSeconds * 1000);
  document.getElementById('dailyRptKpiPending').textContent = pending;
}

// rowIndex -> { value, timerId } for remarks the user is currently typing
// but that haven't been confirmed-saved to the sheet yet. Used so the 15s
// background auto-refresh doesn't clobber in-progress typing.
let dailyRemarksPending = {};

function renderDailyReportTable() {
  const tbody = document.getElementById('dailyReportBody');

  // Preserve focus/cursor on a remarks input across the innerHTML rebuild
  // (background auto-refresh re-renders the whole table every 15s).
  const active = document.activeElement;
  let focusInfo = null;
  if (active && active.classList && active.classList.contains('daily-rpt-remarks-input') && tbody.contains(active)) {
    focusInfo = {
      rowIndex: active.dataset.row,
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd
    };
  }

  if (!filteredDailyTaskData.length) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:24px;color:#6b7280;">No records found.</td></tr>';
    return;
  }
  tbody.innerHTML = filteredDailyTaskData.map(row => {
    const p = (row.priority || '').toLowerCase();
    const attachmentsCell = (row.attachments && row.attachments.length)
      ? row.attachments.map((url, i) =>
        `<a href="${encodeURI(url)}" target="_blank" rel="noopener" class="daily-rpt-attach-link" title="Open attachment ${i + 1}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </a>`).join('')
      : '<span class="daily-rpt-attach-empty">-</span>';

    const remarksValue = dailyRemarksPending.hasOwnProperty(row.rowIndex)
      ? dailyRemarksPending[row.rowIndex].value
      : (row.remarks || '');
    const remarksCell = `<input type="text" class="daily-rpt-remarks-input" data-row="${row.rowIndex}"
        value="${escapeHtml(remarksValue)}" placeholder="Add remarks\u2026"
        oninput="onDailyRemarksInput(this, ${row.rowIndex})"
        onblur="flushDailyRemarks(${row.rowIndex})">`;

    const actionCell = `<input type="checkbox" class="daily-rpt-action-checkbox"
        ${row.actionDone ? 'checked disabled' : ''}
        onchange="markDailyAction(this, ${row.rowIndex})" title="Mark as actioned / solved">`;

    const tsCell = `<span class="daily-rpt-action-ts" data-row="${row.rowIndex}">${escapeHtml(row.actionTimestamp || '-')}</span>`;

    return `<tr>
      <td>${escapeHtml(row.date || '-')}</td>
      <td>${escapeHtml(row.unit || '-')}</td>
      <td>${escapeHtml(row.floor || '-')}</td>
      <td>${escapeHtml(row.observationArea || '-')}</td>
      <td><span class="daily-priority-badge daily-priority-${p}">${escapeHtml(row.priority || '-')}</span></td>
      <td>${escapeHtml(row.signInTime || '-')}</td>
      <td>${escapeHtml(row.signOutTime || '-')}</td>
      <td>${escapeHtml(row.duration || '-')}</td>
      <td class="daily-rpt-attach-cell">${attachmentsCell}</td>
      <td class="daily-rpt-remarks-cell">${remarksCell}</td>
      <td class="daily-rpt-action-cell">${actionCell}</td>
      <td class="daily-rpt-ts-cell">${tsCell}</td>
    </tr>`;
  }).join('');

  if (focusInfo) {
    const el = tbody.querySelector(`.daily-rpt-remarks-input[data-row="${focusInfo.rowIndex}"]`);
    if (el) {
      el.focus();
      try { el.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd); } catch (err) { /* ignore */ }
    }
  }
}

// Debounced autosave while typing remarks.
function onDailyRemarksInput(el, rowIndex) {
  const value = el.value;
  const pending = dailyRemarksPending[rowIndex] || {};
  pending.value = value;
  clearTimeout(pending.timerId);
  pending.timerId = setTimeout(() => saveDailyRemarks(rowIndex, value), 900);
  dailyRemarksPending[rowIndex] = pending;
}

// Saves immediately on blur (e.g. user tabs/clicks away) instead of waiting
// for the debounce timer.
function flushDailyRemarks(rowIndex) {
  const pending = dailyRemarksPending[rowIndex];
  if (!pending) return;
  clearTimeout(pending.timerId);
  saveDailyRemarks(rowIndex, pending.value);
}

async function saveDailyRemarks(rowIndex, value) {
  try {
    await serverCall('dailyTaskUpdate', { action: 'dailyTaskUpdate', rowIndex, remarks: value });
    allDailyTaskData.forEach(r => { if (r.rowIndex === rowIndex) r.remarks = value; });
    filteredDailyTaskData.forEach(r => { if (r.rowIndex === rowIndex) r.remarks = value; });
    delete dailyRemarksPending[rowIndex];
  } catch (err) {
    showToast('Failed to save remarks. Please try again.', true);
  }
}

// Action tickbox: one-directional (matches Report Dashboard's "mark done"
// pattern) — once ticked it's saved, stamped, and locked.
function markDailyAction(cb, rowIndex) {
  cb.disabled = true;
  const tr = cb.closest('tr');

  serverCall('dailyTaskUpdate', { action: 'dailyTaskUpdate', rowIndex, actionDone: true })
    .then(response => {
      if (response && response.ok === false) throw new Error(response.message || 'Failed to update.');
      const ts = (response && response.result && response.result.actionTimestamp) || '';
      if (tr) {
        const tsEl = tr.querySelector('.daily-rpt-action-ts');
        if (tsEl) tsEl.textContent = ts || '-';
      }
      allDailyTaskData.forEach(r => { if (r.rowIndex === rowIndex) { r.actionDone = true; r.actionTimestamp = ts; } });
      filteredDailyTaskData.forEach(r => { if (r.rowIndex === rowIndex) { r.actionDone = true; r.actionTimestamp = ts; } });
      renderDailyReportKpis();
      showToast('Marked as actioned.', false);
    })
    .catch(() => {
      cb.checked = false;
      cb.disabled = false;
      showToast('Failed to update. Please try again.', true);
    });
}

// ── Audit Report Dashboard — KPI drill-down (click a KPI card to see its data) ──
function rptStatusBadge(row, today) {
  const isComplete = row.status === 'Complete';
  const isPending = !isComplete;
  if (isPending && row.isoDate) {
    const d = new Date(row.isoDate); d.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.round((today - d) / 86400000));
    const lbl = days === 0 ? 'Pending, audited today.'
      : days === 1 ? 'Pending, 1 day has elapsed since the audit date.'
        : `Pending, ${days} days have elapsed since the audit date.`;
    return `<span class="rpt-badge rpt-badge-pending">${escapeHtml(lbl)}</span>`;
  } else if (isComplete) {
    return `<span class="rpt-badge rpt-badge-complete">Complete</span>`;
  }
  return `<span class="rpt-badge rpt-badge-default">${escapeHtml(row.status || '-')}</span>`;
}

function openRptKpiDrill(kind) {
  const modal = document.getElementById('kpiDrillModal');
  const titleEl = document.getElementById('kpiDrillTitle');
  const thead = document.getElementById('kpiDrillHead');
  const tbody = document.getElementById('kpiDrillBody');
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let title = '', headerHtml = '', bodyHtml = '', rows = [];

  if (kind === 'total') {
    rows = filteredRptData;
    title = `Total Records — ${rows.length}`;
  } else if (kind === 'pending') {
    rows = filteredRptData.filter(r => r.status !== 'Complete');
    title = `Pending — ${rows.length}`;
  } else if (kind === 'complete') {
    rows = filteredRptData.filter(r => r.status === 'Complete');
    title = `Complete — ${rows.length}`;
  } else if (kind === 'elapsed') {
    // The KPI shows pending-as-% of total, so the underlying rows behind
    // it are the same pending set, sorted by days elapsed (most stale first).
    rows = filteredRptData
      .filter(r => r.status !== 'Complete' && r.isoDate)
      .sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
    const total = filteredRptData.length;
    const pct = total > 0 ? Math.round((rows.length / total) * 100) + '%' : '-';
    title = `Today Elapsed (Avg ${pct}) — ${rows.length} pending`;
  }

  headerHtml = '<tr><th>Audit Date</th><th>Unit</th><th>Location</th><th>Remarks</th><th>Status</th><th>Actual Date</th></tr>';
  bodyHtml = rows.length
    ? rows.map(r => `<tr>
        <td>${escapeHtml(r.auditDate || '-')}</td>
        <td>${escapeHtml(r.unit || '-')}</td>
        <td>${escapeHtml(r.location || '-')}</td>
        <td>${escapeHtml(r.remarks || '-')}</td>
        <td>${rptStatusBadge(r, today)}</td>
        <td>${escapeHtml(r.actualDate || '-')}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7280;">No records.</td></tr>';

  titleEl.textContent = title;
  thead.innerHTML = headerHtml;
  tbody.innerHTML = bodyHtml;
  modal.classList.remove('hidden');
}

// ── Daily Task Report — KPI drill-down (click a KPI card to see its data) ──
function openDailyKpiDrill(kind) {
  const modal = document.getElementById('kpiDrillModal');
  const titleEl = document.getElementById('kpiDrillTitle');
  const thead = document.getElementById('kpiDrillHead');
  const tbody = document.getElementById('kpiDrillBody');

  let title = '', headerHtml = '', bodyHtml = '';

  if (kind === 'total') {
    title = `Total Visits — ${filteredDailyTaskData.length}`;
    headerHtml = '<tr><th>Date</th><th>Unit</th><th>Floor</th><th>Observation Area</th><th>Priority</th><th>Duration</th></tr>';
    bodyHtml = filteredDailyTaskData.length
      ? filteredDailyTaskData.map(r => `<tr>
          <td>${escapeHtml(r.date || '-')}</td>
          <td>${escapeHtml(r.unit || '-')}</td>
          <td>${escapeHtml(r.floor || '-')}</td>
          <td>${escapeHtml(r.observationArea || '-')}</td>
          <td><span class="daily-priority-badge daily-priority-${(r.priority || '').toLowerCase()}">${escapeHtml(r.priority || '-')}</span></td>
          <td>${escapeHtml(r.duration || '-')}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7280;">No records.</td></tr>';

  } else if (kind === 'factories') {
    const map = {};
    filteredDailyTaskData.forEach(r => {
      const key = r.unit || 'Unknown';
      if (!map[key]) map[key] = { visits: 0, seconds: 0 };
      map[key].visits += 1;
      map[key].seconds += parseDurationToSeconds(r.duration);
    });
    const factoryRows = Object.keys(map).sort().map(k => ({
      unit: k,
      visits: map[k].visits,
      time: formatElapsed(map[k].seconds * 1000)
    }));
    title = `Factories Visited — ${factoryRows.length}`;
    headerHtml = '<tr><th>Factory</th><th>Visits</th><th>Total Time</th></tr>';
    bodyHtml = factoryRows.length
      ? factoryRows.map(f => `<tr>
          <td>${escapeHtml(f.unit)}</td>
          <td>${f.visits}</td>
          <td>${escapeHtml(f.time)}</td>
        </tr>`).join('')
      : '<tr><td colspan="3" style="text-align:center;padding:20px;color:#6b7280;">No records.</td></tr>';

  } else if (kind === 'time') {
    const totalSeconds = filteredDailyTaskData.reduce((sum, r) => sum + parseDurationToSeconds(r.duration), 0);
    title = `Total Time — ${formatElapsed(totalSeconds * 1000)}`;
    headerHtml = '<tr><th>Date</th><th>Unit</th><th>Sign In</th><th>Sign Out</th><th>Duration</th></tr>';
    const sorted = [...filteredDailyTaskData].sort((a, b) => parseDurationToSeconds(b.duration) - parseDurationToSeconds(a.duration));
    bodyHtml = sorted.length
      ? sorted.map(r => `<tr>
          <td>${escapeHtml(r.date || '-')}</td>
          <td>${escapeHtml(r.unit || '-')}</td>
          <td>${escapeHtml(r.signInTime || '-')}</td>
          <td>${escapeHtml(r.signOutTime || '-')}</td>
          <td>${escapeHtml(r.duration || '-')}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7280;">No records.</td></tr>';

  } else if (kind === 'pending') {
    const pendingRows = filteredDailyTaskData.filter(r => !r.actionDone);
    title = `Action Pending — ${pendingRows.length}`;
    headerHtml = '<tr><th>Date</th><th>Unit</th><th>Floor</th><th>Observation Area</th><th>Priority</th><th>Remarks</th></tr>';
    bodyHtml = pendingRows.length
      ? pendingRows.map(r => `<tr>
          <td>${escapeHtml(r.date || '-')}</td>
          <td>${escapeHtml(r.unit || '-')}</td>
          <td>${escapeHtml(r.floor || '-')}</td>
          <td>${escapeHtml(r.observationArea || '-')}</td>
          <td><span class="daily-priority-badge daily-priority-${(r.priority || '').toLowerCase()}">${escapeHtml(r.priority || '-')}</span></td>
          <td>${escapeHtml(r.remarks || '-')}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7280;">Nothing pending.</td></tr>';
  }

  titleEl.textContent = title;
  thead.innerHTML = headerHtml;
  tbody.innerHTML = bodyHtml;
  modal.classList.remove('hidden');
}

function closeKpiDrill() {
  document.getElementById('kpiDrillModal').classList.add('hidden');
}

function parseDurationToSeconds(duration) {
  const parts = String(duration || '').split(':').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

// ─── Daily Task Report — Excel (.xlsx) export ──────────────────────────
function downloadDailyReportExcel() {
  if (!filteredDailyTaskData.length) { showToast('No data to export.', true); return; }

  const header = ['Date', 'Unit', 'Floor', 'Observation Area', 'Priority', 'Sign In', 'Sign Out', 'Duration', 'Attachments', 'Remarks', 'Action', 'Timestamp'];
  const rows = filteredDailyTaskData.map(r => [
    r.date || '',
    r.unit || '',
    r.floor || '',
    r.observationArea || '',
    r.priority || '',
    r.signInTime || '',
    r.signOutTime || '',
    r.duration || '',
    (r.attachments && r.attachments.length) ? r.attachments.join('\n') : '',
    r.remarks || '',
    r.actionDone ? 'Done' : 'Pending',
    r.actionTimestamp || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 36 },
    { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 40 },
    { wch: 30 }, { wch: 10 }, { wch: 22 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Task Report');

  const stamp = formatLocalDate(new Date());
  XLSX.writeFile(wb, `Daily_Task_Report_${stamp}.xlsx`);
}

// ─── Daily Task Report — PDF export (IBM Plex Sans) ────────────────────
function downloadDailyReportPdf() {
  if (!filteredDailyTaskData.length) { showToast('No data to export.', true); return; }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('PDF library failed to load. Check your connection and try again.', true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  if (window.registerIbmPlexFont) window.registerIbmPlexFont(doc);
  const fontName = window.registerIbmPlexFont ? 'IBMPlexSans' : 'helvetica';
  doc.setFont(fontName, 'normal');

  doc.setFontSize(15);
  doc.setTextColor(20, 30, 40);
  doc.text('Daily Task Report', 40, 36);

  doc.setFontSize(9);
  doc.setTextColor(110, 120, 130);
  doc.text(`Generated: ${formatDailyTimestamp(new Date())}`, 40, 52);

  const from = document.getElementById('dailyRptFrom').value;
  const to = document.getElementById('dailyRptTo').value;
  const factory = document.getElementById('dailyRptFactory').value || 'All Factories';
  doc.text(`Range: ${from || '-'} to ${to || '-'}   |   Factory: ${factory}`, 40, 64);

  doc.autoTable({
    head: [['Date', 'Unit', 'Floor', 'Observation Area', 'Priority', 'Sign In', 'Sign Out', 'Duration', 'Attach.', 'Remarks', 'Action', 'Timestamp']],
    body: filteredDailyTaskData.map(r => [
      r.date || '-',
      r.unit || '-',
      r.floor || '-',
      r.observationArea || '-',
      r.priority || '-',
      r.signInTime || '-',
      r.signOutTime || '-',
      r.duration || '-',
      (r.attachments && r.attachments.length) ? String(r.attachments.length) : '-',
      r.remarks || '-',
      r.actionDone ? 'Done' : 'Pending',
      r.actionTimestamp || '-'
    ]),
    startY: 76,
    styles: {
      font: fontName,
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [30, 40, 50],
      lineColor: [225, 229, 233],
      lineWidth: 0.5
    },
    headStyles: {
      font: fontName,
      fontStyle: 'bold',
      fillColor: [13, 148, 136],
      textColor: 255,
      fontSize: 8.5
    },
    alternateRowStyles: { fillColor: [246, 248, 247] },
    margin: { left: 40, right: 40 }
  });

  const stamp = formatLocalDate(new Date());
  doc.save(`Daily_Task_Report_${stamp}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────
// ✉  OBSERVATION MAIL FEATURE
// ─────────────────────────────────────────────────────────────────────────

// Mail is always sent server-side (GmailApp) from whichever Google account
// this Apps Script project itself runs under — no alias/from configuration
// needed. The actual address is fetched from the server (see
// getSendingAddress() in Code.gs) and shown in the "From" field below.

// Cached recipient list + sending address so re-opening the compose card
// doesn't re-fetch every time. Cleared on load failure so the next open retries.
let mailRecipientsCache = null;
let mailFromAddressCache = '';

async function loadMailRecipients(force = false) {
  if (mailRecipientsCache && !force) return mailRecipientsCache;
  try {
    const data = await fetchJson(bustCache(`${WEB_APP_URL}?action=mailRecipients`), {}, READ_REQUEST_TIMEOUT_MS);
    mailRecipientsCache = (data && data.emails) || [];
    mailFromAddressCache = (data && data.fromAddress) || '';
  } catch (error) {
    console.error('Could not load mail recipients:', error);
    mailRecipientsCache = null;
  }
  return mailRecipientsCache;
}

// ── To / CC multi-select dropdown ──────────────────────────────────────
// Replaces the old single-select <select> so multiple recipients can be
// picked for both To and CC. Selected addresses are kept in these arrays
// and joined with commas when the mail is actually sent.
let mailToSelected = [];
let mailCcSelected = [];

function getMailSelectedArray(kind) {
  return kind === 'cc' ? mailCcSelected : mailToSelected;
}

function renderRecipientPanel(kind) {
  const panel = document.getElementById(kind === 'cc' ? 'mailCcPanel' : 'mailToPanel');
  if (!panel) return;
  const emails = mailRecipientsCache || [];
  const selected = getMailSelectedArray(kind);

  if (!emails.length) {
    panel.innerHTML = `<div class="mail-multiselect-empty">No recipients found in DROPDOWN sheet</div>`;
    return;
  }

  panel.innerHTML = emails.map(email => {
    const checked = selected.includes(email) ? 'checked' : '';
    const safe = escapeHtml(email);
    return `
      <label class="mail-multiselect-option">
        <input type="checkbox" ${checked} onchange="toggleRecipientChoice('${kind}', '${safe.replace(/'/g, "\\'")}')">
        <span>${safe}</span>
      </label>`;
  }).join('');
}

function updateRecipientChips(kind) {
  const chipsEl = document.getElementById(kind === 'cc' ? 'mailCcChips' : 'mailToChips');
  if (!chipsEl) return;
  const selected = getMailSelectedArray(kind);
  if (!selected.length) {
    chipsEl.textContent = kind === 'cc' ? 'None (optional)' : 'Select recipient(s)…';
    return;
  }
  chipsEl.textContent = selected.join(', ');
}

function toggleRecipientChoice(kind, email) {
  const arr = getMailSelectedArray(kind);
  const idx = arr.indexOf(email);
  if (idx === -1) {
    arr.push(email);
  } else {
    arr.splice(idx, 1);
  }
  updateRecipientChips(kind);
}

function toggleRecipientDropdown(kind) {
  const openId = kind === 'cc' ? 'mailCcPanel' : 'mailToPanel';
  const otherId = kind === 'cc' ? 'mailToPanel' : 'mailCcPanel';
  const openPanel = document.getElementById(openId);
  const otherPanel = document.getElementById(otherId);
  if (!openPanel) return;

  const willOpen = openPanel.classList.contains('hidden');
  if (otherPanel) otherPanel.classList.add('hidden');
  openPanel.classList.toggle('hidden', !willOpen);
}

// Close any open recipient dropdown when clicking outside of it.
document.addEventListener('click', (event) => {
  const toBox = document.getElementById('mailToMultiselect');
  const ccBox = document.getElementById('mailCcMultiselect');
  if (toBox && !toBox.contains(event.target)) {
    document.getElementById('mailToPanel')?.classList.add('hidden');
  }
  if (ccBox && !ccBox.contains(event.target)) {
    document.getElementById('mailCcPanel')?.classList.add('hidden');
  }
});

function populateMailMultiselect(kind) {
  renderRecipientPanel(kind);
  updateRecipientChips(kind);
}

function openMailConfirm() {
  document.getElementById('mailConfirmOverlay').classList.remove('hidden');
}

function closeMailConfirm() {
  document.getElementById('mailConfirmOverlay').classList.add('hidden');
}

// Company logo shown in the mailed observation's header. Same asset as
// FIRE_AUDIT_CONFIG.LOGO_FALLBACK_URL in Code.gs — hardcoded here too since
// this file can't read server-side constants, and it needs to be a public,
// always-reachable URL for it to render in the recipient's inbox.
const MAIL_LOGO_URL = 'https://res.cloudinary.com/dsvyn62lc/image/upload/q_auto/v1776405935/trio_group_logo-removebg-preview_ymc7fs.png';

async function openMailCompose() {
  closeMailConfirm();

  // ── Gather current observation data ──────────────────────────────────
  const unit = document.getElementById('dailyUnit')?.value || '';
  const floor = document.getElementById('dailyFloor')?.value || '';
  const observationArea = document.getElementById('dailyObservation')?.value?.trim() || '';
  const priority = document.getElementById('dailyPriority')?.value || '';
  const now = new Date();
  const dateStr = formatDailyTimestamp(now);

  // ── Auto Subject ──────────────────────────────────────────────────────
  const dateForSubject = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const subject = `Fire Audit Observation – ${unit ? unit + ', ' : ''}${dateForSubject}`;
  document.getElementById('mailSubjectInput').value = subject;

  // ── Priority badge (fully inline-styled — must survive being emailed) ─
  const priorityColors = {
    High: { bg: '#fde7e9', fg: '#a4262c', dot: '#d13438' },
    Medium: { bg: '#fff4ce', fg: '#7a5c00', dot: '#ffb900' },
    Low: { bg: '#dff6dd', fg: '#107c10', dot: '#107c10' }
  };
  const pc = priorityColors[priority] || { bg: '#f3f2f1', fg: '#605e5c', dot: '#a19f9d' };
  const priorityHtml = priority
    ? `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${pc.bg};color:${pc.fg};">
         <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${pc.dot};margin-right:6px;vertical-align:middle;"></span>${priority}
       </span>`
    : '<span style="color:#9ca3af;">—</span>';

  // Builds/rebuilds the HTML + plain-text body.
  //
  // IMPORTANT: every style below is inline (style="...") on purpose — this
  // HTML is sent as-is inside the actual email via GmailApp. Email clients
  // (Gmail, Outlook, mobile mail apps) ignore external/site stylesheets, so
  // classes from style.css would render as plain unstyled text for the
  // recipient. Inline styles are the only way the colors/layout survive.
  function renderMailBody() {
    const observationHtml = observationArea
      ? escapeHtml(observationArea).replace(/\n/g, '<br>')
      : '<em style="opacity:0.65">No observation entered yet.</em>';

    document.getElementById('mailBodyContent').innerHTML = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;font-family:'Segoe UI',Calibri,Arial,sans-serif;background:#ffffff;border:1px solid #d1d1d1;">
        <tr>
          <td style="background:#0078D4;padding:18px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="width:52px;vertical-align:middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;width:44px;height:44px;">
                    <tr>
                      <td align="center" valign="middle" style="width:44px;height:44px;">
                        <img src="${MAIL_LOGO_URL}" alt="Trio Group" width="30" height="30" style="display:block;width:30px;height:30px;object-fit:contain;">
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:middle;padding-left:14px;text-align:left;">
                  <div style="color:#ffffff;font-size:17px;font-weight:600;letter-spacing:.1px;">Fire Safety Audit Observation</div>
                  <div style="color:#deecfb;font-size:11.5px;font-weight:400;letter-spacing:.3px;margin-top:3px;">Trio Group &middot; Fire Audit System</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#faf9f8;border-top:3px solid #0078D4;padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:26px 26px 22px;">
                  <p style="font-size:14.5px;font-weight:600;color:#201f1e;margin:0 0 12px;">Dear All,</p>
                  <p style="font-size:13.5px;color:#3b3a39;line-height:1.7;margin:0 0 20px;">
                    Please find below the fire safety observation recorded during today&rsquo;s floor round.
                  </p>

                  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e1dfdd;margin-bottom:20px;background:#ffffff;">
                    <tr style="background:#f3f2f1;">
                      <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#605e5c;width:130px;border-bottom:1px solid #e1dfdd;">Date &amp; Time</td>
                      <td style="padding:10px 14px;font-size:13px;color:#201f1e;border-bottom:1px solid #e1dfdd;">${dateStr}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#605e5c;border-bottom:1px solid #e1dfdd;">Unit / Factory</td>
                      <td style="padding:10px 14px;font-size:13px;color:#201f1e;border-bottom:1px solid #e1dfdd;">${unit || '—'}</td>
                    </tr>
                    <tr style="background:#f3f2f1;">
                      <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#605e5c;border-bottom:1px solid #e1dfdd;">Floor</td>
                      <td style="padding:10px 14px;font-size:13px;color:#201f1e;border-bottom:1px solid #e1dfdd;">${floor || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#605e5c;">Priority</td>
                      <td style="padding:10px 14px;">${priorityHtml}</td>
                    </tr>
                  </table>

                  <p style="font-size:11.5px;font-weight:600;color:#0078D4;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px;">Observation</p>
                  <div style="background:#ffffff;border:1px solid #e1dfdd;border-left:3px solid #0078D4;padding:14px 16px;font-size:13.5px;color:#201f1e;line-height:1.7;margin-bottom:22px;">
                    ${observationHtml}
                  </div>

                  <p style="font-size:13px;color:#3b3a39;line-height:1.6;margin:0 0 24px;">
                    Kindly take the necessary corrective action at the earliest.
                  </p>

                  <div style="border-top:1px solid #e1dfdd;padding-top:16px;font-size:12.5px;color:#605e5c;line-height:1.75;">
                    Thanks &amp; Regards,<br>
                    <strong style="color:#0078D4;font-size:13px;">Fire Audit System</strong><br>
                    Trio Group
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    // Plain-text version of the same body, kept in sync for the actual send
    // (GmailApp needs a text fallback alongside the HTML body).
    const bodyLines = [
      'Dear All,',
      '',
      "Please find below the fire safety observation recorded during today's floor round.",
      '',
      `Date & Time    : ${dateStr}`,
      `Unit / Factory : ${unit || '—'}`,
      `Floor          : ${floor || '—'}`,
      `Priority       : ${priority || '—'}`,
      '',
      'Observation:',
      observationArea || '(none)',
      '',
      'Kindly take the necessary corrective action at the earliest.',
      '',
      'Thanks & Regards,',
      'Fire Audit System',
      'Trio Group'
    ];
    currentMailData = {
      subject,
      plainBody: bodyLines.join('\n'),
      htmlBody: document.getElementById('mailBodyContent').innerHTML
    };
  }

  renderMailBody();

  // ── To / CC recipient multi-selects (from DROPDOWN sheet, column C) ───
  mailToSelected = [];
  mailCcSelected = [];
  document.getElementById('mailToPanel')?.classList.add('hidden');
  document.getElementById('mailCcPanel')?.classList.add('hidden');
  populateMailMultiselect('to');
  populateMailMultiselect('cc');

  // ── Show compose overlay right away; recipients fill in once loaded ───
  document.getElementById('mailComposeOverlay').classList.remove('hidden');

  loadMailRecipients().then(() => {
    populateMailMultiselect('to');
    populateMailMultiselect('cc');
  });
}

function closeMailCompose() {
  document.getElementById('mailComposeOverlay').classList.add('hidden');
}

// Holds the composed subject/body between openMailCompose() and send, so the
// send doesn't have to re-scrape the (readonly) DOM.
let currentMailData = { subject: '', plainBody: '', htmlBody: '' };

async function sendObservationMail() {
  const to = mailToSelected.join(',');
  const cc = mailCcSelected.join(',');
  const subject = document.getElementById('mailSubjectInput')?.value?.trim() || currentMailData.subject;

  if (!mailToSelected.length) {
    showToast('Please select at least one recipient (To) before sending.', true);
    return;
  }

  const sendBtn = document.getElementById('mailSendBtn');
  const originalLabel = sendBtn ? sendBtn.innerHTML : '';
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Sending…`;
  }

  try {
    // Reuse whatever photos are currently attached to this Daily Task entry
    // (dailyAttachments — see "Daily Task: Attachments" above) as the mail's
    // actual file attachments.
    const attachments = dailyAttachments.map(a => ({
      name: a.name,
      mimeType: a.mimeType,
      data: a.data
    }));

    const response = await serverCall('sendObservationMail', {
      action: 'sendObservationMail',
      to,
      cc,
      subject,
      body: currentMailData.plainBody,
      htmlBody: currentMailData.htmlBody,
      attachments
    });

    if (response && response.ok === false) {
      throw new Error(response.message || 'Failed to send mail.');
    }

    showToast(`Mail sent to ${mailToSelected.join(', ')}${mailCcSelected.length ? ' (cc: ' + mailCcSelected.join(', ') + ')' : ''}.`);
    closeMailCompose();
  } catch (error) {
    console.error('Failed to send observation mail:', error);
    showToast(`Could not send mail: ${error.message || error}`, true);
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove('sending');
      sendBtn.innerHTML = originalLabel;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AMC (ANNUAL MAINTENANCE CONTRACT) FRONTEND LOGIC
// ─────────────────────────────────────────────────────────────────────────────

let allAmcData = [];
let currentAmcCategory = '';
let amcFilesSelected = [];
let amcDataPromise = null;
let amcDataCache = null;
let amcDataCachedAt = 0;
const AMC_PREFETCH_MAX_AGE_MS = 60000;

preloadAmcData();

function preloadAmcData() {
  fetchAmcDataFromBackend().catch(() => { });
}

function fetchAmcDataFromBackend(force = false) {
  const cacheIsFresh = Array.isArray(amcDataCache) && (Date.now() - amcDataCachedAt) < AMC_PREFETCH_MAX_AGE_MS;
  if (!force && cacheIsFresh) {
    return Promise.resolve(amcDataCache);
  }
  if (!force && amcDataPromise) {
    return amcDataPromise;
  }

  let request;
  if (window.google && google.script && google.script.run) {
    request = new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getAmcData());
  } else {
    request = fetchJson(bustCache(`${WEB_APP_URL}?action=amcData`), {}, READ_REQUEST_TIMEOUT_MS);
  }

  amcDataPromise = request
    .then(data => {
      amcDataCache = Array.isArray(data) ? data : [];
      amcDataCachedAt = Date.now();
      return amcDataCache;
    })
    .catch(error => {
      amcDataPromise = null;
      throw error;
    });

  return amcDataPromise;
}

async function loadAmcData(force = false) {
  try {
    const data = await fetchAmcDataFromBackend(force);
    allAmcData = Array.isArray(data) ? data : [];
    updateAmcOverviewBadges();
    updateAmcAlertBanner();
    if (currentAmcCategory) {
      renderAmcTable();
    }
  } catch (err) {
    console.error('Error loading AMC data:', err);
    showToast(`Could not load AMC records: ${err.message || err}`, true);
  }
}

function refreshAmcData() {
  loadAmcData(true).then(() => showToast('AMC records refreshed.'));
}

// ── AMC date display helper ──────────────────────────────────────────────────
// Converts a yyyy-mm-dd string from the backend to dd-mm-yyyy for display.
// Returns '—' for falsy input so callers don't need to guard themselves.
function fmtAMCDate(dateStr) {
  if (!dateStr) return '—';
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return '—';
    const dd = String(dateStr.getDate()).padStart(2, '0');
    const mm = String(dateStr.getMonth() + 1).padStart(2, '0');
    const yyyy = dateStr.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  const str = String(dateStr).trim();
  if (!str || str === '-' || str === '—') return '—';
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${d}-${m}-${y}`;
  }
  const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${d}-${m}-${y}`;
  }
  return str;
}

// ── AMC contract cost display helper ─────────────────────────────────────────
// Formats a contract cost value (₹, Indian grouping) for display.
// Returns '—' for blank/null/undefined so callers don't need to guard.
function fmtAmcCost(cost) {
  if (cost === '' || cost === null || cost === undefined || isNaN(Number(cost))) return '—';
  return `₹${Number(cost).toLocaleString('en-IN')}`;
}

// Mirrors AMC_FREQUENCY_DAYS in Code.gs — used only for the live client-side
// suggestion; the backend recalculates authoritatively on save either way.
const AMC_FREQUENCY_DAYS_JS = { 'Monthly': 30, 'Quarterly': 91, 'Half-Yearly': 182, 'Annual': 365 };

function amcCalcNextDueDate(fromDateStr, frequency) {
  const intervalDays = AMC_FREQUENCY_DAYS_JS[frequency];
  if (!intervalDays || !fromDateStr) return '';
  const d = new Date(fromDateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().slice(0, 10);
}

// ── Live status preview (mirrors amcContractStatus / amcServiceStatus /
// amcCombineStatus in Code.gs) — Status is NOT a field anyone fills in
// anymore; it's always derived from the dates, so the form just shows a
// read-only preview that updates as the person types.
const AMC_CONTRACT_WARN_DAYS_JS = 30;
const AMC_SERVICE_WARN_DAYS_JS = 7;

function amcDaysFromTodayJs(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const t = new Date(today);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function amcComputeStatusPreview({ expiryDate, nextDueDate, lastServiceDate, startDate, frequency }) {
  const effectiveNextDue = nextDueDate || amcCalcNextDueDate(lastServiceDate || startDate, frequency);

  let contractStatus = 'Active';
  let contractDays = null;
  if (expiryDate) {
    contractDays = amcDaysFromTodayJs(expiryDate);
    if (contractDays < 0) contractStatus = 'Expired';
    else if (contractDays <= AMC_CONTRACT_WARN_DAYS_JS) contractStatus = 'Expiring Soon';
  }

  let serviceStatus = 'Not Scheduled';
  let serviceDays = null;
  if (frequency !== 'On-Call' && effectiveNextDue) {
    serviceDays = amcDaysFromTodayJs(effectiveNextDue);
    if (serviceDays < 0) serviceStatus = 'Overdue';
    else if (serviceDays <= AMC_SERVICE_WARN_DAYS_JS) serviceStatus = 'Due Soon';
    else serviceStatus = 'On Track';
  }

  let overall = 'Active';
  let detail = expiryDate
    ? 'Contract and servicing are both on track.'
    : 'Add a Contract Expiry Date to see a live status.';

  if (contractStatus === 'Expired') { overall = 'Expired'; detail = `Contract expired ${Math.abs(contractDays)}d ago.`; }
  else if (serviceStatus === 'Overdue') { overall = 'Service Overdue'; detail = `Service visit overdue by ${Math.abs(serviceDays)}d.`; }
  else if (contractStatus === 'Expiring Soon') { overall = 'Expiring Soon'; detail = `Contract expires in ${contractDays}d.`; }
  else if (serviceStatus === 'Due Soon') { overall = 'Service Due Soon'; detail = `Next service due in ${serviceDays}d.`; }

  return { overall, detail, effectiveNextDue };
}

function updateAmcStatusPreview() {
  const el = document.getElementById('amcStatusPreview');
  if (!el) return;

  const expiryDate = document.getElementById('amcFormExpiryDate')?.value || '';
  const startDate = document.getElementById('amcFormStartDate')?.value || '';
  const frequency = document.getElementById('amcFormFrequency')?.value || 'Annual';
  const lastServiceDate = document.getElementById('amcFormLastService')?.value || '';
  const nextDueDate = document.getElementById('amcFormNextDue')?.value || '';

  const { overall, detail } = amcComputeStatusPreview({ expiryDate, nextDueDate, lastServiceDate, startDate, frequency });

  const statusClass =
    (overall === 'Expired' || overall === 'Service Overdue') ? 'status-expired' :
      (overall === 'Expiring Soon' || overall === 'Service Due Soon') ? 'status-expiring' :
        overall === 'Active' ? 'status-active' : 'status-pending';

  el.innerHTML = `<span class="amc-status-pill ${statusClass}">${escapeHtml(overall)}</span><span class="amc-status-preview-text">${escapeHtml(detail)}</span>`;
}

const AMC_CATEGORY_MAP = {
  'Generator': 'amcBadgeGenerator',
  'Fire': 'amcBadgeFire',
  'Lift': 'amcBadgeLift',
  'Air Condition': 'amcBadgeAirCondition',
  'Water Filter': 'amcBadgeWaterFilter',
  'CCTV Camera': 'amcBadgeCCTVCamera',
  'Sound System & intercom': 'amcBadgeSoundSystem',
  'Solar Panel Maintenance': 'amcBadgeSolarPanel'
};

function updateAmcOverviewBadges() {
  const counts = {};
  Object.keys(AMC_CATEGORY_MAP).forEach(k => counts[k] = { total: 0, expired: 0, serviceOverdue: 0, expiring: 0, serviceDue: 0 });

  allAmcData.forEach(r => {
    const cat = r.category;
    if (counts[cat]) {
      counts[cat].total++;
      if (r.status === 'Expired') counts[cat].expired++;
      else if (r.status === 'Service Overdue') counts[cat].serviceOverdue++;
      else if (r.status === 'Expiring Soon') counts[cat].expiring++;
      else if (r.status === 'Service Due Soon') counts[cat].serviceDue++;
    }
  });

  // Same priority order as the backend's amcCombineStatus(): contract expiry
  // trumps everything, then an overdue service visit, then an approaching
  // contract expiry, then an approaching service visit, then all-clear.
  Object.entries(AMC_CATEGORY_MAP).forEach(([cat, badgeId]) => {
    const el = document.getElementById(badgeId);
    if (!el) return;
    const c = counts[cat];
    if (c.total === 0) {
      el.textContent = '0 Records';
      el.style.backgroundColor = '';
      el.style.color = '';
    } else if (c.expired > 0) {
      el.textContent = `${c.total} (${c.expired} Expired)`;
      el.style.backgroundColor = '#fee2e2';
      el.style.color = '#b91c1c';
    } else if (c.serviceOverdue > 0) {
      el.textContent = `${c.total} (${c.serviceOverdue} Service Overdue)`;
      el.style.backgroundColor = '#fee2e2';
      el.style.color = '#b91c1c';
    } else if (c.expiring > 0) {
      el.textContent = `${c.total} (${c.expiring} Expiring)`;
      el.style.backgroundColor = '#fef3c7';
      el.style.color = '#b45309';
    } else if (c.serviceDue > 0) {
      el.textContent = `${c.total} (${c.serviceDue} Service Due)`;
      el.style.backgroundColor = '#fef3c7';
      el.style.color = '#b45309';
    } else {
      el.textContent = `${c.total} Active`;
      el.style.backgroundColor = '#dcfce7';
      el.style.color = '#15803d';
    }
  });
}

// Fills the "Auto Alert & Warning Banner" at the top of the AMC overview
// with a plain-language summary the moment anyone opens the AMC screen —
// no need to click into a category to notice something's overdue.
function updateAmcAlertBanner() {
  const bar = document.getElementById('amcAlertSummaryBar');
  const textEl = document.getElementById('amcAlertText');
  if (!bar || !textEl) return;

  const expired = allAmcData.filter(r => r.status === 'Expired').length;
  const serviceOverdue = allAmcData.filter(r => r.status === 'Service Overdue').length;
  const expiring = allAmcData.filter(r => r.status === 'Expiring Soon').length;
  const serviceDue = allAmcData.filter(r => r.status === 'Service Due Soon').length;

  const critical = expired + serviceOverdue;
  const warning = expiring + serviceDue;

  if (critical === 0 && warning === 0) {
    bar.classList.add('hidden');
    return;
  }

  const parts = [];
  if (expired) parts.push(`<strong>${expired} contract${expired > 1 ? 's' : ''} expired</strong>`);
  if (serviceOverdue) parts.push(`<strong>${serviceOverdue} service visit${serviceOverdue > 1 ? 's' : ''} overdue</strong>`);
  if (expiring) parts.push(`${expiring} contract${expiring > 1 ? 's' : ''} expiring soon`);
  if (serviceDue) parts.push(`${serviceDue} service visit${serviceDue > 1 ? 's' : ''} due soon`);

  textEl.innerHTML = parts.join(' &nbsp;•&nbsp; ') + ' — check the category cards below for details.';
  bar.classList.remove('hidden');
  bar.classList.toggle('amc-alert-critical', critical > 0);
}

// Manually fires the same daily reminder email the server-side trigger
// sends (see sendAmcWarningDigest() in Code.gs) — lets an admin test it or
// push it out immediately without waiting for the 8 AM schedule.
async function sendAmcReminderDigestNow() {
  try {
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'sendAmcDigest' })
    });
    const data = await res.json();
    if (data.sent) {
      showToast(data.message || 'Reminder digest sent.');
    } else {
      showToast(data.message || 'Nothing to send right now.');
    }
  } catch (err) {
    showToast(`Could not send digest: ${err.message || err}`, true);
  }
}

// Category badge colours — shared by the reminder dashboard and the record detail card
const AMC_REMINDER_CATEGORY_COLORS = {
  'Generator': '#f97316',
  'Fire': '#ef4444',
  'Lift': '#8b5cf6',
  'Air Condition': '#0ea5e9',
  'Water Filter': '#10b981',
  'CCTV Camera': '#0891b2',
  'Sound System & intercom': '#ec4899',
  'Solar Panel Maintenance': '#eab308'
};

// ─── AI Reminder Dashboard ──────────────────────────────────────────────────
// Opens the reminder card and populates all 4 alert quadrants from allAmcData.
function openAmcReminderDashboard() {
  const modal = document.getElementById('amcReminderModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderAmcReminderDashboard();
}

function closeAmcReminderDashboard() {
  const modal = document.getElementById('amcReminderModal');
  if (modal) modal.classList.add('hidden');
}

function renderAmcReminderDashboard() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Helper: safe parse a YYYY-MM-DD date string
  function safeDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Helper: days difference (positive = future, negative = past)
  function daysFrom(dateStr) {
    const d = safeDate(dateStr);
    if (!d) return null;
    d.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }

  // Category badge colours (see AMC_REMINDER_CATEGORY_COLORS)
  function categoryChip(cat) {
    const col = AMC_REMINDER_CATEGORY_COLORS[cat] || '#64748b';
    return `<span class="amcr-cat-chip" style="background:${col}20;color:${col};border:1px solid ${col}40;">${escapeHtml(cat)}</span>`;
  }

  function rowHtml(r, daysLabel, urgency) {
    const urgencyClass = urgency === 'critical' ? 'amcr-urgency-critical' : 'amcr-urgency-warning';
    return `
      <div class="amcr-row" onclick="openAmcReminderDetail('${escapeHtml(r.id)}')">
        <div class="amcr-row-top">
          ${categoryChip(r.category)}
          <span class="${urgencyClass}">${escapeHtml(daysLabel)}</span>
        </div>
        <div class="amcr-row-unit"><strong>${escapeHtml(r.unit || '—')}</strong>${r.floor ? ` · ${escapeHtml(r.floor)}` : ''}</div>
        <div class="amcr-row-vendor">${r.vendorName ? `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;opacity:.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(r.vendorName)}` : ''}</div>
      </div>`;
  }

  // Quadrant 1: Contract Expired, not renewed
  const expired = allAmcData
    .filter(r => r.status === 'Expired')
    .sort((a, b) => (daysFrom(a.expiryDate) || 0) - (daysFrom(b.expiryDate) || 0));

  // Quadrant 2: Contract Expiring Soon
  const expiring = allAmcData
    .filter(r => r.status === 'Expiring Soon')
    .sort((a, b) => (daysFrom(a.expiryDate) || 999) - (daysFrom(b.expiryDate) || 999));

  // Quadrant 3: Service Overdue (date passed, not yet serviced)
  const serviceOverdue = allAmcData
    .filter(r => r.status === 'Service Overdue')
    .sort((a, b) => (daysFrom(a.nextDueDate) || 0) - (daysFrom(b.nextDueDate) || 0));

  // Quadrant 4: Service Due Soon
  const serviceDue = allAmcData
    .filter(r => r.status === 'Service Due Soon')
    .sort((a, b) => (daysFrom(a.nextDueDate) || 999) - (daysFrom(b.nextDueDate) || 999));

  // Render helper
  function renderList(elId, countElId, items, buildRow) {
    const listEl = document.getElementById(elId);
    const countEl = document.getElementById(countElId);
    if (!listEl || !countEl) return;
    countEl.textContent = items.length;
    if (items.length === 0) {
      listEl.innerHTML = '<p class="amc-reminder-empty"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12.5 10.8 15 16 9"/></svg>All clear</p>';
      return;
    }
    listEl.innerHTML = items.map(buildRow).join('');
  }

  // Render all four
  renderList('amcReminderListExpired', 'amcReminderCountExpired', expired, r => {
    const d = daysFrom(r.expiryDate);
    const label = d !== null ? `Expired ${Math.abs(d)}d ago` : 'Date unknown';
    return rowHtml(r, label, 'critical');
  });

  renderList('amcReminderListExpiring', 'amcReminderCountExpiring', expiring, r => {
    const d = daysFrom(r.expiryDate);
    const label = d !== null ? `Expires in ${d}d (${fmtAMCDate(r.expiryDate)})` : 'Date unknown';
    return rowHtml(r, label, 'warning');
  });

  renderList('amcReminderListServiceOverdue', 'amcReminderCountServiceOverdue', serviceOverdue, r => {
    const d = daysFrom(r.nextDueDate);
    const label = d !== null ? `Overdue by ${Math.abs(d)}d (due ${fmtAMCDate(r.nextDueDate)})` : 'Date unknown';
    return rowHtml(r, label, 'critical');
  });

  renderList('amcReminderListServiceDue', 'amcReminderCountServiceDue', serviceDue, r => {
    const d = daysFrom(r.nextDueDate);
    const label = d !== null ? `Due in ${d}d (${fmtAMCDate(r.nextDueDate)})` : 'Date unknown';
    return rowHtml(r, label, 'warning');
  });

  // Summary bar
  const totalCritical = expired.length + serviceOverdue.length;
  const totalWarning  = expiring.length + serviceDue.length;
  const bar = document.getElementById('amcReminderSummaryBar');
  if (bar) {
    const svgOk = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><polyline points="20 6 9 17 4 12"/></svg>`;
    const svgWarn = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    if (totalCritical === 0 && totalWarning === 0) {
      bar.innerHTML = `<span class="amcr-summary-ok">${svgOk}All AMC contracts and servicing schedules are on track.</span>`;
      bar.className = 'amc-reminder-summary-bar amcr-bar-ok';
    } else {
      const parts = [];
      if (expired.length) parts.push(`<strong>${expired.length}</strong> contract${expired.length > 1 ? 's' : ''} expired`);
      if (serviceOverdue.length) parts.push(`<strong>${serviceOverdue.length}</strong> service${serviceOverdue.length > 1 ? 's' : ''} overdue`);
      if (expiring.length) parts.push(`<strong>${expiring.length}</strong> expiring soon`);
      if (serviceDue.length) parts.push(`<strong>${serviceDue.length}</strong> service${serviceDue.length > 1 ? 's' : ''} due soon`);
      bar.innerHTML = svgWarn + parts.join(' &nbsp;·&nbsp; ');
      bar.className = 'amc-reminder-summary-bar ' + (totalCritical > 0 ? 'amcr-bar-critical' : 'amcr-bar-warning');
    }
  }
}

// ─── AI Reminder — Record Detail Card ───────────────────────────────────────
// Opens when an individual alert row is clicked; shows every field for that
// single AMC record on top of the dashboard.
function openAmcReminderDetail(recordId) {
  const record = allAmcData.find(r => String(r.id) === String(recordId));
  if (!record) {
    showToast('Record not found.', true);
    return;
  }

  const modal = document.getElementById('amcReminderDetailModal');
  if (!modal) return;

  const col = AMC_REMINDER_CATEGORY_COLORS[record.category] || '#64748b';
  const box = modal.querySelector('.amcrd-box');
  if (box) {
    box.style.setProperty('--amcrd-accent', col);
    box.style.setProperty('--amcrd-accent-soft', col + '14');
  }

  const catBadge = document.getElementById('amcrdCatBadge');
  // catBadge now shows the fixed company logo (see index.html) — no per-category overwrite.

  document.getElementById('amcrdUnitTitle').textContent = `${record.category || 'AMC'} — Unit ${record.unit || '—'}`;
  document.getElementById('amcrdFloorSub').textContent = record.floor ? `Floor: ${record.floor}` : 'Floor not specified';
  document.getElementById('amcrdStatusPill').textContent = record.status || '—';
  document.getElementById('amcrdVendor').textContent = record.vendorName || '—';
  document.getElementById('amcrdContact').textContent = record.contactInfo || '—';
  document.getElementById('amcrdStart').textContent = fmtAMCDate(record.startDate);
  document.getElementById('amcrdExpiry').textContent = fmtAMCDate(record.expiryDate);
  document.getElementById('amcrdFrequency').textContent = record.frequency || 'Annual';
  document.getElementById('amcrdLastService').textContent = fmtAMCDate(record.lastServiceDate);
  document.getElementById('amcrdNextDue').textContent = fmtAMCDate(record.nextDueDate);
  document.getElementById('amcrdRecordId').textContent = record.id || '—';
  document.getElementById('amcrdRemarks').textContent = record.remarks || 'No remarks provided.';

  // Alert note — why this record is showing up in the reminder feed
  const noteEl = document.getElementById('amcrdAlertNote');
  if (noteEl) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    function daysFrom(dateStr) {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return Math.round((d - now) / 86400000);
    }
    const svgWarnIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    let noteText = '';
    let noteClass = 'is-warning';
    if (record.status === 'Expired') {
      const d = daysFrom(record.expiryDate);
      noteText = d !== null ? `Contract expired ${Math.abs(d)}d ago — not yet renewed.` : 'Contract expired — date unknown.';
      noteClass = 'is-critical';
    } else if (record.status === 'Expiring Soon') {
      const d = daysFrom(record.expiryDate);
      noteText = d !== null ? `Contract expires in ${d}d (${fmtAMCDate(record.expiryDate)}).` : 'Contract expiring soon.';
    } else if (record.status === 'Service Overdue') {
      const d = daysFrom(record.nextDueDate);
      noteText = d !== null ? `Servicing overdue by ${Math.abs(d)}d (was due ${fmtAMCDate(record.nextDueDate)}).` : 'Servicing overdue.';
      noteClass = 'is-critical';
    } else if (record.status === 'Service Due Soon') {
      const d = daysFrom(record.nextDueDate);
      noteText = d !== null ? `Servicing due in ${d}d (${fmtAMCDate(record.nextDueDate)}).` : 'Servicing due soon.';
    }
    if (noteText) {
      noteEl.style.display = 'flex';
      noteEl.className = 'amcrd-alert-note ' + noteClass;
      noteEl.innerHTML = svgWarnIcon + noteText;
    } else {
      noteEl.style.display = 'none';
    }
  }

  // Attachments
  const docsBlock = document.getElementById('amcrdDocsBlock');
  const docsList = document.getElementById('amcrdDocsList');
  if (docsBlock && docsList) {
    if (record.attachments && record.attachments.length) {
      docsBlock.style.display = 'flex';
      docsList.innerHTML = record.attachments.map((link, i) => `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="amcrd-doc-link"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Doc ${i + 1}</a>`).join('');
    } else {
      docsBlock.style.display = 'none';
      docsList.innerHTML = '';
    }
  }

  // Manage button hands off to the existing full action/details modal
  const manageBtn = document.getElementById('amcrdManageBtn');
  if (manageBtn) {
    manageBtn.onclick = () => {
      closeAmcReminderDetail();
      openAmcActionModal(record.id);
    };
  }

  modal.classList.remove('hidden');
}

function closeAmcReminderDetail() {
  const modal = document.getElementById('amcReminderDetailModal');
  if (modal) modal.classList.add('hidden');
}

function openAmcCategoryDetail(categoryKey) {
  currentAmcCategory = categoryKey;
  const overviewEl = document.getElementById('amcOverviewView');
  const detailEl = document.getElementById('amcCategoryDetailView');
  const titleEl = document.getElementById('amcDetailCategoryTitle');

  if (overviewEl) overviewEl.classList.add('hidden');
  if (detailEl) detailEl.classList.remove('hidden');
  if (titleEl) titleEl.textContent = `${categoryKey} AMC Records`;

  // Populate Unit filter with unique units
  const unitFilterEl = document.getElementById('amcFilterUnit');
  if (unitFilterEl) {
    const existingVal = unitFilterEl.value;
    const units = [...new Set(state.factories.concat(allAmcData.flatMap(r => amcSplitUnits(r.unit))))].filter(Boolean);
    unitFilterEl.innerHTML = '<option value="">All Units</option>' +
      units.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');
    if (units.includes(existingVal)) unitFilterEl.value = existingVal;
  }

  renderAmcTable();
}

function closeAmcCategoryDetail() {
  currentAmcCategory = '';
  const overviewEl = document.getElementById('amcOverviewView');
  const detailEl = document.getElementById('amcCategoryDetailView');
  if (overviewEl) overviewEl.classList.remove('hidden');
  if (detailEl) detailEl.classList.add('hidden');
}

function applyAmcFilters() {
  renderAmcTable();
}

function resetAmcFilters() {
  const searchInput = document.getElementById('amcSearchInput');
  const unitFilter = document.getElementById('amcFilterUnit');
  const floorFilter = document.getElementById('amcFilterFloor');
  const statusFilter = document.getElementById('amcFilterStatus');
  if (searchInput) searchInput.value = '';
  if (unitFilter) unitFilter.value = '';
  if (floorFilter) floorFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  renderAmcTable();
}

// Always-on pulsing highlight on the table's "Next Due" date — red once
// servicing is due soon/overdue, green while still on track — so it's
// impossible to miss at a glance, without opening the record.
function amcNextDuePulseClass(r) {
  if (r.serviceStatus === 'Not Scheduled' || !r.nextDueDate) return '';
  return (r.serviceStatus === 'Overdue' || r.serviceStatus === 'Due Soon') ? 'amc-nextdue-pulse-red' : 'amc-nextdue-pulse-green';
}

function renderAmcTable() {
  const tbody = document.getElementById('amcTableBody');
  const badge = document.getElementById('amcDetailCountBadge');
  if (!tbody) return;

  const searchQuery = (document.getElementById('amcSearchInput')?.value || '').toLowerCase().trim();
  const unitFilter = document.getElementById('amcFilterUnit')?.value || '';
  const floorFilter = document.getElementById('amcFilterFloor')?.value || '';
  const statusFilter = document.getElementById('amcFilterStatus')?.value || '';

  const records = allAmcData.filter(r => {
    if (r.category !== currentAmcCategory) return false;
    if (unitFilter && !amcSplitUnits(r.unit).includes(unitFilter)) return false;
    if (floorFilter && r.floor !== floorFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (searchQuery) {
      const match = [r.vendorName, r.contactInfo, r.remarks, r.unit, r.floor, r.id].join(' ').toLowerCase();
      if (!match.includes(searchQuery)) return false;
    }
    return true;
  });

  if (badge) badge.textContent = `${records.length} Records`;

  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:36px;color:#6b7280;">No AMC records matching current filter in <strong>${escapeHtml(currentAmcCategory)}</strong>. Click "+ Add Contract / Service" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map((r, index) => {
    // Red for anything actually past due (contract expired or a missed
    // service visit), amber for anything approaching, green when clear.
    const statusClass =
      (r.status === 'Expired' || r.status === 'Service Overdue') ? 'status-expired' :
        (r.status === 'Expiring Soon' || r.status === 'Service Due Soon') ? 'status-expiring' :
          r.status === 'Active' ? 'status-active' : 'status-pending';

    // A short "why" line under the pill, so it's clear whether it's the
    // CONTRACT or the SERVICING that's the problem.
    let statusDetail = '';
    if (r.status === 'Expired') statusDetail = `Contract expired ${Math.abs(r.contractDaysLeft)}d ago`;
    else if (r.status === 'Expiring Soon') statusDetail = `Contract expires in ${r.contractDaysLeft}d`;
    else if (r.status === 'Service Overdue') statusDetail = `Service overdue by ${Math.abs(r.serviceDaysLeft)}d`;
    else if (r.status === 'Service Due Soon') statusDetail = `Service due in ${r.serviceDaysLeft}d`;

    const durationDisplay = (r.startDate || r.expiryDate)
      ? `${fmtAMCDate(r.startDate)} to ${fmtAMCDate(r.expiryDate)}`
      : '—';

    const docsHtml = (r.attachments && r.attachments.length)
      ? r.attachments.map((link, i) => `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="amc-doc-link"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Doc ${i + 1} <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></a>`).join(' ')
      : '<span style="color:#94a3b8;">None</span>';

    return `
      <tr>
        <td style="color:#64748b;font-weight:600;">${index + 1}</td>
        <td><strong>${escapeHtml(r.unit)}</strong></td>
        <td>${escapeHtml(r.floor || '—')}</td>
        <td>
          <div style="font-weight:600;">${escapeHtml(r.vendorName || '—')}</div>
          <div style="font-size:11.5px;color:#64748b;">${escapeHtml(r.contactInfo || '')}</div>
        </td>
        <td>${durationDisplay}</td>
        <td>${(r.contractCost !== '' && r.contractCost !== null && r.contractCost !== undefined) ? `<strong>${fmtAmcCost(r.contractCost)}</strong>` : '<span style="color:#94a3b8;">—</span>'}</td>
        <td>${escapeHtml(r.frequency || 'Annual')}</td>
        <td>${fmtAMCDate(r.lastServiceDate)}</td>
        <td><strong class="${amcNextDuePulseClass(r)}">${fmtAMCDate(r.nextDueDate)}</strong></td>
        <td>
          <span class="amc-status-pill ${statusClass}">${escapeHtml(r.status)}</span>
          ${statusDetail ? `<div style="font-size:10.5px;color:#64748b;margin-top:3px;">${escapeHtml(statusDetail)}</div>` : ''}
        </td>
        <td>${docsHtml}</td>
        <td style="max-width:180px;font-size:12px;color:#475569;white-space:normal;">${escapeHtml(r.remarks || '—')}</td>
        <td>
          <button class="amc-take-action-btn" type="button" onclick="openAmcActionModal('${escapeHtml(r.id)}')" title="Take actions & view details for this AMC record">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Take Actions
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── AMC Unit multi-select (form) ─────────────────────────────────────────
// One AMC record can now cover several units under a single combined
// contract (one vendor, one agreement, one total cost). The record is
// still stored as ONE row — the units are joined into a single comma
// separated string in the same "Unit" column as before, so nothing about
// the record is split or duplicated: it's one combined entity everywhere
// (filters, totals, exports) and simply becomes visible whenever any one
// of its units is filtered on.
let amcFormUnitsSelected = [];

// Splits the stored/combined "Unit" string ("Unit A, Unit B") back into
// individual unit names. Works fine on plain single-unit records too.
function amcSplitUnits(unitStr) {
  return String(unitStr || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function renderAmcUnitOptions() {
  const panel = document.getElementById('amcFormUnitPanel');
  if (!panel) return;
  const units = state.factories || [];
  if (!units.length) {
    panel.innerHTML = `<div class="amc-unit-multiselect-empty">No units/factories found</div>`;
    return;
  }
  panel.innerHTML = units.map(u => {
    const checked = amcFormUnitsSelected.includes(u) ? 'checked' : '';
    const safe = escapeHtml(u);
    return `
      <label class="amc-unit-multiselect-option">
        <input type="checkbox" ${checked} onchange="toggleAmcFormUnit('${safe.replace(/'/g, "\\'")}')">
        <span>${safe}</span>
      </label>`;
  }).join('');
}

function updateAmcFormUnitChips() {
  const chipsEl = document.getElementById('amcFormUnitChips');
  if (!chipsEl) return;
  if (!amcFormUnitsSelected.length) {
    chipsEl.textContent = 'Select unit(s)...';
    chipsEl.classList.add('amc-unit-multiselect-placeholder');
    return;
  }
  chipsEl.classList.remove('amc-unit-multiselect-placeholder');
  chipsEl.textContent = amcFormUnitsSelected.join(', ');
}

function toggleAmcFormUnit(unit) {
  const idx = amcFormUnitsSelected.indexOf(unit);
  if (idx === -1) amcFormUnitsSelected.push(unit);
  else amcFormUnitsSelected.splice(idx, 1);
  renderAmcUnitOptions();
  updateAmcFormUnitChips();
}

function toggleAmcUnitDropdown() {
  const panel = document.getElementById('amcFormUnitPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
}

function setAmcFormUnits(units) {
  amcFormUnitsSelected = Array.isArray(units) ? units.slice() : amcSplitUnits(units);
  renderAmcUnitOptions();
  updateAmcFormUnitChips();
}

// Close the unit dropdown when clicking outside of it.
document.addEventListener('click', (event) => {
  const box = document.getElementById('amcUnitMultiselect');
  if (box && !box.contains(event.target)) {
    document.getElementById('amcFormUnitPanel')?.classList.add('hidden');
  }
});

function openAmcForm(categoryKey = '', rowIndex = null) {
  const modal = document.getElementById('amcFormModal');
  const titleEl = document.getElementById('amcFormModalTitle');
  const form = document.getElementById('amcRecordForm');
  if (!modal || !form) return;

  form.reset();
  amcFilesSelected = [];
  renderAmcFileList();

  // Reset/populate Unit multi-select
  setAmcFormUnits([]);

  document.getElementById('amcFormRowIndex').value = '';
  document.getElementById('amcFormId').value = '';

  if (rowIndex) {
    const record = allAmcData.find(r => r.rowIndex === rowIndex);
    if (record) {
      titleEl.textContent = `Edit ${record.category} Record`;
      document.getElementById('amcFormRowIndex').value = record.rowIndex;
      document.getElementById('amcFormId').value = record.id;
      document.getElementById('amcFormCategory').value = record.category;
      setAmcFormUnits(amcSplitUnits(record.unit));
      document.getElementById('amcFormFloor').value = record.floor || '';
      document.getElementById('amcFormVendor').value = record.vendorName;
      document.getElementById('amcFormContact').value = record.contactInfo;
      document.getElementById('amcFormStartDate').value = record.startDate;
      document.getElementById('amcFormExpiryDate').value = record.expiryDate;
      document.getElementById('amcFormCost').value = (record.contractCost !== '' && record.contractCost !== null && record.contractCost !== undefined) ? record.contractCost : '';
      document.getElementById('amcFormFrequency').value = record.frequency;
      document.getElementById('amcFormLastService').value = record.lastServiceDate;
      document.getElementById('amcFormNextDue').value = record.nextDueDate;
      document.getElementById('amcFormRemarks').value = record.remarks;

      // Existing record: show the breakdown/service log history + the
      // "log a visit" mini-form underneath, and pull its history.
      const logSection = document.getElementById('amcServiceLogSection');
      if (logSection) logSection.classList.remove('hidden');
      const logDateEl = document.getElementById('amcLogVisitDate');
      if (logDateEl) logDateEl.value = today;
      loadAmcServiceLogForForm(record.id);
    }
  } else {
    titleEl.textContent = categoryKey ? `New ${categoryKey} AMC Record` : 'New AMC Record';
    if (categoryKey) {
      document.getElementById('amcFormCategory').value = categoryKey;
    }
    // Set default start date = today
    document.getElementById('amcFormStartDate').value = today;

    // Service/breakdown logging only makes sense once a record exists
    // (it needs a Record ID to attach the visit to), so it's hidden for a
    // brand-new record and appears automatically once you edit it again.
    const logSection = document.getElementById('amcServiceLogSection');
    if (logSection) logSection.classList.add('hidden');
    const timeline = document.getElementById('amcServiceLogTimeline');
    if (timeline) timeline.innerHTML = '<p class="amc-service-log-empty">No visits logged yet.</p>';
  }

  updateAmcStatusPreview();
  modal.classList.remove('hidden');
}

// ── Service / Breakdown Log (per AMC record) ──────────────────────────────

let amcCurrentLogRecordId = '';

async function fetchAmcServiceLog(amcId) {
  if (window.google && google.script && google.script.run) {
    return new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getAmcServiceLog(amcId));
  }
  return fetchJson(bustCache(`${WEB_APP_URL}?action=amcServiceLog&amcId=${encodeURIComponent(amcId)}`), {}, READ_REQUEST_TIMEOUT_MS);
}

// Past contract terms (previous vendors, dates, cost) for one AMC record —
// archived automatically whenever that record is renewed.
async function fetchAmcContractHistory(amcId) {
  if (window.google && google.script && google.script.run) {
    return new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getAmcContractHistory(amcId));
  }
  return fetchJson(bustCache(`${WEB_APP_URL}?action=amcContractHistory&amcId=${encodeURIComponent(amcId)}`), {}, READ_REQUEST_TIMEOUT_MS);
}

async function loadAmcServiceLogForForm(amcId) {
  amcCurrentLogRecordId = amcId;
  const timeline = document.getElementById('amcServiceLogTimeline');
  if (timeline) timeline.innerHTML = '<p class="amc-service-log-empty">Loading history…</p>';

  try {
    const logs = await fetchAmcServiceLog(amcId);
    if (amcCurrentLogRecordId !== amcId) return; // form has since switched to a different record
    renderAmcServiceLogTimeline(Array.isArray(logs) ? logs : []);
  } catch (err) {
    if (timeline) timeline.innerHTML = `<p class="amc-service-log-empty">Could not load history: ${escapeHtml(err.message || String(err))}</p>`;
  }
}

function renderAmcServiceLogTimeline(logs) {
  const timeline = document.getElementById('amcServiceLogTimeline');
  if (!timeline) return;

  if (!logs.length) {
    timeline.innerHTML = '<p class="amc-service-log-empty">No visits logged yet — log the first one below.</p>';
    return;
  }

  timeline.innerHTML = logs.map(l => {
    const isBreakdown = l.logType === 'Breakdown Repair';
    const hasCost = l.cost !== '' && l.cost !== null && l.cost !== undefined;
    return `
      <div class="amc-log-entry ${isBreakdown ? 'amc-log-breakdown' : 'amc-log-scheduled'}">
        <div class="amc-log-entry-top">
          <span class="amc-log-type-badge">
            ${isBreakdown ? `
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>Breakdown
            ` : `
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;">
                <polyline points="20 6 9 17 4 12"/>
              </svg>Scheduled
            `}
          </span>
          <span class="amc-log-date">${escapeHtml(l.visitDate || '—')}</span>
          ${hasCost ? `<span class="amc-log-cost">₹${escapeHtml(String(l.cost))}</span>` : ''}
        </div>
        ${l.description ? `<div class="amc-log-desc">${escapeHtml(l.description)}</div>` : ''}
        ${l.technician ? `<div class="amc-log-tech">By: ${escapeHtml(l.technician)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// Keeps the "Update Last Service Date" checkbox in sync with the selected
// visit Type: ON for a real Scheduled Service, OFF for a Breakdown Repair —
// so, by default, an emergency repair never shifts the next servicing date;
// only an actual scheduled service does. Still user-overridable.
function syncAmcLogUpdateLastCheckbox() {
  const typeEl = document.getElementById('amcLogType');
  const checkboxEl = document.getElementById('amcLogUpdateLast');
  if (!typeEl || !checkboxEl) return;
  checkboxEl.checked = typeEl.value === 'Scheduled Service';
}

async function handleAmcLogSubmit() {
  const amcId = document.getElementById('amcFormId').value;
  if (!amcId) {
    showToast('Save the record first, then log a service or breakdown visit.', true);
    return;
  }

  const visitDate = document.getElementById('amcLogVisitDate').value;
  if (!visitDate) {
    showToast('Please pick a visit date.', true);
    return;
  }

  const payload = {
    action: 'saveAmcServiceLog',
    amcId,
    visitDate,
    logType: document.getElementById('amcLogType').value,
    technician: document.getElementById('amcLogTechnician').value.trim(),
    cost: document.getElementById('amcLogCost').value,
    description: document.getElementById('amcLogDescription').value.trim(),
    updateLastService: document.getElementById('amcLogUpdateLast').checked,
    attachments: []
  };

  const btn = document.getElementById('amcLogAddBtn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving…'; }

  try {
    const res = await serverCall('saveAmcServiceLog', payload);
    if (res && res.ok === false) throw new Error(res.message || 'Server returned failure.');
    showToast('Visit logged successfully.');

    document.getElementById('amcLogVisitDate').value = today;
    document.getElementById('amcLogType').value = 'Scheduled Service';
    document.getElementById('amcLogTechnician').value = '';
    document.getElementById('amcLogCost').value = '';
    document.getElementById('amcLogDescription').value = '';
    document.getElementById('amcLogUpdateLast').checked = true;

    await loadAmcServiceLogForForm(amcId);
    await loadAmcData(true);

    // Reflect the auto-updated Last Service / Next Due Date right in the
    // still-open form, so the person sees the effect immediately.
    if (payload.updateLastService) {
      const refreshed = allAmcData.find(r => r.id === amcId);
      if (refreshed) {
        document.getElementById('amcFormLastService').value = refreshed.lastServiceDate;
        document.getElementById('amcFormNextDue').value = refreshed.nextDueDate;
        updateAmcStatusPreview();
      }
    }
  } catch (err) {
    console.error('Failed to log AMC visit:', err);
    showToast(`Could not log visit: ${err.message || err}`, true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

function openAmcFormFromDetail() {
  openAmcForm(currentAmcCategory);
}

function closeAmcForm() {
  const modal = document.getElementById('amcFormModal');
  if (modal) modal.classList.add('hidden');
  document.getElementById('amcFormUnitPanel')?.classList.add('hidden');
  amcFormUnitsSelected = [];
}

function editAmcRecord(rowIndex) {
  openAmcForm('', rowIndex);
}

async function deleteAmcRecordRow(rowIndex, recordId) {
  if (!confirm(`Are you sure you want to delete this AMC record (${recordId})?`)) return;

  try {
    showToast('Deleting AMC record...');
    const res = await serverCall('deleteAmc', { action: 'deleteAmc', rowIndex });
    showToast('AMC record deleted successfully.');
    await loadAmcData(true);
  } catch (err) {
    console.error('Error deleting AMC record:', err);
    showToast(`Failed to delete record: ${err.message || err}`, true);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AMC TAKE ACTION & COMPREHENSIVE DETAILS MODAL LOGIC
// ─────────────────────────────────────────────────────────────────────────────

let amcActiveActionRecord = null;

function openAmcActionModal(recordId) {
  const modal = document.getElementById('amcActionModal');
  if (!modal) return;

  const record = allAmcData.find(r => r.id === recordId);
  if (!record) {
    showToast('Record not found.', true);
    return;
  }

  amcActiveActionRecord = record;

  // Title, Subtitle, and Status Badge
  const titleEl = document.getElementById('amcActionTitle');
  const subEl = document.getElementById('amcActionSubtitle');
  const badgeEl = document.getElementById('amcActionStatusBadge');

  if (titleEl) titleEl.textContent = `${record.category} AMC — Unit ${record.unit}${record.floor ? ' / ' + record.floor : ''}`;
  if (subEl) subEl.textContent = `Vendor: ${record.vendorName || '—'} | Record ID: ${record.id}`;

  const statusClass =
    (record.status === 'Expired' || record.status === 'Service Overdue') ? 'status-expired' :
      (record.status === 'Expiring Soon' || record.status === 'Service Due Soon') ? 'status-expiring' :
        record.status === 'Active' ? 'status-active' : 'status-pending';

  if (badgeEl) {
    badgeEl.className = `amc-status-pill ${statusClass}`;
    badgeEl.textContent = record.status;
  }

  // Summary Card Items
  document.getElementById('amcSummaryUnit').textContent = record.unit || '—';
  document.getElementById('amcSummaryFloor').textContent = record.floor || '—';
  document.getElementById('amcSummaryVendor').textContent = record.vendorName ? `${record.vendorName} ${record.contactInfo ? '(' + record.contactInfo + ')' : ''}` : '—';
  document.getElementById('amcSummaryFrequency').textContent = record.frequency || 'Annual';
  document.getElementById('amcSummaryExpiry').textContent = fmtAMCDate(record.expiryDate);
  document.getElementById('amcSummaryCost').textContent = fmtAmcCost(record.contractCost);
  document.getElementById('amcSummaryLastService').textContent = fmtAMCDate(record.lastServiceDate);
  document.getElementById('amcSummaryNextDue').textContent = fmtAMCDate(record.nextDueDate);
  applyAmcNextDuePulse(record.nextDueDate);
  document.getElementById('amcSummaryRemarks').textContent = record.remarks || 'No remarks provided.';

  // Docs in Summary Card
  const docsEl = document.getElementById('amcSummaryDocs');
  if (docsEl) {
    if (record.attachments && record.attachments.length) {
      docsEl.innerHTML = record.attachments.map((link, i) => `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="amc-doc-link"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Doc ${i + 1} <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></a>`).join(' ');
    } else {
      docsEl.innerHTML = '<span style="font-size:12px;color:#b08d5f;">No documents attached.</span>';
    }
  }

  // Reset Full Details Panel
  const fullPanel = document.getElementById('amcFullDetailsPanel');
  const fullToggleBtn = document.getElementById('amcToggleFullDetailsBtn');
  if (fullPanel) fullPanel.classList.add('hidden');
  if (fullToggleBtn) {
    fullToggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <span>View Full Details &amp; History</span>
    `;
  }

  // Pre-fill Tab 1: Servicing Form
  document.getElementById('amcActionRecordId').value = record.id;
  const serviceDateInput = document.getElementById('amcActionServiceDate');
  if (serviceDateInput) serviceDateInput.value = today;
  document.getElementById('amcActionServiceTech').value = '';
  document.getElementById('amcActionServiceCost').value = '';
  document.getElementById('amcActionServiceDesc').value = '';
  calculateAmcNextServicePreview();

  // Pre-fill Tab 2: Breakdown Form
  const breakdownDateInput = document.getElementById('amcActionBreakdownDate');
  if (breakdownDateInput) breakdownDateInput.value = today;
  document.getElementById('amcActionBreakdownTech').value = '';
  document.getElementById('amcActionBreakdownCost').value = '';
  document.getElementById('amcActionBreakdownDesc').value = '';
  // Off by default: a breakdown/emergency repair should NOT push the
  // servicing cycle forward. Next Due Date keeps counting from the actual
  // Last Service Date unless someone explicitly ticks this on.
  document.getElementById('amcActionBreakdownUpdateCycle').checked = false;

  // Pre-fill Tab 3: Renew Form
  document.getElementById('amcActionRenewVendor').value = record.vendorName || '';
  document.getElementById('amcActionRenewContact').value = record.contactInfo || '';
  document.getElementById('amcActionRenewCost').value = (record.contractCost !== '' && record.contractCost !== null && record.contractCost !== undefined) ? record.contractCost : '';
  document.getElementById('amcActionRenewFrequency').value = record.frequency || 'Annual';
  document.getElementById('amcActionRenewStartDate').value = record.startDate || '';
  document.getElementById('amcActionRenewExpiryDate').value = record.expiryDate || '';
  document.getElementById('amcActionRenewRemarks').value = record.remarks || '';

  // Default active tab = 'service'
  switchAmcActionTab('service');

  // Load audit history
  loadAmcFullDetailsHistory(record.id);

  modal.classList.remove('hidden');
}

function closeAmcActionModal() {
  const modal = document.getElementById('amcActionModal');
  if (modal) modal.classList.add('hidden');
  amcActiveActionRecord = null;
}

function switchAmcActionTab(tabKey) {
  const tabBtns = {
    service: document.getElementById('amcTabBtnService'),
    breakdown: document.getElementById('amcTabBtnBreakdown'),
    renew: document.getElementById('amcTabBtnRenew'),
    delete: document.getElementById('amcTabBtnDelete')
  };
  const tabContents = {
    service: document.getElementById('amcTabContentService'),
    breakdown: document.getElementById('amcTabContentBreakdown'),
    renew: document.getElementById('amcTabContentRenew'),
    delete: document.getElementById('amcTabContentDelete')
  };

  Object.entries(tabBtns).forEach(([k, btn]) => {
    if (btn) btn.classList.toggle('active', k === tabKey);
  });
  Object.entries(tabContents).forEach(([k, content]) => {
    if (content) content.classList.toggle('hidden', k !== tabKey);
  });
}

function toggleAmcFullDetails() {
  const panel = document.getElementById('amcFullDetailsPanel');
  const btn = document.getElementById('amcToggleFullDetailsBtn');
  if (!panel || !btn) return;

  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
      <span>Hide Full Details &amp; History</span>
    `;
  } else {
    panel.classList.add('hidden');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <span>View Full Details &amp; History</span>
    `;
  }
}

// Contract & Vendor History — every previous term (old vendor, dates, cost,
// scope) this AMC record has had, archived automatically on each renewal.
// Kept as its own panel, separate from the day-to-day service/breakdown
// timeline, since it answers a different question: "who held this contract
// before, and on what terms" rather than "what visits happened".
async function loadAmcContractHistoryPanel(recordId) {
  const timeline = document.getElementById('amcContractHistoryTimeline');
  const countBadge = document.getElementById('amcContractHistoryCount');
  if (timeline) timeline.innerHTML = '<p class="amc-service-log-empty">Loading contract history…</p>';

  try {
    const history = await fetchAmcContractHistory(recordId);
    const list = Array.isArray(history) ? history : [];
    if (countBadge) countBadge.textContent = `${list.length} Past Term${list.length === 1 ? '' : 's'}`;

    // Store for the per-record Excel/PDF export buttons.
    window._amcContractHistoryCache = list;

    if (!list.length) {
      if (timeline) timeline.innerHTML = '<p class="amc-service-log-empty">No renewals yet — this is the first contract term on record.</p>';
      return;
    }

    if (timeline) {
      timeline.innerHTML = list.map(term => {
        const hasCost = term.contractCost !== '' && term.contractCost !== null && term.contractCost !== undefined;
        const vendorChanged = term.renewedToVendor && term.renewedToVendor !== term.vendorName;
        return `
          <div class="amc-contract-history-entry">
            <div class="amc-log-entry-top">
              <span class="amc-log-type-badge">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>${escapeHtml(term.vendorName || 'Unknown Vendor')}
              </span>
              <span class="amc-log-date">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${escapeHtml(fmtAMCDate(term.startDate))} to ${escapeHtml(fmtAMCDate(term.expiryDate))}
              </span>
              ${hasCost ? `<span class="amc-log-cost">${escapeHtml(fmtAmcCost(term.contractCost))}</span>` : ''}
            </div>
            ${term.contactInfo ? `<div class="amc-log-tech">Contact: <strong>${escapeHtml(term.contactInfo)}</strong></div>` : ''}
            ${term.frequency ? `<div class="amc-log-tech">Service Frequency: <strong>${escapeHtml(term.frequency)}</strong></div>` : ''}
            ${term.remarks ? `<div class="amc-log-desc">${escapeHtml(term.remarks)}</div>` : ''}
            ${vendorChanged
              ? `<div class="amc-contract-history-renewed-tag">Renewed &rarr; ${escapeHtml(term.renewedToVendor)}</div>`
              : (term.renewedToVendor ? `<div class="amc-contract-history-renewed-tag">Renewed with same vendor</div>` : '')}
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    if (timeline) timeline.innerHTML = `<p class="amc-service-log-empty">Could not load contract history: ${escapeHtml(err.message || String(err))}</p>`;
  }
}

async function loadAmcFullDetailsHistory(recordId) {
  const timeline = document.getElementById('amcFullHistoryTimeline');
  const countBadge = document.getElementById('amcFullHistoryCount');
  if (timeline) timeline.innerHTML = '<p class="amc-service-log-empty">Loading history…</p>';

  loadAmcContractHistoryPanel(recordId);

  try {
    const logs = await fetchAmcServiceLog(recordId);
    const list = Array.isArray(logs) ? logs : [];
    if (countBadge) countBadge.textContent = `${list.length} Visit${list.length === 1 ? '' : 's'}`;

    // Store for download usage
    window._amcHistoryLogsCache = list;

    // Show/hide download buttons based on whether there is data
    const dlBtns = document.getElementById('amcHistoryDownloadBtns');
    if (dlBtns) dlBtns.classList.toggle('hidden', list.length === 0);

    if (!list.length) {
      if (timeline) timeline.innerHTML = '<p class="amc-service-log-empty">No previous servicing or breakdown history logged yet.</p>';
      return;
    }

    if (timeline) {
      timeline.innerHTML = list.map(l => {
        const isBreakdown = l.logType === 'Breakdown Repair';
        const hasCost = l.cost !== '' && l.cost !== null && l.cost !== undefined;
        return `
          <div class="amc-log-entry ${isBreakdown ? 'amc-log-breakdown' : 'amc-log-scheduled'}">
            <div class="amc-log-entry-top">
              <span class="amc-log-type-badge">
                ${isBreakdown ? `
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>Breakdown Repair
                ` : `
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>Routine Servicing
                `}
              </span>
              <span class="amc-log-date">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${escapeHtml(fmtAMCDate(l.visitDate))}
              </span>
              ${hasCost ? `<span class="amc-log-cost">₹${escapeHtml(String(l.cost))}</span>` : ''}
            </div>
            ${l.description ? `<div class="amc-log-desc">${escapeHtml(l.description)}</div>` : ''}
            ${l.technician ? `<div class="amc-log-tech">Attended by: <strong>${escapeHtml(l.technician)}</strong></div>` : ''}
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    if (timeline) timeline.innerHTML = `<p class="amc-service-log-empty">Could not load history: ${escapeHtml(err.message || String(err))}</p>`;
  }
}

// ─── AMC Maintenance & Service History — Excel (.xlsx) export ─────────────
function downloadAmcHistoryExcel() {
  const logs = window._amcHistoryLogsCache || [];
  if (!logs.length) { showToast('No history to export.', true); return; }

  const record = amcActiveActionRecord || {};

  const infoRows = [
    ['Complete Maintenance & Service History'],
    [`Category: ${record.category || '-'}    Unit / Factory: ${record.unit || '-'}    Floor: ${record.floor || '-'}`],
    [`Vendor: ${record.vendorName || '-'}${record.contactInfo ? ' (' + record.contactInfo + ')' : ''}`],
    [`Generated: ${formatDailyTimestamp(new Date())}`],
    []
  ];

  const header = ['Visit Date', 'Type', 'Technician', 'Cost (₹)', 'Issue / Work Done'];
  const rows = logs.map(l => [
    fmtAMCDate(l.visitDate) || '-',
    l.logType || '-',
    l.technician || '-',
    (l.cost !== '' && l.cost !== null && l.cost !== undefined) ? Number(l.cost) : '',
    l.description || '-'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...infoRows, header, ...rows]);
  ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 50 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Service History');

  // Contract & Vendor History — past terms this record has had, if any.
  const contractHistory = window._amcContractHistoryCache || [];
  if (contractHistory.length) {
    const chHeader = ['Vendor', 'Contact', 'Start Date', 'Expiry Date', 'Contract Cost (₹)', 'Frequency', 'Remarks', 'Renewed To'];
    const chRows = contractHistory.map(h => [
      h.vendorName || '-',
      h.contactInfo || '-',
      fmtAMCDate(h.startDate) || '-',
      fmtAMCDate(h.expiryDate) || '-',
      (h.contractCost !== '' && h.contractCost !== null && h.contractCost !== undefined) ? Number(h.contractCost) : '',
      h.frequency || '-',
      h.remarks || '-',
      h.renewedToVendor || '-'
    ]);
    const wsHistory = XLSX.utils.aoa_to_sheet([['Contract & Vendor History (Past Terms)'], [], chHeader, ...chRows]);
    wsHistory['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 40 }, { wch: 20 }];
    wsHistory['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Contract History');
  }

  const stamp = formatLocalDate(new Date());
  const unitSlug = (record.unit || 'AMC').replace(/[^a-z0-9]+/gi, '_');
  XLSX.writeFile(wb, `AMC_History_${unitSlug}_${stamp}.xlsx`);
}

// ─── AMC Maintenance & Service History — PDF export (IBM Plex Sans) ───────
function downloadAmcHistoryPdf() {
  const logs = window._amcHistoryLogsCache || [];
  if (!logs.length) { showToast('No history to export.', true); return; }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('PDF library failed to load. Check your connection and try again.', true);
    return;
  }

  const record = amcActiveActionRecord || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  if (window.registerIbmPlexFont) window.registerIbmPlexFont(doc);
  const fontName = window.registerIbmPlexFont ? 'IBMPlexSans' : 'helvetica';
  doc.setFont(fontName, 'normal');

  doc.setFontSize(15);
  doc.setTextColor(20, 30, 40);
  doc.text('Complete Maintenance & Service History', 40, 36);

  doc.setFontSize(9.5);
  doc.setTextColor(90, 100, 110);
  doc.text(`${record.category || '-'} AMC — Unit ${record.unit || '-'}${record.floor ? ' / ' + record.floor : ''}`, 40, 52);
  doc.text(`Vendor: ${record.vendorName || '-'}${record.contactInfo ? ' (' + record.contactInfo + ')' : ''}`, 40, 65);

  doc.setFontSize(8.5);
  doc.setTextColor(140, 150, 160);
  doc.text(`Generated: ${formatDailyTimestamp(new Date())}`, 40, 78);

  doc.autoTable({
    head: [['Visit Date', 'Type', 'Technician', 'Cost (₹)', 'Issue / Work Done']],
    body: logs.map(l => [
      fmtAMCDate(l.visitDate) || '-',
      l.logType || '-',
      l.technician || '-',
      (l.cost !== '' && l.cost !== null && l.cost !== undefined) ? String(l.cost) : '-',
      l.description || '-'
    ]),
    startY: 90,
    styles: {
      font: fontName,
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 40, 50],
      lineColor: [225, 229, 233],
      lineWidth: 0.5,
      overflow: 'linebreak'
    },
    headStyles: {
      font: fontName,
      fontStyle: 'bold',
      fillColor: [13, 148, 136],
      textColor: 255,
      fontSize: 8.5
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 85 },
      2: { cellWidth: 85 },
      3: { cellWidth: 55 },
      4: { cellWidth: 'auto' }
    },
    alternateRowStyles: { fillColor: [246, 248, 247] },
    margin: { left: 40, right: 40 }
  });

  // Contract & Vendor History — past terms this record has had, if any.
  const contractHistory = window._amcContractHistoryCache || [];
  if (contractHistory.length) {
    let historyY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 90) + 26;
    if (historyY > 700) { doc.addPage(); historyY = 40; }

    doc.setFontSize(12);
    doc.setTextColor(20, 30, 40);
    doc.text('Contract & Vendor History (Past Terms)', 40, historyY);

    doc.autoTable({
      head: [['Vendor', 'Contact', 'Start', 'Expiry', 'Cost (₹)', 'Frequency', 'Renewed To']],
      body: contractHistory.map(h => [
        h.vendorName || '-',
        h.contactInfo || '-',
        fmtAMCDate(h.startDate) || '-',
        fmtAMCDate(h.expiryDate) || '-',
        (h.contractCost !== '' && h.contractCost !== null && h.contractCost !== undefined) ? String(h.contractCost) : '-',
        h.frequency || '-',
        h.renewedToVendor || '-'
      ]),
      startY: historyY + 10,
      styles: {
        font: fontName,
        fontSize: 8.5,
        cellPadding: 6,
        textColor: [30, 40, 50],
        lineColor: [225, 229, 233],
        lineWidth: 0.5,
        overflow: 'linebreak'
      },
      headStyles: {
        font: fontName,
        fontStyle: 'bold',
        fillColor: [124, 58, 237],
        textColor: 255,
        fontSize: 8.5
      },
      alternateRowStyles: { fillColor: [246, 244, 253] },
      margin: { left: 40, right: 40 }
    });
  }

  const stamp = formatLocalDate(new Date());
  const unitSlug = (record.unit || 'AMC').replace(/[^a-z0-9]+/gi, '_');
  doc.save(`AMC_History_${unitSlug}_${stamp}.pdf`);
}

// Colors the "Next Service Due" value red (pulsing) if the due date falls
// within the next 30 days (or is already overdue), otherwise green (pulsing).
function applyAmcNextDuePulse(nextDueDateStr) {
  const el = document.getElementById('amcSummaryNextDue');
  if (!el) return;

  el.classList.remove('amc-nextdue-pulse-red', 'amc-nextdue-pulse-green');
  if (!nextDueDateStr) return;

  const due = new Date(nextDueDateStr);
  if (isNaN(due.getTime())) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / 86400000);
  el.classList.add(diffDays <= 30 ? 'amc-nextdue-pulse-red' : 'amc-nextdue-pulse-green');
}

function calculateAmcNextServicePreview() {
  const textEl = document.getElementById('amcCalcNextDueText');
  if (!textEl || !amcActiveActionRecord) return;

  const serviceDate = document.getElementById('amcActionServiceDate')?.value;
  const frequency = amcActiveActionRecord.frequency || 'Annual';

  if (!serviceDate) {
    textEl.innerHTML = `Please select a Service Date to calculate the next due date.`;
    return;
  }

  if (frequency === 'On-Call') {
    textEl.innerHTML = `This contract is on <strong>On-Call</strong> frequency (No fixed automated schedule).`;
    return;
  }

  const nextDue = amcCalcNextDueDate(serviceDate, frequency);
  if (nextDue) {
    textEl.innerHTML = `Based on Service Date <strong>${escapeHtml(serviceDate)}</strong> and <strong>${escapeHtml(frequency)}</strong> frequency, the next servicing due date will automatically become: <strong class="amc-highlight-due-date">${escapeHtml(nextDue)}</strong>.`;
  } else {
    textEl.innerHTML = `Could not calculate next due date.`;
  }
}

async function handleAmcServicingActionSubmit(event) {
  event.preventDefault();
  if (!amcActiveActionRecord) return;

  const visitDate = document.getElementById('amcActionServiceDate')?.value;
  if (!visitDate) {
    showToast('Please enter a service date.', true);
    return;
  }

  const payload = {
    action: 'saveAmcServiceLog',
    amcId: amcActiveActionRecord.id,
    visitDate,
    logType: 'Scheduled Service',
    technician: document.getElementById('amcActionServiceTech')?.value.trim() || '',
    cost: document.getElementById('amcActionServiceCost')?.value || '',
    description: document.getElementById('amcActionServiceDesc')?.value.trim() || 'Routine Scheduled Servicing',
    updateLastService: true,
    attachments: []
  };

  const btn = document.getElementById('amcServiceSaveBtn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving Servicing Record…'; }

  try {
    const res = await serverCall('saveAmcServiceLog', payload);
    if (res && res.ok === false) throw new Error(res.message || 'Server returned failure.');
    showToast('Routine servicing logged and Next Due Date updated successfully.');

    await loadAmcData(true);
    const refreshed = allAmcData.find(r => r.id === amcActiveActionRecord.id);
    if (refreshed) {
      openAmcActionModal(refreshed.id);
    }
  } catch (err) {
    console.error('Failed to log servicing:', err);
    showToast(`Could not log servicing: ${err.message || err}`, true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

async function handleAmcBreakdownActionSubmit(event) {
  event.preventDefault();
  if (!amcActiveActionRecord) return;

  const visitDate = document.getElementById('amcActionBreakdownDate')?.value;
  const description = document.getElementById('amcActionBreakdownDesc')?.value.trim();
  if (!visitDate || !description) {
    showToast('Please enter the breakdown date and fault description.', true);
    return;
  }

  const payload = {
    action: 'saveAmcServiceLog',
    amcId: amcActiveActionRecord.id,
    visitDate,
    logType: 'Breakdown Repair',
    technician: document.getElementById('amcActionBreakdownTech')?.value.trim() || '',
    cost: document.getElementById('amcActionBreakdownCost')?.value || '',
    description,
    updateLastService: document.getElementById('amcActionBreakdownUpdateCycle')?.checked ?? false,
    attachments: []
  };

  const btn = document.getElementById('amcBreakdownSaveBtn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving Breakdown Record…'; }

  try {
    const res = await serverCall('saveAmcServiceLog', payload);
    if (res && res.ok === false) throw new Error(res.message || 'Server returned failure.');
    showToast('Breakdown repair logged successfully.');

    await loadAmcData(true);
    const refreshed = allAmcData.find(r => r.id === amcActiveActionRecord.id);
    if (refreshed) {
      openAmcActionModal(refreshed.id);
    }
  } catch (err) {
    console.error('Failed to log breakdown:', err);
    showToast(`Could not log breakdown: ${err.message || err}`, true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

async function handleAmcContractRenewalSubmit(event) {
  event.preventDefault();
  if (!amcActiveActionRecord) return;

  const vendorName = document.getElementById('amcActionRenewVendor')?.value.trim();
  const expiryDate = document.getElementById('amcActionRenewExpiryDate')?.value;
  if (!vendorName || !expiryDate) {
    showToast('Vendor and Contract Expiry Date are required.', true);
    return;
  }

  const payload = {
    action: 'saveAmc',
    rowIndex: amcActiveActionRecord.rowIndex,
    id: amcActiveActionRecord.id,
    category: amcActiveActionRecord.category,
    unit: amcActiveActionRecord.unit,
    floor: amcActiveActionRecord.floor || '',
    vendorName,
    contactInfo: document.getElementById('amcActionRenewContact')?.value.trim() || '',
    startDate: document.getElementById('amcActionRenewStartDate')?.value || '',
    expiryDate,
    contractCost: document.getElementById('amcActionRenewCost')?.value || '',
    frequency: document.getElementById('amcActionRenewFrequency')?.value || 'Annual',
    lastServiceDate: amcActiveActionRecord.lastServiceDate,
    nextDueDate: amcActiveActionRecord.nextDueDate,
    remarks: document.getElementById('amcActionRenewRemarks')?.value.trim() || '',
    existingAttachments: amcActiveActionRecord.attachments || [],
    attachments: [],
    // Tells the backend this is a renewal (not a plain edit), so the
    // outgoing contract term gets archived into AMC Contract History
    // before the live record is overwritten with the new term.
    isRenewal: true
  };

  const btn = document.getElementById('amcRenewSaveBtn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Updating Contract…'; }

  try {
    const res = await serverCall('saveAmc', payload);
    if (res && res.ok === false) throw new Error(res.message || 'Server returned failure.');
    showToast('Contract details updated successfully.');

    await loadAmcData(true);
    const refreshed = allAmcData.find(r => r.id === amcActiveActionRecord.id);
    if (refreshed) {
      openAmcActionModal(refreshed.id);
    }
  } catch (err) {
    console.error('Failed to update contract:', err);
    showToast(`Could not update contract: ${err.message || err}`, true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

async function confirmDeleteFromActionModal() {
  if (!amcActiveActionRecord) return;
  const modal = document.getElementById('amcDeletePasswordModal');
  const input = document.getElementById('amcDeletePasswordInput');
  const error = document.getElementById('amcDeletePasswordError');
  if (!modal || !input) return;

  input.value = '';
  input.type = 'password';
  if (error) error.classList.add('hidden');
  modal.classList.remove('hidden');
  window.setTimeout(() => input.focus(), 180);
}

function closeAmcDeletePasswordModal() {
  const modal = document.getElementById('amcDeletePasswordModal');
  const input = document.getElementById('amcDeletePasswordInput');
  const error = document.getElementById('amcDeletePasswordError');
  if (modal) modal.classList.add('hidden');
  if (input) { input.value = ''; input.type = 'password'; }
  if (error) error.classList.add('hidden');
}

function toggleAmcDeletePasswordVisibility() {
  const input = document.getElementById('amcDeletePasswordInput');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

function clearAmcDeletePasswordError() {
  const input = document.getElementById('amcDeletePasswordInput');
  const error = document.getElementById('amcDeletePasswordError');
  if (input) input.classList.remove('is-invalid');
  if (error) error.classList.add('hidden');
}

async function submitAmcDeletePassword(event) {
  event.preventDefault();
  if (!amcActiveActionRecord) return;

  const input = document.getElementById('amcDeletePasswordInput');
  const error = document.getElementById('amcDeletePasswordError');
  const btn = document.getElementById('amcDeletePasswordSubmitBtn');
  if (!input || !input.value) {
    if (error) error.classList.remove('hidden');
    if (input) { input.classList.add('is-invalid'); input.focus(); input.select(); }
    return;
  }

  input.classList.remove('is-invalid');
  const rowIndex = amcActiveActionRecord.rowIndex;
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Deleting…'; }

  try {
    showToast('Deleting AMC record...');
    const res = await serverCall('deleteAmc', {
      action: 'deleteAmc',
      rowIndex,
      deletePassword: input.value
    });
    if (res && res.ok === false) throw new Error(res.message || 'Server returned failure.');
    showToast('AMC record deleted successfully.');
    closeAmcDeletePasswordModal();
    closeAmcActionModal();
    await loadAmcData(true);
  } catch (err) {
    console.error('Error deleting AMC record:', err);
    if (String(err.message || err).toLowerCase().includes('password')) {
      if (error) error.classList.remove('hidden');
      if (input) { input.classList.add('is-invalid'); input.focus(); input.select(); }
      return;
    }
    showToast(`Failed to delete record: ${err.message || err}`, true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

function handleAmcFileSelection(event) {
  const files = [...event.target.files];
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      amcFilesSelected.push({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: String(reader.result).split(',')[1]
      });
      renderAmcFileList();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function removeAmcSelectedFile(index) {
  amcFilesSelected.splice(index, 1);
  renderAmcFileList();
}

function renderAmcFileList() {
  const listEl = document.getElementById('amcFormFileList');
  if (!listEl) return;
  if (!amcFilesSelected.length) {
    listEl.innerHTML = '';
    return;
  }
  listEl.innerHTML = amcFilesSelected.map((f, i) => `
    <span class="amc-form-file-item">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${escapeHtml(f.name)}
      <button type="button" class="amc-form-file-remove" onclick="removeAmcSelectedFile(${i})" title="Remove">&times;</button>
    </span>
  `).join('');
}

async function handleAmcFormSubmit(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('amcFormSubmitBtn');
  const originalHtml = submitBtn ? submitBtn.innerHTML : '';

  const payload = {
    action: 'saveAmc',
    rowIndex: document.getElementById('amcFormRowIndex').value || null,
    id: document.getElementById('amcFormId').value || null,
    category: document.getElementById('amcFormCategory').value,
    unit: amcFormUnitsSelected.join(', '),
    floor: document.getElementById('amcFormFloor').value,
    vendorName: document.getElementById('amcFormVendor').value.trim(),
    contactInfo: document.getElementById('amcFormContact').value.trim(),
    startDate: document.getElementById('amcFormStartDate').value,
    expiryDate: document.getElementById('amcFormExpiryDate').value,
    contractCost: document.getElementById('amcFormCost').value || '',
    frequency: document.getElementById('amcFormFrequency').value,
    lastServiceDate: document.getElementById('amcFormLastService').value,
    nextDueDate: document.getElementById('amcFormNextDue').value,
    remarks: document.getElementById('amcFormRemarks').value.trim(),
    attachments: amcFilesSelected
  };

  if (!payload.category || !payload.unit || !payload.floor || !payload.vendorName || !payload.expiryDate) {
    showToast('Please fill all required fields.', true);
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving…';
  }

  try {
    const res = await serverCall('saveAmc', payload);
    if (res && res.ok === false) throw new Error(res.message || 'Server returned failure.');
    showToast('AMC record saved successfully.');
    closeAmcForm();
    await loadAmcData(true);
  } catch (err) {
    console.error('Failed to save AMC record:', err);
    showToast(`Could not save AMC record: ${err.message || err}`, true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AMC REPORT & ANALYTICS DASHBOARD FRONTEND CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

let allAmcServiceLogs = [];
let amcAllLogsPromise = null;
let amcAllLogsCachedAt = 0;
let currentAmcReportTab = 'pivot';

// Wire up menu button for AMC Report & Analysis
document.getElementById('amcReportBtn')?.addEventListener('click', () => {
  openAmcReportModal();
  const overlay = document.getElementById('headerMoreOverlay');
  const panel = document.getElementById('headerMorePanel');
  if (overlay && panel) {
    overlay.classList.remove('active');
    panel.classList.remove('active');
  }
});

async function fetchAllAmcServiceLogs(force = false) {
  const cacheIsFresh = Array.isArray(allAmcServiceLogs) && allAmcServiceLogs.length > 0 && (Date.now() - amcAllLogsCachedAt) < AMC_PREFETCH_MAX_AGE_MS;
  if (!force && cacheIsFresh) return allAmcServiceLogs;
  if (!force && amcAllLogsPromise) return amcAllLogsPromise;

  let request;
  if (window.google && google.script && google.script.run) {
    request = new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getAmcServiceLog(''));
  } else {
    request = fetchJson(bustCache(`${WEB_APP_URL}?action=amcServiceLog&amcId=`), {}, READ_REQUEST_TIMEOUT_MS);
  }

  amcAllLogsPromise = request
    .then(data => {
      allAmcServiceLogs = Array.isArray(data) ? data : [];
      amcAllLogsCachedAt = Date.now();
      return allAmcServiceLogs;
    })
    .catch(err => {
      amcAllLogsPromise = null;
      console.warn('Could not fetch all AMC logs:', err);
      return [];
    });

  return amcAllLogsPromise;
}

// All archived contract terms across every AMC record — powers the "Past
// Vendors" rows in the Vendors tab and the Contract History export sheet,
// so a vendor switch shows up in analysis even after the record moves on.
let allAmcContractHistory = [];
let amcAllHistoryPromise = null;
let amcAllHistoryCachedAt = 0;

async function fetchAllAmcContractHistory(force = false) {
  const cacheIsFresh = Array.isArray(allAmcContractHistory) && allAmcContractHistory.length > 0 && (Date.now() - amcAllHistoryCachedAt) < AMC_PREFETCH_MAX_AGE_MS;
  if (!force && cacheIsFresh) return allAmcContractHistory;
  if (!force && amcAllHistoryPromise) return amcAllHistoryPromise;

  let request;
  if (window.google && google.script && google.script.run) {
    request = new Promise((res, rej) =>
      google.script.run.withSuccessHandler(res).withFailureHandler(rej).getAmcContractHistory(''));
  } else {
    request = fetchJson(bustCache(`${WEB_APP_URL}?action=amcContractHistory&amcId=`), {}, READ_REQUEST_TIMEOUT_MS);
  }

  amcAllHistoryPromise = request
    .then(data => {
      allAmcContractHistory = Array.isArray(data) ? data : [];
      amcAllHistoryCachedAt = Date.now();
      return allAmcContractHistory;
    })
    .catch(err => {
      amcAllHistoryPromise = null;
      console.warn('Could not fetch all AMC contract history:', err);
      return [];
    });

  return amcAllHistoryPromise;
}

async function openAmcReportModal() {
  const modal = document.getElementById('amcReportModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const updatedEl = document.getElementById('amcReportUpdatedAt');
  if (updatedEl) updatedEl.textContent = `Generated: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  // Populate Unit and Floor filter options
  populateAmcReportFilterDropdowns();

  // Load both AMC master data and all service logs concurrently
  try {
    await Promise.all([
      loadAmcData(false),
      fetchAllAmcServiceLogs(false),
      fetchAllAmcContractHistory(false)
    ]);
  } catch (err) {
    console.error('Error opening AMC report data:', err);
  }

  // Re-populate dropdowns with updated units
  populateAmcReportFilterDropdowns();

  // Calculate and render all dashboard sections
  updateAmcReportDashboard();
}

function closeAmcReportModal() {
  const modal = document.getElementById('amcReportModal');
  if (modal) modal.classList.add('hidden');
}

async function refreshAmcReportData() {
  showToast('Refreshing AMC analysis data…');
  try {
    await Promise.all([
      loadAmcData(true),
      fetchAllAmcServiceLogs(true),
      fetchAllAmcContractHistory(true)
    ]);
    const updatedEl = document.getElementById('amcReportUpdatedAt');
    if (updatedEl) updatedEl.textContent = `Generated: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    populateAmcReportFilterDropdowns();
    updateAmcReportDashboard();
    showToast('Analysis data updated.');
  } catch (err) {
    showToast(`Refresh failed: ${err.message || err}`, true);
  }
}

function populateAmcReportFilterDropdowns() {
  const unitFilterEl = document.getElementById('amcRptFilterUnit');
  if (unitFilterEl) {
    const currentVal = unitFilterEl.value;
    const units = [...new Set(state.factories.concat(allAmcData.flatMap(r => amcSplitUnits(r.unit))))].filter(Boolean);
    unitFilterEl.innerHTML = '<option value="">All Units</option>' +
      units.map(u => `<option value="${escapeHtml(u)}" ${u === currentVal ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('');
  }
}

function getFilteredAmcReportRecords() {
  const unitFilter = document.getElementById('amcRptFilterUnit')?.value || '';
  const floorFilter = document.getElementById('amcRptFilterFloor')?.value || '';
  const categoryFilter = document.getElementById('amcRptFilterCategory')?.value || '';
  const statusFilter = document.getElementById('amcRptFilterStatus')?.value || '';
  const searchFilter = (document.getElementById('amcRptSearchInput')?.value || '').toLowerCase().trim();

  return allAmcData.filter(r => {
    if (unitFilter && !amcSplitUnits(r.unit).includes(unitFilter)) return false;
    if (floorFilter && r.floor !== floorFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (statusFilter) {
      if (statusFilter === 'Overdue' && r.serviceStatus !== 'Overdue') return false;
      if (statusFilter === 'Due Soon' && r.serviceStatus !== 'Due Soon') return false;
      if (statusFilter === 'Expired' && r.status !== 'Expired') return false;
      if (statusFilter === 'Expiring Soon' && r.status !== 'Expiring Soon') return false;
      if (statusFilter === 'Active' && r.status !== 'Active') return false;
    }
    if (searchFilter) {
      const matchStr = [r.vendorName, r.contactInfo, r.remarks, r.unit, r.floor, r.id, r.category].join(' ').toLowerCase();
      if (!matchStr.includes(searchFilter)) return false;
    }
    return true;
  });
}

function applyAmcReportFilters() {
  updateAmcReportDashboard();
}

function resetAmcReportFilters() {
  const unitFilter = document.getElementById('amcRptFilterUnit');
  const floorFilter = document.getElementById('amcRptFilterFloor');
  const categoryFilter = document.getElementById('amcRptFilterCategory');
  const statusFilter = document.getElementById('amcRptFilterStatus');
  const searchInput = document.getElementById('amcRptSearchInput');

  if (unitFilter) unitFilter.value = '';
  if (floorFilter) floorFilter.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  if (searchInput) searchInput.value = '';

  updateAmcReportDashboard();
}

function switchAmcReportTab(tabKey) {
  currentAmcReportTab = tabKey;
  document.querySelectorAll('.amc-rpt-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.amc-rpt-tab-content').forEach(c => c.classList.add('hidden'));

  if (tabKey === 'pivot') {
    document.getElementById('amcRptTabBtnPivot')?.classList.add('active');
    document.getElementById('amcRptTabContentPivot')?.classList.remove('hidden');
    renderAmcPivotTable();
  } else if (tabKey === 'delays') {
    document.getElementById('amcRptTabBtnDelays')?.classList.add('active');
    document.getElementById('amcRptTabContentDelays')?.classList.remove('hidden');
    renderAmcDelaysTable();
  } else if (tabKey === 'breakdowns') {
    document.getElementById('amcRptTabBtnBreakdowns')?.classList.add('active');
    document.getElementById('amcRptTabContentBreakdowns')?.classList.remove('hidden');
    renderAmcBreakdownsTable();
  } else if (tabKey === 'vendors') {
    document.getElementById('amcRptTabBtnVendors')?.classList.add('active');
    document.getElementById('amcRptTabContentVendors')?.classList.remove('hidden');
    renderAmcVendorsTable();
  }
}

function updateAmcReportDashboard() {
  const filteredRecords = getFilteredAmcReportRecords();
  const recordIds = new Set(filteredRecords.map(r => r.id));
  const filteredLogs = allAmcServiceLogs.filter(l => recordIds.has(l.amcId));
  const filteredHistory = allAmcContractHistory.filter(h => recordIds.has(h.recordId));

  const totalAssets = filteredRecords.length;
  const activeContracts = filteredRecords.filter(r => r.status === 'Active').length;
  const overdueCount = filteredRecords.filter(r => r.serviceStatus === 'Overdue').length;
  const dueSoonCount = filteredRecords.filter(r => r.serviceStatus === 'Due Soon').length;
  const expiredContracts = filteredRecords.filter(r => r.status === 'Expired').length;
  const expiringContracts = filteredRecords.filter(r => r.status === 'Expiring Soon').length;

  const breakdownCount = filteredLogs.filter(l => l.logType === 'Breakdown Repair').length;
  const scheduledCount = filteredLogs.filter(l => l.logType === 'Scheduled Service').length;

  const currentContractCostTotal = filteredRecords.reduce((sum, r) => {
    const num = parseFloat(r.contractCost);
    return sum + (!isNaN(num) ? num : 0);
  }, 0);
  const pastContractCostTotal = filteredHistory.reduce((sum, h) => {
    const num = parseFloat(h.contractCost);
    return sum + (!isNaN(num) ? num : 0);
  }, 0);
  const totalContractCost = currentContractCostTotal + pastContractCostTotal;

  const servicingCostTotal = filteredLogs.filter(l => l.logType === 'Scheduled Service').reduce((sum, l) => {
    const num = parseFloat(l.cost);
    return sum + (!isNaN(num) ? num : 0);
  }, 0);
  const breakdownCostTotal = filteredLogs.filter(l => l.logType === 'Breakdown Repair').reduce((sum, l) => {
    const num = parseFloat(l.cost);
    return sum + (!isNaN(num) ? num : 0);
  }, 0);
  const totalMaintCost = servicingCostTotal + breakdownCostTotal;
  const grandTotalCost = totalContractCost + totalMaintCost;

  document.getElementById('amcRptTotalAssets').textContent = totalAssets;
  document.getElementById('amcRptActiveSub').textContent = `${activeContracts} Active (${expiringContracts} Expiring)`;
  document.getElementById('amcRptOverdueCount').textContent = overdueCount;
  document.getElementById('amcRptDueSoonSub').textContent = `${dueSoonCount} Due Soon`;
  document.getElementById('amcRptBreakdownCount').textContent = breakdownCount;
  document.getElementById('amcRptScheduledVisitsSub').textContent = `${scheduledCount} Scheduled Visits`;
  document.getElementById('amcRptTotalCost').textContent = `₹${grandTotalCost.toLocaleString('en-IN')}`;
  document.getElementById('amcRptExpiredContractsSub').textContent = `Current ₹${currentContractCostTotal.toLocaleString('en-IN')} | Past ₹${pastContractCostTotal.toLocaleString('en-IN')} | Svc ₹${servicingCostTotal.toLocaleString('en-IN')} | Repair ₹${breakdownCostTotal.toLocaleString('en-IN')}`;

  if (currentAmcReportTab === 'pivot') renderAmcPivotTable();
  else if (currentAmcReportTab === 'delays') renderAmcDelaysTable();
  else if (currentAmcReportTab === 'breakdowns') renderAmcBreakdownsTable();
  else if (currentAmcReportTab === 'vendors') renderAmcVendorsTable();
}

function renderAmcPivotTable() {
  const container = document.getElementById('amcPivotTableContainer');
  if (!container) return;

  const records = getFilteredAmcReportRecords();
  const recordIds = new Set(records.map(r => r.id));
  const logs = allAmcServiceLogs.filter(l => recordIds.has(l.amcId));
  const history = allAmcContractHistory.filter(h => recordIds.has(h.recordId));
  const dimension = document.getElementById('amcPivotDimension')?.value || 'unit_floor';

  if (!records.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">No AMC records match the selected filter criteria.</div>';
    return;
  }

  const allCategories = [
    'Generator',
    'Fire',
    'Lift',
    'Air Condition',
    'Water Filter',
    'CCTV Camera',
    'Sound System & intercom',
    'Solar Panel Maintenance'
  ];

  if (dimension === 'unit_floor') {
    const rowKeys = [...new Set(records.map(r => `${r.unit}|||${r.floor || 'All Floors'}`))].sort();

    let headHtml = `
      <thead>
        <tr>
          <th class="sticky-col" style="min-width:180px;">Unit &amp; Floor</th>
          ${allCategories.map(cat => `<th style="min-width:130px;">${escapeHtml(cat)}</th>`).join('')}
          <th style="min-width:150px;background-color:#172554;">Total Overview</th>
        </tr>
      </thead>
    `;

    const catTotals = {};
    allCategories.forEach(c => catTotals[c] = { total: 0, overdue: 0, breakdown: 0, currentCost: 0, pastCost: 0, maintCost: 0, cost: 0 });
    let grandTotal = { total: 0, overdue: 0, breakdown: 0, currentCost: 0, pastCost: 0, maintCost: 0, cost: 0 };

    let bodyHtml = rowKeys.map(rowKey => {
      const [unit, floor] = rowKey.split('|||');
      let rowTotal = { total: 0, overdue: 0, breakdown: 0, currentCost: 0, pastCost: 0, maintCost: 0, cost: 0 };

      const cells = allCategories.map(cat => {
        const matching = records.filter(r => r.unit === unit && (r.floor || 'All Floors') === floor && r.category === cat);
        if (!matching.length) {
          return `<td style="color:#94a3b8;">—</td>`;
        }

        const count = matching.length;
        const overdue = matching.filter(r => r.serviceStatus === 'Overdue').length;
        const matchingIds = new Set(matching.map(r => r.id));
        const matchingLogs = logs.filter(l => matchingIds.has(l.amcId));
        const matchingHistory = history.filter(h => matchingIds.has(h.recordId));
        const breakdowns = matchingLogs.filter(l => l.logType === 'Breakdown Repair').length;
        
        const currentCost = matching.reduce((sum, r) => sum + (parseFloat(r.contractCost) || 0), 0);
        const pastCost = matchingHistory.reduce((sum, h) => sum + (parseFloat(h.contractCost) || 0), 0);
        const svcCost = matchingLogs.filter(l => l.logType === 'Scheduled Service').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
        const bkdCost = matchingLogs.filter(l => l.logType === 'Breakdown Repair').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
        const maintCost = svcCost + bkdCost;
        const cost = currentCost + pastCost + maintCost;

        rowTotal.total += count;
        rowTotal.overdue += overdue;
        rowTotal.breakdown += breakdowns;
        rowTotal.currentCost += currentCost;
        rowTotal.pastCost += pastCost;
        rowTotal.maintCost += maintCost;
        rowTotal.cost += cost;

        catTotals[cat].total += count;
        catTotals[cat].overdue += overdue;
        catTotals[cat].breakdown += breakdowns;
        catTotals[cat].currentCost += currentCost;
        catTotals[cat].pastCost += pastCost;
        catTotals[cat].maintCost += maintCost;
        catTotals[cat].cost += cost;

        return `
          <td>
            <div class="pivot-cell-box">
              <span class="pivot-tag tag-active">${count} Asset${count > 1 ? 's' : ''}</span>
              ${overdue ? `<span class="pivot-tag tag-overdue">${overdue} Overdue</span>` : ''}
              ${breakdowns ? `<span class="pivot-tag tag-breakdown">${breakdowns} Repair${breakdowns > 1 ? 's' : ''}</span>` : ''}
              ${currentCost > 0 ? `<span class="pivot-tag" style="background:#eff6ff;color:#1d4ed8;font-size:10px;" title="Current Term Rate">Curr ₹${currentCost.toLocaleString('en-IN')}</span>` : ''}
              ${pastCost > 0 ? `<span class="pivot-tag" style="background:#ede9fe;color:#5b21b6;font-size:10px;" title="Past Term Renewals">Past ₹${pastCost.toLocaleString('en-IN')}</span>` : ''}
              ${maintCost > 0 ? `<span class="pivot-tag" style="background:#fef3c7;color:#b45309;font-size:10px;" title="Svc ₹${svcCost.toLocaleString('en-IN')} + Repair ₹${bkdCost.toLocaleString('en-IN')}">Maint ₹${maintCost.toLocaleString('en-IN')}</span>` : ''}
              ${cost > 0 ? `<span class="pivot-tag tag-cost" title="Current ₹${currentCost.toLocaleString('en-IN')} + Past ₹${pastCost.toLocaleString('en-IN')} + Maint ₹${maintCost.toLocaleString('en-IN')}">Total ₹${cost.toLocaleString('en-IN')}</span>` : ''}
            </div>
          </td>
        `;
      }).join('');

      grandTotal.total += rowTotal.total;
      grandTotal.overdue += rowTotal.overdue;
      grandTotal.breakdown += rowTotal.breakdown;
      grandTotal.currentCost += rowTotal.currentCost;
      grandTotal.pastCost += rowTotal.pastCost;
      grandTotal.maintCost += rowTotal.maintCost;
      grandTotal.cost += rowTotal.cost;

      return `
        <tr>
          <td class="sticky-col">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml(unit)}</div>
            <div style="font-size:11px;color:var(--muted);">${escapeHtml(floor)}</div>
          </td>
          ${cells}
          <td style="background-color:rgba(30,58,138,0.05);font-weight:700;">
            <div class="pivot-cell-box">
              <strong style="color:#1e3a8a;">${rowTotal.total} Total Assets</strong>
              ${rowTotal.overdue ? `<span class="pivot-tag tag-overdue">${rowTotal.overdue} Overdue</span>` : ''}
              ${rowTotal.breakdown ? `<span class="pivot-tag tag-breakdown">${rowTotal.breakdown} Repairs</span>` : ''}
              ${rowTotal.currentCost > 0 ? `<span class="pivot-tag" style="background:#eff6ff;color:#1d4ed8;font-size:10px;">Curr ₹${rowTotal.currentCost.toLocaleString('en-IN')}</span>` : ''}
              ${rowTotal.pastCost > 0 ? `<span class="pivot-tag" style="background:#ede9fe;color:#5b21b6;font-size:10px;">Past ₹${rowTotal.pastCost.toLocaleString('en-IN')}</span>` : ''}
              ${rowTotal.maintCost > 0 ? `<span class="pivot-tag" style="background:#fef3c7;color:#b45309;font-size:10px;">Maint ₹${rowTotal.maintCost.toLocaleString('en-IN')}</span>` : ''}
              ${rowTotal.cost > 0 ? `<span class="pivot-tag tag-cost" style="font-weight:800;">Total ₹${rowTotal.cost.toLocaleString('en-IN')}</span>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    let footHtml = `
      <tfoot>
        <tr>
          <td class="sticky-col">Grand Total</td>
          ${allCategories.map(cat => {
            const ct = catTotals[cat];
            if (!ct.total) return `<td style="color:#94a3b8;">0</td>`;
            return `
              <td>
                <div class="pivot-cell-box">
                  <strong>${ct.total}</strong>
                  ${ct.overdue ? `<span class="pivot-tag tag-overdue">${ct.overdue} Overdue</span>` : ''}
                  ${ct.breakdown ? `<span class="pivot-tag tag-breakdown">${ct.breakdown} Repairs</span>` : ''}
                  ${ct.currentCost > 0 ? `<span class="pivot-tag" style="background:#eff6ff;color:#1d4ed8;font-size:10px;">Curr ₹${ct.currentCost.toLocaleString('en-IN')}</span>` : ''}
                  ${ct.pastCost > 0 ? `<span class="pivot-tag" style="background:#ede9fe;color:#5b21b6;font-size:10px;">Past ₹${ct.pastCost.toLocaleString('en-IN')}</span>` : ''}
                  ${ct.maintCost > 0 ? `<span class="pivot-tag" style="background:#fef3c7;color:#b45309;font-size:10px;">Maint ₹${ct.maintCost.toLocaleString('en-IN')}</span>` : ''}
                  ${ct.cost > 0 ? `<span class="pivot-tag tag-cost">Total ₹${ct.cost.toLocaleString('en-IN')}</span>` : ''}
                </div>
              </td>
            `;
          }).join('')}
          <td style="background-color:#1e3a8a;color:#ffffff;">
            <div class="pivot-cell-box">
              <span style="font-size:14px;font-weight:800;color:#ffffff;">${grandTotal.total} Assets</span>
              ${grandTotal.overdue ? `<span class="pivot-tag tag-overdue" style="background:#ffffff;color:#dc2626;">${grandTotal.overdue} Overdue</span>` : ''}
              ${grandTotal.currentCost > 0 ? `<span class="pivot-tag" style="background:#dbeafe;color:#1e3a8a;font-size:10.5px;">Curr ₹${grandTotal.currentCost.toLocaleString('en-IN')}</span>` : ''}
              ${grandTotal.pastCost > 0 ? `<span class="pivot-tag" style="background:#ede9fe;color:#5b21b6;font-size:10.5px;">Past ₹${grandTotal.pastCost.toLocaleString('en-IN')}</span>` : ''}
              ${grandTotal.maintCost > 0 ? `<span class="pivot-tag" style="background:#fef3c7;color:#92400e;font-size:10.5px;">Maint ₹${grandTotal.maintCost.toLocaleString('en-IN')}</span>` : ''}
              ${grandTotal.cost > 0 ? `<span class="pivot-tag" style="background:#ffffff;color:#1e3a8a;font-weight:800;">Total ₹${grandTotal.cost.toLocaleString('en-IN')}</span>` : ''}
            </div>
          </td>
        </tr>
      </tfoot>
    `;

    container.innerHTML = `
      <table class="amc-pivot-table">
        ${headHtml}
        <tbody>${bodyHtml}</tbody>
        ${footHtml}
      </table>
    `;
  } else if (dimension === 'category_status') {
    let headHtml = `
      <thead>
        <tr>
          <th class="sticky-col" style="min-width:180px;">Category</th>
          <th>Total Assets</th>
          <th>Active</th>
          <th>Expiring Soon</th>
          <th>Expired</th>
          <th>Service Due Soon</th>
          <th>Service Overdue</th>
          <th>Breakdown Repairs</th>
          <th>Current Contract (₹)</th>
          <th>Past Contracts (₹)</th>
          <th>Total Contract (₹)</th>
          <th>Routine Service Cost (₹)</th>
          <th>Breakdown Repair Cost (₹)</th>
          <th>Grand Total Spend (₹)</th>
          <th>Compliance Rate</th>
        </tr>
      </thead>
    `;

    let bodyHtml = allCategories.map(cat => {
      const matching = records.filter(r => r.category === cat);
      const count = matching.length;
      if (!count) {
        return `
          <tr>
            <td class="sticky-col">${escapeHtml(cat)}</td>
            <td style="color:#94a3b8;">0</td>
            <td style="color:#94a3b8;">0</td>
            <td style="color:#94a3b8;">0</td>
            <td style="color:#94a3b8;">0</td>
            <td style="color:#94a3b8;">0</td>
            <td style="color:#94a3b8;">0</td>
            <td style="color:#94a3b8;">0</td>
            <td style="color:#94a3b8;">₹0</td>
            <td style="color:#94a3b8;">₹0</td>
            <td style="color:#94a3b8;">₹0</td>
            <td style="color:#94a3b8;">₹0</td>
            <td style="color:#94a3b8;">₹0</td>
            <td style="color:#94a3b8;">₹0</td>
            <td style="color:#94a3b8;">100%</td>
          </tr>
        `;
      }

      const active = matching.filter(r => r.status === 'Active').length;
      const expiring = matching.filter(r => r.status === 'Expiring Soon').length;
      const expired = matching.filter(r => r.status === 'Expired').length;
      const dueSoon = matching.filter(r => r.serviceStatus === 'Due Soon').length;
      const overdue = matching.filter(r => r.serviceStatus === 'Overdue').length;

      const matchingIds = new Set(matching.map(r => r.id));
      const matchingLogs = logs.filter(l => matchingIds.has(l.amcId));
      const matchingHistory = history.filter(h => matchingIds.has(h.recordId));
      const breakdowns = matchingLogs.filter(l => l.logType === 'Breakdown Repair').length;
      
      const currentContractCost = matching.reduce((sum, r) => sum + (parseFloat(r.contractCost) || 0), 0);
      const pastContractCost = matchingHistory.reduce((sum, h) => sum + (parseFloat(h.contractCost) || 0), 0);
      const totalContractVal = currentContractCost + pastContractCost;

      const servicingCost = matchingLogs.filter(l => l.logType === 'Scheduled Service').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
      const breakdownCost = matchingLogs.filter(l => l.logType === 'Breakdown Repair').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
      const cost = totalContractVal + servicingCost + breakdownCost;

      const onTrack = count - (overdue + expired);
      const compliance = Math.round((onTrack / count) * 100);

      return `
        <tr>
          <td class="sticky-col"><strong>${escapeHtml(cat)}</strong></td>
          <td><strong>${count}</strong></td>
          <td><span class="pivot-tag tag-active">${active}</span></td>
          <td>${expiring ? `<span class="pivot-tag tag-breakdown">${expiring}</span>` : '0'}</td>
          <td>${expired ? `<span class="pivot-tag tag-overdue">${expired}</span>` : '0'}</td>
          <td>${dueSoon ? `<span class="pivot-tag tag-breakdown">${dueSoon}</span>` : '0'}</td>
          <td>${overdue ? `<span class="pivot-tag tag-overdue">${overdue}</span>` : '0'}</td>
          <td>${breakdowns ? `<span class="pivot-tag tag-breakdown">${breakdowns}</span>` : '0'}</td>
          <td style="color:#1d4ed8;font-weight:700;">₹${currentContractCost.toLocaleString('en-IN')}</td>
          <td style="color:#7c3aed;font-weight:600;">₹${pastContractCost.toLocaleString('en-IN')}</td>
          <td style="color:#1e3a8a;font-weight:700;">₹${totalContractVal.toLocaleString('en-IN')}</td>
          <td style="color:#059669;font-weight:600;">₹${servicingCost.toLocaleString('en-IN')}</td>
          <td style="color:#ea580c;font-weight:600;">₹${breakdownCost.toLocaleString('en-IN')}</td>
          <td style="font-weight:800;color:#047857;">₹${cost.toLocaleString('en-IN')}</td>
          <td>
            <strong style="color:${compliance < 80 ? '#dc2626' : compliance < 100 ? '#ea580c' : '#15803d'};">
              ${compliance}%
            </strong>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="amc-pivot-table">
        ${headHtml}
        <tbody>${bodyHtml}</tbody>
      </table>
    `;
  } else if (dimension === 'vendor_category') {
    const currentVendors = [...new Set(records.map(r => r.vendorName).filter(Boolean))];
    const currentVendorSet = new Set(currentVendors);
    const pastVendors = [...new Set(history.map(h => h.vendorName).filter(Boolean))].filter(v => !currentVendorSet.has(v));
    const vendors = [...currentVendors, ...pastVendors].sort();

    let headHtml = `
      <thead>
        <tr>
          <th class="sticky-col" style="min-width:200px;">Vendor Agency</th>
          <th>Covered Categories</th>
          <th>Units Covered</th>
          <th>Total Contracts</th>
          <th>Active</th>
          <th>Overdue Visits</th>
          <th>Breakdowns</th>
          <th>Live Term (₹)</th>
          <th>Past Terms (₹)</th>
          <th>Total Contract (₹)</th>
          <th>Routine Service Spend (₹)</th>
          <th>Breakdown Repair Spend (₹)</th>
          <th>Total Spend (₹)</th>
        </tr>
      </thead>
    `;

    let bodyHtml = vendors.map(vendor => {
      const matching = records.filter(r => r.vendorName === vendor);
      const historyMatching = history.filter(h => h.vendorName === vendor);

      const cats = [...new Set([...matching.map(r => r.category), ...historyMatching.map(h => h.category)])].join(', ');
      const units = [...new Set([...matching.map(r => r.unit), ...historyMatching.map(h => h.unit)])].join(', ');
      const active = matching.filter(r => r.status === 'Active').length;
      const overdue = matching.filter(r => r.serviceStatus === 'Overdue').length;

      const matchingIds = new Set(matching.map(r => r.id));
      const matchingLogs = logs.filter(l => matchingIds.has(l.amcId));
      const breakdowns = matchingLogs.filter(l => l.logType === 'Breakdown Repair').length;
      
      const liveContractCost = matching.reduce((sum, r) => sum + (parseFloat(r.contractCost) || 0), 0);
      const pastContractCost = historyMatching.reduce((sum, h) => sum + (parseFloat(h.contractCost) || 0), 0);
      const totalContractVal = liveContractCost + pastContractCost;

      const servicingCost = matchingLogs.filter(l => l.logType === 'Scheduled Service').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
      const breakdownCost = matchingLogs.filter(l => l.logType === 'Breakdown Repair').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
      const cost = totalContractVal + servicingCost + breakdownCost;

      return `
        <tr>
          <td class="sticky-col">
            <strong>${escapeHtml(vendor)}</strong>
            <div style="font-size:11px;color:var(--muted);">${escapeHtml(matching[0]?.contactInfo || historyMatching[0]?.contactInfo || '')}</div>
          </td>
          <td>${escapeHtml(cats)}</td>
          <td>${escapeHtml(units)}</td>
          <td><strong>${matching.length + historyMatching.length}</strong></td>
          <td><span class="pivot-tag tag-active">${active}</span></td>
          <td>${overdue ? `<span class="pivot-tag tag-overdue">${overdue}</span>` : '0'}</td>
          <td>${breakdowns ? `<span class="pivot-tag tag-breakdown">${breakdowns}</span>` : '0'}</td>
          <td><span style="color:#1d4ed8;font-weight:700;">${liveContractCost > 0 ? '₹' + liveContractCost.toLocaleString('en-IN') : '—'}</span></td>
          <td><span style="color:#7c3aed;font-weight:600;">${pastContractCost > 0 ? '₹' + pastContractCost.toLocaleString('en-IN') : '—'}</span></td>
          <td><strong style="color:#1e3a8a;">${totalContractVal > 0 ? '₹' + totalContractVal.toLocaleString('en-IN') : '—'}</strong></td>
          <td><span style="color:#059669;font-weight:600;">₹${servicingCost.toLocaleString('en-IN')}</span></td>
          <td><span style="color:#ea580c;font-weight:600;">₹${breakdownCost.toLocaleString('en-IN')}</span></td>
          <td title="Live ₹${liveContractCost.toLocaleString('en-IN')} + Past ₹${pastContractCost.toLocaleString('en-IN')} + Service ₹${servicingCost.toLocaleString('en-IN')} + Breakdown ₹${breakdownCost.toLocaleString('en-IN')}"><strong style="color:#047857;">₹${cost.toLocaleString('en-IN')}</strong></td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="amc-pivot-table">
        ${headHtml}
        <tbody>${bodyHtml}</tbody>
      </table>
    `;
  }
}

function renderAmcOpenServiceDelays() {
  const container = document.getElementById('amcDelaysTableContainer');
  const cardsRow = document.getElementById('amcDelayCardsRow');
  if (!container) return;

  const records = getFilteredAmcReportRecords();
  const overdueList = records.filter(r => r.serviceStatus === 'Overdue' || r.serviceStatus === 'Due Soon');

  let criticalCount = 0; 
  let severeCount = 0;   
  let moderateCount = 0; 

  overdueList.forEach(r => {
    const days = Math.abs(r.serviceDaysLeft || 0);
    if (r.serviceStatus === 'Overdue') {
      if (days > 60) criticalCount++;
      else if (days >= 30) severeCount++;
      else moderateCount++;
    } else {
      moderateCount++;
    }
  });

  if (cardsRow) {
    cardsRow.innerHTML = `
      <div class="amc-sub-summary-card card-critical">
        <div class="amc-sub-summary-info">
          <h5>Critical Delay (>60 Days)</h5>
          <p>Immediate executive escalation needed</p>
        </div>
        <span class="amc-sub-summary-val" style="color:#dc2626;">${criticalCount}</span>
      </div>
      <div class="amc-sub-summary-card card-warning">
        <div class="amc-sub-summary-info">
          <h5>Severe Delay (30–60 Days)</h5>
          <p>Follow up with service vendors</p>
        </div>
        <span class="amc-sub-summary-val" style="color:#ea580c;">${severeCount}</span>
      </div>
      <div class="amc-sub-summary-card card-info">
        <div class="amc-sub-summary-info">
          <h5>Moderate / Due Soon (&lt;30 Days)</h5>
          <p>Schedule technician visit</p>
        </div>
        <span class="amc-sub-summary-val" style="color:#1e3a8a;">${moderateCount}</span>
      </div>
    `;
  }

  if (!overdueList.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#15803d;font-weight:600;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Excellent! All equipment servicing schedules are currently up to date with zero delays.</div>';
    return;
  }

  const sorted = [...overdueList].sort((a, b) => (a.serviceDaysLeft || 0) - (b.serviceDaysLeft || 0));

  let headHtml = `
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>Unit</th>
        <th>Floor</th>
        <th>AMC Category</th>
        <th>Vendor Agency</th>
        <th>Last Serviced</th>
        <th>Next Due Date</th>
        <th>Contract Cost (₹)</th>
        <th>Delay Duration</th>
        <th>Severity Level</th>
        <th>Action</th>
      </tr>
    </thead>
  `;

  let bodyHtml = sorted.map((r, i) => {
    const isOverdue = r.serviceStatus === 'Overdue';
    const days = Math.abs(r.serviceDaysLeft || 0);

    let severityBadge = '';
    if (isOverdue) {
      if (days > 60) severityBadge = '<span class="pivot-tag tag-overdue" style="background:#fee2e2;color:#991b1b;"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><path d="M12 9v4"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 17h.01"/></svg>Critical Delay (&gt;60d)</span>';
      else if (days >= 30) severityBadge = '<span class="pivot-tag tag-breakdown"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><path d="M12 9v4"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 17h.01"/></svg>Severe Delay (30-60d)</span>';
      else severityBadge = '<span class="pivot-tag tag-breakdown" style="background:#fef3c7;color:#92400e;">Moderate Delay (&lt;30d)</span>';
    } else {
      severityBadge = '<span class="pivot-tag" style="background:#e0f2fe;color:#0369a1;"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Service Due Soon</span>';
    }

    const cc = (r.contractCost !== '' && r.contractCost !== null && r.contractCost !== undefined) ? Number(r.contractCost) : 0;

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(r.unit)}</strong></td>
        <td>${escapeHtml(r.floor || '—')}</td>
        <td><strong>${escapeHtml(r.category)}</strong></td>
        <td>
          <div>${escapeHtml(r.vendorName || '—')}</div>
          <div style="font-size:11px;color:var(--muted);">${escapeHtml(r.contactInfo || '')}</div>
        </td>
        <td>${fmtAMCDate(r.lastServiceDate)}</td>
        <td><strong class="${amcNextDuePulseClass(r)}">${fmtAMCDate(r.nextDueDate)}</strong></td>
        <td style="color:#1d4ed8;font-weight:700;">${cc > 0 ? '₹' + cc.toLocaleString('en-IN') : '—'}</td>
        <td>
          <strong style="color:${isOverdue ? '#dc2626' : '#ea580c'};">
            ${isOverdue ? `${days} Days Overdue` : `Due in ${days} Days`}
          </strong>
        </td>
        <td>${severityBadge}</td>
        <td>
          <button class="amc-take-action-btn" type="button" onclick="closeAmcReportModal();openAmcActionModal('${escapeHtml(r.id)}')">
            Take Action
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="amc-pivot-table">
      ${headHtml}
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

function renderAmcDelaysTable() {
  const container = document.getElementById('amcDelaysTableContainer');
  const cardsRow = document.getElementById('amcDelayCardsRow');
  if (!container) return;

  const records = getFilteredAmcReportRecords();
  const recordMap = new Map(records.map(r => [r.id, r]));
  const delayedServices = allAmcServiceLogs
    .filter(log => recordMap.has(log.amcId) && log.logType === 'Scheduled Service' && Number(log.delayDays) > 0)
    .sort((a, b) => Number(b.delayDays) - Number(a.delayDays));
  const totalDelayDays = delayedServices.reduce((sum, log) => sum + Number(log.delayDays || 0), 0);
  const criticalCount = delayedServices.filter(log => Number(log.delayDays) > 60).length;
  const severeCount = delayedServices.filter(log => Number(log.delayDays) >= 30 && Number(log.delayDays) <= 60).length;
  const shortDelayCount = delayedServices.length - criticalCount - severeCount;

  if (cardsRow) {
    cardsRow.innerHTML = `
      <div class="amc-sub-summary-card card-critical amc-delay-kpi-card" onclick="openAmcKpiDrilldown('completedLate')" title="View all services completed after the due date" role="button" tabindex="0"><div class="amc-sub-summary-info"><h5>Late Services Completed</h5><p>Completed after their scheduled due date · View details →</p></div><span class="amc-sub-summary-val" style="color:#dc2626;">${delayedServices.length}</span></div>
      <div class="amc-sub-summary-card card-warning amc-delay-kpi-card" onclick="openAmcKpiDrilldown('delayDays')" title="View services contributing to total delay days" role="button" tabindex="0"><div class="amc-sub-summary-info"><h5>Total Delay Days</h5><p>Combined lateness of completed services · View details →</p></div><span class="amc-sub-summary-val" style="color:#ea580c;">${totalDelayDays}</span></div>
      <div class="amc-sub-summary-card card-info amc-delay-kpi-card" onclick="openAmcKpiDrilldown('delaySeverity')" title="View delay severity breakdown" role="button" tabindex="0"><div class="amc-sub-summary-info"><h5>Critical / Severe / Short</h5><p>&gt;60d / 30–60d / under 30d late · View details →</p></div><span class="amc-sub-summary-val" style="color:#1e3a8a;">${criticalCount} / ${severeCount} / ${shortDelayCount}</span></div>`;
  }

  if (!delayedServices.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#15803d;font-weight:600;">No completed delayed service is recorded for the selected filters. Delay tracking begins automatically for each newly logged scheduled service.</div>';
    return;
  }

  const rows = delayedServices.map((log, index) => {
    const record = recordMap.get(log.amcId) || {};
    const days = Number(log.delayDays);
    const severity = days > 60 ? 'Critical (>60d)' : days >= 30 ? 'Severe (30–60d)' : 'Short Delay (<30d)';
    const cc = (record.contractCost !== '' && record.contractCost !== null && record.contractCost !== undefined) ? Number(record.contractCost) : 0;
    const logCost = (log.cost !== '' && log.cost !== null && log.cost !== undefined) ? Number(log.cost) : 0;
    return `<tr><td>${index + 1}</td><td><strong>${escapeHtml(record.category || '—')}</strong><div style="font-size:11px;color:var(--muted);">${escapeHtml(record.id || '')}</div></td><td><strong>${escapeHtml(record.unit || '—')}</strong><div style="font-size:11px;color:var(--muted);">${escapeHtml(record.floor || '—')}</div></td><td>${fmtAMCDate(log.scheduledDueDate)}</td><td><strong>${fmtAMCDate(log.visitDate)}</strong></td><td style="color:#1d4ed8;font-weight:700;">${cc > 0 ? '₹' + cc.toLocaleString('en-IN') : '—'}</td><td style="color:#059669;font-weight:600;">${logCost > 0 ? '₹' + logCost.toLocaleString('en-IN') : '₹0'}</td><td><strong style="color:#dc2626;">${days} day${days === 1 ? '' : 's'} late</strong></td><td><span class="pivot-tag ${days > 60 ? 'tag-overdue' : 'tag-breakdown'}">${severity}</span></td><td><strong>${escapeHtml(record.vendorName || '—')}</strong><div style="font-size:11px;color:var(--muted);">${escapeHtml(record.contactInfo || '')}</div></td><td>${escapeHtml(log.technician || '—')}<div style="font-size:11px;color:var(--muted);">${escapeHtml(log.description || '')}</div></td></tr>`;
  }).join('');
  container.innerHTML = `<table class="amc-pivot-table"><thead><tr><th>#</th><th>AMC Service</th><th>Location</th><th>Scheduled Due</th><th>Actual Service Date</th><th>Contract Value (₹)</th><th>Visit Cost (₹)</th><th>Completion Delay</th><th>Severity</th><th>Vendor / Contact</th><th>Technician / Work Done</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderAmcBreakdownsTable() {
  const container = document.getElementById('amcBreakdownsTableContainer');
  const summaryRow = document.getElementById('amcBreakdownSummaryRow');
  if (!container) return;

  const records = getFilteredAmcReportRecords();
  const recordMap = new Map(records.map(r => [r.id, r]));
  const logs = allAmcServiceLogs.filter(l => recordMap.has(l.amcId) && l.logType === 'Breakdown Repair');
  const history = allAmcContractHistory.filter(h => recordMap.has(h.recordId));

  const totalBreakdowns = logs.length;
  const totalRepairCost = logs.reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);

  const equipFailures = {};
  const affectedUnitIds = new Set();
  logs.forEach(l => {
    equipFailures[l.amcId] = (equipFailures[l.amcId] || 0) + 1;
    affectedUnitIds.add(l.amcId);
  });
  const recurringCount = Object.values(equipFailures).filter(c => c > 1).length;

  const affectedCurrentContractCost = [...affectedUnitIds].reduce((sum, id) => {
    const rec = recordMap.get(id);
    const num = parseFloat(rec?.contractCost);
    return sum + (!isNaN(num) ? num : 0);
  }, 0);
  const affectedPastContractCost = history.filter(h => affectedUnitIds.has(h.recordId)).reduce((sum, h) => {
    const num = parseFloat(h.contractCost);
    return sum + (!isNaN(num) ? num : 0);
  }, 0);
  const totalAffectedContractVal = affectedCurrentContractCost + affectedPastContractCost;
  const totalAffectedSpend = totalAffectedContractVal + totalRepairCost;

  if (summaryRow) {
    summaryRow.innerHTML = `
      <div class="amc-sub-summary-card card-warning">
        <div class="amc-sub-summary-info">
          <h5>Total Breakdown Incidents</h5>
          <p>Unscheduled emergency visits logged</p>
        </div>
        <span class="amc-sub-summary-val" style="color:#ea580c;">${totalBreakdowns}</span>
      </div>
      <div class="amc-sub-summary-card card-critical">
        <div class="amc-sub-summary-info">
          <h5>Recurring Problem Assets</h5>
          <p>Equipment with &gt;1 breakdown repair</p>
        </div>
        <span class="amc-sub-summary-val" style="color:#dc2626;">${recurringCount}</span>
      </div>
      <div class="amc-sub-summary-card card-info">
        <div class="amc-sub-summary-info">
          <h5>Breakdown Repair Spend</h5>
          <p>Emergency parts &amp; service cost</p>
        </div>
        <span class="amc-sub-summary-val" style="color:#ea580c;">₹${totalRepairCost.toLocaleString('en-IN')}</span>
      </div>
      <div class="amc-sub-summary-card card-info">
        <div class="amc-sub-summary-info">
          <h5>Contract Value (Current + Past)</h5>
          <p>Current ₹${affectedCurrentContractCost.toLocaleString('en-IN')} | Past ₹${affectedPastContractCost.toLocaleString('en-IN')}</p>
        </div>
        <span class="amc-sub-summary-val" style="color:#1d4ed8;">₹${totalAffectedContractVal.toLocaleString('en-IN')}</span>
      </div>
    `;
  }

  if (!logs.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#15803d;font-weight:600;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Zero breakdown repairs logged! All equipment functioning smoothly.</div>';
    return;
  }

  let headHtml = `
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>Visit Date</th>
        <th>Category</th>
        <th>Unit</th>
        <th>Floor</th>
        <th>Vendor / Tech</th>
        <th>Failure Description / Work Done</th>
        <th>Current Term (₹)</th>
        <th>Past Terms (₹)</th>
        <th>Repair Cost (₹)</th>
        <th>Total Lifetime Spend (₹)</th>
        <th>Action</th>
      </tr>
    </thead>
  `;

  let bodyHtml = logs.map((l, i) => {
    const parentRec = recordMap.get(l.amcId) || {};
    const failCount = equipFailures[l.amcId] || 1;
    const currentVal = parseFloat(parentRec.contractCost) || 0;
    const pastVal = history.filter(h => h.recordId === l.amcId).reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const repairVal = parseFloat(l.cost) || 0;

    const assetRepairs = logs.filter(log => log.amcId === l.amcId).reduce((s, log) => s + (parseFloat(log.cost) || 0), 0);
    const cumulativeAssetTotal = currentVal + pastVal + assetRepairs;

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${fmtAMCDate(l.visitDate)}</strong></td>
        <td>
          <strong>${escapeHtml(parentRec.category || '—')}</strong>
          ${failCount > 1 ? `<span class="pivot-tag tag-overdue" style="font-size:10px;margin-left:4px;">${failCount}x Failures</span>` : ''}
        </td>
        <td>${escapeHtml(parentRec.unit || '—')}</td>
        <td>${escapeHtml(parentRec.floor || '—')}</td>
        <td>
          <div>${escapeHtml(parentRec.vendorName || '—')}</div>
          <div style="font-size:11px;color:var(--muted);">${escapeHtml(l.technician ? 'Tech: ' + l.technician : '')}</div>
        </td>
        <td style="max-width:260px;text-align:left;">
          <div style="font-size:12px;color:var(--ink);">${escapeHtml(l.description || 'Breakdown repair')}</div>
        </td>
        <td style="color:#1d4ed8;font-weight:700;">
          ${currentVal > 0 ? '₹' + currentVal.toLocaleString('en-IN') : '—'}
        </td>
        <td style="color:#7c3aed;font-weight:600;">
          ${pastVal > 0 ? '₹' + pastVal.toLocaleString('en-IN') : '—'}
        </td>
        <td style="color:#ea580c;font-weight:700;">
          ${repairVal > 0 ? '₹' + repairVal.toLocaleString('en-IN') : '₹0'}
        </td>
        <td title="Current ₹${currentVal.toLocaleString('en-IN')} + Past ₹${pastVal.toLocaleString('en-IN')} + Cumulative Repairs ₹${assetRepairs.toLocaleString('en-IN')}">
          <strong style="color:#047857;">₹${cumulativeAssetTotal.toLocaleString('en-IN')}</strong>
        </td>
        <td>
          <button class="amc-take-action-btn" type="button" onclick="closeAmcReportModal();openAmcActionModal('${escapeHtml(parentRec.id)}')">
            View Record
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="amc-pivot-table">
      ${headHtml}
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

function renderAmcVendorsTable() {
  const container = document.getElementById('amcVendorsTableContainer');
  if (!container) return;

  const records = getFilteredAmcReportRecords();
  const recordMap = new Map(records.map(r => [r.id, r]));
  const logs = allAmcServiceLogs.filter(l => recordMap.has(l.amcId));
  const history = allAmcContractHistory.filter(h => recordMap.has(h.recordId));

  const currentVendors = [...new Set(records.map(r => r.vendorName).filter(Boolean))];
  const currentVendorSet = new Set(currentVendors);
  const pastVendors = [...new Set(history.map(h => h.vendorName).filter(Boolean))]
    .filter(v => !currentVendorSet.has(v));
  const vendors = [...currentVendors, ...pastVendors].sort();

  if (!vendors.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">No vendor records found for current filter.</div>';
    return;
  }

  let headHtml = `
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th class="sticky-col">Vendor / Agency Name</th>
        <th>Status</th>
        <th>Contact Details</th>
        <th>Maintained Categories</th>
        <th>Units Serviced</th>
        <th>Total Contracts</th>
        <th>Active</th>
        <th>Overdue Servicing</th>
        <th>Breakdown Calls</th>
        <th>Live Term (₹)</th>
        <th>Past Terms (₹)</th>
        <th>Total Contract (₹)</th>
        <th>Routine Service Spend (₹)</th>
        <th>Breakdown Repair Spend (₹)</th>
        <th>Total Spend (₹)</th>
      </tr>
    </thead>
  `;

  let bodyHtml = vendors.map((vendor, i) => {
    const isCurrent = currentVendorSet.has(vendor);
    const matching = records.filter(r => r.vendorName === vendor);
    const historyMatching = history.filter(h => h.vendorName === vendor);

    const cats = [...new Set([...matching.map(r => r.category), ...historyMatching.map(h => h.category)])].filter(Boolean).join(', ');
    const units = [...new Set([...matching.map(r => r.unit), ...historyMatching.map(h => h.unit)])].filter(Boolean).join(', ');
    const active = matching.filter(r => r.status === 'Active').length;
    const overdue = matching.filter(r => r.status === 'Service Overdue').length;

    const matchingIds = new Set(matching.map(r => r.id));
    const matchingLogs = logs.filter(l => matchingIds.has(l.amcId));
    const breakdowns = matchingLogs.filter(l => l.logType === 'Breakdown Repair').length;
    
    const liveContractCost = matching.reduce((sum, r) => sum + (parseFloat(r.contractCost) || 0), 0);
    const pastContractCost = historyMatching.reduce((sum, h) => sum + (parseFloat(h.contractCost) || 0), 0);
    const totalContractVal = liveContractCost + pastContractCost;

    const servicingSpend = matchingLogs.filter(l => l.logType === 'Scheduled Service').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
    const breakdownSpend = matchingLogs.filter(l => l.logType === 'Breakdown Repair').reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
    const totalVendorCost = totalContractVal + servicingSpend + breakdownSpend;

    const contact = matching[0]?.contactInfo || historyMatching[0]?.contactInfo || '—';
    const totalContracts = matching.length + historyMatching.length;

    return `
      <tr${!isCurrent ? ' style="opacity:0.82;"' : ''}>
        <td>${i + 1}</td>
        <td class="sticky-col"><strong>${escapeHtml(vendor)}</strong></td>
        <td>${isCurrent ? '<span class="pivot-tag tag-active">Current</span>' : '<span class="pivot-tag" style="background:#ede9fe;color:#5b21b6;">Past Vendor</span>'}</td>
        <td>${escapeHtml(contact)}</td>
        <td>${escapeHtml(cats)}</td>
        <td>${escapeHtml(units)}</td>
        <td><strong>${totalContracts}</strong></td>
        <td><span class="pivot-tag tag-active">${active}</span></td>
        <td>${overdue ? `<span class="pivot-tag tag-overdue">${overdue} Overdue</span>` : '<span style="color:#15803d;">0</span>'}</td>
        <td>${breakdowns ? `<span class="pivot-tag tag-breakdown">${breakdowns}</span>` : '0'}</td>
        <td><span style="color:#1d4ed8;font-weight:700;">${liveContractCost > 0 ? '₹' + liveContractCost.toLocaleString('en-IN') : '—'}</span></td>
        <td><span style="color:#7c3aed;font-weight:600;">${pastContractCost > 0 ? '₹' + pastContractCost.toLocaleString('en-IN') : '—'}</span></td>
        <td><strong style="color:#1e3a8a;">${totalContractVal > 0 ? '₹' + totalContractVal.toLocaleString('en-IN') : '—'}</strong></td>
        <td style="color:#059669;font-weight:600;">₹${servicingSpend.toLocaleString('en-IN')}</td>
        <td style="color:#ea580c;font-weight:600;">₹${breakdownSpend.toLocaleString('en-IN')}</td>
        <td title="Live ₹${liveContractCost.toLocaleString('en-IN')} + Past ₹${pastContractCost.toLocaleString('en-IN')} + Service ₹${servicingSpend.toLocaleString('en-IN')} + Breakdown ₹${breakdownSpend.toLocaleString('en-IN')}"><strong style="color:#047857;">₹${totalVendorCost.toLocaleString('en-IN')}</strong></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="amc-pivot-table">
      ${headHtml}
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

// ── Export Multi-Sheet Comprehensive Excel (.xlsx) ──────────────────────────
function exportAmcAnalysisExcel() {
  if (!window.XLSX) {
    showToast('Excel export library not available.', true);
    return;
  }

  const records = getFilteredAmcReportRecords();
  if (!records.length) {
    showToast('No records to export.', true);
    return;
  }

  const recordMap = new Map(records.map(r => [r.id, r]));
  const logs = allAmcServiceLogs.filter(l => recordMap.has(l.amcId));
  const history = allAmcContractHistory.filter(h => recordMap.has(h.recordId));
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Master Records List
  const masterHeaders = [
    'Record ID', 'Category', 'Unit', 'Floor', 'Vendor', 'Contact',
    'Start Date', 'Expiry Date', 'Current Term Cost (₹)', 'Past Terms Cost (₹)', 'Total Contract Value (₹)',
    'Routine Service Spend (₹)', 'Breakdown Repair Spend (₹)', 'Grand Total Asset Cost (₹)',
    'Frequency', 'Last Service Date', 'Next Due Date', 'Status', 'Remarks'
  ];
  const masterRows = records.map(r => {
    const rLogs = logs.filter(l => l.amcId === r.id);
    const cc = (r.contractCost !== '' && r.contractCost !== null && r.contractCost !== undefined) ? Number(r.contractCost) : 0;
    const pastCost = history.filter(h => h.recordId === r.id).reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const totContract = cc + pastCost;

    const svcC = rLogs.filter(l => l.logType === 'Scheduled Service').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const bkdC = rLogs.filter(l => l.logType === 'Breakdown Repair').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const totAsset = totContract + svcC + bkdC;

    return [
      r.id || '',
      r.category || '',
      r.unit || '',
      r.floor || '',
      r.vendorName || '',
      r.contactInfo || '',
      r.startDate || '',
      r.expiryDate || '',
      cc,
      pastCost,
      totContract,
      svcC,
      bkdC,
      totAsset,
      r.frequency || '',
      r.lastServiceDate || '',
      r.nextDueDate || '',
      r.status || '',
      r.remarks || ''
    ];
  });
  const wsMaster = XLSX.utils.aoa_to_sheet([['AMC MASTER EQUIPMENT & CONTRACT RECORDS (WITH LIFECYCLE FINANCIALS)'], [], masterHeaders, ...masterRows]);
  wsMaster['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'AMC Master Records');

  // ── Sheet 2: Servicing Delays Report
  const overdueList = records.filter(r => r.status === 'Service Overdue' || r.status === 'Service Due Soon');
  const delayHeaders = ['Unit', 'Floor', 'Category', 'Vendor', 'Last Serviced', 'Next Due Date', 'Contract Cost (₹)', 'Days Overdue', 'Status'];
  const delayRows = overdueList.map(r => [
    r.unit || '',
    r.floor || '',
    r.category || '',
    r.vendorName || '',
    r.lastServiceDate || '',
    r.nextDueDate || '',
    (r.contractCost !== '' && r.contractCost !== null && r.contractCost !== undefined) ? Number(r.contractCost) : '',
    Math.abs(r.serviceDaysLeft || 0),
    r.status || ''
  ]);
  const wsDelays = XLSX.utils.aoa_to_sheet([['AMC SERVICING DELAY & OVERDUE REPORT'], [], delayHeaders, ...delayRows]);
  wsDelays['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsDelays, 'Servicing Delays');

  // ── Sheet 3: Breakdown & Repair Logs
  const breakdownLogs = logs.filter(l => l.logType === 'Breakdown Repair');
  const breakdownHeaders = ['Visit Date', 'Category', 'Unit', 'Floor', 'Vendor', 'Technician', 'Current Term (₹)', 'Past Terms (₹)', 'Repair Cost (₹)', 'Lifetime Asset Spend (₹)', 'Issue Description'];
  const breakdownRows = breakdownLogs.map(l => {
    const p = recordMap.get(l.amcId) || {};
    const curVal = (p.contractCost !== '' && p.contractCost !== null && p.contractCost !== undefined) ? Number(p.contractCost) : 0;
    const pastVal = history.filter(h => h.recordId === l.amcId).reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const rc = l.cost !== '' && l.cost !== null && l.cost !== undefined ? Number(l.cost) : 0;
    const assetRepairs = logs.filter(log => log.amcId === l.amcId && log.logType === 'Breakdown Repair').reduce((s, log) => s + (parseFloat(log.cost) || 0), 0);
    return [
      l.visitDate || '',
      p.category || '',
      p.unit || '',
      p.floor || '',
      p.vendorName || '',
      l.technician || '',
      curVal,
      pastVal,
      rc,
      curVal + pastVal + assetRepairs,
      l.description || ''
    ];
  });
  const wsBreakdown = XLSX.utils.aoa_to_sheet([['BREAKDOWN & EMERGENCY REPAIR HOTSPOTS (WITH LIFECYCLE CONTRACT VALUE)'], [], breakdownHeaders, ...breakdownRows]);
  wsBreakdown['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Breakdown Repairs');

  // ── Sheet 4: Contract Renewal History (previous vendors & terms)
  const historyHeaders = [
    'Record ID', 'Category', 'Unit', 'Floor', 'Vendor (Past Term)', 'Contact',
    'Start Date', 'Expiry Date', 'Contract Cost (₹)', 'Frequency', 'Remarks', 'Renewed To Vendor'
  ];
  const historyRows = history.map(h => [
    h.recordId || '',
    h.category || '',
    h.unit || '',
    h.floor || '',
    h.vendorName || '',
    h.contactInfo || '',
    h.startDate || '',
    h.expiryDate || '',
    (h.contractCost !== '' && h.contractCost !== null && h.contractCost !== undefined) ? Number(h.contractCost) : '',
    h.frequency || '',
    h.remarks || '',
    h.renewedToVendor || ''
  ]);
  const wsHistory = XLSX.utils.aoa_to_sheet([['AMC CONTRACT RENEWAL HISTORY (PAST VENDORS & TERMS)'], [], historyHeaders, ...(historyRows.length ? historyRows : [['No renewals recorded yet for the current filter.']])]);
  wsHistory['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 35 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsHistory, 'Contract Renewal History');

  const stamp = formatLocalDate(new Date());
  XLSX.writeFile(wb, `AMC_Report_Analysis_${stamp}.xlsx`);
  showToast('Excel report downloaded successfully.');
}

// ── Print Report Function ───────────────────────────────────────────────────
function printAmcAnalysisReport() {
  const records = getFilteredAmcReportRecords();
  const recordMap = new Map(records.map(r => [r.id, r]));
  const logs = allAmcServiceLogs.filter(l => recordMap.has(l.amcId));

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // KPI cards
  setText('amcKpiPrintTotalAssets', document.getElementById('amcRptTotalAssets')?.textContent || '0');
  setText('amcKpiPrintActiveSub', document.getElementById('amcRptActiveSub')?.textContent || '0 Active Contracts');
  setText('amcKpiPrintOverdue', document.getElementById('amcRptOverdueCount')?.textContent || '0');
  setText('amcKpiPrintDueSoon', document.getElementById('amcRptDueSoonSub')?.textContent || '0 Due Soon');
  setText('amcKpiPrintBreakdowns', document.getElementById('amcRptBreakdownCount')?.textContent || '0');
  setText('amcKpiPrintScheduled', document.getElementById('amcRptScheduledVisitsSub')?.textContent || '0 Scheduled Visits');
  setText('amcKpiPrintCost', document.getElementById('amcRptTotalCost')?.textContent || '₹0');
  setText('amcKpiPrintExpired', document.getElementById('amcRptExpiredContractsSub')?.textContent || '0 Contracts Expired');

  // Table 1: AMC Master Equipment & Contract Records
  const masterBody = document.getElementById('amcPrintMasterBody');
  if (masterBody) {
    masterBody.innerHTML = records.length ? records.map(r => `
      <tr>
        <td>${escapeHtml(r.id || '')}</td>
        <td>${escapeHtml(r.category || '')}</td>
        <td>${escapeHtml(r.unit || '')}</td>
        <td>${escapeHtml(r.floor || '')}</td>
        <td>${escapeHtml(r.vendorName || '')}</td>
        <td>${escapeHtml(r.startDate || '')}</td>
        <td>${escapeHtml(r.expiryDate || '')}</td>
        <td>${(r.contractCost !== '' && r.contractCost !== null && r.contractCost !== undefined) ? escapeHtml(fmtAmcCost(r.contractCost)) : '-'}</td>
        <td>${escapeHtml(r.frequency || '')}</td>
        <td>${escapeHtml(r.lastServiceDate || '')}</td>
        <td>${escapeHtml(r.nextDueDate || '')}</td>
        <td>${escapeHtml(r.status || '')}</td>
      </tr>
    `).join('') : `<tr><td colspan="12" class="amc-kpi-print-empty">No records found.</td></tr>`;
  }

  // Table 2: Servicing Delay & Overdue Report
  const delayBody = document.getElementById('amcPrintDelayBody');
  if (delayBody) {
    const overdueList = records.filter(r => r.status === 'Service Overdue' || r.status === 'Service Due Soon');
    delayBody.innerHTML = overdueList.length ? overdueList.map(r => `
      <tr>
        <td>${escapeHtml(r.unit || '')}</td>
        <td>${escapeHtml(r.floor || '')}</td>
        <td>${escapeHtml(r.category || '')}</td>
        <td>${escapeHtml(r.vendorName || '')}</td>
        <td>${escapeHtml(r.lastServiceDate || '')}</td>
        <td>${escapeHtml(r.nextDueDate || '')}</td>
        <td>${Math.abs(r.serviceDaysLeft || 0)}</td>
        <td>${escapeHtml(r.status || '')}</td>
      </tr>
    `).join('') : `<tr><td colspan="8" class="amc-kpi-print-empty">No servicing delays or overdue equipment.</td></tr>`;
  }

  // Table 3: Breakdown & Emergency Repair Logs
  const breakdownBody = document.getElementById('amcPrintBreakdownBody');
  if (breakdownBody) {
    const breakdownLogs = logs.filter(l => l.logType === 'Breakdown Repair');
    breakdownBody.innerHTML = breakdownLogs.length ? breakdownLogs.map(l => {
      const p = recordMap.get(l.amcId) || {};
      const cost = (l.cost !== '' && l.cost !== null && l.cost !== undefined) ? Number(l.cost).toLocaleString('en-IN') : '—';
      return `
        <tr>
          <td>${escapeHtml(l.visitDate || '')}</td>
          <td>${escapeHtml(p.category || '')}</td>
          <td>${escapeHtml(p.unit || '')}</td>
          <td>${escapeHtml(p.floor || '')}</td>
          <td>${escapeHtml(p.vendorName || '')}</td>
          <td>${escapeHtml(l.technician || '')}</td>
          <td>${cost}</td>
          <td>${escapeHtml(l.description || '')}</td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="8" class="amc-kpi-print-empty">No breakdown repair logs.</td></tr>`;
  }

  // Table 4: Contract Renewal History (past vendors & terms)
  const historyBody = document.getElementById('amcPrintHistoryBody');
  if (historyBody) {
    const history = allAmcContractHistory.filter(h => recordMap.has(h.recordId));
    historyBody.innerHTML = history.length ? history.map(h => `
      <tr>
        <td>${escapeHtml(h.recordId || '')}</td>
        <td>${escapeHtml(h.unit || '')}</td>
        <td>${escapeHtml(h.floor || '')}</td>
        <td>${escapeHtml(h.vendorName || '')}</td>
        <td>${escapeHtml(h.startDate || '')}</td>
        <td>${escapeHtml(h.expiryDate || '')}</td>
        <td>${(h.contractCost !== '' && h.contractCost !== null && h.contractCost !== undefined) ? escapeHtml(fmtAmcCost(h.contractCost)) : '-'}</td>
        <td>${escapeHtml(h.renewedToVendor || '')}</td>
      </tr>
    `).join('') : `<tr><td colspan="8" class="amc-kpi-print-empty">No contract renewals recorded yet.</td></tr>`;
  }

  const dateEl = document.getElementById('amcKpiPrintDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = `Generated on ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  window.print();
}

// ═══════════════════════════════════════════════════════════════════════════
//  AMC KPI DRILL-DOWN ANALYSIS CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

let currentDrillKpiType = 'assets';
let currentDrillSubView = 'assets_category';

function openAmcKpiDrilldown(kpiType) {
  currentDrillKpiType = kpiType;
  const modal = document.getElementById('amcKpiDrillModal');
  const searchInput = document.getElementById('amcDrillSearchInput');
  if (searchInput) searchInput.value = '';

  const select = document.getElementById('amcDrillViewSelect');
  if (select) {
    if (kpiType === 'spend') {
      select.innerHTML = `
        <option value="spend_category">1. Category-wise Cost Distribution Matrix (Current + Past + Maint)</option>
        <option value="spend_vendor">2. Vendor-wise Financial Matrix (Live + Past Terms + Service)</option>
        <option value="spend_equipment">3. Equipment Contract &amp; Maintenance Summary (A to Z Lifecycle)</option>
        <option value="spend_history">4. Past Contract Renewal Terms History Archive</option>
        <option value="spend_logs">5. Detailed Expense &amp; Service Logs</option>
      `;
      currentDrillSubView = 'spend_category';
    } else if (kpiType === 'assets') {
      select.innerHTML = `
        <option value="assets_category">1. Category Summary &amp; Financial Matrix</option>
        <option value="assets_equipment">2. Individual Equipment Asset Records</option>
      `;
      currentDrillSubView = 'assets_category';
    } else if (kpiType === 'breakdowns') {
      select.innerHTML = `
        <option value="breakdowns_category">1. Breakdown Cost vs Contract Value by Category</option>
        <option value="breakdowns_logs">2. Breakdown &amp; Emergency Repair Logs</option>
      `;
      currentDrillSubView = 'breakdowns_category';
    } else if (kpiType === 'overdue') {
      select.innerHTML = `
        <option value="overdue_schedule">1. Equipment Servicing Schedule List</option>
      `;
      currentDrillSubView = 'overdue_schedule';
    } else if (['completedLate', 'delayDays', 'delaySeverity'].includes(kpiType)) {
      select.innerHTML = `
        <option value="delay_services">1. Completed Delayed Services List</option>
      `;
      currentDrillSubView = 'delay_services';
    }
    select.value = currentDrillSubView;
  }

  if (modal) modal.classList.remove('hidden');
  renderAmcDrilldownContent(kpiType);
}

function changeAmcDrilldownView(newSubView) {
  currentDrillSubView = newSubView;
  const searchVal = (document.getElementById('amcDrillSearchInput')?.value || '').toLowerCase().trim();
  renderAmcDrilldownContent(currentDrillKpiType, searchVal);
}

function closeAmcKpiDrillModal() {
  const modal = document.getElementById('amcKpiDrillModal');
  if (modal) modal.classList.add('hidden');
}

function filterAmcDrilldownTable() {
  const searchVal = (document.getElementById('amcDrillSearchInput')?.value || '').toLowerCase().trim();
  renderAmcDrilldownContent(currentDrillKpiType, searchVal);
}

function renderAmcDrilldownContent(kpiType, searchVal = '') {
  const container = document.getElementById('amcDrillBodyContainer');
  const titleEl = document.getElementById('amcDrillTitle');
  const subtitleEl = document.getElementById('amcDrillSubtitle');
  const statsTextEl = document.getElementById('amcDrillStatsText');
  const iconWrap = document.getElementById('amcDrillIconWrap');
  if (!container) return;

  const records = getFilteredAmcReportRecords();
  const recordMap = new Map(records.map(r => [r.id, r]));
  const logs = allAmcServiceLogs.filter(l => recordMap.has(l.amcId));
  const history = allAmcContractHistory.filter(h => recordMap.has(h.recordId));

  // ═════════════════════════════════════════════════════════════════════════
  // SERVICING DELAY ANALYSIS KPI CARDS
  // ═════════════════════════════════════════════════════════════════════════
  if (['completedLate', 'delayDays', 'delaySeverity'].includes(kpiType)) {
    const delayedLogs = logs
      .filter(l => l.logType === 'Scheduled Service' && Number(l.delayDays) > 0)
      .sort((a, b) => Number(b.delayDays) - Number(a.delayDays));
    const totalDelayDays = delayedLogs.reduce((sum, l) => sum + Number(l.delayDays || 0), 0);
    const critical = delayedLogs.filter(l => Number(l.delayDays) > 60).length;
    const severe = delayedLogs.filter(l => Number(l.delayDays) >= 30 && Number(l.delayDays) <= 60).length;
    const short = delayedLogs.length - critical - severe;
    const config = {
      completedLate: {
        title: `Late Services Completed (${delayedLogs.length})`,
        subtitle: 'Each row is a scheduled service completed after its recorded due date.',
        statLabel: 'Completed Late Services', statValue: delayedLogs.length
      },
      delayDays: {
        title: `Total Delay Days (${totalDelayDays} Days)`,
        subtitle: 'Each row contributes its completion delay to the total shown above.',
        statLabel: 'Combined Delay Days', statValue: totalDelayDays
      },
      delaySeverity: {
        title: `Delay Severity Breakdown (${critical} / ${severe} / ${short})`,
        subtitle: 'Critical: over 60 days; Severe: 30–60 days; Short: under 30 days late.',
        statLabel: 'Completed Delayed Services', statValue: delayedLogs.length
      }
    }[kpiType];
    if (titleEl) titleEl.textContent = config.title;
    if (subtitleEl) subtitleEl.textContent = config.subtitle;
    if (iconWrap) iconWrap.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>';

    const filtered = searchVal ? delayedLogs.filter(l => {
      const r = recordMap.get(l.amcId) || {};
      return [r.category, r.unit, r.floor, r.vendorName, r.contactInfo, l.technician, l.description, l.visitDate, l.scheduledDueDate].join(' ').toLowerCase().includes(searchVal);
    }) : delayedLogs;
    if (statsTextEl) statsTextEl.textContent = `Showing ${filtered.length} of ${delayedLogs.length} completed delayed services`;

    const rows = filtered.map((l, index) => {
      const r = recordMap.get(l.amcId) || {};
      const days = Number(l.delayDays);
      const severity = days > 60 ? 'Critical (>60d)' : days >= 30 ? 'Severe (30–60d)' : 'Short Delay (<30d)';
      const cc = (r.contractCost !== '' && r.contractCost !== null && r.contractCost !== undefined) ? Number(r.contractCost) : 0;
      const logCost = (l.cost !== '' && l.cost !== null && l.cost !== undefined) ? Number(l.cost) : 0;
      return `<tr><td>${index + 1}</td><td><strong>${escapeHtml(r.category || '—')}</strong><div style="font-size:11px;color:var(--muted);">${escapeHtml(r.id || '')}</div></td><td><strong>${escapeHtml(r.unit || '—')}</strong><div style="font-size:11px;color:var(--muted);">${escapeHtml(r.floor || '—')}</div></td><td>${fmtAMCDate(l.scheduledDueDate)}</td><td><strong>${fmtAMCDate(l.visitDate)}</strong></td><td style="color:#1d4ed8;font-weight:700;">${cc > 0 ? '₹' + cc.toLocaleString('en-IN') : '—'}</td><td style="color:#059669;font-weight:600;">${logCost > 0 ? '₹' + logCost.toLocaleString('en-IN') : '₹0'}</td><td><strong style="color:#dc2626;">${days} day${days === 1 ? '' : 's'} late</strong></td><td><span class="pivot-tag ${days > 60 ? 'tag-overdue' : 'tag-breakdown'}">${severity}</span></td><td><strong>${escapeHtml(r.vendorName || '—')}</strong><div style="font-size:11px;color:var(--muted);">${escapeHtml(r.contactInfo || '')}</div></td><td>${escapeHtml(log.technician || '—')}<div style="font-size:11px;color:var(--muted);">${escapeHtml(log.description || '')}</div></td></tr>`;
    }).join('');

    container.innerHTML = `
      <div class="amc-drill-summary-grid">
        <div class="amc-drill-stat-chip chip-danger"><span class="chip-label">${config.statLabel}</span><span class="chip-val" style="color:#dc2626;">${config.statValue}</span></div>
        <div class="amc-drill-stat-chip chip-warning"><span class="chip-label">Total Delay Days</span><span class="chip-val" style="color:#ea580c;">${totalDelayDays}</span></div>
        <div class="amc-drill-stat-chip chip-danger"><span class="chip-label">Critical (&gt;60d)</span><span class="chip-val" style="color:#dc2626;">${critical}</span></div>
        <div class="amc-drill-stat-chip chip-warning"><span class="chip-label">Severe (30–60d)</span><span class="chip-val" style="color:#ea580c;">${severe}</span></div>
        <div class="amc-drill-stat-chip chip-success"><span class="chip-label">Short (&lt;30d)</span><span class="chip-val" style="color:#059669;">${short}</span></div>
      </div>
      <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;"><table class="amc-pivot-table"><thead><tr><th>#</th><th>AMC Service</th><th>Location</th><th>Scheduled Due</th><th>Actual Service Date</th><th>Contract Value (₹)</th><th>Visit Cost (₹)</th><th>Completion Delay</th><th>Severity</th><th>Vendor / Contact</th><th>Technician / Work Done</th></tr></thead><tbody>${rows || '<tr><td colspan="11" style="padding:24px;text-align:center;color:#94a3b8;">No matching completed delayed services.</td></tr>'}</tbody></table></div>`;
  }
  // ═════════════════════════════════════════════════════════════════════════
  // CARD 1: TOTAL AMC ASSETS & PORTFOLIO
  // ═════════════════════════════════════════════════════════════════════════
  else if (kpiType === 'assets') {
    if (titleEl) titleEl.textContent = `Total AMC Assets & Contract Portfolio (${records.length} Assets)`;
    if (subtitleEl) subtitleEl.textContent = 'Category-wise, financial rate, and equipment-wise breakdown of all registered maintenance contracts';
    if (iconWrap) iconWrap.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';

    const total = records.length;
    const active = records.filter(r => r.status === 'Active').length;
    const expiring = records.filter(r => r.status === 'Expiring Soon').length;
    const expired = records.filter(r => r.status === 'Expired').length;

    const currentContractVal = records.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
    const pastContractVal = history.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const totalContractValue = currentContractVal + pastContractVal;
    const totalMaintSpend = logs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const totalPortfolioCost = totalContractValue + totalMaintSpend;

    const summaryChipsHtml = `
      <div class="amc-drill-summary-grid">
        <div class="amc-drill-stat-chip chip-total">
          <span class="chip-label">Total Assets</span>
          <span class="chip-val" style="color:#1e3a8a;">${total}</span>
        </div>
        <div class="amc-drill-stat-chip chip-total">
          <span class="chip-label">Current Term Value</span>
          <span class="chip-val" style="color:#1d4ed8;">₹${currentContractVal.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-purple">
          <span class="chip-label">Past Terms Value</span>
          <span class="chip-val" style="color:#7c3aed;">₹${pastContractVal.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-warning">
          <span class="chip-label">Total Maint Spend</span>
          <span class="chip-val" style="color:#ea580c;">₹${totalMaintSpend.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-success">
          <span class="chip-label">Combined Portfolio Cost</span>
          <span class="chip-val" style="color:#047857;">₹${totalPortfolioCost.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-success">
          <span class="chip-label">Active Contracts</span>
          <span class="chip-val" style="color:#059669;">${active}</span>
        </div>
      </div>
    `;

    let selectedTableHtml = '';

    if (currentDrillSubView === 'assets_category') {
      const catMap = {};
      records.forEach(r => {
        if (!catMap[r.category]) catMap[r.category] = { total: 0, active: 0, expiring: 0, expired: 0, overdue: 0, currentCost: 0, pastCost: 0, maintSpend: 0, units: new Set() };
        catMap[r.category].total++;
        if (r.status === 'Active') catMap[r.category].active++;
        if (r.status === 'Expiring Soon') catMap[r.category].expiring++;
        if (r.status === 'Expired') catMap[r.category].expired++;
        if (r.status === 'Service Overdue') catMap[r.category].overdue++;
        catMap[r.category].currentCost += (parseFloat(r.contractCost) || 0);
        if (r.unit) catMap[r.category].units.add(r.unit);
      });

      history.forEach(h => {
        const cat = h.category || 'General';
        if (catMap[cat]) catMap[cat].pastCost += (parseFloat(h.contractCost) || 0);
      });

      logs.forEach(l => {
        const parent = recordMap.get(l.amcId) || {};
        const cat = parent.category || 'General';
        if (catMap[cat]) {
          catMap[cat].maintSpend += (parseFloat(l.cost) || 0);
        }
      });

      let catEntries = Object.entries(catMap);
      if (searchVal) {
        catEntries = catEntries.filter(([cat, s]) => [cat, ...s.units].join(' ').toLowerCase().includes(searchVal));
      }

      let catPivotRows = catEntries.map(([cat, s]) => {
        const combined = s.currentCost + s.pastCost + s.maintSpend;
        return `
          <tr>
            <td style="text-align:center;"><span class="cat-pill">${escapeHtml(cat)}</span></td>
            <td style="text-align:center;font-weight:800;font-size:13.5px;color:#1e3a8a;">${s.total}</td>
            <td style="text-align:center;"><span class="pivot-tag tag-active">${s.active} Active</span></td>
            <td style="text-align:center;">${s.expiring ? `<span class="pivot-tag" style="background:#fef3c7;color:#b45309;font-weight:700;">${s.expiring} Expiring</span>` : '<span style="color:#94a3b8;">0</span>'}</td>
            <td style="text-align:center;">${s.expired ? `<span class="pivot-tag tag-overdue">${s.expired} Expired</span>` : '<span style="color:#94a3b8;">0</span>'}</td>
            <td style="text-align:center;color:#1d4ed8;font-weight:700;">₹${s.currentCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#7c3aed;font-weight:600;">₹${s.pastCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#ea580c;font-weight:700;">₹${s.maintSpend.toLocaleString('en-IN')}</td>
            <td style="text-align:center;font-weight:800;color:#047857;font-size:13.5px;">₹${combined.toLocaleString('en-IN')}</td>
            <td style="text-align:center;font-size:12px;font-weight:600;color:var(--ink);">${escapeHtml([...s.units].join(', '))}</td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${catEntries.length} of ${Object.keys(catMap).length} categories | Total Portfolio: ₹${totalPortfolioCost.toLocaleString('en-IN')}`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>1. Category Summary &amp; Financial Matrix</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">Equipment Category</th>
                <th style="text-align:center;">Total Assets</th>
                <th style="text-align:center;">Active</th>
                <th style="text-align:center;">Expiring Soon</th>
                <th style="text-align:center;">Expired</th>
                <th style="text-align:center;">Current Term (₹)</th>
                <th style="text-align:center;">Past Terms (₹)</th>
                <th style="text-align:center;">Maint Spend (₹)</th>
                <th style="text-align:center;">Combined Total (₹)</th>
                <th style="text-align:center;">Units Covering</th>
              </tr>
            </thead>
            <tbody>${catPivotRows || '<tr><td colspan="10" style="padding:24px;text-align:center;color:#94a3b8;">No matching categories found.</td></tr>'}</tbody>
          </table>
        </div>
      `;
    } else {
      let filtered = records;
      if (searchVal) {
        filtered = records.filter(r => [r.category, r.unit, r.floor, r.vendorName, r.status, r.id, r.remarks].join(' ').toLowerCase().includes(searchVal));
      }

      let listRows = filtered.map((r, i) => {
        const cc = parseFloat(r.contractCost) || 0;
        const pastCost = history.filter(h => h.recordId === r.id).reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
        const rLogs = logs.filter(l => l.amcId === r.id);
        const svcC = rLogs.filter(l => l.logType === 'Scheduled Service').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
        const bkdC = rLogs.filter(l => l.logType === 'Breakdown Repair').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
        const totAsset = cc + pastCost + svcC + bkdC;

        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="text-align:center;"><code>${escapeHtml(r.id)}</code></td>
            <td style="text-align:center;"><span class="cat-pill">${escapeHtml(r.category)}</span></td>
            <td style="text-align:center;font-weight:700;">${escapeHtml(r.unit)}</td>
            <td style="text-align:center;">${escapeHtml(r.floor || 'All Floors')}</td>
            <td style="text-align:center;">${escapeHtml(r.vendorName || '—')}</td>
            <td style="text-align:center;">${fmtAMCDate(r.startDate)}</td>
            <td style="text-align:center;font-weight:700;">${fmtAMCDate(r.expiryDate)}</td>
            <td style="text-align:center;color:#1d4ed8;font-weight:700;">${cc > 0 ? '₹' + cc.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;color:#7c3aed;font-weight:600;">${pastCost > 0 ? '₹' + pastCost.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;color:#059669;font-weight:600;">${svcC > 0 ? '₹' + svcC.toLocaleString('en-IN') : '₹0'}</td>
            <td style="text-align:center;color:#ea580c;font-weight:600;">${bkdC > 0 ? '₹' + bkdC.toLocaleString('en-IN') : '₹0'}</td>
            <td style="text-align:center;font-weight:800;color:#047857;">₹${totAsset.toLocaleString('en-IN')}</td>
            <td style="text-align:center;">
              <span class="pivot-tag ${r.status === 'Active' ? 'tag-active' : r.status === 'Expired' ? 'tag-overdue' : 'tag-breakdown'}">
                ${escapeHtml(r.status)}
              </span>
            </td>
            <td style="text-align:center;">
              <button type="button" class="amc-drill-action-btn" onclick="closeAmcKpiDrillModal();openAmcActionModal('${escapeHtml(r.id)}')">
                Action &rarr;
              </button>
            </td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${filtered.length} of ${total} equipment assets | Total Portfolio: ₹${totalPortfolioCost.toLocaleString('en-IN')}`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>2. Individual Equipment Asset Records &amp; Lifetime Financial Breakdown (${filtered.length})</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th style="text-align:center;">Record ID</th>
                <th style="text-align:center;">Category</th>
                <th style="text-align:center;">Unit</th>
                <th style="text-align:center;">Floor</th>
                <th style="text-align:center;">Vendor</th>
                <th style="text-align:center;">Start Date</th>
                <th style="text-align:center;">Expiry Date</th>
                <th style="text-align:center;">Current Term (₹)</th>
                <th style="text-align:center;">Past Terms (₹)</th>
                <th style="text-align:center;">Routine Svc (₹)</th>
                <th style="text-align:center;">Repair Cost (₹)</th>
                <th style="text-align:center;">Total Cost (₹)</th>
                <th style="text-align:center;">Contract Status</th>
                <th style="text-align:center;">Take Action</th>
              </tr>
            </thead>
            <tbody>${listRows || '<tr><td colspan="15" style="padding:24px;text-align:center;color:#94a3b8;">No matching assets found.</td></tr>'}</tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = summaryChipsHtml + selectedTableHtml;
  }
  // ═════════════════════════════════════════════════════════════════════════
  // CARD 2: SERVICING OVERDUE & DUE SCHEDULE
  // ═════════════════════════════════════════════════════════════════════════
  else if (kpiType === 'overdue') {
    const overdueList = records.filter(r => r.status === 'Service Overdue' || (r.serviceDaysLeft !== undefined && r.serviceDaysLeft < 0));
    const dueSoonList = records.filter(r => r.status === 'Service Due Soon' || (r.serviceDaysLeft !== undefined && r.serviceDaysLeft >= 0 && r.serviceDaysLeft <= 14));
    const onTrackList = records.filter(r => !overdueList.includes(r) && !dueSoonList.includes(r));

    if (titleEl) titleEl.textContent = `Servicing Schedule & Status Tracker (${overdueList.length} Overdue, ${dueSoonList.length} Due Soon)`;
    if (subtitleEl) subtitleEl.textContent = 'Detailed servicing timeline, contract value at risk, and compliance status across equipment';
    if (iconWrap) iconWrap.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

    const sortedAll = [...overdueList, ...dueSoonList, ...onTrackList];

    let filtered = sortedAll;
    if (searchVal) {
      filtered = sortedAll.filter(r => [r.category, r.unit, r.floor, r.vendorName, r.contactInfo, r.status, r.id].join(' ').toLowerCase().includes(searchVal));
    }

    const worstOverdueDays = overdueList.length
      ? Math.abs([...overdueList].sort((a, b) => (a.serviceDaysLeft || 0) - (b.serviceDaysLeft || 0))[0]?.serviceDaysLeft || 0)
      : 0;

    const overdueContractCost = overdueList.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);

    let rows = filtered.map((r, i) => {
      const isOverdue = r.status === 'Service Overdue' || (r.serviceDaysLeft !== undefined && r.serviceDaysLeft < 0);
      const isDueSoon = r.status === 'Service Due Soon' || (r.serviceDaysLeft !== undefined && r.serviceDaysLeft >= 0 && r.serviceDaysLeft <= 14);
      const days = r.serviceDaysLeft !== undefined ? Math.abs(r.serviceDaysLeft) : null;
      const cc = (r.contractCost !== '' && r.contractCost !== null && r.contractCost !== undefined) ? Number(r.contractCost) : 0;

      let statusBadge = '<span class="pivot-tag tag-active"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><polyline points="20 6 9 17 4 12"/></svg>On Track</span>';
      if (isOverdue) {
        statusBadge = `<span class="pivot-tag tag-overdue"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><path d="M12 9v4"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 17h.01"/></svg>${days !== null ? `${days}d Overdue` : 'Overdue'}</span>`;
      } else if (isDueSoon) {
        statusBadge = `<span class="pivot-tag tag-breakdown"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${days !== null ? `Due in ${days}d` : 'Due Soon'}</span>`;
      }

      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;"><code>${escapeHtml(r.id)}</code></td>
          <td style="text-align:center;"><span class="cat-pill">${escapeHtml(r.category)}</span></td>
          <td style="text-align:center;font-weight:700;">${escapeHtml(r.unit)}</td>
          <td style="text-align:center;">${escapeHtml(r.floor || 'All Floors')}</td>
          <td style="text-align:center;">${escapeHtml(r.vendorName || '—')}</td>
          <td style="text-align:center;">${fmtAMCDate(r.lastServiceDate)}</td>
          <td style="text-align:center;font-weight:700;color:#1e3a8a;">${fmtAMCDate(r.nextDueDate)}</td>
          <td style="text-align:center;color:#1d4ed8;font-weight:700;">${cc > 0 ? '₹' + cc.toLocaleString('en-IN') : '—'}</td>
          <td style="text-align:center;">${escapeHtml(r.frequency || 'Annual')}</td>
          <td style="text-align:center;">${statusBadge}</td>
          <td style="text-align:center;">
            <button type="button" class="amc-drill-action-btn" onclick="closeAmcKpiDrillModal();openAmcActionModal('${escapeHtml(r.id)}')">
              Log Service &rarr;
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (statsTextEl) statsTextEl.textContent = `Showing ${filtered.length} equipment servicing records | Overdue Contract Value: ₹${overdueContractCost.toLocaleString('en-IN')}`;

    container.innerHTML = `
      <div class="amc-drill-summary-grid">
        <div class="amc-drill-stat-chip ${overdueList.length ? 'chip-danger' : 'chip-success'}">
          <span class="chip-label">Overdue Servicing</span>
          <span class="chip-val" style="color:${overdueList.length ? '#dc2626' : '#059669'};">${overdueList.length}</span>
        </div>
        <div class="amc-drill-stat-chip chip-total">
          <span class="chip-label">Overdue Contract Value</span>
          <span class="chip-val" style="color:#1d4ed8;">₹${overdueContractCost.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip ${dueSoonList.length ? 'chip-warning' : 'chip-success'}">
          <span class="chip-label">Due Soon (< 14d)</span>
          <span class="chip-val" style="color:${dueSoonList.length ? '#ea580c' : '#059669'};">${dueSoonList.length}</span>
        </div>
        <div class="amc-drill-stat-chip chip-success">
          <span class="chip-label">Up to Date</span>
          <span class="chip-val" style="color:#059669;">${onTrackList.length}</span>
        </div>
        <div class="amc-drill-stat-chip chip-purple">
          <span class="chip-label">Worst Delay</span>
          <span class="chip-val" style="color:${worstOverdueDays ? '#dc2626' : '#059669'};">${worstOverdueDays ? `${worstOverdueDays} Days` : 'None (0d)'}</span>
        </div>
      </div>

      <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Equipment Servicing Schedule List (${filtered.length})</h4>
      <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
        <table class="amc-pivot-table">
          <thead>
            <tr>
              <th style="text-align:center;">#</th>
              <th style="text-align:center;">Record ID</th>
              <th style="text-align:center;">Equipment Category</th>
              <th style="text-align:center;">Unit / Factory</th>
              <th style="text-align:center;">Floor</th>
              <th style="text-align:center;">Vendor</th>
              <th style="text-align:center;">Last Serviced</th>
              <th style="text-align:center;">Next Due Date</th>
              <th style="text-align:center;">Contract Cost (₹)</th>
              <th style="text-align:center;">Frequency</th>
              <th style="text-align:center;">Servicing Status</th>
              <th style="text-align:center;">Take Action</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="12" style="padding:28px;text-align:center;color:#94a3b8;">No equipment records found.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }
  // ═════════════════════════════════════════════════════════════════════════
  // CARD 3: BREAKDOWNS LOGGED & SERVICE HISTORY
  // ═════════════════════════════════════════════════════════════════════════
  else if (kpiType === 'breakdowns') {
    const breakdownLogs = logs.filter(l => l.logType === 'Breakdown Repair');
    const scheduledLogs = logs.filter(l => l.logType === 'Scheduled Service');

    if (titleEl) titleEl.textContent = `Breakdowns Logged & Service History (${breakdownLogs.length} Breakdowns, ${scheduledLogs.length} Scheduled)`;
    if (subtitleEl) subtitleEl.textContent = 'Complete log of emergency breakdown repairs, routine maintenance visits, and contract financial comparison';
    if (iconWrap) iconWrap.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';

    const totalRepairCost = breakdownLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const totalScheduledCost = scheduledLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);

    const affectedUnitIds = new Set(breakdownLogs.map(l => l.amcId));
    const affectedCurrentContractCost = [...affectedUnitIds].reduce((sum, id) => {
      const rec = recordMap.get(id);
      const num = parseFloat(rec?.contractCost);
      return sum + (!isNaN(num) ? num : 0);
    }, 0);
    const affectedPastContractCost = history.filter(h => affectedUnitIds.has(h.recordId)).reduce((sum, h) => {
      const num = parseFloat(h.contractCost);
      return sum + (!isNaN(num) ? num : 0);
    }, 0);
    const totalAffectedContractCost = affectedCurrentContractCost + affectedPastContractCost;
    const totalBreakdownSectionSpend = totalRepairCost + totalAffectedContractCost;

    const summaryChipsHtml = `
      <div class="amc-drill-summary-grid">
        <div class="amc-drill-stat-chip chip-danger">
          <span class="chip-label">Total Breakdowns</span>
          <span class="chip-val" style="color:#dc2626;">${breakdownLogs.length}</span>
        </div>
        <div class="amc-drill-stat-chip chip-warning">
          <span class="chip-label">Total Repair Cost</span>
          <span class="chip-val" style="color:#ea580c;">₹${totalRepairCost.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-total">
          <span class="chip-label">Affected Contract Value</span>
          <span class="chip-val" style="color:#1d4ed8;">₹${totalAffectedContractCost.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-success">
          <span class="chip-label">Combined Breakdown Spend</span>
          <span class="chip-val" style="color:#047857;">₹${totalBreakdownSectionSpend.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-total">
          <span class="chip-label">Scheduled Visits</span>
          <span class="chip-val" style="color:#1e3a8a;">${scheduledLogs.length}</span>
        </div>
      </div>
    `;

    let selectedTableHtml = '';

    if (currentDrillSubView === 'breakdowns_category') {
      const catBreakdowns = {};
      breakdownLogs.forEach(l => {
        const parent = recordMap.get(l.amcId) || {};
        const cat = parent.category || 'General';
        if (!catBreakdowns[cat]) catBreakdowns[cat] = { count: 0, cost: 0, currentVal: 0, pastVal: 0, assetIds: new Set() };
        catBreakdowns[cat].count++;
        catBreakdowns[cat].cost += (parseFloat(l.cost) || 0);
        if (l.amcId) catBreakdowns[cat].assetIds.add(l.amcId);
      });

      Object.keys(catBreakdowns).forEach(cat => {
        catBreakdowns[cat].currentVal = [...catBreakdowns[cat].assetIds].reduce((sum, id) => {
          const rec = recordMap.get(id);
          const num = parseFloat(rec?.contractCost);
          return sum + (!isNaN(num) ? num : 0);
        }, 0);
        catBreakdowns[cat].pastVal = history.filter(h => catBreakdowns[cat].assetIds.has(h.recordId)).reduce((sum, h) => {
          const num = parseFloat(h.contractCost);
          return sum + (!isNaN(num) ? num : 0);
        }, 0);
      });

      let catEntries = Object.entries(catBreakdowns);
      if (searchVal) {
        catEntries = catEntries.filter(([cat]) => cat.toLowerCase().includes(searchVal));
      }

      let catBreakdownRows = catEntries.map(([cat, s]) => `
        <tr>
          <td style="text-align:center;"><span class="cat-pill">${escapeHtml(cat)}</span></td>
          <td style="text-align:center;"><span class="pivot-tag tag-breakdown" style="font-weight:800;">${s.count} Incidents</span></td>
          <td style="text-align:center;font-weight:800;color:#c2410c;font-size:13.5px;">₹${s.cost.toLocaleString('en-IN')}</td>
          <td style="text-align:center;font-weight:700;color:#1d4ed8;">₹${s.currentVal.toLocaleString('en-IN')}</td>
          <td style="text-align:center;font-weight:600;color:#7c3aed;">₹${s.pastVal.toLocaleString('en-IN')}</td>
          <td style="text-align:center;font-weight:800;color:#047857;font-size:13.5px;">₹${(s.cost + s.currentVal + s.pastVal).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${catEntries.length} of ${Object.keys(catBreakdowns).length} categories with breakdown repairs`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="18" x2="12" y2="6"/></svg>1. Breakdown Cost vs Contract Value by Category</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">Equipment Category</th>
                <th style="text-align:center;">Breakdown Incidents</th>
                <th style="text-align:center;">Repair Cost (₹)</th>
                <th style="text-align:center;">Current Term (₹)</th>
                <th style="text-align:center;">Past Terms (₹)</th>
                <th style="text-align:center;">Total Cumulative Spend (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${catBreakdownRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#94a3b8;">No breakdown data recorded yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else {
      let filtered = logs;
      if (searchVal) {
        filtered = logs.filter(l => {
          const parent = recordMap.get(l.amcId) || {};
          return [l.logId, l.logType, l.technician, l.description, parent.category, parent.unit, parent.floor, parent.vendorName].join(' ').toLowerCase().includes(searchVal);
        });
      }

      let rows = filtered.map((l, i) => {
        const parent = recordMap.get(l.amcId) || {};
        const isBreakdown = l.logType === 'Breakdown Repair';
        const costVal = parseFloat(l.cost) || 0;
        const currentVal = parseFloat(parent.contractCost) || 0;
        const pastVal = history.filter(h => h.recordId === l.amcId).reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);

        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="text-align:center;"><code>${escapeHtml(l.logId || '—')}</code></td>
            <td style="text-align:center;"><strong>${fmtAMCDate(l.visitDate)}</strong></td>
            <td style="text-align:center;">
              <span class="pivot-tag ${isBreakdown ? 'tag-breakdown' : 'tag-active'}" style="font-weight:700;">
                ${isBreakdown ? '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9L4.3 20.7a1 1 0 0 1-1.4-1.4L10.2 12A6 6 0 0 1 14.7 6.3z"/></svg>Breakdown' : '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;"><polyline points="20 6 9 17 4 12"/></svg>Scheduled'}
              </span>
            </td>
            <td style="text-align:center;"><span class="cat-pill">${escapeHtml(parent.category || '—')}</span></td>
            <td style="text-align:center;font-weight:700;">${escapeHtml(parent.unit || '—')} <span style="font-weight:400;color:#64748b;">(${escapeHtml(parent.floor || 'All Floors')})</span></td>
            <td style="text-align:center;">${escapeHtml(parent.vendorName || '—')}</td>
            <td style="text-align:center;font-size:12px;max-width:260px;white-space:normal;">${escapeHtml(l.description || '—')}</td>
            <td style="text-align:center;color:#1d4ed8;font-weight:700;">${currentVal > 0 ? '₹' + currentVal.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;color:#7c3aed;font-weight:600;">${pastVal > 0 ? '₹' + pastVal.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;font-weight:800;color:${costVal > 0 ? '#c2410c' : '#64748b'};font-size:13px;">₹${costVal.toLocaleString('en-IN')}</td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${filtered.length} of ${logs.length} logged visits | Breakdown Repair Cost: ₹${totalRepairCost.toLocaleString('en-IN')}`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>2. Breakdown &amp; Emergency Service Visit Log (${filtered.length})</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th style="text-align:center;">Log ID</th>
                <th style="text-align:center;">Visit Date</th>
                <th style="text-align:center;">Type</th>
                <th style="text-align:center;">Category</th>
                <th style="text-align:center;">Unit &amp; Floor</th>
                <th style="text-align:center;">Vendor</th>
                <th style="text-align:center;">Description</th>
                <th style="text-align:center;">Current Term (₹)</th>
                <th style="text-align:center;">Past Terms (₹)</th>
                <th style="text-align:center;">Visit Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="11" style="padding:24px;text-align:center;color:#94a3b8;">No matching breakdown or service logs.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = summaryChipsHtml + selectedTableHtml;
  }
  // ═════════════════════════════════════════════════════════════════════════
  // CARD 4: TOTAL AMC COST & FINANCIAL EXPENDITURE ANALYSIS (A TO Z LIFECYCLE)
  // ═════════════════════════════════════════════════════════════════════════
  else if (kpiType === 'spend') {
    const currentContractGrand = records.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
    const pastContractGrand = history.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const totalContractGrand = currentContractGrand + pastContractGrand;

    const breakdownCost = logs.filter(l => l.logType === 'Breakdown Repair').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const scheduledCost = logs.filter(l => l.logType === 'Scheduled Service').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const totalSpend = totalContractGrand + scheduledCost + breakdownCost;
    const avgPerAsset = records.length ? Math.round(totalSpend / records.length) : 0;

    if (titleEl) titleEl.textContent = `Total AMC Lifetime Expenditure Analysis (₹${totalSpend.toLocaleString('en-IN')})`;
    if (subtitleEl) subtitleEl.textContent = `Complete A to Z Lifecycle Cost: Current Contract (₹${currentContractGrand.toLocaleString('en-IN')}) + Past Renewals (₹${pastContractGrand.toLocaleString('en-IN')}) + Routine Servicing (₹${scheduledCost.toLocaleString('en-IN')}) + Breakdown Repairs (₹${breakdownCost.toLocaleString('en-IN')})`;
    if (iconWrap) iconWrap.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="18" x2="12" y2="6"/></svg>';

    const summaryChipsHtml = `
      <div class="amc-drill-summary-grid">
        <div class="amc-drill-stat-chip chip-success">
          <span class="chip-label">Grand Total A-to-Z Spend</span>
          <span class="chip-val" style="color:#047857;">₹${totalSpend.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-total">
          <span class="chip-label">Current Contract Term</span>
          <span class="chip-val" style="color:#1d4ed8;">₹${currentContractGrand.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-purple">
          <span class="chip-label">Past Renewal Terms</span>
          <span class="chip-val" style="color:#7c3aed;">₹${pastContractGrand.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-total">
          <span class="chip-label">Routine Servicing Cost</span>
          <span class="chip-val" style="color:#1e3a8a;">₹${scheduledCost.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-warning">
          <span class="chip-label">Breakdown Repair Cost</span>
          <span class="chip-val" style="color:#ea580c;">₹${breakdownCost.toLocaleString('en-IN')}</span>
        </div>
        <div class="amc-drill-stat-chip chip-purple">
          <span class="chip-label">Avg Lifetime / Asset</span>
          <span class="chip-val" style="color:#7c3aed;">₹${avgPerAsset.toLocaleString('en-IN')}</span>
        </div>
      </div>
    `;

    let selectedTableHtml = '';

    // 1. Category-wise Cost Distribution Matrix
    if (currentDrillSubView === 'spend_category') {
      const catSpend = {};
      records.forEach(r => {
        const cat = r.category || 'General';
        if (!catSpend[cat]) catSpend[cat] = { assets: 0, currentCost: 0, pastCost: 0, scheduledCost: 0, breakdownCost: 0, total: 0, visits: 0 };
        catSpend[cat].assets++;
        catSpend[cat].currentCost += (parseFloat(r.contractCost) || 0);
      });
      history.forEach(h => {
        const cat = h.category || 'General';
        if (!catSpend[cat]) catSpend[cat] = { assets: 0, currentCost: 0, pastCost: 0, scheduledCost: 0, breakdownCost: 0, total: 0, visits: 0 };
        catSpend[cat].pastCost += (parseFloat(h.contractCost) || 0);
      });
      logs.forEach(l => {
        const parent = recordMap.get(l.amcId) || {};
        const cat = parent.category || 'General';
        if (!catSpend[cat]) catSpend[cat] = { assets: 0, currentCost: 0, pastCost: 0, scheduledCost: 0, breakdownCost: 0, total: 0, visits: 0 };
        const c = parseFloat(l.cost) || 0;
        catSpend[cat].visits++;
        if (l.logType === 'Breakdown Repair') catSpend[cat].breakdownCost += c;
        else catSpend[cat].scheduledCost += c;
      });
      Object.values(catSpend).forEach(s => { s.total = s.currentCost + s.pastCost + s.scheduledCost + s.breakdownCost; });

      let catEntries = Object.entries(catSpend).sort((a, b) => b[1].total - a[1].total);
      if (searchVal) {
        catEntries = catEntries.filter(([cat]) => cat.toLowerCase().includes(searchVal));
      }

      let catSpendRows = catEntries.map(([cat, s]) => {
        const pct = totalSpend > 0 ? Math.round((s.total / totalSpend) * 100) : 0;
        const totContract = s.currentCost + s.pastCost;
        return `
          <tr>
            <td style="text-align:center;"><span class="cat-pill">${escapeHtml(cat)}</span></td>
            <td style="text-align:center;font-weight:700;">${s.assets} Assets</td>
            <td style="text-align:center;font-weight:600;">${s.visits} Visits</td>
            <td style="text-align:center;color:#1d4ed8;font-weight:700;">₹${s.currentCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#7c3aed;font-weight:600;">₹${s.pastCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#1e3a8a;font-weight:700;">₹${totContract.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#059669;font-weight:700;">₹${s.scheduledCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#ea580c;font-weight:700;">₹${s.breakdownCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;font-weight:800;color:#047857;font-size:14px;">₹${s.total.toLocaleString('en-IN')}</td>
            <td style="text-align:center;font-weight:700;color:#1e3a8a;">${pct}%</td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${catEntries.length} of ${Object.keys(catSpend).length} categories | Total A-to-Z Spend: ₹${totalSpend.toLocaleString('en-IN')}`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="18" x2="12" y2="6"/></svg>1. Category-wise Cost Distribution Matrix (Current + Past + Maint)</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">Equipment Category</th>
                <th style="text-align:center;">Total Assets</th>
                <th style="text-align:center;">Visits</th>
                <th style="text-align:center;">Current Term (₹)</th>
                <th style="text-align:center;">Past Terms (₹)</th>
                <th style="text-align:center;">Total Contract (₹)</th>
                <th style="text-align:center;">Routine Service (₹)</th>
                <th style="text-align:center;">Breakdown Repair (₹)</th>
                <th style="text-align:center;">Grand Total (₹)</th>
                <th style="text-align:center;">% Share</th>
              </tr>
            </thead>
            <tbody>
              ${catSpendRows || '<tr><td colspan="10" style="padding:20px;text-align:center;color:#94a3b8;">No matching cost data recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
    // 2. Vendor-wise Financial Matrix
    else if (currentDrillSubView === 'spend_vendor') {
      const vendorSpend = {};
      records.forEach(r => {
        const v = r.vendorName || 'Direct / Unspecified';
        if (!vendorSpend[v]) vendorSpend[v] = { contracts: 0, liveCost: 0, pastCost: 0, scheduledCost: 0, breakdownCost: 0, total: 0, categories: new Set() };
        vendorSpend[v].contracts++;
        vendorSpend[v].liveCost += (parseFloat(r.contractCost) || 0);
        if (r.category) vendorSpend[v].categories.add(r.category);
      });
      history.forEach(h => {
        const v = h.vendorName || 'Direct / Unspecified';
        if (!vendorSpend[v]) vendorSpend[v] = { contracts: 0, liveCost: 0, pastCost: 0, scheduledCost: 0, breakdownCost: 0, total: 0, categories: new Set() };
        vendorSpend[v].contracts++;
        vendorSpend[v].pastCost += (parseFloat(h.contractCost) || 0);
        if (h.category) vendorSpend[v].categories.add(h.category);
      });
      logs.forEach(l => {
        const parent = recordMap.get(l.amcId) || {};
        const v = parent.vendorName || 'Direct / Unspecified';
        if (!vendorSpend[v]) vendorSpend[v] = { contracts: 0, liveCost: 0, pastCost: 0, scheduledCost: 0, breakdownCost: 0, total: 0, categories: new Set() };
        const c = parseFloat(l.cost) || 0;
        if (l.logType === 'Breakdown Repair') vendorSpend[v].breakdownCost += c;
        else vendorSpend[v].scheduledCost += c;
      });
      Object.values(vendorSpend).forEach(s => { s.total = s.liveCost + s.pastCost + s.scheduledCost + s.breakdownCost; });

      let vendorEntries = Object.entries(vendorSpend).sort((a, b) => b[1].total - a[1].total);
      if (searchVal) {
        vendorEntries = vendorEntries.filter(([v, s]) => [v, ...s.categories].join(' ').toLowerCase().includes(searchVal));
      }

      let vendorSpendRows = vendorEntries.map(([v, s]) => {
        const totContract = s.liveCost + s.pastCost;
        return `
          <tr>
            <td style="text-align:center;"><strong>${escapeHtml(v)}</strong></td>
            <td style="text-align:center;font-size:11.5px;color:var(--muted);">${escapeHtml([...s.categories].join(', '))}</td>
            <td style="text-align:center;font-weight:700;">${s.contracts}</td>
            <td style="text-align:center;color:#1d4ed8;font-weight:700;">₹${s.liveCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#7c3aed;font-weight:600;">₹${s.pastCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#1e3a8a;font-weight:700;">₹${totContract.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#059669;font-weight:600;">₹${s.scheduledCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#ea580c;font-weight:600;">₹${s.breakdownCost.toLocaleString('en-IN')}</td>
            <td style="text-align:center;font-weight:800;color:#047857;font-size:13.5px;">₹${s.total.toLocaleString('en-IN')}</td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${vendorEntries.length} of ${Object.keys(vendorSpend).length} vendors | Total Spend: ₹${totalSpend.toLocaleString('en-IN')}`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>2. Vendor-wise Financial Matrix (Live + Past Terms + Service)</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">Vendor Agency</th>
                <th style="text-align:center;">Covered Categories</th>
                <th style="text-align:center;">Contracts</th>
                <th style="text-align:center;">Live Term (₹)</th>
                <th style="text-align:center;">Past Terms (₹)</th>
                <th style="text-align:center;">Total Contract (₹)</th>
                <th style="text-align:center;">Routine Service Spend (₹)</th>
                <th style="text-align:center;">Breakdown Spend (₹)</th>
                <th style="text-align:center;">Total Vendor Payout (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${vendorSpendRows || '<tr><td colspan="9" style="padding:20px;text-align:center;color:#94a3b8;">No matching vendor expenditure recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
    // 3. Equipment Contract & Maintenance Summary
    else if (currentDrillSubView === 'spend_equipment') {
      let filteredRecordsForSpend = records;
      if (searchVal) {
        filteredRecordsForSpend = records.filter(r =>
          [r.id, r.category, r.unit, r.floor, r.vendorName, r.status].join(' ').toLowerCase().includes(searchVal)
        );
      }

      let contractRows = filteredRecordsForSpend.map((r, i) => {
        const cc = parseFloat(r.contractCost) || 0;
        const pastCost = history.filter(h => h.recordId === r.id).reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
        const totContract = cc + pastCost;

        const rLogs = logs.filter(l => l.amcId === r.id);
        const svcC = rLogs.filter(l => l.logType === 'Scheduled Service').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
        const bkdC = rLogs.filter(l => l.logType === 'Breakdown Repair').reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
        const totAsset = totContract + svcC + bkdC;

        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="text-align:center;"><code>${escapeHtml(r.id || '—')}</code></td>
            <td style="text-align:center;"><span class="cat-pill">${escapeHtml(r.category || '—')}</span></td>
            <td style="text-align:center;font-weight:700;">${escapeHtml(r.unit || '—')} <span style="font-weight:400;color:#64748b;">(${escapeHtml(r.floor || 'All Floors')})</span></td>
            <td style="text-align:center;">${escapeHtml(r.vendorName || '—')}</td>
            <td style="text-align:center;">${escapeHtml(r.startDate || '—')}</td>
            <td style="text-align:center;">${escapeHtml(r.expiryDate || '—')}</td>
            <td style="text-align:center;font-weight:700;color:#1d4ed8;">${cc > 0 ? '₹' + cc.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;font-weight:600;color:#7c3aed;">${pastCost > 0 ? '₹' + pastCost.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;font-weight:700;color:#1e3a8a;">${totContract > 0 ? '₹' + totContract.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;font-weight:600;color:#059669;">${svcC > 0 ? '₹' + svcC.toLocaleString('en-IN') : '₹0'}</td>
            <td style="text-align:center;font-weight:600;color:#ea580c;">${bkdC > 0 ? '₹' + bkdC.toLocaleString('en-IN') : '₹0'}</td>
            <td style="text-align:center;font-weight:800;color:#047857;">₹${totAsset.toLocaleString('en-IN')}</td>
            <td style="text-align:center;"><span class="pivot-tag ${r.status === 'Active' ? 'tag-active' : r.status === 'Expired' ? 'tag-overdue' : 'tag-breakdown'}">${escapeHtml(r.status || '—')}</span></td>
            <td style="text-align:center;">
              <button type="button" class="amc-drill-action-btn" onclick="closeAmcKpiDrillModal();openAmcActionModal('${escapeHtml(r.id)}')">
                View &rarr;
              </button>
            </td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${filteredRecordsForSpend.length} of ${records.length} equipment asset summaries`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><path d="M12 12v4"/></svg>3. Individual Equipment Contract &amp; Maintenance Summary (A to Z Lifecycle)</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th style="text-align:center;">Record ID</th>
                <th style="text-align:center;">Category</th>
                <th style="text-align:center;">Unit & Floor</th>
                <th style="text-align:center;">Vendor</th>
                <th style="text-align:center;">Start Date</th>
                <th style="text-align:center;">Expiry Date</th>
                <th style="text-align:center;">Current Term (₹)</th>
                <th style="text-align:center;">Past Terms (₹)</th>
                <th style="text-align:center;">Total Contract (₹)</th>
                <th style="text-align:center;">Routine Svc (₹)</th>
                <th style="text-align:center;">Breakdown (₹)</th>
                <th style="text-align:center;">Lifetime Total (₹)</th>
                <th style="text-align:center;">Contract Status</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${contractRows || '<tr><td colspan="15" style="padding:24px;text-align:center;color:#94a3b8;">No contract records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
    // 4. Past Contract Renewal Terms History Archive
    else if (currentDrillSubView === 'spend_history') {
      let filteredHistory = history;
      if (searchVal) {
        filteredHistory = history.filter(h =>
          [h.recordId, h.category, h.unit, h.floor, h.vendorName, h.contactInfo, h.remarks, h.renewedToVendor].join(' ').toLowerCase().includes(searchVal)
        );
      }

      let historyRows = filteredHistory.map((h, i) => {
        const hc = parseFloat(h.contractCost) || 0;
        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="text-align:center;"><code>${escapeHtml(h.recordId || '—')}</code></td>
            <td style="text-align:center;"><span class="cat-pill">${escapeHtml(h.category || '—')}</span></td>
            <td style="text-align:center;font-weight:700;">${escapeHtml(h.unit || '—')} <span style="font-weight:400;color:#64748b;">(${escapeHtml(h.floor || 'All Floors')})</span></td>
            <td style="text-align:center;"><strong>${escapeHtml(h.vendorName || '—')}</strong></td>
            <td style="text-align:center;font-size:12px;">${escapeHtml(h.contactInfo || '—')}</td>
            <td style="text-align:center;">${fmtAMCDate(h.startDate)} – ${fmtAMCDate(h.expiryDate)}</td>
            <td style="text-align:center;font-weight:800;color:#7c3aed;font-size:13.5px;">₹${hc.toLocaleString('en-IN')}</td>
            <td style="text-align:center;color:#047857;font-weight:700;">${escapeHtml(h.renewedToVendor || '—')}</td>
            <td style="text-align:center;font-size:12px;max-width:220px;white-space:normal;">${escapeHtml(h.remarks || '—')}</td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${filteredHistory.length} of ${history.length} past renewal terms | Past Contract Total: ₹${pastContractGrand.toLocaleString('en-IN')}`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>4. Past Contract Renewal Terms History Archive (${filteredHistory.length})</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th style="text-align:center;">Record ID</th>
                <th style="text-align:center;">Category</th>
                <th style="text-align:center;">Unit & Floor</th>
                <th style="text-align:center;">Past Vendor</th>
                <th style="text-align:center;">Contact</th>
                <th style="text-align:center;">Term Period</th>
                <th style="text-align:center;">Contract Cost (₹)</th>
                <th style="text-align:center;">Renewed To</th>
                <th style="text-align:center;">Renewal Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${historyRows || '<tr><td colspan="10" style="padding:24px;text-align:center;color:#94a3b8;">No past contract renewals found for this filter.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
    // 5. Detailed Log of Maintenance & Repair Expenses
    else {
      let filteredLogs = logs;
      if (searchVal) {
        filteredLogs = logs.filter(l => {
          const parent = recordMap.get(l.amcId) || {};
          return [l.logId, l.logType, l.technician, l.description, parent.category, parent.unit, parent.floor, parent.vendorName].join(' ').toLowerCase().includes(searchVal);
        });
      }

      let costRows = filteredLogs.map((l, i) => {
        const parent = recordMap.get(l.amcId) || {};
        const c = parseFloat(l.cost) || 0;
        const cc = parseFloat(parent.contractCost) || 0;

        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="text-align:center;"><code>${escapeHtml(l.logId || '—')}</code></td>
            <td style="text-align:center;">${fmtAMCDate(l.visitDate)}</td>
            <td style="text-align:center;"><span class="pivot-tag ${l.logType === 'Breakdown Repair' ? 'tag-breakdown' : 'tag-active'}">${escapeHtml(l.logType)}</span></td>
            <td style="text-align:center;"><span class="cat-pill">${escapeHtml(parent.category || '—')}</span></td>
            <td style="text-align:center;font-weight:700;">${escapeHtml(parent.unit || '—')} <span style="font-weight:400;color:#64748b;">(${escapeHtml(parent.floor || 'All Floors')})</span></td>
            <td style="text-align:center;">${escapeHtml(parent.vendorName || '—')}</td>
            <td style="text-align:center;font-size:12px;max-width:260px;white-space:normal;">${escapeHtml(l.description || '—')}</td>
            <td style="text-align:center;color:#1d4ed8;font-weight:700;">${cc > 0 ? '₹' + cc.toLocaleString('en-IN') : '—'}</td>
            <td style="text-align:center;font-weight:800;color:${c > 0 ? '#047857' : '#64748b'};font-size:13px;">₹${c.toLocaleString('en-IN')}</td>
          </tr>
        `;
      }).join('');

      if (statsTextEl) statsTextEl.textContent = `Showing ${filteredLogs.length} of ${logs.length} expense log entries`;

      selectedTableHtml = `
        <h4 style="margin:12px 0 6px;font-family:var(--font-heading);font-size:14px;color:var(--ink);font-weight:700;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>5. Detailed Log of Maintenance &amp; Repair Expenses (${filteredLogs.length})</h4>
        <div class="amc-drill-table-wrap" style="height:420px;max-height:420px;">
          <table class="amc-pivot-table">
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th style="text-align:center;">Log ID</th>
                <th style="text-align:center;">Visit Date</th>
                <th style="text-align:center;">Log Type</th>
                <th style="text-align:center;">Category</th>
                <th style="text-align:center;">Unit &amp; Floor</th>
                <th style="text-align:center;">Vendor</th>
                <th style="text-align:center;">Description</th>
                <th style="text-align:center;">Current Rate (₹)</th>
                <th style="text-align:center;">Visit Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${costRows || '<tr><td colspan="10" style="padding:24px;text-align:center;color:#94a3b8;">No cost entries found for current filter.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = summaryChipsHtml + selectedTableHtml;
  }
}

function exportAmcDrilldownExcel() {
  if (!window.XLSX) {
    showToast('Excel export library not available.', true);
    return;
  }

  const table = document.querySelector('#amcDrillBodyContainer table');
  if (!table) {
    showToast('No table data to export.', true);
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  const sheetName = (currentDrillSubView || currentDrillKpiType).substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const stamp = formatLocalDate(new Date());
  XLSX.writeFile(wb, `AMC_KPI_${(currentDrillSubView || currentDrillKpiType).toUpperCase()}_${stamp}.xlsx`);
  showToast('KPI breakdown downloaded to Excel.');
}

function printAmcDrilldownPdf() {
  const body = document.getElementById('amcDrillBodyContainer');
  const title = document.getElementById('amcDrillTitle')?.textContent || 'AMC KPI Details';
  const subtitle = document.getElementById('amcDrillSubtitle')?.textContent || '';
  if (!body || !body.querySelector('table')) {
    showToast('No table data to export.', true);
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    showToast('Please allow pop-ups to download the PDF.', true);
    return;
  }
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#172554;padding:24px}h1{font-size:20px;margin:0 0 6px}p{font-size:12px;color:#475569;margin:0 0 18px}.amc-drill-summary-grid{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}.amc-drill-stat-chip{border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;min-width:120px}.chip-label{display:block;font-size:11px;color:#475569}.chip-val{display:block;font-size:18px;font-weight:700;margin-top:3px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#1e3a8a;color:#fff;padding:8px;text-align:left}td{border:1px solid #cbd5e1;padding:7px;vertical-align:top}.pivot-tag{display:inline-block;padding:3px 6px;border-radius:10px;background:#fef3c7;color:#92400e;font-weight:700}.tag-overdue{background:#fee2e2;color:#b91c1c}@media print{body{padding:0}table{font-size:9px}th,td{padding:5px}}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)} · Generated ${new Date().toLocaleString('en-IN')}</p>${body.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// Close KPI drilldown modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const drillModal = document.getElementById('amcKpiDrillModal');
    if (drillModal && !drillModal.classList.contains('hidden')) {
      closeAmcKpiDrillModal();
    }
    const histModal = document.getElementById('amcHistoryAnalysisModal');
    if (histModal && !histModal.classList.contains('hidden')) {
      closeAmcHistoryAnalysisCard();
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// AMC COMPREHENSIVE HISTORY & LIFECYCLE INTELLIGENCE CONTROLLER
// ═════════════════════════════════════════════════════════════════════════════

let currentAmcHistTab = 'category';
let currentAmcHistTimelineView = 'stream';

async function openAmcHistoryIntelligenceCard() {
  const modal = document.getElementById('amcHistoryAnalysisModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const updatedEl = document.getElementById('amcHistUpdatedAt');
  if (updatedEl) {
    updatedEl.textContent = `Analyzed: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Pre-populate filter dropdowns
  populateAmcHistFilterDropdowns();

  // Load live records, past contract terms and all service/breakdown logs concurrently
  try {
    await Promise.all([
      loadAmcData(false),
      fetchAllAmcServiceLogs(false),
      fetchAllAmcContractHistory(false)
    ]);
  } catch (err) {
    console.error('Error loading AMC history intelligence data:', err);
  }

  // Refresh dropdowns with complete datasets
  populateAmcHistFilterDropdowns();

  // Render dashboard metrics and active tab
  renderAmcHistoryDashboard();
}

function closeAmcHistoryAnalysisCard() {
  const modal = document.getElementById('amcHistoryAnalysisModal');
  if (modal) modal.classList.add('hidden');
}

async function refreshAmcHistoryData() {
  showToast('Refreshing AMC history data…');
  try {
    await Promise.all([
      loadAmcData(true),
      fetchAllAmcServiceLogs(true),
      fetchAllAmcContractHistory(true)
    ]);
    const updatedEl = document.getElementById('amcHistUpdatedAt');
    if (updatedEl) {
      updatedEl.textContent = `Analyzed: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
    populateAmcHistFilterDropdowns();
    renderAmcHistoryDashboard();
    showToast('History intelligence updated.');
  } catch (err) {
    showToast(`History refresh failed: ${err.message || err}`, true);
  }
}

function switchAmcHistTab(tabId) {
  currentAmcHistTab = tabId;
  const tabIds = ['category', 'unit', 'vendor', 'timeline'];
  tabIds.forEach(id => {
    const btn = document.getElementById(`amcHistTabBtn${id.charAt(0).toUpperCase() + id.slice(1)}`);
    const content = document.getElementById(`amcHistTabContent${id.charAt(0).toUpperCase() + id.slice(1)}`);
    if (btn) btn.classList.toggle('active', id === tabId);
    if (content) content.classList.toggle('hidden', id !== tabId);
  });
}

function switchAmcHistTimelineView(viewType) {
  currentAmcHistTimelineView = viewType;
  const viewMap = {
    stream: 'amcHistSubBtnStream',
    terms: 'amcHistSubBtnTerms',
    logs: 'amcHistSubBtnLogs'
  };
  Object.entries(viewMap).forEach(([key, btnId]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('active', key === viewType);
  });
  renderAmcHistTimeline();
}

function populateAmcHistFilterDropdowns() {
  const unitEl = document.getElementById('amcHistFilterUnit');
  if (unitEl) {
    const curUnit = unitEl.value;
    const allUnits = [...new Set([
      ...state.factories,
      ...allAmcData.flatMap(r => amcSplitUnits(r.unit)),
      ...allAmcContractHistory.flatMap(h => amcSplitUnits(h.unit))
    ])].filter(Boolean).sort();
    unitEl.innerHTML = '<option value="">All Units</option>' +
      allUnits.map(u => `<option value="${escapeHtml(u)}" ${u === curUnit ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('');
  }

  const vendorEl = document.getElementById('amcHistFilterVendor');
  if (vendorEl) {
    const curVendor = vendorEl.value;
    const allVendors = [...new Set([
      ...allAmcData.map(r => r.vendorName),
      ...allAmcContractHistory.map(h => h.vendorName)
    ])].filter(Boolean).sort();
    vendorEl.innerHTML = '<option value="">All Vendors</option>' +
      allVendors.map(v => `<option value="${escapeHtml(v)}" ${v === curVendor ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  }
}

function applyAmcHistFilters() {
  renderAmcHistoryDashboard();
}

function resetAmcHistFilters() {
  const unitEl = document.getElementById('amcHistFilterUnit');
  const catEl = document.getElementById('amcHistFilterCategory');
  const vendorEl = document.getElementById('amcHistFilterVendor');
  const searchEl = document.getElementById('amcHistSearchInput');
  if (unitEl) unitEl.value = '';
  if (catEl) catEl.value = '';
  if (vendorEl) vendorEl.value = '';
  if (searchEl) searchEl.value = '';
  renderAmcHistoryDashboard();
}

function getFilteredAmcHistoryData() {
  const unitFilter = document.getElementById('amcHistFilterUnit')?.value || '';
  const catFilter = document.getElementById('amcHistFilterCategory')?.value || '';
  const vendorFilter = document.getElementById('amcHistFilterVendor')?.value || '';
  const searchFilter = (document.getElementById('amcHistSearchInput')?.value || '').toLowerCase().trim();

  // Match live records
  const filteredRecords = allAmcData.filter(r => {
    if (unitFilter && !amcSplitUnits(r.unit).includes(unitFilter)) return false;
    if (catFilter && r.category !== catFilter) return false;
    if (vendorFilter && r.vendorName !== vendorFilter) return false;
    if (searchFilter) {
      const q = [r.id, r.category, r.unit, r.floor, r.vendorName, r.contactInfo, r.remarks, r.status].join(' ').toLowerCase();
      if (!q.includes(searchFilter)) return false;
    }
    return true;
  });

  const recordIdSet = new Set(filteredRecords.map(r => r.id));

  // Match archived contract terms
  const filteredHistory = allAmcContractHistory.filter(h => {
    if (unitFilter && !amcSplitUnits(h.unit).includes(unitFilter)) return false;
    if (catFilter && h.category !== catFilter) return false;
    if (vendorFilter && h.vendorName !== vendorFilter) return false;
    if (searchFilter) {
      const q = [h.recordId, h.category, h.unit, h.floor, h.vendorName, h.contactInfo, h.remarks, h.renewedToVendor].join(' ').toLowerCase();
      if (!q.includes(searchFilter)) return false;
    }
    return true;
  });

  // All known record IDs matching the filter
  const allMatchingIds = new Set([...filteredRecords.map(r => r.id), ...filteredHistory.map(h => h.recordId)]);

  // Master map for record details lookup
  const recordMap = new Map();
  allAmcData.forEach(r => recordMap.set(r.id, r));
  allAmcContractHistory.forEach(h => {
    if (!recordMap.has(h.recordId)) {
      recordMap.set(h.recordId, {
        id: h.recordId,
        category: h.category,
        unit: h.unit,
        floor: h.floor,
        vendorName: h.vendorName,
        contactInfo: h.contactInfo,
        status: 'Archived Term'
      });
    }
  });

  // Match service and repair logs
  const filteredLogs = allAmcServiceLogs.filter(l => {
    if (allMatchingIds.size > 0 && !allMatchingIds.has(l.amcId)) return false;
    if (searchFilter) {
      const parent = recordMap.get(l.amcId) || {};
      const q = [l.logId, l.logType, l.technician, l.description, l.workDone, l.partsReplaced, parent.category, parent.unit, parent.floor, parent.vendorName].join(' ').toLowerCase();
      if (!q.includes(searchFilter)) return false;
    }
    return true;
  });

  return {
    records: filteredRecords,
    history: filteredHistory,
    logs: filteredLogs,
    recordMap: recordMap
  };
}

function renderAmcHistoryDashboard() {
  const data = getFilteredAmcHistoryData();
  const { records, history, logs, recordMap } = data;

  // 1. TOP METRIC STRIPS CALCULATION
  const liveCost = records.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
  const pastCost = history.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
  const totalTermValue = liveCost + pastCost;
  const totalTermsCount = records.length + history.length;

  const routineLogs = logs.filter(l => l.logType === 'Scheduled Service');
  const breakdownLogs = logs.filter(l => l.logType === 'Breakdown Repair');
  const routineSpend = routineLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
  const breakdownSpend = breakdownLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
  const grandHistoricSpend = totalTermValue + routineSpend + breakdownSpend;

  const categories = [...new Set([...records.map(r => r.category), ...history.map(h => h.category)])].filter(Boolean);
  const units = [...new Set([...records.flatMap(r => amcSplitUnits(r.unit)), ...history.flatMap(h => amcSplitUnits(h.unit))])].filter(Boolean);

  const liveVendors = new Set(records.map(r => r.vendorName).filter(Boolean));
  const pastOnlyVendors = new Set(history.map(h => h.vendorName).filter(Boolean).filter(v => !liveVendors.has(v)));
  const totalVendorsCount = liveVendors.size + pastOnlyVendors.size;
  const renewalTransitions = history.filter(h => h.renewedToVendor && h.renewedToVendor !== h.vendorName).length;

  // Top Category by count
  const catCountMap = {};
  records.forEach(r => { if (r.category) catCountMap[r.category] = (catCountMap[r.category] || 0) + 1; });
  history.forEach(h => { if (h.category) catCountMap[h.category] = (catCountMap[h.category] || 0) + 1; });
  const topCatEntry = Object.entries(catCountMap).sort((a, b) => b[1] - a[1])[0];
  const topCatText = topCatEntry ? `${topCatEntry[0]} (${topCatEntry[1]} Terms)` : '—';

  // Populate Metric Tiles
  const setEl = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setEl('amcHistKpiTotalTerms', totalTermsCount);
  setEl('amcHistKpiTermsSub', `${records.length} Active | ${history.length} Archived Past Terms`);
  setEl('amcHistKpiTermsVal', `₹${totalTermValue.toLocaleString('en-IN')} Total Term Value`);

  setEl('amcHistKpiTotalCats', categories.length);
  setEl('amcHistKpiCatsSub', `Active Across ${categories.length} Categories`);
  setEl('amcHistKpiTopCat', `Top Category: ${topCatText}`);

  setEl('amcHistKpiTotalUnits', units.length);
  setEl('amcHistKpiUnitsSub', `${records.length} Current Equipment Assets`);
  setEl('amcHistKpiUnitsCost', `₹${grandHistoricSpend.toLocaleString('en-IN')} Total Lifecycle Spend`);

  setEl('amcHistKpiTotalVendors', totalVendorsCount);
  setEl('amcHistKpiVendorsSub', `${liveVendors.size} Live Partners | ${pastOnlyVendors.size} Past Vendors`);
  setEl('amcHistKpiVendorRenewals', `${renewalTransitions} Vendor Switches Recorded`);

  setEl('amcHistKpiTotalVisits', logs.length);
  setEl('amcHistKpiVisitsSub', `${routineLogs.length} Routine | ${breakdownLogs.length} Breakdown Repairs`);
  setEl('amcHistKpiGrandSpend', `₹${grandHistoricSpend.toLocaleString('en-IN')} Lifetime Grand Spend`);

  // Render individual tabs
  renderAmcHistCategoryAnalysis(data);
  renderAmcHistUnitAnalysis(data);
  renderAmcHistVendorAnalysis(data);
  renderAmcHistTimeline();
}

// ── TAB 1: Category-Wise History Analysis ─────────────────────────────────────
function renderAmcHistCategoryAnalysis(data) {
  const { records, history, logs } = data;
  const cardsContainer = document.getElementById('amcHistCategoryCardsGrid');
  const tableContainer = document.getElementById('amcHistCategoryTableContainer');
  if (!cardsContainer || !tableContainer) return;

  const categories = [...new Set([...records.map(r => r.category), ...history.map(h => h.category)])].filter(Boolean).sort();

  if (!categories.length) {
    cardsContainer.innerHTML = '';
    tableContainer.innerHTML = '<div style="padding:32px;text-align:center;color:#9a3412;">No category history records found for the selected filter.</div>';
    return;
  }

  const catDataList = categories.map(cat => {
    const liveRecs = records.filter(r => r.category === cat);
    const pastRecs = history.filter(h => h.category === cat);
    const recIds = new Set([...liveRecs.map(r => r.id), ...pastRecs.map(h => h.recordId)]);
    const catLogs = logs.filter(l => recIds.has(l.amcId));

    const curCost = liveRecs.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
    const pastCost = pastRecs.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const totContract = curCost + pastCost;

    const routineL = catLogs.filter(l => l.logType === 'Scheduled Service');
    const bkdL = catLogs.filter(l => l.logType === 'Breakdown Repair');
    const routineC = routineL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const bkdC = bkdL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const grandTotal = totContract + routineC + bkdC;

    const liveVendors = [...new Set(liveRecs.map(r => r.vendorName).filter(Boolean))];
    const pastVendors = [...new Set(pastRecs.map(h => h.vendorName).filter(Boolean))];
    const allVendors = [...new Set([...liveVendors, ...pastVendors])];

    return {
      category: cat,
      liveCount: liveRecs.length,
      pastCount: pastRecs.length,
      totalTerms: liveRecs.length + pastRecs.length,
      curCost,
      pastCost,
      totContract,
      routineCount: routineL.length,
      routineCost: routineC,
      bkdCount: bkdL.length,
      bkdCost: bkdC,
      grandTotal,
      allVendors,
      liveVendors,
      pastVendors
    };
  });

  // Render Category Cards (Sharp Rectangular Warm Cards with SVG Icons)
  cardsContainer.innerHTML = catDataList.map(c => `
    <div class="amc-hist-card-box-item">
      <div class="amc-hist-card-header">
        <div class="amc-hist-card-title">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          ${escapeHtml(c.category)}
        </div>
        <span class="hist-tag tag-live">${c.totalTerms} Terms</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Active Contracts:</span>
        <span class="amc-hist-stat-val">${c.liveCount} (₹${c.curCost.toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Past Terms Archived:</span>
        <span class="amc-hist-stat-val">${c.pastCount} (₹${c.pastCost.toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Routine Visits / Spend:</span>
        <span class="amc-hist-stat-val" style="color:#059669;">${c.routineCount} visits (₹${c.routineCost.toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Breakdown Calls / Spend:</span>
        <span class="amc-hist-stat-val" style="color:#c2410c;">${c.bkdCount} calls (₹${c.bkdCost.toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-footer">
        <span style="font-size:11px;color:#78350f;font-weight:700;">Lifetime Spend:</span>
        <strong style="color:#7c2d12;font-size:13.5px;font-family:var(--font-heading);">₹${c.grandTotal.toLocaleString('en-IN')}</strong>
      </div>
    </div>
  `).join('');

  // Render Category Matrix Table
  const tableRows = catDataList.map((c, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="text-align:center;"><strong>${escapeHtml(c.category)}</strong></td>
      <td style="text-align:center;"><span class="hist-tag tag-live">${c.liveCount}</span></td>
      <td style="text-align:center;"><span class="hist-tag tag-past">${c.pastCount}</span></td>
      <td style="text-align:center;"><strong>${c.totalTerms}</strong></td>
      <td style="text-align:center;color:#1d4ed8;font-weight:700;">₹${c.curCost.toLocaleString('en-IN')}</td>
      <td style="text-align:center;color:#7c3aed;font-weight:600;">₹${c.pastCost.toLocaleString('en-IN')}</td>
      <td style="text-align:center;color:#1e3a8a;font-weight:800;">₹${c.totContract.toLocaleString('en-IN')}</td>
      <td style="text-align:center;color:#059669;font-weight:600;">${c.routineCount} (₹${c.routineCost.toLocaleString('en-IN')})</td>
      <td style="text-align:center;color:#ea580c;font-weight:600;">${c.bkdCount} (₹${c.bkdCost.toLocaleString('en-IN')})</td>
      <td style="text-align:center;color:#7c2d12;font-weight:800;font-size:12.5px;">₹${c.grandTotal.toLocaleString('en-IN')}</td>
      <td style="text-align:center;font-size:11px;color:#572a11;">${escapeHtml(c.allVendors.join(', ') || '—')}</td>
    </tr>
  `).join('');

  tableContainer.innerHTML = `
    <table class="amc-hist-table">
      <thead>
        <tr>
          <th style="width:35px;text-align:center;">#</th>
          <th style="text-align:center;">Category Name</th>
          <th style="text-align:center;">Live</th>
          <th style="text-align:center;">Past Terms</th>
          <th style="text-align:center;">Total Terms</th>
          <th style="text-align:center;">Live Term (₹)</th>
          <th style="text-align:center;">Past Terms (₹)</th>
          <th style="text-align:center;">Total Contract (₹)</th>
          <th style="text-align:center;">Routine Visits</th>
          <th style="text-align:center;">Breakdown Repairs</th>
          <th style="text-align:center;">Grand Total Spend (₹)</th>
          <th style="text-align:center;">Vendors Associated</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

// ── TAB 2: Unit-Wise History Analysis (WITH MULTI-UNIT SPLIT CALCULATION) ─────
function renderAmcHistUnitAnalysis(data) {
  const { records, history, logs, recordMap } = data;
  const cardsContainer = document.getElementById('amcHistUnitCardsGrid');
  const tableContainer = document.getElementById('amcHistUnitTableContainer');
  if (!cardsContainer || !tableContainer) return;

  const units = [...new Set([
    ...records.flatMap(r => amcSplitUnits(r.unit)),
    ...history.flatMap(h => amcSplitUnits(h.unit))
  ])].filter(Boolean).sort();

  if (!units.length) {
    cardsContainer.innerHTML = '';
    tableContainer.innerHTML = '<div style="padding:32px;text-align:center;color:#9a3412;">No unit history records found for current filter.</div>';
    return;
  }

  const unitDataList = units.map(u => {
    const liveRecs = records.filter(r => amcSplitUnits(r.unit).includes(u));
    const pastRecs = history.filter(h => amcSplitUnits(h.unit).includes(u));
    const recIds = new Set([...liveRecs.map(r => r.id), ...pastRecs.map(h => h.recordId)]);
    const unitLogs = logs.filter(l => recIds.has(l.amcId));

    // SPLIT COST LOGIC: When a contract spans multiple units, divide the cost equally among them
    const curCost = liveRecs.reduce((s, r) => {
      const uCount = Math.max(1, amcSplitUnits(r.unit).length);
      const fullCost = parseFloat(r.contractCost) || 0;
      return s + (fullCost / uCount);
    }, 0);

    const pastCost = pastRecs.reduce((s, h) => {
      const uCount = Math.max(1, amcSplitUnits(h.unit).length);
      const fullCost = parseFloat(h.contractCost) || 0;
      return s + (fullCost / uCount);
    }, 0);

    const totContract = curCost + pastCost;

    const routineL = unitLogs.filter(l => l.logType === 'Scheduled Service');
    const bkdL = unitLogs.filter(l => l.logType === 'Breakdown Repair');

    const routineC = routineL.reduce((s, l) => {
      const parent = recordMap.get(l.amcId) || {};
      const uCount = Math.max(1, amcSplitUnits(parent.unit).length);
      const fullCost = parseFloat(l.cost) || 0;
      return s + (fullCost / uCount);
    }, 0);

    const bkdC = bkdL.reduce((s, l) => {
      const parent = recordMap.get(l.amcId) || {};
      const uCount = Math.max(1, amcSplitUnits(parent.unit).length);
      const fullCost = parseFloat(l.cost) || 0;
      return s + (fullCost / uCount);
    }, 0);

    const grandTotal = totContract + routineC + bkdC;

    const cats = [...new Set([...liveRecs.map(r => r.category), ...pastRecs.map(h => h.category)])].filter(Boolean);
    const vendors = [...new Set([...liveRecs.map(r => r.vendorName), ...pastRecs.map(h => h.vendorName)])].filter(Boolean);

    return {
      unit: u,
      liveCount: liveRecs.length,
      pastCount: pastRecs.length,
      totalTerms: liveRecs.length + pastRecs.length,
      curCost,
      pastCost,
      totContract,
      routineCount: routineL.length,
      routineCost: routineC,
      bkdCount: bkdL.length,
      bkdCost: bkdC,
      grandTotal,
      categories: cats,
      vendors: vendors
    };
  });

  // Render Unit Cards with SVG Icons
  cardsContainer.innerHTML = unitDataList.map(u => `
    <div class="amc-hist-card-box-item">
      <div class="amc-hist-card-header">
        <div class="amc-hist-card-title">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M2 20h20M5 20V8l7 4V4l7 4v12"/></svg>
          ${escapeHtml(u.unit)}
        </div>
        <span class="hist-tag tag-live">${u.categories.length} Categories</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Live Equipment / Past:</span>
        <span class="amc-hist-stat-val">${u.liveCount} Live | ${u.pastCount} Past</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Split Contract Value:</span>
        <span class="amc-hist-stat-val" style="color:#1d4ed8;">₹${Math.round(u.totContract).toLocaleString('en-IN')}</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Routine Service Logs:</span>
        <span class="amc-hist-stat-val" style="color:#059669;">${u.routineCount} visits (₹${Math.round(u.routineCost).toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Breakdown Calls:</span>
        <span class="amc-hist-stat-val" style="color:#c2410c;">${u.bkdCount} calls (₹${Math.round(u.bkdCost).toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-footer">
        <span style="font-size:11px;color:#78350f;font-weight:700;">Split Lifetime Spend:</span>
        <strong style="color:#7c2d12;font-size:13.5px;font-family:var(--font-heading);">₹${Math.round(u.grandTotal).toLocaleString('en-IN')}</strong>
      </div>
    </div>
  `).join('');

  // Render Unit Matrix Table
  const tableRows = unitDataList.map((u, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="text-align:center;"><strong>${escapeHtml(u.unit)}</strong></td>
      <td style="text-align:center;font-size:11px;color:#572a11;">${escapeHtml(u.categories.join(', ') || '—')}</td>
      <td style="text-align:center;"><span class="hist-tag tag-live">${u.liveCount}</span></td>
      <td style="text-align:center;"><span class="hist-tag tag-past">${u.pastCount}</span></td>
      <td style="text-align:center;color:#1d4ed8;font-weight:700;">₹${Math.round(u.curCost).toLocaleString('en-IN')}</td>
      <td style="text-align:center;color:#7c3aed;font-weight:600;">₹${Math.round(u.pastCost).toLocaleString('en-IN')}</td>
      <td style="text-align:center;color:#1e3a8a;font-weight:800;">₹${Math.round(u.totContract).toLocaleString('en-IN')}</td>
      <td style="text-align:center;color:#059669;font-weight:600;">${u.routineCount} (₹${Math.round(u.routineCost).toLocaleString('en-IN')})</td>
      <td style="text-align:center;color:#ea580c;font-weight:600;">${u.bkdCount} (₹${Math.round(u.bkdCost).toLocaleString('en-IN')})</td>
      <td style="text-align:center;color:#7c2d12;font-weight:800;font-size:12.5px;">₹${Math.round(u.grandTotal).toLocaleString('en-IN')}</td>
      <td style="text-align:center;font-size:11px;color:#572a11;">${escapeHtml(u.vendors.join(', ') || '—')}</td>
    </tr>
  `).join('');

  tableContainer.innerHTML = `
    <table class="amc-hist-table">
      <thead>
        <tr>
          <th style="width:35px;text-align:center;">#</th>
          <th style="text-align:center;">Facility / Unit</th>
          <th style="text-align:center;">Categories Serviced</th>
          <th style="text-align:center;">Live Assets</th>
          <th style="text-align:center;">Past Terms</th>
          <th style="text-align:center;">Live Value (₹)</th>
          <th style="text-align:center;">Past Value (₹)</th>
          <th style="text-align:center;">Split Contract Value (₹)</th>
          <th style="text-align:center;">Routine Visits</th>
          <th style="text-align:center;">Breakdown Repairs</th>
          <th style="text-align:center;">Grand Total Spend (₹)</th>
          <th style="text-align:center;">Vendors History</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

// ── TAB 3: Vendor-Wise History Analysis ───────────────────────────────────────
function renderAmcHistVendorAnalysis(data) {
  const { records, history, logs } = data;
  const cardsContainer = document.getElementById('amcHistVendorCardsGrid');
  const tableContainer = document.getElementById('amcHistVendorTableContainer');
  if (!cardsContainer || !tableContainer) return;

  const currentVendors = [...new Set(records.map(r => r.vendorName).filter(Boolean))];
  const currentVendorSet = new Set(currentVendors);
  const pastVendors = [...new Set(history.map(h => h.vendorName).filter(Boolean))]
    .filter(v => !currentVendorSet.has(v));
  const allVendors = [...currentVendors, ...pastVendors].sort();

  if (!allVendors.length) {
    cardsContainer.innerHTML = '';
    tableContainer.innerHTML = '<div style="padding:32px;text-align:center;color:#9a3412;">No vendor history records found for current filter.</div>';
    return;
  }

  const vendorDataList = allVendors.map(vendor => {
    const isLive = currentVendorSet.has(vendor);
    const liveRecs = records.filter(r => r.vendorName === vendor);
    const pastRecs = history.filter(h => h.vendorName === vendor);
    const liveIds = new Set(liveRecs.map(r => r.id));
    const pastIds = new Set(pastRecs.map(h => h.recordId));
    const allIds = new Set([...liveIds, ...pastIds]);

    const vendorLogs = logs.filter(l => allIds.has(l.amcId));
    const liveCost = liveRecs.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
    const pastCost = pastRecs.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const totContract = liveCost + pastCost;

    const routineL = vendorLogs.filter(l => l.logType === 'Scheduled Service');
    const bkdL = vendorLogs.filter(l => l.logType === 'Breakdown Repair');
    const routineC = routineL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const bkdC = bkdL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const grandPayout = totContract + routineC + bkdC;

    const cats = [...new Set([...liveRecs.map(r => r.category), ...pastRecs.map(h => h.category)])].filter(Boolean);
    const units = [...new Set([...liveRecs.flatMap(r => amcSplitUnits(r.unit)), ...pastRecs.flatMap(h => amcSplitUnits(h.unit))])].filter(Boolean);

    const switches = pastRecs.filter(h => h.renewedToVendor && h.renewedToVendor !== vendor).map(h => `&rarr; ${h.renewedToVendor}`);
    const transitionText = switches.length ? [...new Set(switches)].join(', ') : (isLive ? 'Current Partner' : 'Archived Past Term');

    const contact = liveRecs[0]?.contactInfo || pastRecs[0]?.contactInfo || '—';

    return {
      vendor,
      isLive,
      contact,
      liveCount: liveRecs.length,
      pastCount: pastRecs.length,
      totalTerms: liveRecs.length + pastRecs.length,
      liveCost,
      pastCost,
      totContract,
      routineCount: routineL.length,
      routineCost: routineC,
      bkdCount: bkdL.length,
      bkdCost: bkdC,
      grandPayout,
      categories: cats,
      units: units,
      transitionText
    };
  });

  // Render Vendor Cards with SVG Icons
  cardsContainer.innerHTML = vendorDataList.map(v => `
    <div class="amc-hist-card-box-item">
      <div class="amc-hist-card-header">
        <div class="amc-hist-card-title">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><rect x="4" y="2" width="16" height="20"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="8" y1="6" x2="10" y2="6"/><line x1="14" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/></svg>
          ${escapeHtml(v.vendor)}
        </div>
        <span class="hist-tag ${v.isLive ? 'tag-live' : 'tag-past'}">${v.isLive ? '<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="vertical-align:-1px;margin-right:3px;"><circle cx="12" cy="12" r="10"/></svg>ACTIVE' : '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>PAST'}</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Contact:</span>
        <span class="amc-hist-stat-val">${escapeHtml(v.contact)}</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Terms Held (Live / Past):</span>
        <span class="amc-hist-stat-val">${v.liveCount} Live | ${v.pastCount} Past (${v.totalTerms} total)</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Routine Service Visits:</span>
        <span class="amc-hist-stat-val" style="color:#059669;">${v.routineCount} completed (₹${v.routineCost.toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Breakdown Calls Handled:</span>
        <span class="amc-hist-stat-val" style="color:#c2410c;">${v.bkdCount} calls (₹${v.bkdCost.toLocaleString('en-IN')})</span>
      </div>
      <div class="amc-hist-card-stat-row">
        <span class="amc-hist-stat-lbl">Transition / Heritage:</span>
        <span class="amc-hist-stat-val" style="font-size:11px;color:#6b21a8;">${v.transitionText}</span>
      </div>
      <div class="amc-hist-card-footer">
        <span style="font-size:11px;color:#78350f;font-weight:700;">Total Lifetime Payout:</span>
        <strong style="color:#7c2d12;font-size:13.5px;font-family:var(--font-heading);">₹${v.grandPayout.toLocaleString('en-IN')}</strong>
      </div>
    </div>
  `).join('');

  // Render Vendor Matrix Table
  const tableRows = vendorDataList.map((v, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="text-align:center;"><strong>${escapeHtml(v.vendor)}</strong></td>
      <td style="text-align:center;"><span class="hist-tag ${v.isLive ? 'tag-live' : 'tag-past'}">${v.isLive ? 'Active Partner' : 'Past Vendor'}</span></td>
      <td style="text-align:center;font-size:11px;">${escapeHtml(v.contact)}</td>
      <td style="text-align:center;font-size:11px;">${escapeHtml(v.categories.join(', ') || '—')}</td>
      <td style="text-align:center;font-size:11px;">${escapeHtml(v.units.join(', ') || '—')}</td>
      <td style="text-align:center;"><strong>${v.totalTerms}</strong></td>
      <td style="text-align:center;color:#1d4ed8;font-weight:700;">${v.liveCost > 0 ? '₹' + v.liveCost.toLocaleString('en-IN') : '—'}</td>
      <td style="text-align:center;color:#7c3aed;font-weight:600;">${v.pastCost > 0 ? '₹' + v.pastCost.toLocaleString('en-IN') : '—'}</td>
      <td style="text-align:center;color:#1e3a8a;font-weight:800;">₹${v.totContract.toLocaleString('en-IN')}</td>
      <td style="text-align:center;color:#059669;font-weight:600;">${v.routineCount} (₹${v.routineCost.toLocaleString('en-IN')})</td>
      <td style="text-align:center;color:#ea580c;font-weight:600;">${v.bkdCount} (₹${v.bkdCost.toLocaleString('en-IN')})</td>
      <td style="text-align:center;color:#7c2d12;font-weight:800;font-size:12.5px;">₹${v.grandPayout.toLocaleString('en-IN')}</td>
      <td style="text-align:center;font-size:11px;color:#6b21a8;font-weight:600;">${v.transitionText}</td>
    </tr>
  `).join('');

  tableContainer.innerHTML = `
    <table class="amc-hist-table">
      <thead>
        <tr>
          <th style="width:35px;text-align:center;">#</th>
          <th style="text-align:center;">Vendor Name</th>
          <th style="text-align:center;">Status</th>
          <th style="text-align:center;">Contact</th>
          <th style="text-align:center;">Categories</th>
          <th style="text-align:center;">Units</th>
          <th style="text-align:center;">Terms</th>
          <th style="text-align:center;">Live Value (₹)</th>
          <th style="text-align:center;">Past Value (₹)</th>
          <th style="text-align:center;">Total Contract (₹)</th>
          <th style="text-align:center;">Routine Visits</th>
          <th style="text-align:center;">Breakdown Repairs</th>
          <th style="text-align:center;">Grand Total Payout (₹)</th>
          <th style="text-align:center;">Renewal Transitions</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

// ── TAB 4: Master Timeline & Every History Log ────────────────────────────────
function renderAmcHistTimeline() {
  const data = getFilteredAmcHistoryData();
  const { records, history, logs, recordMap } = data;
  const container = document.getElementById('amcHistTimelineContainer');
  const countEl = document.getElementById('amcHistTimelineCount');
  if (!container) return;

  if (currentAmcHistTimelineView === 'terms') {
    // Subview 2: All Archived Terms Table
    if (countEl) countEl.textContent = `Showing ${history.length} archived contract renewal terms`;
    if (!history.length) {
      container.innerHTML = '<div style="padding:32px;text-align:center;color:#9a3412;">No archived contract terms match current filters.</div>';
      return;
    }

    const rows = history.map((h, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="text-align:center;"><code>${escapeHtml(h.recordId || '—')}</code></td>
        <td style="text-align:center;"><strong>${escapeHtml(h.category || '—')}</strong></td>
        <td style="text-align:center;">${escapeHtml(h.unit || '—')} (${escapeHtml(h.floor || 'All Floors')})</td>
        <td style="text-align:center;"><strong>${escapeHtml(h.vendorName || '—')}</strong><div style="font-size:10.5px;color:#78350f;">${escapeHtml(h.contactInfo || '')}</div></td>
        <td style="text-align:center;">${escapeHtml(fmtAMCDate(h.startDate))} to ${escapeHtml(fmtAMCDate(h.expiryDate))}</td>
        <td style="text-align:center;color:#7c3aed;font-weight:700;">${(h.contractCost !== '' && h.contractCost !== null && h.contractCost !== undefined) ? '₹' + Number(h.contractCost).toLocaleString('en-IN') : '—'}</td>
        <td style="text-align:center;">${escapeHtml(h.frequency || '—')}</td>
        <td style="text-align:center;font-size:11px;color:#44403c;">${escapeHtml(h.remarks || '—')}</td>
        <td style="text-align:center;"><span class="hist-tag tag-renewal">${escapeHtml(h.renewedToVendor ? `Renewed &rarr; ${h.renewedToVendor}` : 'Archived Term')}</span></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="amc-hist-table-wrap">
        <table class="amc-hist-table">
          <thead>
            <tr>
              <th style="width:35px;text-align:center;">#</th>
              <th style="text-align:center;">Record ID</th>
              <th style="text-align:center;">Category</th>
              <th style="text-align:center;">Unit &amp; Floor</th>
              <th style="text-align:center;">Vendor (Past Term)</th>
              <th style="text-align:center;">Term Period</th>
              <th style="text-align:center;">Term Cost (₹)</th>
              <th style="text-align:center;">Frequency</th>
              <th style="text-align:center;">Remarks / Scope</th>
              <th style="text-align:center;">Renewal Destination</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } else if (currentAmcHistTimelineView === 'logs') {
    // Subview 3: All Service & Breakdown Logs Table
    if (countEl) countEl.textContent = `Showing ${logs.length} service visit & repair log entries`;
    if (!logs.length) {
      container.innerHTML = '<div style="padding:32px;text-align:center;color:#9a3412;">No service or breakdown logs match current filters.</div>';
      return;
    }

    const rows = logs.map((l, i) => {
      const parent = recordMap.get(l.amcId) || {};
      const isBreakdown = l.logType === 'Breakdown Repair';
      const costVal = (l.cost !== '' && l.cost !== null && l.cost !== undefined) ? Number(l.cost) : 0;
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;"><code>${escapeHtml(l.logId || '—')}</code></td>
          <td style="text-align:center;"><strong>${escapeHtml(fmtAMCDate(l.visitDate))}</strong></td>
          <td style="text-align:center;"><span class="hist-tag ${isBreakdown ? 'tag-breakdown' : 'tag-service'}">${escapeHtml(l.logType)}</span></td>
          <td style="text-align:center;"><strong>${escapeHtml(parent.category || '—')}</strong><div style="font-size:10.5px;color:#78350f;">${escapeHtml(l.amcId || '')}</div></td>
          <td style="text-align:center;">${escapeHtml(parent.unit || '—')} (${escapeHtml(parent.floor || 'All Floors')})</td>
          <td style="text-align:center;">${escapeHtml(parent.vendorName || '—')}</td>
          <td style="text-align:center;"><strong>${escapeHtml(l.technician || '—')}</strong></td>
          <td style="text-align:center;color:${isBreakdown ? '#c2410c' : '#059669'};font-weight:700;">${costVal > 0 ? '₹' + costVal.toLocaleString('en-IN') : '₹0'}</td>
          <td style="text-align:center;font-size:11px;color:#44403c;">${escapeHtml(l.description || l.workDone || '—')}</td>
          <td style="text-align:center;font-size:11px;color:#78350f;">${escapeHtml(l.partsReplaced || '—')}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="amc-hist-table-wrap">
        <table class="amc-hist-table">
          <thead>
            <tr>
              <th style="width:35px;text-align:center;">#</th>
              <th style="text-align:center;">Log ID</th>
              <th style="text-align:center;">Visit Date</th>
              <th style="text-align:center;">Log Type</th>
              <th style="text-align:center;">Category</th>
              <th style="text-align:center;">Unit &amp; Floor</th>
              <th style="text-align:center;">Vendor</th>
              <th style="text-align:center;">Technician</th>
              <th style="text-align:center;">Cost (₹)</th>
              <th style="text-align:center;">Work Done / Remarks</th>
              <th style="text-align:center;">Parts Replaced</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } else {
    // Subview 1: Full Chronological Timeline Stream (Combined renewals, past terms, scheduled visits, breakdown repairs with SVG icons)
    const streamEvents = [];

    // Add Live Records
    records.forEach(r => {
      streamEvents.push({
        date: r.startDate || r.expiryDate || '9999-99-99',
        type: 'live_contract',
        title: `Active Contract: ${r.category || 'Equipment'} (${r.id || ''})`,
        badge: '<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="vertical-align:-1px;margin-right:3px;"><circle cx="12" cy="12" r="10"/></svg>Active Contract',
        badgeClass: 'tag-live',
        desc: `Vendor: ${r.vendorName || '—'} | Unit: ${r.unit || '—'} (${r.floor || 'All Floors'}) | Period: ${fmtAMCDate(r.startDate)} to ${fmtAMCDate(r.expiryDate)}`,
        cost: parseFloat(r.contractCost) || 0,
        meta: `Status: ${r.status || 'Active'} · Next Service Due: ${fmtAMCDate(r.nextDueDate)}`
      });
    });

    // Add Past Contract Terms
    history.forEach(h => {
      streamEvents.push({
        date: h.expiryDate || h.startDate || '9999-99-99',
        type: 'past_contract',
        title: `Archived Contract Term: ${h.category || 'Equipment'} (${h.recordId || ''})`,
        badge: '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Archived Term',
        badgeClass: 'tag-past',
        desc: `Vendor: ${h.vendorName || '—'} &rarr; ${h.renewedToVendor ? `Renewed to ${h.renewedToVendor}` : 'Completed'} | Period: ${fmtAMCDate(h.startDate)} to ${fmtAMCDate(h.expiryDate)}`,
        cost: parseFloat(h.contractCost) || 0,
        meta: h.remarks ? `Remarks: ${h.remarks}` : `Contact: ${h.contactInfo || '—'}`
      });
    });

    // Add Service & Breakdown Logs
    logs.forEach(l => {
      const parent = recordMap.get(l.amcId) || {};
      const isBreakdown = l.logType === 'Breakdown Repair';
      streamEvents.push({
        date: l.visitDate || '9999-99-99',
        type: isBreakdown ? 'breakdown_visit' : 'routine_visit',
        title: `${isBreakdown ? 'Breakdown Repair' : 'Routine Service'}: ${parent.category || 'Equipment'} (${l.amcId || ''})`,
        badge: isBreakdown ? '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Breakdown Repair' : '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9L4.3 20.7a1 1 0 0 1-1.4-1.4L10.2 12A6 6 0 0 1 14.7 6.3z"/></svg>Scheduled Service',
        badgeClass: isBreakdown ? 'tag-breakdown' : 'tag-service',
        desc: `Technician: ${l.technician || '—'} | Work: ${l.description || l.workDone || 'Routine Servicing completed'}${l.partsReplaced ? ` | Parts: ${l.partsReplaced}` : ''}`,
        cost: parseFloat(l.cost) || 0,
        meta: `Unit: ${parent.unit || '—'} (${parent.floor || 'All Floors'}) · Vendor: ${parent.vendorName || '—'}`
      });
    });

    // Sort descending by date
    streamEvents.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (countEl) countEl.textContent = `Showing ${streamEvents.length} chronological history events across all systems`;

    if (!streamEvents.length) {
      container.innerHTML = '<div style="padding:32px;text-align:center;color:#9a3412;">No history events found for current filter.</div>';
      return;
    }

    const itemsHtml = streamEvents.map(e => `
      <div class="amc-hist-stream-item">
        <div class="amc-hist-stream-marker"></div>
        <div class="amc-hist-stream-top">
          <div class="amc-hist-stream-title">${escapeHtml(e.title)}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="hist-tag ${e.badgeClass}">${e.badge}</span>
            <span class="amc-hist-stream-date">${fmtAMCDate(e.date)}</span>
          </div>
        </div>
        <div class="amc-hist-stream-desc">${escapeHtml(e.desc)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:2px;">
          <div class="amc-hist-stream-meta">${escapeHtml(e.meta)}</div>
          ${e.cost > 0 ? `<strong style="font-family:var(--font-heading);color:#7c2d12;font-size:12px;">₹${e.cost.toLocaleString('en-IN')}</strong>` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="amc-hist-stream">${itemsHtml}</div>`;
  }
}

// ── Export Multi-Sheet Comprehensive History Excel (.xlsx) ───────────────────
function exportAmcHistoryCardExcel() {
  if (!window.XLSX) {
    showToast('Excel export library not available.', true);
    return;
  }

  const data = getFilteredAmcHistoryData();
  const { records, history, logs, recordMap } = data;

  if (!records.length && !history.length && !logs.length) {
    showToast('No history data to export.', true);
    return;
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Category-Wise History Summary
  const categories = [...new Set([...records.map(r => r.category), ...history.map(h => h.category)])].filter(Boolean).sort();
  const catHeaders = ['#', 'Category Name', 'Live Contracts', 'Past Terms', 'Total Terms', 'Live Term (₹)', 'Past Terms (₹)', 'Total Contract (₹)', 'Routine Visits', 'Routine Spend (₹)', 'Breakdown Calls', 'Breakdown Spend (₹)', 'Grand Total Spend (₹)', 'Vendors Associated'];
  const catRows = categories.map((cat, i) => {
    const liveRecs = records.filter(r => r.category === cat);
    const pastRecs = history.filter(h => h.category === cat);
    const recIds = new Set([...liveRecs.map(r => r.id), ...pastRecs.map(h => h.recordId)]);
    const catLogs = logs.filter(l => recIds.has(l.amcId));
    const curCost = liveRecs.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
    const pastCost = pastRecs.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const totContract = curCost + pastCost;
    const routineL = catLogs.filter(l => l.logType === 'Scheduled Service');
    const bkdL = catLogs.filter(l => l.logType === 'Breakdown Repair');
    const routineC = routineL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const bkdC = bkdL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const grandTotal = totContract + routineC + bkdC;
    const allVendors = [...new Set([...liveRecs.map(r => r.vendorName), ...pastRecs.map(h => h.vendorName)])].filter(Boolean).join(', ');
    return [i + 1, cat, liveRecs.length, pastRecs.length, liveRecs.length + pastRecs.length, curCost, pastCost, totContract, routineL.length, routineC, bkdL.length, bkdC, grandTotal, allVendors];
  });
  const wsCat = XLSX.utils.aoa_to_sheet([['AMC CATEGORY-WISE HISTORICAL LIFECYCLE & EXPENDITURE ANALYSIS'], [], catHeaders, ...catRows]);
  XLSX.utils.book_append_sheet(wb, wsCat, 'Category History');

  // ── Sheet 2: Unit-Wise History Summary (WITH MULTI-UNIT SPLIT COST CALCULATION)
  const units = [...new Set([...records.flatMap(r => amcSplitUnits(r.unit)), ...history.flatMap(h => amcSplitUnits(h.unit))])].filter(Boolean).sort();
  const unitHeaders = ['#', 'Facility / Unit', 'Categories Serviced', 'Live Assets', 'Past Terms', 'Live Term (₹)', 'Past Terms (₹)', 'Split Total Contract (₹)', 'Routine Visits', 'Routine Spend (₹)', 'Breakdown Calls', 'Breakdown Spend (₹)', 'Grand Total Spend (₹)', 'Vendors History'];
  const unitRows = units.map((u, i) => {
    const liveRecs = records.filter(r => amcSplitUnits(r.unit).includes(u));
    const pastRecs = history.filter(h => amcSplitUnits(h.unit).includes(u));
    const recIds = new Set([...liveRecs.map(r => r.id), ...pastRecs.map(h => h.recordId)]);
    const unitLogs = logs.filter(l => recIds.has(l.amcId));

    // Multi-unit split calculation
    const curCost = liveRecs.reduce((s, r) => {
      const uCount = Math.max(1, amcSplitUnits(r.unit).length);
      return s + ((parseFloat(r.contractCost) || 0) / uCount);
    }, 0);
    const pastCost = pastRecs.reduce((s, h) => {
      const uCount = Math.max(1, amcSplitUnits(h.unit).length);
      return s + ((parseFloat(h.contractCost) || 0) / uCount);
    }, 0);
    const totContract = curCost + pastCost;

    const routineL = unitLogs.filter(l => l.logType === 'Scheduled Service');
    const bkdL = unitLogs.filter(l => l.logType === 'Breakdown Repair');

    const routineC = routineL.reduce((s, l) => {
      const parent = recordMap.get(l.amcId) || {};
      const uCount = Math.max(1, amcSplitUnits(parent.unit).length);
      return s + ((parseFloat(l.cost) || 0) / uCount);
    }, 0);

    const bkdC = bkdL.reduce((s, l) => {
      const parent = recordMap.get(l.amcId) || {};
      const uCount = Math.max(1, amcSplitUnits(parent.unit).length);
      return s + ((parseFloat(l.cost) || 0) / uCount);
    }, 0);

    const grandTotal = totContract + routineC + bkdC;
    const cats = [...new Set([...liveRecs.map(r => r.category), ...pastRecs.map(h => h.category)])].filter(Boolean).join(', ');
    const vendors = [...new Set([...liveRecs.map(r => r.vendorName), ...pastRecs.map(h => h.vendorName)])].filter(Boolean).join(', ');
    return [i + 1, u, cats, liveRecs.length, pastRecs.length, Math.round(curCost), Math.round(pastCost), Math.round(totContract), routineL.length, Math.round(routineC), bkdL.length, Math.round(bkdC), Math.round(grandTotal), vendors];
  });
  const wsUnit = XLSX.utils.aoa_to_sheet([['AMC UNIT / FACILITY-WISE HISTORICAL ANALYSIS (WITH MULTI-UNIT SPLIT APPORTIONMENT)'], [], unitHeaders, ...unitRows]);
  XLSX.utils.book_append_sheet(wb, wsUnit, 'Unit History');

  // ── Sheet 3: Vendor-Wise History Summary
  const currentVendors = [...new Set(records.map(r => r.vendorName).filter(Boolean))];
  const currentVendorSet = new Set(currentVendors);
  const pastVendors = [...new Set(history.map(h => h.vendorName).filter(Boolean))].filter(v => !currentVendorSet.has(v));
  const allVendors = [...currentVendors, ...pastVendors].sort();
  const vendorHeaders = ['#', 'Vendor Agency', 'Status', 'Contact', 'Categories', 'Units', 'Terms Held', 'Live Term (₹)', 'Past Terms (₹)', 'Total Contract (₹)', 'Routine Visits', 'Routine Spend (₹)', 'Breakdown Calls', 'Breakdown Spend (₹)', 'Total Vendor Payout (₹)', 'Renewal Transitions'];
  const vendorRows = allVendors.map((vendor, i) => {
    const isLive = currentVendorSet.has(vendor);
    const liveRecs = records.filter(r => r.vendorName === vendor);
    const pastRecs = history.filter(h => h.vendorName === vendor);
    const liveIds = new Set(liveRecs.map(r => r.id));
    const pastIds = new Set(pastRecs.map(h => h.recordId));
    const allIds = new Set([...liveIds, ...pastIds]);
    const vendorLogs = logs.filter(l => allIds.has(l.amcId));
    const liveCost = liveRecs.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
    const pastCost = pastRecs.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    const totContract = liveCost + pastCost;
    const routineL = vendorLogs.filter(l => l.logType === 'Scheduled Service');
    const bkdL = vendorLogs.filter(l => l.logType === 'Breakdown Repair');
    const routineC = routineL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const bkdC = bkdL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const grandPayout = totContract + routineC + bkdC;
    const cats = [...new Set([...liveRecs.map(r => r.category), ...pastRecs.map(h => h.category)])].filter(Boolean).join(', ');
    const us = [...new Set([...liveRecs.flatMap(r => amcSplitUnits(r.unit)), ...pastRecs.flatMap(h => amcSplitUnits(h.unit))])].filter(Boolean).join(', ');
    const switches = pastRecs.filter(h => h.renewedToVendor && h.renewedToVendor !== vendor).map(h => `-> ${h.renewedToVendor}`);
    const transitionText = switches.length ? [...new Set(switches)].join(', ') : (isLive ? 'Current Partner' : 'Archived Past Term');
    const contact = liveRecs[0]?.contactInfo || pastRecs[0]?.contactInfo || '—';
    return [i + 1, vendor, isLive ? 'Active Partner' : 'Past Vendor', contact, cats, us, liveRecs.length + pastRecs.length, liveCost, pastCost, totContract, routineL.length, routineC, bkdL.length, bkdC, grandPayout, transitionText];
  });
  const wsVendor = XLSX.utils.aoa_to_sheet([['AMC VENDOR-WISE HISTORICAL PERFORMANCE & PAYOUT INTELLIGENCE'], [], vendorHeaders, ...vendorRows]);
  XLSX.utils.book_append_sheet(wb, wsVendor, 'Vendor History');

  // ── Sheet 4: Archived Contract Terms Master
  const termHeaders = ['#', 'Record ID', 'Category', 'Unit', 'Floor', 'Vendor', 'Contact', 'Start Date (DD-MM-YYYY)', 'Expiry Date (DD-MM-YYYY)', 'Term Cost (₹)', 'Frequency', 'Remarks', 'Renewed To Vendor'];
  const termRows = history.map((h, i) => [i + 1, h.recordId || '', h.category || '', h.unit || '', h.floor || '', h.vendorName || '', h.contactInfo || '', fmtAMCDate(h.startDate), fmtAMCDate(h.expiryDate), (h.contractCost !== '' && h.contractCost !== null && h.contractCost !== undefined) ? Number(h.contractCost) : '', h.frequency || '', h.remarks || '', h.renewedToVendor || '']);
  const wsTerms = XLSX.utils.aoa_to_sheet([['AMC ARCHIVED CONTRACT TERMS MASTER'], [], termHeaders, ...(termRows.length ? termRows : [['No archived terms.']])]);
  XLSX.utils.book_append_sheet(wb, wsTerms, 'Archived Contract Terms');

  // ── Sheet 5: Service & Breakdown Logs Master
  const logHeaders = ['#', 'Log ID', 'Visit Date (DD-MM-YYYY)', 'Log Type', 'AMC Record ID', 'Technician', 'Visit Cost (₹)', 'Work Done / Description', 'Parts Replaced'];
  const logRows = logs.map((l, i) => [i + 1, l.logId || '', fmtAMCDate(l.visitDate), l.logType || '', l.amcId || '', l.technician || '', (l.cost !== '' && l.cost !== null && l.cost !== undefined) ? Number(l.cost) : '', l.description || l.workDone || '', l.partsReplaced || '']);
  const wsLogs = XLSX.utils.aoa_to_sheet([['AMC SERVICE & BREAKDOWN REPAIR LOGS MASTER'], [], logHeaders, ...(logRows.length ? logRows : [['No service logs.']])]);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Service & Repair Logs');

  const stamp = fmtAMCDate(new Date()).replace(/-/g, '_');
  XLSX.writeFile(wb, `AMC_History_Intelligence_${stamp}.xlsx`);
  showToast('History intelligence exported to Excel.');
}

// ── Print History Card Report ────────────────────────────────────────────────
function printAmcHistoryCard() {
  const modal = document.getElementById('amcHistoryAnalysisModal');
  if (!modal) return;
  const printWindow = window.open('', '_blank', 'width=1200,height=850');
  if (!printWindow) {
    showToast('Please allow pop-ups to print the History Card.', true);
    return;
  }

  const kpisHtml = document.querySelector('.amc-hist-kpi-grid')?.innerHTML || '';
  const catTableHtml = document.getElementById('amcHistCategoryTableContainer')?.innerHTML || '';
  const unitTableHtml = document.getElementById('amcHistUnitTableContainer')?.innerHTML || '';
  const vendorTableHtml = document.getElementById('amcHistVendorTableContainer')?.innerHTML || '';

  printWindow.document.write(`<!doctype html><html><head><title>AMC History &amp; Lifecycle Intelligence Report</title><style>
    body{font-family:Arial,sans-serif;color:#29180e;padding:24px;background:#fffdfa;}
    h1{font-size:20px;color:#431407;margin:0 0 4px;text-transform:uppercase;}
    p{font-size:12px;color:#78350f;margin:0 0 16px;}
    .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px;}
    .amc-hist-kpi-tile{border:1px solid #b45309;border-top-width:4px;padding:8px 10px;background:#fff8f5;}
    .amc-hist-kpi-tag{font-size:9px;font-weight:700;color:#9a3412;}
    .amc-hist-kpi-val{font-size:18px;font-weight:800;color:#431407;margin:3px 0;}
    .amc-hist-kpi-sub{font-size:10px;color:#78716c;}
    .amc-hist-kpi-foot{font-size:10px;font-weight:700;color:#c2410c;margin-top:4px;border-top:1px dashed #d97706;padding-top:3px;}
    h2{font-size:13px;color:#7c2d12;margin:18px 0 6px;text-transform:uppercase;border-bottom:2px solid #ea580c;padding-bottom:4px;}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;}
    th{background:#431407;color:#fff;padding:6px;text-align:left;}
    td{border:1px solid #d6c4af;padding:5px;vertical-align:top;}
    .hist-tag{display:inline-block;padding:2px 4px;font-size:8.5px;font-weight:700;background:#fef3c7;color:#92400e;}
    @media print{body{padding:0;}table{font-size:9px;}th,td{padding:4px;}}
  </style></head><body>
    <h1>AMC Comprehensive History &amp; Lifecycle Intelligence</h1>
    <p>Generated: ${fmtAMCDate(new Date())} ${new Date().toLocaleTimeString('en-IN')}</p>
    <div class="kpi-grid">${kpisHtml}</div>
    <h2>1. Category-Wise History Matrix</h2>${catTableHtml}
    <h2>2. Unit-Wise History Matrix (Multi-Unit Split Share)</h2>${unitTableHtml}
    <h2>3. Vendor-Wise History Matrix</h2>${vendorTableHtml}
  </body></html>`);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// ═════════════════════════════════════════════════════════════════════════════
// ── AMC KPI AUDIT STATEMENT & INVOICE DETAILS MODAL & PDF GENERATOR ──────────
// ═════════════════════════════════════════════════════════════════════════════

let currentAmcInvoiceData = null;

function openAmcHistKpiInvoice(metricKey) {
  const modal = document.getElementById('amcHistKpiInvoiceModal');
  if (!modal) return;

  const data = getFilteredAmcHistoryData();
  const { records, history, logs, recordMap } = data;

  const dateStr = fmtAMCDate(new Date());
  const docRef = `AMC-INV-${(metricKey || 'HIST').toUpperCase()}-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  let heading = '';
  let subheading = '';
  let stamp = 'AUDITED EVALUATION STATEMENT';
  let totalVal = 0;
  let subtotalTerms = 0;
  let subtotalRoutine = 0;
  let subtotalBreakdown = 0;
  let metaChips = [];
  let tableHeaders = [];
  let tableRows = [];
  let pdfTableHeaders = [];
  let pdfTableRows = [];
  let auditNote = 'Apportionment Policy: Multi-unit AMC contracts are apportioned equally across assigned facilities. Maintenance costs reflect verified technician visit logs.';

  if (metricKey === 'terms') {
    heading = 'CONTRACT TERMS & RENEWAL LIFECYCLE STATEMENT';
    subheading = 'Itemized statement of all current active contracts and archived past renewal terms';
    stamp = 'CONTRACT PORTFOLIO AUDIT';

    const liveCost = records.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
    const pastCost = history.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
    subtotalTerms = liveCost + pastCost;

    const routineLogs = logs.filter(l => l.logType === 'Scheduled Service');
    const bkdLogs = logs.filter(l => l.logType === 'Breakdown Repair');
    subtotalRoutine = routineLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    subtotalBreakdown = bkdLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    totalVal = subtotalTerms + subtotalRoutine + subtotalBreakdown;

    metaChips = [
      { lbl: 'Total Terms Evaluated', val: `${records.length + history.length} Terms` },
      { lbl: 'Active Portfolio', val: `${records.length} Contracts (₹${Math.round(liveCost).toLocaleString('en-IN')})` },
      { lbl: 'Archived Past Terms', val: `${history.length} Terms (₹${Math.round(pastCost).toLocaleString('en-IN')})` },
      { lbl: 'Contract Base Valuation', val: `₹${Math.round(subtotalTerms).toLocaleString('en-IN')}` }
    ];

    tableHeaders = ['#', 'Record ID', 'Status', 'Category', 'Unit & Floor', 'Vendor Agency', 'Contract Period', 'Base Cost (₹)'];
    pdfTableHeaders = ['#', 'Record ID', 'Status', 'Category', 'Unit / Floor', 'Vendor', 'Period (DD-MM-YYYY)', 'Cost (₹)'];

    // Combine live and history rows
    let rowIdx = 1;
    records.forEach(r => {
      const cVal = parseFloat(r.contractCost) || 0;
      tableRows.push(`
        <tr>
          <td style="text-align:center;">${rowIdx}</td>
          <td style="text-align:center;"><code>${escapeHtml(r.id)}</code></td>
          <td style="text-align:center;"><span class="hist-tag tag-live">Active</span></td>
          <td style="text-align:center;"><strong>${escapeHtml(r.category)}</strong></td>
          <td style="text-align:center;">${escapeHtml(r.unit)} (${escapeHtml(r.floor || 'All Floors')})</td>
          <td style="text-align:center;">${escapeHtml(r.vendorName || '—')}</td>
          <td style="text-align:center;">${escapeHtml(fmtAMCDate(r.startDate))} to ${escapeHtml(fmtAMCDate(r.expiryDate))}</td>
          <td style="text-align:center;font-weight:700;color:#1d4ed8;">₹${Math.round(cVal).toLocaleString('en-IN')}</td>
        </tr>
      `);
      pdfTableRows.push([rowIdx, r.id || '', 'Active', r.category || '', `${r.unit || ''} (${r.floor || ''})`, r.vendorName || '', `${fmtAMCDate(r.startDate)} - ${fmtAMCDate(r.expiryDate)}`, `₹${Math.round(cVal).toLocaleString('en-IN')}`]);
      rowIdx++;
    });

    history.forEach(h => {
      const cVal = parseFloat(h.contractCost) || 0;
      tableRows.push(`
        <tr>
          <td style="text-align:center;">${rowIdx}</td>
          <td style="text-align:center;"><code>${escapeHtml(h.recordId)}</code></td>
          <td style="text-align:center;"><span class="hist-tag tag-past">Archived</span></td>
          <td style="text-align:center;"><strong>${escapeHtml(h.category)}</strong></td>
          <td style="text-align:center;">${escapeHtml(h.unit)} (${escapeHtml(h.floor || 'All Floors')})</td>
          <td style="text-align:center;">${escapeHtml(h.vendorName || '—')}</td>
          <td style="text-align:center;">${escapeHtml(fmtAMCDate(h.startDate))} to ${escapeHtml(fmtAMCDate(h.expiryDate))}</td>
          <td style="text-align:center;font-weight:700;color:#7c3aed;">₹${Math.round(cVal).toLocaleString('en-IN')}</td>
        </tr>
      `);
      pdfTableRows.push([rowIdx, h.recordId || '', 'Archived', h.category || '', `${h.unit || ''} (${h.floor || ''})`, h.vendorName || '', `${fmtAMCDate(h.startDate)} - ${fmtAMCDate(h.expiryDate)}`, `₹${Math.round(cVal).toLocaleString('en-IN')}`]);
      rowIdx++;
    });
  } else if (metricKey === 'categories') {
    heading = 'CATEGORY-WISE ASSET & EXPENDITURE STATEMENT';
    subheading = 'Comprehensive expenditure breakdown across fire safety equipment categories';
    stamp = 'CATEGORY AUDIT STATEMENT';

    const categories = [...new Set([...records.map(r => r.category), ...history.map(h => h.category)])].filter(Boolean).sort();
    tableHeaders = ['#', 'Category Name', 'Active', 'Past', 'Total Terms', 'Contract Base (₹)', 'Routine (₹)', 'Repairs (₹)', 'Grand Spend (₹)'];
    pdfTableHeaders = ['#', 'Category Name', 'Active', 'Past', 'Terms', 'Contract Base (₹)', 'Routine (₹)', 'Repairs (₹)', 'Grand Spend (₹)'];

    categories.forEach((cat, i) => {
      const liveRecs = records.filter(r => r.category === cat);
      const pastRecs = history.filter(h => h.category === cat);
      const recIds = new Set([...liveRecs.map(r => r.id), ...pastRecs.map(h => h.recordId)]);
      const catLogs = logs.filter(l => recIds.has(l.amcId));

      const curCost = liveRecs.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
      const pastCost = pastRecs.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
      const totContract = curCost + pastCost;

      const routineL = catLogs.filter(l => l.logType === 'Scheduled Service');
      const bkdL = catLogs.filter(l => l.logType === 'Breakdown Repair');
      const routineC = routineL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
      const bkdC = bkdL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
      const grandTotal = totContract + routineC + bkdC;

      subtotalTerms += totContract;
      subtotalRoutine += routineC;
      subtotalBreakdown += bkdC;

      tableRows.push(`
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;"><strong>${escapeHtml(cat)}</strong></td>
          <td style="text-align:center;">${liveRecs.length}</td>
          <td style="text-align:center;">${pastRecs.length}</td>
          <td style="text-align:center;"><strong>${liveRecs.length + pastRecs.length}</strong></td>
          <td style="text-align:center;">₹${Math.round(totContract).toLocaleString('en-IN')}</td>
          <td style="text-align:center;color:#059669;">₹${Math.round(routineC).toLocaleString('en-IN')}</td>
          <td style="text-align:center;color:#ea580c;">₹${Math.round(bkdC).toLocaleString('en-IN')}</td>
          <td style="text-align:center;font-weight:800;color:#7c2d12;">₹${Math.round(grandTotal).toLocaleString('en-IN')}</td>
        </tr>
      `);
      pdfTableRows.push([i + 1, cat, liveRecs.length, pastRecs.length, liveRecs.length + pastRecs.length, `₹${Math.round(totContract).toLocaleString('en-IN')}`, `₹${Math.round(routineC).toLocaleString('en-IN')}`, `₹${Math.round(bkdC).toLocaleString('en-IN')}`, `₹${Math.round(grandTotal).toLocaleString('en-IN')}`]);
    });

    totalVal = subtotalTerms + subtotalRoutine + subtotalBreakdown;
    metaChips = [
      { lbl: 'Categories Count', val: `${categories.length} Categories` },
      { lbl: 'Total Portfolio Terms', val: `${records.length + history.length} Terms` },
      { lbl: 'Routine Service Total', val: `₹${Math.round(subtotalRoutine).toLocaleString('en-IN')}` },
      { lbl: 'Grand Category Spend', val: `₹${Math.round(totalVal).toLocaleString('en-IN')}` }
    ];
  } else if (metricKey === 'units') {
    heading = 'FACILITY & UNIT-WISE APPORTIONED SPEND STATEMENT';
    subheading = 'Unit-by-unit apportioned lifecycle expenditure statement with multi-unit split calculation';
    stamp = 'FACILITY ALLOCATION AUDIT';

    const units = [...new Set([...records.flatMap(r => amcSplitUnits(r.unit)), ...history.flatMap(h => amcSplitUnits(h.unit))])].filter(Boolean).sort();
    tableHeaders = ['#', 'Facility / Unit', 'Categories Covered', 'Active', 'Past', 'Split Base Contract (₹)', 'Routine Spend (₹)', 'Repair Spend (₹)', 'Split Grand Total (₹)'];
    pdfTableHeaders = ['#', 'Facility / Unit', 'Categories', 'Active', 'Past', 'Split Base (₹)', 'Routine (₹)', 'Repairs (₹)', 'Grand Total (₹)'];

    units.forEach((u, i) => {
      const liveRecs = records.filter(r => amcSplitUnits(r.unit).includes(u));
      const pastRecs = history.filter(h => amcSplitUnits(h.unit).includes(u));
      const recIds = new Set([...liveRecs.map(r => r.id), ...pastRecs.map(h => h.recordId)]);
      const unitLogs = logs.filter(l => recIds.has(l.amcId));

      const curCost = liveRecs.reduce((s, r) => s + ((parseFloat(r.contractCost) || 0) / Math.max(1, amcSplitUnits(r.unit).length)), 0);
      const pastCost = pastRecs.reduce((s, h) => s + ((parseFloat(h.contractCost) || 0) / Math.max(1, amcSplitUnits(h.unit).length)), 0);
      const totContract = curCost + pastCost;

      const routineL = unitLogs.filter(l => l.logType === 'Scheduled Service');
      const bkdL = unitLogs.filter(l => l.logType === 'Breakdown Repair');

      const routineC = routineL.reduce((s, l) => {
        const parent = recordMap.get(l.amcId) || {};
        return s + ((parseFloat(l.cost) || 0) / Math.max(1, amcSplitUnits(parent.unit).length));
      }, 0);

      const bkdC = bkdL.reduce((s, l) => {
        const parent = recordMap.get(l.amcId) || {};
        return s + ((parseFloat(l.cost) || 0) / Math.max(1, amcSplitUnits(parent.unit).length));
      }, 0);

      const grandTotal = totContract + routineC + bkdC;

      subtotalTerms += totContract;
      subtotalRoutine += routineC;
      subtotalBreakdown += bkdC;

      const cats = [...new Set([...liveRecs.map(r => r.category), ...pastRecs.map(h => h.category)])].filter(Boolean).join(', ');

      tableRows.push(`
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;"><strong>${escapeHtml(u)}</strong></td>
          <td style="text-align:center;font-size:10.5px;">${escapeHtml(cats || '—')}</td>
          <td style="text-align:center;">${liveRecs.length}</td>
          <td style="text-align:center;">${pastRecs.length}</td>
          <td style="text-align:center;">₹${Math.round(totContract).toLocaleString('en-IN')}</td>
          <td style="text-align:center;color:#059669;">₹${Math.round(routineC).toLocaleString('en-IN')}</td>
          <td style="text-align:center;color:#ea580c;">₹${Math.round(bkdC).toLocaleString('en-IN')}</td>
          <td style="text-align:center;font-weight:800;color:#7c2d12;">₹${Math.round(grandTotal).toLocaleString('en-IN')}</td>
        </tr>
      `);
      pdfTableRows.push([i + 1, u, cats, liveRecs.length, pastRecs.length, `₹${Math.round(totContract).toLocaleString('en-IN')}`, `₹${Math.round(routineC).toLocaleString('en-IN')}`, `₹${Math.round(bkdC).toLocaleString('en-IN')}`, `₹${Math.round(grandTotal).toLocaleString('en-IN')}`]);
    });

    totalVal = subtotalTerms + subtotalRoutine + subtotalBreakdown;
    metaChips = [
      { lbl: 'Facilities Evaluated', val: `${units.length} Units` },
      { lbl: 'Split Base Portfolio', val: `₹${Math.round(subtotalTerms).toLocaleString('en-IN')}` },
      { lbl: 'Apportioned Routine', val: `₹${Math.round(subtotalRoutine).toLocaleString('en-IN')}` },
      { lbl: 'Grand Apportioned Total', val: `₹${Math.round(totalVal).toLocaleString('en-IN')}` }
    ];
  } else if (metricKey === 'vendors') {
    heading = 'VENDOR HERITAGE & PAYOUT AUDIT STATEMENT';
    subheading = 'Statement of agency contracts, renewal transitions, and total lifetime payouts';
    stamp = 'VENDOR COMPLIANCE AUDIT';

    const currentVendors = [...new Set(records.map(r => r.vendorName).filter(Boolean))];
    const currentVendorSet = new Set(currentVendors);
    const pastVendors = [...new Set(history.map(h => h.vendorName).filter(Boolean))].filter(v => !currentVendorSet.has(v));
    const allVendors = [...currentVendors, ...pastVendors].sort();

    tableHeaders = ['#', 'Vendor Agency', 'Status', 'Contact', 'Terms Held', 'Contract Total (₹)', 'Routine Spend (₹)', 'Repair Spend (₹)', 'Total Lifetime Payout (₹)'];
    pdfTableHeaders = ['#', 'Vendor Agency', 'Status', 'Contact', 'Terms', 'Contract (₹)', 'Routine (₹)', 'Repairs (₹)', 'Total Payout (₹)'];

    allVendors.forEach((vendor, i) => {
      const isLive = currentVendorSet.has(vendor);
      const liveRecs = records.filter(r => r.vendorName === vendor);
      const pastRecs = history.filter(h => h.vendorName === vendor);
      const liveIds = new Set(liveRecs.map(r => r.id));
      const pastIds = new Set(pastRecs.map(h => h.recordId));
      const allIds = new Set([...liveIds, ...pastIds]);

      const vendorLogs = logs.filter(l => allIds.has(l.amcId));
      const liveCost = liveRecs.reduce((s, r) => s + (parseFloat(r.contractCost) || 0), 0);
      const pastCost = pastRecs.reduce((s, h) => s + (parseFloat(h.contractCost) || 0), 0);
      const totContract = liveCost + pastCost;

      const routineL = vendorLogs.filter(l => l.logType === 'Scheduled Service');
      const bkdL = vendorLogs.filter(l => l.logType === 'Breakdown Repair');
      const routineC = routineL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
      const bkdC = bkdL.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
      const grandPayout = totContract + routineC + bkdC;

      subtotalTerms += totContract;
      subtotalRoutine += routineC;
      subtotalBreakdown += bkdC;

      const contact = liveRecs[0]?.contactInfo || pastRecs[0]?.contactInfo || '—';

      tableRows.push(`
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;"><strong>${escapeHtml(vendor)}</strong></td>
          <td style="text-align:center;"><span class="hist-tag ${isLive ? 'tag-live' : 'tag-past'}">${isLive ? 'Active Partner' : 'Past Vendor'}</span></td>
          <td style="text-align:center;font-size:10.5px;">${escapeHtml(contact)}</td>
          <td style="text-align:center;"><strong>${liveRecs.length + pastRecs.length}</strong></td>
          <td style="text-align:center;">₹${Math.round(totContract).toLocaleString('en-IN')}</td>
          <td style="text-align:center;color:#059669;">₹${Math.round(routineC).toLocaleString('en-IN')}</td>
          <td style="text-align:center;color:#ea580c;">₹${Math.round(bkdC).toLocaleString('en-IN')}</td>
          <td style="text-align:center;font-weight:800;color:#7c2d12;">₹${Math.round(grandPayout).toLocaleString('en-IN')}</td>
        </tr>
      `);
      pdfTableRows.push([i + 1, vendor, isLive ? 'Active' : 'Past', contact, liveRecs.length + pastRecs.length, `₹${Math.round(totContract).toLocaleString('en-IN')}`, `₹${Math.round(routineC).toLocaleString('en-IN')}`, `₹${Math.round(bkdC).toLocaleString('en-IN')}`, `₹${Math.round(grandPayout).toLocaleString('en-IN')}`]);
    });

    totalVal = subtotalTerms + subtotalRoutine + subtotalBreakdown;
    metaChips = [
      { lbl: 'Vendor Partners', val: `${allVendors.length} Agencies` },
      { lbl: 'Active Live Partners', val: `${currentVendors.length} Active` },
      { lbl: 'Archived Past Agencies', val: `${pastVendors.length} Past` },
      { lbl: 'Total Lifetime Payout', val: `₹${Math.round(totalVal).toLocaleString('en-IN')}` }
    ];
  } else {
    // metricKey === 'repairs'
    heading = 'MAINTENANCE, ROUTINE & BREAKDOWN REPAIR STATEMENT';
    subheading = 'Detailed audit log of all scheduled preventive maintenance and emergency breakdown calls';
    stamp = 'MAINTENANCE LOG AUDIT';

    const routineLogs = logs.filter(l => l.logType === 'Scheduled Service');
    const bkdLogs = logs.filter(l => l.logType === 'Breakdown Repair');
    subtotalRoutine = routineLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    subtotalBreakdown = bkdLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    subtotalTerms = 0;
    totalVal = subtotalRoutine + subtotalBreakdown;

    metaChips = [
      { lbl: 'Total Verified Visits', val: `${logs.length} Visits` },
      { lbl: 'Scheduled Preventive', val: `${routineLogs.length} Visits (₹${Math.round(subtotalRoutine).toLocaleString('en-IN')})` },
      { lbl: 'Emergency Breakdowns', val: `${bkdLogs.length} Calls (₹${Math.round(subtotalBreakdown).toLocaleString('en-IN')})` },
      { lbl: 'Total Maintenance Spend', val: `₹${Math.round(totalVal).toLocaleString('en-IN')}` }
    ];

    tableHeaders = ['#', 'Log ID', 'Visit Date', 'Log Type', 'Category (ID)', 'Unit & Floor', 'Technician', 'Work Done & Remarks', 'Visit Cost (₹)'];
    pdfTableHeaders = ['#', 'Log ID', 'Date (DD-MM-YYYY)', 'Type', 'Category / ID', 'Unit', 'Technician', 'Cost (₹)'];

    logs.forEach((l, i) => {
      const parent = recordMap.get(l.amcId) || {};
      const isBreakdown = l.logType === 'Breakdown Repair';
      const cVal = parseFloat(l.cost) || 0;

      tableRows.push(`
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;"><code>${escapeHtml(l.logId || '—')}</code></td>
          <td style="text-align:center;"><strong>${escapeHtml(fmtAMCDate(l.visitDate))}</strong></td>
          <td style="text-align:center;"><span class="hist-tag ${isBreakdown ? 'tag-breakdown' : 'tag-service'}">${escapeHtml(l.logType)}</span></td>
          <td style="text-align:center;"><strong>${escapeHtml(parent.category || '—')}</strong><div style="font-size:10px;color:#78350f;">${escapeHtml(l.amcId || '')}</div></td>
          <td style="text-align:center;">${escapeHtml(parent.unit || '—')} (${escapeHtml(parent.floor || 'All Floors')})</td>
          <td style="text-align:center;"><strong>${escapeHtml(l.technician || '—')}</strong></td>
          <td style="text-align:center;font-size:10.5px;">${escapeHtml(l.description || l.workDone || '—')}${l.partsReplaced ? `<div style="color:#c2410c;font-weight:700;">Parts: ${escapeHtml(l.partsReplaced)}</div>` : ''}</td>
          <td style="text-align:center;font-weight:700;color:${isBreakdown ? '#c2410c' : '#059669'};">₹${Math.round(cVal).toLocaleString('en-IN')}</td>
        </tr>
      `);
      pdfTableRows.push([i + 1, l.logId || '', fmtAMCDate(l.visitDate), isBreakdown ? 'Breakdown' : 'Routine', `${parent.category || ''} (${l.amcId || ''})`, parent.unit || '', l.technician || '', `₹${Math.round(cVal).toLocaleString('en-IN')}`]);
    });
  }

  // Populate DOM elements
  document.getElementById('amcInvStamp').textContent = stamp;
  document.getElementById('amcInvDocRef').textContent = docRef;
  document.getElementById('amcInvDate').textContent = dateStr;
  document.getElementById('amcInvHeading').textContent = heading;
  document.getElementById('amcInvSubheading').textContent = subheading;
  document.getElementById('amcInvTotalVal').textContent = `₹${Math.round(totalVal).toLocaleString('en-IN')}`;

  document.getElementById('amcInvMetaGrid').innerHTML = metaChips.map(c => `
    <div class="amc-inv-chip">
      <span class="inv-chip-lbl">${escapeHtml(c.lbl)}</span>
      <span class="inv-chip-val">${escapeHtml(c.val)}</span>
    </div>
  `).join('');

  document.getElementById('amcInvTableHead').innerHTML = `<tr>${tableHeaders.map((th, idx) => `<th style="text-align:center;${idx === 0 ? 'width:35px;' : ''}">${th}</th>`).join('')}</tr>`;
  document.getElementById('amcInvTableBody').innerHTML = tableRows.length ? tableRows.join('') : '<tr><td colspan="10" style="padding:24px;text-align:center;color:#9a3412;">No matching records found.</td></tr>';

  document.getElementById('amcInvSubtotalTerms').textContent = `₹${Math.round(subtotalTerms).toLocaleString('en-IN')}`;
  document.getElementById('amcInvSubtotalRoutine').textContent = `₹${Math.round(subtotalRoutine).toLocaleString('en-IN')}`;
  document.getElementById('amcInvSubtotalBreakdown').textContent = `₹${Math.round(subtotalBreakdown).toLocaleString('en-IN')}`;
  document.getElementById('amcInvGrandTotal').textContent = `₹${Math.round(totalVal).toLocaleString('en-IN')}`;
  document.getElementById('amcInvCalcNotes').textContent = auditNote;

  currentAmcInvoiceData = {
    metricKey,
    heading,
    subheading,
    stamp,
    docRef,
    dateStr,
    totalVal,
    subtotalTerms,
    subtotalRoutine,
    subtotalBreakdown,
    metaChips,
    pdfTableHeaders,
    pdfTableRows
  };

  modal.classList.remove('hidden');
}

function closeAmcHistKpiInvoice() {
  const modal = document.getElementById('amcHistKpiInvoiceModal');
  if (modal) modal.classList.add('hidden');
}

// ── Download Invoice as High-Definition PDF (A4 Formal Layout) ──────────────
function downloadAmcHistInvoicePdf() {
  const sheet = document.getElementById('amcHistInvoiceSheet');
  if (!sheet || !currentAmcInvoiceData) {
    showToast('No active invoice data to download.', true);
    return;
  }

  const d = currentAmcInvoiceData;
  const filename = `AMC_Audit_Invoice_${d.metricKey}_${d.dateStr.replace(/-/g, '_')}.pdf`;

  // Method 1: High-Definition html2pdf rendering (Pixel-perfect DOM snapshot with exact fonts, ₹ symbols & layout)
  if (window.html2pdf) {
    showToast('Generating official invoice PDF...');

    // Clone sheet into an off-screen container with explicit A4 print styling and light background
    const exportContainer = document.createElement('div');
    exportContainer.style.width = '794px'; // Standard A4 96dpi width
    exportContainer.style.padding = '24px 28px';
    exportContainer.style.background = '#fffdfa';
    exportContainer.style.color = '#29180e';
    exportContainer.style.fontFamily = 'Arial, sans-serif';
    exportContainer.style.position = 'fixed';
    exportContainer.style.left = '-9999px';
    exportContainer.style.top = '0';
    exportContainer.style.zIndex = '99999';

    exportContainer.innerHTML = sheet.innerHTML;

    // Remove max-height / scrolling on table wrap in cloned element
    const tableWrap = exportContainer.querySelector('.amc-inv-table-wrap');
    if (tableWrap) {
      tableWrap.style.maxHeight = 'none';
      tableWrap.style.overflow = 'visible';
      tableWrap.style.border = '1.5px solid #b45309';
    }

    document.body.appendChild(exportContainer);

    const opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#fffdfa'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(exportContainer).save().then(() => {
      document.body.removeChild(exportContainer);
      showToast(`Downloaded official invoice: ${filename}`);
    }).catch(err => {
      console.error('html2pdf generation error:', err);
      if (document.body.contains(exportContainer)) {
        document.body.removeChild(exportContainer);
      }
      fallbackJsPdfDownload();
    });
    return;
  }

  // Method 2: Robust jsPDF fallback
  fallbackJsPdfDownload();
}

function fallbackJsPdfDownload() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('PDF library unavailable. Opening print view.', true);
    printAmcHistInvoice();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const d = currentAmcInvoiceData;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Formal Top Header
  doc.setFillColor(67, 20, 7);
  doc.rect(0, 0, pageWidth, 52, 'F');

  doc.setTextColor(254, 215, 170);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIO GROUP', 32, 24);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 237, 213);
  doc.text('FIRE & SAFETY ENGINEERING ASSET MANAGEMENT - AUDIT STATEMENT', 32, 38);

  // Doc Details Bar (Safely within margins)
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`DOC REF: ${d.docRef}`, pageWidth - 32, 24, { align: 'right' });
  doc.text(`DATE: ${d.dateStr}`, pageWidth - 32, 38, { align: 'right' });

  // Title Banner
  doc.setFillColor(248, 239, 230);
  doc.rect(32, 62, pageWidth - 64, 40, 'F');
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1);
  doc.rect(32, 62, pageWidth - 64, 40, 'S');

  doc.setTextColor(67, 20, 7);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(d.heading, 42, 78);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 53, 15);
  doc.text(d.subheading, 42, 90);

  // Valuation Text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(124, 45, 18);
  doc.text(`VALUATION: Rs. ${Math.round(d.totalVal).toLocaleString('en-IN')}`, pageWidth - 42, 84, { align: 'right' });

  // Clean table rows with Rs. instead of broken unicode symbols
  const cleanHead = d.pdfTableHeaders.map(h => h.replace(/\(₹\)/g, '(Rs.)'));
  const cleanBody = d.pdfTableRows.map(row => row.map(cell => String(cell).replace(/₹/g, 'Rs. ')));

  if (doc.autoTable) {
    doc.autoTable({
      startY: 110,
      margin: { left: 32, right: 32 },
      head: [cleanHead],
      body: cleanBody,
      theme: 'grid',
      headStyles: {
        fillColor: [67, 20, 7],
        textColor: [255, 247, 237],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [41, 24, 14],
        lineColor: [222, 200, 180],
        cellPadding: 3.5
      },
      alternateRowStyles: {
        fillColor: [253, 248, 242]
      },
      didDrawPage: function(dataPage) {
        doc.setFontSize(7);
        doc.setTextColor(120, 113, 108);
        doc.text(`TRIO GROUP · Official AMC Audit Statement · Page ${dataPage.pageNumber}`, 32, pageHeight - 14);
      }
    });

    let finalY = doc.lastAutoTable.finalY + 12;

    if (finalY + 110 > pageHeight) {
      doc.addPage();
      finalY = 36;
    }

    // Totals Summary Box
    doc.setFillColor(251, 245, 237);
    doc.rect(pageWidth - 272, finalY, 240, 58, 'F');
    doc.setDrawColor(180, 83, 9);
    doc.rect(pageWidth - 272, finalY, 240, 58, 'S');

    doc.setFontSize(7.5);
    doc.setTextColor(68, 64, 60);
    doc.text('Contract Base Terms Subtotal:', pageWidth - 262, finalY + 13);
    doc.text(`Rs. ${Math.round(d.subtotalTerms).toLocaleString('en-IN')}`, pageWidth - 42, finalY + 13, { align: 'right' });

    doc.text('Routine Scheduled Servicing:', pageWidth - 262, finalY + 24);
    doc.text(`Rs. ${Math.round(d.subtotalRoutine).toLocaleString('en-IN')}`, pageWidth - 42, finalY + 24, { align: 'right' });

    doc.text('Emergency Breakdown Repairs:', pageWidth - 262, finalY + 35);
    doc.text(`Rs. ${Math.round(d.subtotalBreakdown).toLocaleString('en-IN')}`, pageWidth - 42, finalY + 35, { align: 'right' });

    doc.setDrawColor(180, 83, 9);
    doc.line(pageWidth - 262, finalY + 41, pageWidth - 42, finalY + 41);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(124, 45, 18);
    doc.text('GRAND TOTAL AUDITED:', pageWidth - 262, finalY + 51);
    doc.text(`Rs. ${Math.round(d.totalVal).toLocaleString('en-IN')}`, pageWidth - 42, finalY + 51, { align: 'right' });

    // Signatures
    const signY = finalY + 80;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 113, 108);

    doc.setDrawColor(120, 53, 15);
    doc.line(32, signY, 150, signY);
    doc.text('PREPARED BY: SAFETY OFFICER', 32, signY + 9);

    doc.line(210, signY, 330, signY);
    doc.text('VERIFIED BY: ENGINEERING LEAD', 210, signY + 9);

    doc.line(390, signY, pageWidth - 32, signY);
    doc.text('AUTHORIZED BY: GENERAL MANAGER', 390, signY + 9);
  }

  const filename = `AMC_Audit_Invoice_${d.metricKey}_${d.dateStr.replace(/-/g, '_')}.pdf`;
  doc.save(filename);
  showToast(`Downloaded official invoice: ${filename}`);
}

// ── Print Invoice Statement ──────────────────────────────────────────────────
function printAmcHistInvoice() {
  const sheet = document.getElementById('amcHistInvoiceSheet');
  if (!sheet) return;

  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (!printWindow) {
    showToast('Please allow pop-ups to print the Invoice.', true);
    return;
  }

  printWindow.document.write(`<!doctype html><html><head><title>Official AMC Audit Statement Invoice</title><style>
    body{font-family:Arial,sans-serif;color:#29180e;padding:24px;background:#fffdfa;margin:0;}
    *{border-radius:0px !important;}
    .amc-inv-sheet-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #b45309;padding-bottom:12px;margin-bottom:14px;}
    .amc-inv-org-title{font-size:16px;font-weight:800;color:#431407;margin:0;}
    .amc-inv-org-sub{font-size:11px;font-weight:700;color:#9a3412;}
    .amc-inv-org-loc{font-size:10px;color:#78716c;}
    .amc-inv-ref-block{text-align:right;font-size:11px;}
    .amc-inv-badge-stamp{display:inline-block;padding:2px 6px;font-size:9px;font-weight:800;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;margin-bottom:3px;}
    .amc-inv-title-banner{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8efe6;border:1px solid #d97706;margin-bottom:12px;}
    .amc-inv-heading{font-size:14px;font-weight:800;color:#431407;margin:0;}
    .amc-inv-subheading{font-size:10px;color:#78716c;margin:2px 0 0;}
    .inv-pill-label{font-size:9px;font-weight:800;color:#9a3412;display:block;}
    .inv-pill-value{font-size:18px;font-weight:800;color:#7c2d12;}
    .amc-inv-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;}
    .amc-inv-chip{padding:6px 8px;background:#ffffff;border:1px solid #e7d6c4;}
    .inv-chip-lbl{font-size:9px;color:#78716c;display:block;}
    .inv-chip-val{font-size:11px;font-weight:700;color:#29180e;}
    .amc-inv-table-wrap{border:1px solid #b45309;margin-bottom:14px;}
    .amc-inv-table{width:100%;border-collapse:collapse;font-size:10px;}
    th{background:#431407;color:#fff;padding:6px;text-align:left;font-size:9px;border:1px solid #7c2d12;}
    td{border:1px solid #eedecf;padding:5px;}
    .amc-inv-calc-summary{display:flex;justify-content:space-between;gap:16px;padding:10px;background:#fbf5ed;border:1px solid #d97706;margin-bottom:20px;}
    .amc-inv-calc-notes{font-size:10px;color:#78716c;flex:1;}
    .amc-inv-calc-totals{width:280px;font-size:10.5px;}
    .amc-inv-tot-row{display:flex;justify-content:space-between;padding:1px 0;}
    .amc-inv-tot-row.grand-total{border-top:1.5px solid #b45309;font-weight:800;color:#7c2d12;margin-top:4px;padding-top:4px;font-size:11.5px;}
    .amc-inv-sign-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:18px;}
    .amc-inv-sign-line{border-top:1px solid #78350f;margin-bottom:4px;}
    .amc-inv-sign-label{font-size:9px;font-weight:700;color:#78716c;text-align:center;display:block;}
    .hist-tag{display:inline-block;padding:2px 4px;font-size:8.5px;font-weight:700;background:#fef3c7;color:#92400e;}
    @media print{body{padding:0;}@page{size:A4;margin:12mm;}}
  </style></head><body>
    ${sheet.innerHTML}
  </body></html>`);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
// ─── Month-Wise AMC Expenditure Analysis (Green Theme Card) ────────────────
// Opened from the "Analysis" button in the AMC Report head. Shows, for a
// selected year: contracts started, services performed, breakdown repairs
// and total expenditure — broken down by month, with a category-wise spend
// pie chart and a month-wise expenditure bar chart, both hand-drawn on
// <canvas> (no external chart library needed).
let amcMonthlySelectedYear = null;

const AMC_MONTHLY_MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const AMC_MONTHLY_PIE_PALETTE = ['#16a34a','#22c55e','#4ade80','#86efac','#15803d','#0d9488','#0891b2','#65a30d','#84cc16','#059669','#0f766e','#166534'];

// Parses AMC date strings in either ISO (yyyy-mm-dd) or DMY (dd-mm-yyyy)
// form — mirrors fmtAMCDate's matching so grouping stays consistent with
// what's shown elsewhere in the report.
function amcParseAnyDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  const str = String(dateStr).trim();
  if (!str || str === '-' || str === '—') return null;
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dmyMatch) {
    const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function openAmcMonthlyAnalysis() {
  const modal = document.getElementById('amcMonthlyAnalysisModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Load live records, service logs and archived contract terms concurrently
  try {
    await Promise.all([
      loadAmcData(false),
      fetchAllAmcServiceLogs(false),
      fetchAllAmcContractHistory(false)
    ]);
  } catch (err) {
    console.error('Error loading AMC monthly analysis data:', err);
  }

  populateAmcMonthlyYearFilter();
  renderAmcMonthlyAnalysis();
}

function closeAmcMonthlyAnalysis() {
  const modal = document.getElementById('amcMonthlyAnalysisModal');
  if (modal) modal.classList.add('hidden');
}

// Builds the Year dropdown from every date actually present in the data
// (contract start dates + service visit dates), so only years with real
// data show up, alongside the current year.
function populateAmcMonthlyYearFilter() {
  const sel = document.getElementById('amcMonthlyYearSelect');
  if (!sel) return;
  const years = new Set();
  allAmcData.forEach(r => { const d = amcParseAnyDate(r.startDate); if (d) years.add(d.getFullYear()); });
  (allAmcContractHistory || []).forEach(h => { const d = amcParseAnyDate(h.startDate); if (d) years.add(d.getFullYear()); });
  (allAmcServiceLogs || []).forEach(l => { const d = amcParseAnyDate(l.visitDate); if (d) years.add(d.getFullYear()); });
  years.add(new Date().getFullYear());

  const sortedYears = [...years].sort((a, b) => b - a);
  const prevVal = sel.value || (amcMonthlySelectedYear ? String(amcMonthlySelectedYear) : String(new Date().getFullYear()));
  sel.innerHTML = sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = sortedYears.includes(Number(prevVal)) ? prevVal : String(sortedYears[0]);
  amcMonthlySelectedYear = Number(sel.value);
}

// Main render: recomputes month buckets for the selected year and refreshes
// the KPI strip, pie chart, bar chart and detailed table. Called on open,
// on year-select change, and can be re-called after a data refresh.
function renderAmcMonthlyAnalysis() {
  const sel = document.getElementById('amcMonthlyYearSelect');
  const year = Number(sel?.value || amcMonthlySelectedYear || new Date().getFullYear());
  amcMonthlySelectedYear = year;

  const months = AMC_MONTHLY_MONTH_NAMES.map((name, idx) => ({
    idx, name,
    contractsStarted: 0, contractValue: 0,
    scheduledCount: 0, scheduledCost: 0,
    breakdownCount: 0, breakdownCost: 0,
    total: 0
  }));

  const recordMap = new Map(allAmcData.map(r => [r.id, r]));

  // Contracts started this year (live records)
  allAmcData.forEach(r => {
    const d = amcParseAnyDate(r.startDate);
    if (d && d.getFullYear() === year) {
      const m = months[d.getMonth()];
      m.contractsStarted++;
      m.contractValue += (parseFloat(r.contractCost) || 0);
    }
  });
  // ...and past contract terms (a mid-year vendor switch still counts)
  (allAmcContractHistory || []).forEach(h => {
    const d = amcParseAnyDate(h.startDate);
    if (d && d.getFullYear() === year) {
      const m = months[d.getMonth()];
      m.contractsStarted++;
      m.contractValue += (parseFloat(h.contractCost) || 0);
    }
  });

  // Services performed & breakdown repairs this year
  (allAmcServiceLogs || []).forEach(l => {
    const d = amcParseAnyDate(l.visitDate);
    if (!d || d.getFullYear() !== year) return;
    const cost = parseFloat(l.cost) || 0;
    const m = months[d.getMonth()];
    if (l.logType === 'Breakdown Repair') {
      m.breakdownCount++;
      m.breakdownCost += cost;
    } else {
      m.scheduledCount++;
      m.scheduledCost += cost;
    }
  });

  months.forEach(m => { m.total = m.contractValue + m.scheduledCost + m.breakdownCost; });

  renderAmcMonthlyKpis(months, year);

  // Category-wise spend distribution for the pie chart: new contract value
  // (by category, for contracts starting this year) + service/repair costs
  // logged this year (mapped back to the record's category).
  const catSpend = {};
  allAmcData.forEach(r => {
    const d = amcParseAnyDate(r.startDate);
    if (d && d.getFullYear() === year) {
      const cat = r.category || 'General';
      catSpend[cat] = (catSpend[cat] || 0) + (parseFloat(r.contractCost) || 0);
    }
  });
  (allAmcServiceLogs || []).forEach(l => {
    const d = amcParseAnyDate(l.visitDate);
    if (!d || d.getFullYear() !== year) return;
    const r = recordMap.get(l.amcId);
    const cat = (r && r.category) || 'General';
    catSpend[cat] = (catSpend[cat] || 0) + (parseFloat(l.cost) || 0);
  });
  const catEntries = Object.entries(catSpend).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  drawAmcMonthlyPieChart(catEntries);
  drawAmcMonthlyBarChart(months);
  renderAmcMonthlyTable(months, year);
}

// Small inline icon set for the KPI strip — kept as tiny stroke SVGs so
// they inherit currentColor from each icon badge's themed background.
const AMC_MONTHLY_KPI_ICONS = {
  contracts: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  services: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  repairs: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  spend: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  peak: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
};

function renderAmcMonthlyKpis(months, year) {
  const kpiStrip = document.getElementById('amcMonthlyKpiStrip');
  if (!kpiStrip) return;

  const totalContracts = months.reduce((s, m) => s + m.contractsStarted, 0);
  const totalServices = months.reduce((s, m) => s + m.scheduledCount, 0);
  const totalBreakdowns = months.reduce((s, m) => s + m.breakdownCount, 0);
  const totalSpend = months.reduce((s, m) => s + m.total, 0);
  const peakMonth = months.reduce((p, m) => (m.total > p.total ? m : p), months[0]);

  const chip = (icon, iconClass, lbl, val, sub) => `
    <div class="amc-monthly-kpi-chip">
      <div class="amc-monthly-kpi-icon ${iconClass}">${icon}</div>
      <span class="amc-monthly-kpi-lbl">${lbl}</span>
      <span class="amc-monthly-kpi-val">${val}</span>
      <div class="amc-monthly-kpi-sub">${sub}</div>
    </div>`;

  kpiStrip.innerHTML =
    chip(AMC_MONTHLY_KPI_ICONS.contracts, 'ic-contracts', 'Contracts Started', totalContracts, `In ${year}`) +
    chip(AMC_MONTHLY_KPI_ICONS.services, 'ic-services', 'Services Performed', totalServices, 'Scheduled visits') +
    chip(AMC_MONTHLY_KPI_ICONS.repairs, 'ic-repairs', 'Breakdown Repairs', totalBreakdowns, 'Unscheduled repairs') +
    chip(AMC_MONTHLY_KPI_ICONS.spend, 'ic-spend', 'Total Expenditure', '₹' + totalSpend.toLocaleString('en-IN'), 'Contracts + services + repairs') +
    chip(AMC_MONTHLY_KPI_ICONS.peak, 'ic-peak', 'Peak Spend Month', peakMonth.total > 0 ? peakMonth.name : '—', peakMonth.total > 0 ? '₹' + peakMonth.total.toLocaleString('en-IN') : 'No spend recorded');
}

// Geometry of the last-drawn pie chart, kept around so mousemove can hit-test
// which slice the cursor is over and pop it out slightly on hover.
let amcMonthlyPieState = null;

// Hand-drawn donut-style pie chart on <canvas> — reuses the AMC category
// colour map (AMC_REMINDER_CATEGORY_COLORS) so a category's colour matches
// everywhere else in the report, falling back to a green palette. Hovering
// a slice (or its legend row) nudges that slice outward for emphasis.
function drawAmcMonthlyPieChart(entries, hoverIndex = -1) {
  const canvas = document.getElementById('amcMonthlyPieChart');
  const legendEl = document.getElementById('amcMonthlyPieLegend');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const isDark = document.body.classList.contains('dark');

  if (!entries.length) {
    amcMonthlyPieState = null;
    ctx.fillStyle = isDark ? '#4ade80' : '#86efac';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenditure recorded for this year', w / 2, h / 2);
    if (legendEl) legendEl.innerHTML = '';
    return;
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 16;
  let startAngle = -Math.PI / 2;
  const slices = [];

  entries.forEach(([cat, val], i) => {
    const angle = (val / total) * Math.PI * 2;
    const mid = startAngle + angle / 2;
    const isHover = i === hoverIndex;
    const pop = isHover ? 8 : 0;
    const ox = Math.cos(mid) * pop, oy = Math.sin(mid) * pop;
    const color = AMC_REMINDER_CATEGORY_COLORS[cat] || AMC_MONTHLY_PIE_PALETTE[i % AMC_MONTHLY_PIE_PALETTE.length];

    ctx.beginPath();
    ctx.moveTo(cx + ox, cy + oy);
    ctx.arc(cx + ox, cy + oy, isHover ? r + 4 : r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = color;
    if (isHover) { ctx.shadowColor = 'rgba(20,83,45,0.35)'; ctx.shadowBlur = 10; }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isDark ? '#0d2417' : '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    slices.push({ cat, val, start: startAngle, end: startAngle + angle, color });
    startAngle += angle;
  });

  amcMonthlyPieState = { cx, cy, r, slices, total };

  // Donut hole with the grand total in the centre
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#0d2417' : '#ffffff';
  ctx.fill();

  const centerLabel = hoverIndex >= 0 ? entries[hoverIndex][0] : 'Total Spend';
  const centerVal = hoverIndex >= 0 ? entries[hoverIndex][1] : total;

  ctx.fillStyle = isDark ? '#e6fdf0' : '#14532d';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₹' + centerVal.toLocaleString('en-IN'), cx, cy - 6);
  ctx.fillStyle = isDark ? '#4ade80' : '#166534';
  ctx.font = '9px sans-serif';
  const label = centerLabel.length > 22 ? centerLabel.slice(0, 20) + '…' : centerLabel;
  ctx.fillText(label, cx, cy + 11);

  if (legendEl) {
    legendEl.innerHTML = entries.map(([cat, val], i) => {
      const color = AMC_REMINDER_CATEGORY_COLORS[cat] || AMC_MONTHLY_PIE_PALETTE[i % AMC_MONTHLY_PIE_PALETTE.length];
      const pct = (val / total) * 100;
      const active = i === hoverIndex ? ' is-active' : '';
      return `<div class="amc-monthly-legend-item${active}" data-slice-index="${i}" onmouseenter="amcMonthlyHoverSlice(${i})" onmouseleave="amcMonthlyHoverSlice(-1)">
        <span class="amc-monthly-legend-dot" style="background:${color};"></span>
        <span class="amc-monthly-legend-label">${escapeHtml(cat)}</span>
        <span class="amc-monthly-legend-track"><span class="amc-monthly-legend-fill" style="width:${pct.toFixed(1)}%;background:${color};"></span></span>
        <span class="amc-monthly-legend-pct">${pct.toFixed(1)}%</span>
      </div>`;
    }).join('');
  }

  bindAmcMonthlyPieHover(canvas);
}

// Redraws the pie with a given slice highlighted — called both from canvas
// mousemove hit-testing and from hovering a legend row, so the two stay
// in sync.
function amcMonthlyHoverSlice(index) {
  if (!amcMonthlyPieState) return;
  const entries = amcMonthlyPieState.slices.map(s => [s.cat, s.val]);
  drawAmcMonthlyPieChart(entries, index);
}

// Binds the canvas mousemove/mouseleave handlers once per canvas element
// (guarded by a dataset flag so repeated re-renders don't stack listeners).
function bindAmcMonthlyPieHover(canvas) {
  if (canvas.dataset.hoverBound === '1') return;
  canvas.dataset.hoverBound = '1';
  let lastHover = -1;
  canvas.addEventListener('mousemove', (e) => {
    if (!amcMonthlyPieState) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
    const { cx, cy, r, slices } = amcMonthlyPieState;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let hover = -1;
    if (dist <= r + 4 && dist >= r * 0.55) {
      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) angle += Math.PI * 2;
      hover = slices.findIndex(s => angle >= s.start && angle < s.end);
    }
    if (hover !== lastHover) {
      lastHover = hover;
      amcMonthlyHoverSlice(hover);
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (lastHover !== -1) { lastHover = -1; amcMonthlyHoverSlice(-1); }
  });
}

// Tracks the active grow-in animation so a rapid year change cancels the
// previous run instead of layering two animations on the same canvas.
let amcMonthlyBarAnimFrame = null;
let amcMonthlyBarHoverIdx = -1;

// Draws a bar with rounded top corners only (canvas has no native
// rounded-rect primitive for this shape).
function amcMonthlyRoundTopRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, Math.max(height, 0));
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
}

// Hand-drawn bar chart on <canvas> for month-wise total expenditure, with a
// short grow-in animation on render. The tallest bar (peak month) is
// rendered in a darker green and gets its value labelled above the bar.
function drawAmcMonthlyBarChart(months) {
  const canvas = document.getElementById('amcMonthlyBarChart');
  if (!canvas) return;
  if (amcMonthlyBarAnimFrame) { cancelAnimationFrame(amcMonthlyBarAnimFrame); amcMonthlyBarAnimFrame = null; }
  amcMonthlyBarHoverIdx = -1;
  bindAmcMonthlyBarHover(canvas, months);

  const duration = 480;
  const start = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const progress = easeOutCubic(t);
    paintAmcMonthlyBarChart(canvas, months, progress, amcMonthlyBarHoverIdx);
    if (t < 1) {
      amcMonthlyBarAnimFrame = requestAnimationFrame(frame);
    } else {
      amcMonthlyBarAnimFrame = null;
    }
  }
  amcMonthlyBarAnimFrame = requestAnimationFrame(frame);
}

function paintAmcMonthlyBarChart(canvas, months, progress = 1, hoverIdx = -1) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? '#15803d' : '#d3f4dd';
  const labelColor = isDark ? '#86efac' : '#14532d';
  const barColorTop = '#4ade80';
  const barColorBottom = '#16a34a';
  const barColorPeak = '#14532d';

  const padL = 42, padR = 12, padT = 20, padB = 26;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const maxVal = Math.max(...months.map(m => m.total), 1);
  const niceMax = Math.ceil(maxVal / 5) * 5 || 1;

  ctx.strokeStyle = gridColor;
  ctx.fillStyle = labelColor;
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (niceMax / steps) * i;
    const y = padT + chartH - (val / niceMax) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0), padL - 6, y);
  }

  const barSlot = chartW / months.length;
  const barW = Math.min(barSlot * 0.5, 34);
  const peakIdx = months.reduce((pi, m, i, arr) => (m.total > arr[pi].total ? i : pi), 0);
  const barCoords = [];

  months.forEach((m, i) => {
    const targetH = (m.total / niceMax) * chartH;
    const barH = targetH * progress;
    const x = padL + i * barSlot + (barSlot - barW) / 2;
    const y = padT + chartH - barH;
    const isPeak = i === peakIdx && m.total > 0;
    const isHover = i === hoverIdx;

    if (barH > 0.5) {
      const grad = ctx.createLinearGradient(0, y, 0, padT + chartH);
      if (isPeak) {
        grad.addColorStop(0, '#166534');
        grad.addColorStop(1, barColorPeak);
      } else {
        grad.addColorStop(0, barColorTop);
        grad.addColorStop(1, barColorBottom);
      }
      amcMonthlyRoundTopRect(ctx, x, y, barW, barH, 4);
      ctx.fillStyle = grad;
      if (isHover) { ctx.shadowColor = 'rgba(20,83,45,0.3)'; ctx.shadowBlur = 8; }
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isHover) {
        ctx.strokeStyle = isDark ? '#4ade80' : '#14532d';
        ctx.lineWidth = 1.5;
        amcMonthlyRoundTopRect(ctx, x, y, barW, barH, 4);
        ctx.stroke();
      }
    }

    barCoords.push({ x, y: padT, w: barW, h: chartH, month: m });

    // Value label above the bar once it's mostly grown in, for the peak
    // bar always and for others on hover, to avoid cluttering the axis.
    if (progress > 0.85 && m.total > 0 && (isPeak || isHover)) {
      ctx.fillStyle = isDark ? '#e6fdf0' : '#14532d';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const label = m.total >= 1000 ? '₹' + (m.total / 1000).toFixed(1) + 'k' : '₹' + m.total;
      ctx.fillText(label, x + barW / 2, y - 5);
    }

    ctx.fillStyle = isHover ? (isDark ? '#e6fdf0' : '#14532d') : labelColor;
    ctx.font = isHover ? 'bold 9px sans-serif' : '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(m.name, x + barW / 2, padT + chartH + 6);
  });

  ctx.strokeStyle = labelColor;
  ctx.beginPath();
  ctx.moveTo(padL, padT + chartH);
  ctx.lineTo(w - padR, padT + chartH);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  canvas._amcBarCoords = barCoords;
  canvas._amcBarProgress = progress;
}

// Hover a bar to see its exact value pop up above it and its label bold —
// bound once per canvas via a dataset flag so repeated renders don't stack
// listeners.
function bindAmcMonthlyBarHover(canvas, months) {
  if (canvas.dataset.hoverBound === '1') {
    canvas._amcBarMonths = months;
    return;
  }
  canvas.dataset.hoverBound = '1';
  canvas._amcBarMonths = months;

  canvas.addEventListener('mousemove', (e) => {
    const coords = canvas._amcBarCoords;
    if (!coords || amcMonthlyBarAnimFrame) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
    let hover = -1;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      if (x >= c.x - 2 && x <= c.x + c.w + 2 && y >= c.y && y <= c.y + c.h) { hover = i; break; }
    }
    if (hover !== amcMonthlyBarHoverIdx) {
      amcMonthlyBarHoverIdx = hover;
      paintAmcMonthlyBarChart(canvas, canvas._amcBarMonths, 1, hover);
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (amcMonthlyBarHoverIdx !== -1) {
      amcMonthlyBarHoverIdx = -1;
      paintAmcMonthlyBarChart(canvas, canvas._amcBarMonths, 1, -1);
    }
  });
}

// Detailed month-by-month table with a TOTAL row in the tfoot, and a
// "Peak" / "Low" tag on standout months.
function renderAmcMonthlyTable(months, year) {
  const head = document.getElementById('amcMonthlyTableHead');
  const body = document.getElementById('amcMonthlyTableBody');
  const foot = document.getElementById('amcMonthlyTableFoot');
  if (!head || !body) return;

  head.innerHTML = `<th>Month</th><th>Contracts Started</th><th>Services Performed</th><th>Breakdown Repairs</th><th>Contract Value (₹)</th><th>Service Cost (₹)</th><th>Repair Cost (₹)</th><th>Total Expenditure (₹)</th>`;

  const maxTotal = Math.max(...months.map(m => m.total), 0);
  const nonZeroTotals = months.filter(m => m.total > 0).map(m => m.total);
  const avgTotal = nonZeroTotals.length ? nonZeroTotals.reduce((a, b) => a + b, 0) / nonZeroTotals.length : 0;

  body.innerHTML = months.map(m => {
    let tag = '';
    if (m.total > 0 && m.total === maxTotal) tag = ' <span class="amc-monthly-tag tag-peak">Peak</span>';
    else if (m.total > 0 && m.total < avgTotal * 0.5) tag = ' <span class="amc-monthly-tag tag-low">Low</span>';
    return `<tr>
      <td style="text-align:left;"><strong>${m.name} ${year}</strong>${tag}</td>
      <td>${m.contractsStarted || '—'}</td>
      <td>${m.scheduledCount || '—'}</td>
      <td>${m.breakdownCount || '—'}</td>
      <td>${m.contractValue > 0 ? '₹' + m.contractValue.toLocaleString('en-IN') : '—'}</td>
      <td>${m.scheduledCost > 0 ? '₹' + m.scheduledCost.toLocaleString('en-IN') : '—'}</td>
      <td>${m.breakdownCost > 0 ? '₹' + m.breakdownCost.toLocaleString('en-IN') : '—'}</td>
      <td><strong>${m.total > 0 ? '₹' + m.total.toLocaleString('en-IN') : '—'}</strong></td>
    </tr>`;
  }).join('');

  if (foot) {
    foot.innerHTML = `
      <td style="text-align:left;">TOTAL (${year})</td>
      <td>${months.reduce((s, m) => s + m.contractsStarted, 0)}</td>
      <td>${months.reduce((s, m) => s + m.scheduledCount, 0)}</td>
      <td>${months.reduce((s, m) => s + m.breakdownCount, 0)}</td>
      <td>₹${months.reduce((s, m) => s + m.contractValue, 0).toLocaleString('en-IN')}</td>
      <td>₹${months.reduce((s, m) => s + m.scheduledCost, 0).toLocaleString('en-IN')}</td>
      <td>₹${months.reduce((s, m) => s + m.breakdownCost, 0).toLocaleString('en-IN')}</td>
      <td>₹${months.reduce((s, m) => s + m.total, 0).toLocaleString('en-IN')}</td>`;
  }
}
