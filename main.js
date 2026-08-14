const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw7NY8Lxr2pL877LbSoch1eeugGaOI7PJulODyApCIU_4tBfe-t6Nb4LorBsYgUc5qFjA/exec';
    // Apps Script can take several seconds to wake up and read Google Sheets.
    // Keep read requests below the browser's practical connection limit while
    // allowing enough time for a cold start or a larger report sheet.
    const READ_REQUEST_TIMEOUT_MS = 30000;
    const today = formatLocalDate(new Date());
    const yesNo = ['YES', 'NO'];
    const floors = ['1st', '2nd', '3rd', '4th', '5th', 'OUTSIDE', 'ALL'];
    const locations = ['KASBA', 'BANTALA','SEALDAH'];
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
        if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
      });

      // Close the panel once an action item is chosen (opens its own modal/view)
      ['pdfBtn', 'rptBtn', 'dailyBtn', 'dailyDashboardBtn'].forEach(id => {
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
          state.factories.map(f => `<option value="${f}"${f===cur?' selected':''}>${f}</option>`).join('');
      });
      document.querySelectorAll('select[data-type="extinguisher"]').forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = '<option value="">Select type...</option>' +
          state.extinguisherTypes.map(t => `<option value="${t}"${t===cur?' selected':''}>${t}</option>`).join('');
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

function closePdfModal(){
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
  fetchPdfsFromBackend().catch(() => {});
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

async function loadRecentPdfs(){

  document
    .getElementById('pdfModal')
    .classList.remove('hidden');

  const list = document.getElementById('pdfList');

  // Only show the loading state if nothing has been prefetched yet â€”
  // otherwise render instantly from cache while a fresh copy loads.
  if (!Array.isArray(pdfDataCache)) {
    list.innerHTML = 'Loading...';
  }

  try{

    allPdfs = await fetchPdfsFromBackend();

    renderPdfList(allPdfs);
    stampPdfUpdated();

  }catch(err){

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
  } catch (_) {}
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

function renderPdfList(data){
  const list = document.getElementById('pdfList');
  if(!data.length){
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

function filterPdfList(){

  const search = document
    .getElementById('pdfSearch')
    .value
    .toLowerCase();

  const fromDate =
    document.getElementById('pdfFromDate').value;

  const toDate =
    document.getElementById('pdfToDate').value;

  let filtered = [...allPdfs];

  if(search){

    filtered = filtered.filter(pdf =>
      pdf.name.toLowerCase().includes(search) ||
      pdf.factory.toLowerCase().includes(search)
    );
  }

  if(fromDate){

    filtered = filtered.filter(pdf =>
      new Date(pdf.timestamp) >= new Date(fromDate)
    );
  }

  if(toDate){

    filtered = filtered.filter(pdf =>
      new Date(pdf.timestamp) <= new Date(toDate + 'T23:59:59')
    );
  }

  renderPdfList(filtered);
}

function formatPdfOnlyDate(date){

  return new Date(date).toLocaleDateString(
    'en-GB',
    {
      day:'2-digit',
      month:'short',
      year:'numeric'
    }
  );
}

function formatPdfOnlyTime(date){

  return new Date(date).toLocaleTimeString(
    'en-US',
    {
      hour:'2-digit',
      minute:'2-digit'
    }
  );
}

function promptDeletePdf(pdfId){
  const password = prompt('Enter password to delete this PDF:');
  
  if(password === null){
    return;
  }
  
  if(password === 'Trio@2026'){
    deletePdf(pdfId);
  } else {
    showToast('Incorrect password. PDF not deleted.', true);
  }
}

async function deletePdf(pdfId){
  try{
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deletePdf', pdfId: pdfId }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    
    const result = await response.json();
    
    if(result.ok){
      showToast('PDF deleted successfully.', false);
      allPdfs = allPdfs.filter(pdf => pdf.id !== pdfId);
      renderPdfList(allPdfs);
    } else {
      showToast(result.message || 'Failed to delete PDF.', true);
    }
  } catch(err){
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
  } catch (_) {}
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
  fetchRptFromBackend().catch(() => {});
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
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
    if (!months.has(key)) {
      const lbl = d.toLocaleString('default',{month:'long'}) + ' ' + d.getFullYear();
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
  const now   = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  document.getElementById('rptFromDate').value = formatLocalDate(first);
  document.getElementById('rptToDate').value   = formatLocalDate(last);
  // Pre-select current month if available
  const curKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;
  const sel = document.getElementById('rptMonth');
  if ([...sel.options].some(o => o.value === curKey)) sel.value = curKey;
  else sel.value = '';
  document.getElementById('rptStatus').value = 'all';
}

function resetRptFilter() { initRptDefaults(); applyRptFilter(); }

function applyRptFilter(resetPage = true) {
  const status = document.getElementById('rptStatus').value;
  const from   = document.getElementById('rptFromDate').value;
  const to     = document.getElementById('rptToDate').value;
  const month  = document.getElementById('rptMonth').value; // "yyyy-M" or ""

  filteredRptData = allRptData.filter(row => {
    if (status === 'Complete' && row.status !== 'Complete') return false;
    if (status === 'Pending'  && row.status === 'Complete') return false;
    const d = row.isoDate ? new Date(row.isoDate) : null;
    if (d && !isNaN(d)) {
      if (from && d < new Date(from)) return false;
      if (to   && d > new Date(to + 'T23:59:59')) return false;
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
  const total    = filteredRptData.length;
  const complete = filteredRptData.filter(r => r.status === 'Complete').length;
  const pending  = total - complete;   // Pending = Total - Complete
  const pct = total > 0 ? Math.round((pending / total) * 100) + '%' : '-';
  document.getElementById('rptKpiTotal').textContent    = total;
  document.getElementById('rptKpiPending').textContent  = pending;
  document.getElementById('rptKpiComplete').textContent = complete;
  document.getElementById('rptKpiElapsed').textContent  = pct;
}

function sortRpt(col) {
  rptSortDir = rptSortCol === col ? rptSortDir * -1 : 1;
  rptSortCol = col;
  document.querySelectorAll('.rpt-table thead th').forEach(th => {
    th.classList.toggle('sorted', th.dataset.col === col);
    const ic = th.querySelector('.sicon');
    if (ic) ic.textContent = th.dataset.col === col ? (rptSortDir===1?'\u2191':'\u2193') : '\u2195';
  });
  renderRptTable();
}

function renderRptTable() {
  const sorted = [...filteredRptData].sort((a,b) => {
    const av = a[rptSortCol]||'', bv = b[rptSortCol]||'';
    return av < bv ? -rptSortDir : av > bv ? rptSortDir : 0;
  });
  const total = sorted.length, pages = Math.ceil(total/RPT_PAGE_SIZE)||1;
  rptPage = Math.min(Math.max(rptPage,1), pages);
  const start = (rptPage-1)*RPT_PAGE_SIZE;
  const page  = sorted.slice(start, start+RPT_PAGE_SIZE);
  const today = new Date(); today.setHours(0,0,0,0);
  const tbody = document.getElementById('rptTableBody');

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#6b7280;">No records found.</td></tr>';
  } else {
    tbody.innerHTML = page.map((row, i) => {
      const isComplete = row.status === 'Complete';
      const isPending  = !isComplete;

      let badge;
      if (isPending && row.isoDate) {
        const d = new Date(row.isoDate); d.setHours(0,0,0,0);
        const days = Math.max(0, Math.round((today-d)/86400000));
        const lbl = days===0 ? 'Pending, audited today.'
          : days===1 ? 'Pending, 1 day has elapsed since the audit date.'
          : `Pending, ${days} days have elapsed since the audit date.`;
        badge = `<span class="rpt-badge rpt-badge-pending">${escapeHtml(lbl)}</span>`;
      } else if (isComplete) {
        badge = `<span class="rpt-badge rpt-badge-complete">Complete</span>`;
      } else {
        badge = `<span class="rpt-badge rpt-badge-default">${escapeHtml(row.status||'-')}</span>`;
      }

      const link = row.fileLink
        ? `<a class="rpt-file-link" href="${escapeHtml(row.fileLink)}" target="_blank" rel="noopener">${escapeHtml(row.fileLink.length>28?row.fileLink.slice(0,26)+'\u2026':row.fileLink)}</a>`
        : '-';

      // Action checkbox: checked = isDone (col G has DONE), only Pending rows are clickable
      const cbChecked  = row.isDone ? ' checked' : '';
      const cbDisabled = isComplete ? ' disabled' : '';
      const cbClick    = isComplete ? '' : ` onclick="markRptDone(this,${row.rowIndex})"`;

      const actualDate = escapeHtml(row.actualDate || '-');

      return `<tr>
        <td>${start+i+1}</td>
        <td>${escapeHtml(row.auditDate||'-')}</td>
        <td>${escapeHtml(row.unit||'-')}</td>
        <td>${escapeHtml(row.location||'-')}</td>
        <td>${link}</td>
        <td>${escapeHtml(row.remarks||'-')}</td>
        <td>${badge}</td>
        <td class="rpt-cb-wrap"><input type="checkbox" class="rpt-cb"${cbChecked}${cbDisabled}${cbClick}></td>
        <td>${actualDate}</td>
      </tr>`;
    }).join('');
  }

  const end = Math.min(start+RPT_PAGE_SIZE, total);
  document.getElementById('rptShowing').textContent =
    total ? `Showing ${start+1} to ${end} of ${total} entries` : 'No entries';

  let ph = `<button class="rpt-page-btn" onclick="rptGoPage(${rptPage-1})"${rptPage===1?' disabled':''}>\u2039</button>`;
  for (let p=1; p<=pages; p++)
    ph += `<button class="rpt-page-btn${p===rptPage?' active':''}" onclick="rptGoPage(${p})">${p}</button>`;
  ph += `<button class="rpt-page-btn" onclick="rptGoPage(${rptPage+1})"${rptPage===pages?' disabled':''}>\u203a</button>`;
  document.getElementById('rptPages').innerHTML = ph;
}

function rptGoPage(p) {
  rptPage = Math.max(1, Math.min(p, Math.ceil(filteredRptData.length/RPT_PAGE_SIZE)||1));
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
      const dd = String(ts.getDate()).padStart(2,'0');
      const mm = String(ts.getMonth()+1).padStart(2,'0');
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
  const hdr = ['#','Audit Date','Unit','Location','File Link','Remarks','STATUS','Actual Date'];
  const rows = filteredRptData.map((r,i) => [
    i+1, r.auditDate||'', r.unit||'', r.location||'',
    r.fileLink||'', r.remarks||'', r.status||'', r.actualDate||''
  ]);
  const csv = [hdr,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href=url; a.download='Audit_Status_Report.csv'; a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
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
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = date.getDate();
  const mo = months[date.getMonth()];
  const yy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dd} ${mo}, ${yy} ${hh}:${mi}:${ss}`;
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
  fetchDailyTaskDataFromBackend().catch(() => {});
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
  const unit            = document.getElementById('dailyUnit')?.value        || '';
  const floor           = document.getElementById('dailyFloor')?.value       || '';
  const observationArea = document.getElementById('dailyObservation')?.value?.trim() || '';
  const priority        = document.getElementById('dailyPriority')?.value    || '';
  const now             = new Date();
  const dateStr         = formatDailyTimestamp(now);

  // ── Auto Subject ──────────────────────────────────────────────────────
  const dateForSubject = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const subject = `Fire Audit Observation – ${unit ? unit + ', ' : ''}${dateForSubject}`;
  document.getElementById('mailSubjectInput').value = subject;

  // ── Priority badge (fully inline-styled — must survive being emailed) ─
  const priorityColors = {
    High:   { bg: '#fee2e2', fg: '#b91c1c', dot: '#ef4444' },
    Medium: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
    Low:    { bg: '#d1fae5', fg: '#047857', dot: '#10b981' }
  };
  const pc = priorityColors[priority] || { bg: '#e5e7eb', fg: '#4b5563', dot: '#9ca3af' };
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
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;border-collapse:collapse;font-family:Calibri,Verdana,Geneva,sans-serif;background:#ffffff;">
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:14px 14px 0 0;padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="width:60px;vertical-align:middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border-radius:10px;width:52px;height:52px;">
                    <tr>
                      <td align="center" valign="middle" style="width:52px;height:52px;">
                        <img src="${MAIL_LOGO_URL}" alt="Trio Group" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;">
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:middle;padding-left:14px;text-align:left;">
                  <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px;">Fire Safety Audit Observation</div>
                  <div style="color:#dcfce7;font-size:11.5px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-top:4px;">Trio Group &middot; Fire Audit System</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #bbf7d0;border-top:none;border-radius:0 0 14px 14px;padding:28px 26px;">
            <p style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 12px;">Dear All,</p>
            <p style="font-size:13.5px;color:#4b5563;line-height:1.7;margin:0 0 20px;">
              Please find below the fire safety observation recorded during today&rsquo;s floor round.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #bbf7d0;margin-bottom:20px;">
              <tr style="background:#f0fdf4;">
                <td style="padding:11px 14px;font-size:12px;font-weight:700;color:#166534;width:130px;border-bottom:1px solid #bbf7d0;">Date &amp; Time</td>
                <td style="padding:11px 14px;font-size:13px;color:#1f2937;border-bottom:1px solid #bbf7d0;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding:11px 14px;font-size:12px;font-weight:700;color:#166534;border-bottom:1px solid #bbf7d0;">Unit / Factory</td>
                <td style="padding:11px 14px;font-size:13px;color:#1f2937;border-bottom:1px solid #bbf7d0;">${unit || '—'}</td>
              </tr>
              <tr style="background:#f0fdf4;">
                <td style="padding:11px 14px;font-size:12px;font-weight:700;color:#166534;border-bottom:1px solid #bbf7d0;">Floor</td>
                <td style="padding:11px 14px;font-size:13px;color:#1f2937;border-bottom:1px solid #bbf7d0;">${floor || '—'}</td>
              </tr>
              <tr>
                <td style="padding:11px 14px;font-size:12px;font-weight:700;color:#166534;">Priority</td>
                <td style="padding:11px 14px;">${priorityHtml}</td>
              </tr>
            </table>

            <p style="font-size:11.5px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.6px;margin:0 0 8px;">Observation</p>
            <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;padding:14px 16px;font-size:13.5px;color:#14532d;line-height:1.7;margin-bottom:22px;">
              ${observationHtml}
            </div>

            <p style="font-size:13px;color:#4b5563;line-height:1.6;margin:0 0 24px;">
              Kindly take the necessary corrective action at the earliest.
            </p>

            <div style="border-top:1px solid #bbf7d0;padding-top:16px;font-size:12.5px;color:#6b7280;line-height:1.75;">
              Thanks &amp; Regards,<br>
              <strong style="color:#15803d;font-size:13px;">Fire Audit System</strong><br>
              Trio Group
            </div>
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
      `Unit / Factory : ${unit  || '—'}`,
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
    sendBtn.innerHTML = 'Sending…';
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
      sendBtn.innerHTML = originalLabel;
    }
  }
}
