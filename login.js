/**
 * FACILIX - Dedicated Sign In Logic
 * Handles authentication against Google Apps Script Users database.
 */

(function () {
  'use strict';

  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw7NY8Lxr2pL877LbSoch1eeugGaOI7PJulODyApCIU_4tBfe-t6Nb4LorBsYgUc5qFjA/exec';
  const AUTH_STORAGE_KEY = 'fire_audit_user';
  const REMEMBER_USER_KEY = 'fire_audit_remember_user';
  const REQUEST_TIMEOUT_MS = 25000;

  // DOM Elements
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const togglePwdBtn = document.getElementById('togglePwdBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const rememberMe = document.getElementById('rememberMe');
  const submitBtn = document.getElementById('submitBtn');
  const authAlert = document.getElementById('authAlert');
  const authAlertText = document.getElementById('authAlertText');
  const authAlertIcon = document.getElementById('authAlertIcon');
  const loginCard = document.getElementById('loginCard');
  const helpLink = document.getElementById('helpLink');
  const helpModal = document.getElementById('helpModal');
  const closeHelpBtn = document.getElementById('closeHelpBtn');

  // SVG Icons for password toggle
  const EYE_OPEN_SVG = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  `;
  const EYE_CLOSED_SVG = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  `;

  // SVG Icons for Alerts
  const ICON_ERROR = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  `;
  const ICON_SUCCESS = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  // ─── Initialization ───
  function init() {
    // Check if user is logging out
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      showAlert('You have been signed out safely.', 'success');
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check if active session already exists
      const activeSession = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
      if (activeSession) {
        try {
          const parsed = JSON.parse(activeSession);
          if (parsed && parsed.username) {
            window.location.replace('index.html');
            return;
          }
        } catch (e) {
          // invalid json, clear it
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    }

    // Restore remembered username
    const rememberedUser = localStorage.getItem(REMEMBER_USER_KEY);
    if (rememberedUser) {
      usernameInput.value = rememberedUser;
      rememberMe.checked = true;
      passwordInput.focus();
    } else {
      usernameInput.focus();
    }

    bindEvents();
    initLiveTelemetry();
  }

  // ─── Event Listeners ───
  function bindEvents() {
    // Password toggle
    togglePwdBtn.addEventListener('click', togglePasswordVisibility);

    // Form submission
    loginForm.addEventListener('submit', handleLogin);

    // Input clearing alert
    usernameInput.addEventListener('input', hideAlert);
    passwordInput.addEventListener('input', hideAlert);

    // Lost Password Modal
    if (helpLink && helpModal && closeHelpBtn) {
      helpLink.addEventListener('click', () => {
        const titleEl = document.getElementById('helpTitle');
        if (titleEl) titleEl.textContent = 'Lost Your Password?';
        helpModal.classList.add('open');
        helpModal.setAttribute('aria-hidden', 'false');
      });

      closeHelpBtn.addEventListener('click', () => {
        helpModal.classList.remove('open');
        helpModal.setAttribute('aria-hidden', 'true');
      });

      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          helpModal.classList.remove('open');
          helpModal.setAttribute('aria-hidden', 'true');
        }
      });
    }

    // ─── Interactive Mouse Spotlight & 3D Tilt Delight ───
    const mouseGlow = document.getElementById('mouseGlow');
    if (window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('mousemove', (e) => {
        if (mouseGlow) {
          mouseGlow.style.opacity = '1';
          mouseGlow.style.left = `${e.clientX}px`;
          mouseGlow.style.top = `${e.clientY}px`;
        }

        if (loginCard) {
          const rect = loginCard.getBoundingClientRect();
          const cardCenterX = rect.left + rect.width / 2;
          const cardCenterY = rect.top + rect.height / 2;
          const deltaX = (e.clientX - cardCenterX) / (window.innerWidth / 2);
          const deltaY = (e.clientY - cardCenterY) / (window.innerHeight / 2);

          const rotateY = deltaX * 3.5;
          const rotateX = -deltaY * 3.5;
          loginCard.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
        }
      }, { passive: true });

      window.addEventListener('mouseleave', () => {
        if (mouseGlow) mouseGlow.style.opacity = '0';
        if (loginCard) loginCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      });
    }
  }

  // ─── Toggle Password Visibility ───
  function togglePasswordVisibility() {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    if (isPassword) {
      passwordInput.setAttribute('type', 'text');
      eyeIcon.innerHTML = EYE_CLOSED_SVG;
      togglePwdBtn.setAttribute('title', 'Hide password');
    } else {
      passwordInput.setAttribute('type', 'password');
      eyeIcon.innerHTML = EYE_OPEN_SVG;
      togglePwdBtn.setAttribute('title', 'Show password');
    }
  }

  // ─── Handle Login Submission ───
  async function handleLogin(e) {
    e.preventDefault();
    hideAlert();

    const username = (usernameInput.value || '').trim();
    const password = (passwordInput.value || '').trim();

    if (!username) {
      showAlert('Please enter your username.', 'error');
      triggerShake();
      usernameInput.focus();
      return;
    }

    if (!password) {
      showAlert('Please enter your password.', 'error');
      triggerShake();
      passwordInput.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await verifyCredentials(username, password);

      if (response && (response.ok || response.success)) {
        const userObj = response.user || { username: username, displayName: username };
        const sessionPayload = {
          username: userObj.username || username,
          displayName: userObj.displayName || username,
          loginTime: new Date().toISOString()
        };

        // Storage logic
        if (rememberMe.checked) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionPayload));
          localStorage.setItem(REMEMBER_USER_KEY, username);
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
        } else {
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionPayload));
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(REMEMBER_USER_KEY);
        }

        showAlert('Authentication successful! Redirecting...', 'success');

        // Smooth redirect to main dashboard
        setTimeout(() => {
          window.location.replace('index.html');
        }, 600);
      } else {
        const msg = (response && response.message) || 'Invalid username or password. Please try again.';
        showAlert(msg, 'error');
        triggerShake();
        setLoading(false);
        passwordInput.focus();
      }
    } catch (err) {
      console.error('Sign In Error:', err);
      showAlert('Unable to reach authentication server. Please check your connection.', 'error');
      triggerShake();
      setLoading(false);
    }
  }

  // ─── API Verification (Fetch GET, POST & JSONP Fallbacks) ───
  async function verifyCredentials(username, password) {
    const timestamp = Date.now();

    // 1. Try Fetch GET with cache busting
    try {
      const getParams = new URLSearchParams({
        action: 'login',
        username: username,
        password: password,
        _ts: timestamp
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(`${WEB_APP_URL}?${getParams.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (parseErr) {
          // If server returned HTML (e.g. out of date deployment), throw specific error
          if (text.includes('<html') || text.includes('ReferenceError') || text.includes('Error')) {
            console.error('Server HTML error response:', text);
            throw new Error('Google Apps Script requires re-deployment. Please save Code.gs in Apps Script and deploy a new version.');
          }
        }
      }
    } catch (getErr) {
      console.warn('GET request failed, trying POST...', getErr.message);
      if (getErr.message.includes('re-deployment')) {
        throw getErr;
      }
    }

    // 2. Try Fetch POST
    try {
      const payload = {
        action: 'login',
        username: username,
        password: password
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          // continue to JSONP
        }
      }
    } catch (postErr) {
      console.warn('POST failed, trying JSONP...', postErr.message);
    }

    // 3. Fallback to JSONP
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_login_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      const script = document.createElement('script');
      let timeoutHandle;

      window[callbackName] = function (data) {
        cleanup();
        resolve(data);
      };

      function cleanup() {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      timeoutHandle = setTimeout(() => {
        cleanup();
        reject(new Error('Connection timed out. Please check your Apps Script deployment.'));
      }, REQUEST_TIMEOUT_MS);

      script.onerror = function () {
        cleanup();
        reject(new Error('Apps Script deployment blocked the request. Please ensure the latest Code.gs is deployed as a new version.'));
      };

      const params = new URLSearchParams({
        action: 'login',
        username: username,
        password: password,
        callback: callbackName,
        _ts: Date.now()
      });

      script.src = `${WEB_APP_URL}?${params.toString()}`;
      document.head.appendChild(script);
    });
  }

  // ─── UI Helper Functions ───
  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      usernameInput.disabled = true;
      passwordInput.disabled = true;
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      usernameInput.disabled = false;
      passwordInput.disabled = false;
    }
  }

  function showAlert(message, type) {
    authAlert.className = `auth-alert ${type}`;
    authAlertText.textContent = message;
    authAlertIcon.innerHTML = type === 'success' ? ICON_SUCCESS : ICON_ERROR;
    authAlert.style.display = 'flex';
  }

  function hideAlert() {
    authAlert.style.display = 'none';
  }

  function triggerShake() {
    loginCard.classList.remove('shake');
    // Force reflow
    void loginCard.offsetWidth;
    loginCard.classList.add('shake');
    setTimeout(() => {
      loginCard.classList.remove('shake');
    }, 600);
  }

  // ─── Live Telemetry Engine (Real-Time Radar & Audit Stream) ───
  function initLiveTelemetry() {
    const timeEl = document.getElementById('liveConsoleTime');
    const pillEl = document.getElementById('liveEventPill');
    const iconEl = document.getElementById('liveEventIcon');
    const titleEl = document.getElementById('liveEventTitle');
    const metaEl = document.getElementById('liveEventMeta');
    const badgeEl = document.getElementById('liveEventBadge');
    const accuracyEl = document.getElementById('liveAccuracyVal');
    const riskEl = document.getElementById('liveRiskVal');
    const verticalsEl = document.getElementById('liveVerticalsVal');

    // 1. Live Clock
    function updateClock() {
      if (!timeEl) return;
      const now = new Date();
      timeEl.textContent = 'LIVE • ' + now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);

    // SVG icons by category
    const CATEGORY_ICONS = {
      'Fire': {
        color: '#f87171',
        svg: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
      },
      'Generator': {
        color: '#fb923c',
        svg: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'
      },
      'Lift': {
        color: '#f97316',
        svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 10 3-3 3 3M9 14l3 3 3-3"/>'
      },
      'Water Filter': {
        color: '#38bdf8',
        svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'
      },
      'CCTV Camera': {
        color: '#22d3ee',
        svg: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'
      },
      'Sound System & intercom': {
        color: '#c084fc',
        svg: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>'
      },
      'Default': {
        color: '#34d399',
        svg: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>'
      }
    };

    let streamItems = [];
    let currentEventIdx = 0;
    let streamInterval = null;

    // Build event object from an AMC record
    function buildStreamEvent(item) {
      const cat = item.category || 'Facility';
      const iconInfo = CATEGORY_ICONS[cat] || CATEGORY_ICONS['Default'];
      const unit = item.unit || 'General';
      const floor = item.floor ? ` &bull; ${item.floor}` : '';
      const vendor = item.vendorName ? ` &bull; ${item.vendorName}` : '';
      
      let badge = 'ACTIVE';
      let badgeClass = 'badge-green';
      let pillar = 'Smart Analysis';
      let metaText = `Unit ${unit}${floor}${vendor}`;

      if (item.status === 'Expired') {
        badge = 'EXPIRED';
        badgeClass = 'badge-red';
        pillar = 'Risk Alert';
        const days = Math.abs(item.contractDaysLeft || 0);
        metaText = `Unit ${unit}${floor} &bull; Contract Expired ${days > 0 ? days + 'd ago' : 'Recently'}`;
      } else if (item.status === 'Service Overdue') {
        badge = 'OVERDUE';
        badgeClass = 'badge-amber';
        pillar = 'Service Alert';
        const days = Math.abs(item.serviceDaysLeft || 0);
        metaText = `Unit ${unit}${floor} &bull; Service Overdue by ${days > 0 ? days + 'd' : 'cycle'}${vendor}`;
      } else if (item.status === 'Service Due Soon') {
        badge = 'DUE SOON';
        badgeClass = 'badge-orange';
        pillar = 'Smart Analysis';
        metaText = `Unit ${unit}${floor} &bull; Service Due in ${item.serviceDaysLeft || 0}d${vendor}`;
      } else if (item.status === 'Expiring Soon') {
        badge = 'EXPIRING';
        badgeClass = 'badge-orange';
        pillar = 'Smart Analysis';
        metaText = `Unit ${unit}${floor} &bull; Contract Expires in ${item.contractDaysLeft || 0}d`;
      } else {
        badge = 'HEALTHY';
        badgeClass = 'badge-green';
        pillar = 'Verified Active';
        if (item.nextDueDate) {
          metaText = `Unit ${unit}${floor} &bull; Next Due: ${item.nextDueDate}${vendor}`;
        } else {
          metaText = `Unit ${unit}${floor} &bull; All Systems Compliant`;
        }
      }

      return {
        title: `${pillar} &bull; ${cat} (${unit})`,
        meta: metaText,
        badge: badge,
        badgeClass: badgeClass,
        iconColor: iconInfo.color,
        svgPath: iconInfo.svg
      };
    }

    // Cycle through live stream items
    function displayNextEvent() {
      if (!streamItems.length || !pillEl || !titleEl || !metaEl || !badgeEl || !iconEl) return;
      currentEventIdx = (currentEventIdx + 1) % streamItems.length;
      const ev = streamItems[currentEventIdx];

      pillEl.classList.add('anim-fade-out');

      setTimeout(() => {
        titleEl.innerHTML = ev.title;
        metaEl.innerHTML = ev.meta;
        badgeEl.textContent = ev.badge;
        badgeEl.className = 'live-event-badge ' + ev.badgeClass;
        iconEl.innerHTML = ev.svgPath;
        iconEl.setAttribute('stroke', ev.iconColor);

        pillEl.classList.remove('anim-fade-out');
        pillEl.classList.add('anim-fade-in');

        setTimeout(() => {
          pillEl.classList.remove('anim-fade-in');
        }, 320);
      }, 280);
    }

    // Process live data and calculate metrics
    function processLiveAmcData(records) {
      if (!Array.isArray(records) || !records.length) return;

      const total = records.length;
      let activeCount = 0;
      let expiredCount = 0;
      let overdueCount = 0;
      const categorySet = new Set();

      records.forEach(r => {
        if (r.category) categorySet.add(r.category);
        if (r.status === 'Expired') expiredCount++;
        else if (r.status === 'Service Overdue') overdueCount++;
        else activeCount++;
      });

      const criticalCount = expiredCount + overdueCount;
      // Real calculations
      const complianceRate = (((total - criticalCount) / total) * 100).toFixed(2);
      const riskRate = ((criticalCount / total) * 100).toFixed(2);
      const totalVerticals = categorySet.size;

      // Update Live Metrics Matrix
      if (accuracyEl) {
        accuracyEl.textContent = complianceRate;
      }
      if (riskEl) {
        riskEl.textContent = `${riskRate}% Risk (${criticalCount})`;
      }
      if (verticalsEl) {
        verticalsEl.textContent = `${totalVerticals} Verticals (${total})`;
      }

      // Also update top Strong Accuracy pillar chip
      const pillarChip = document.getElementById('pillarAccuracyChip');
      const pillarLbl = document.getElementById('pillarAccuracyLbl');
      if (pillarChip) {
        pillarChip.textContent = `${complianceRate}%`;
      }
      if (pillarLbl) {
        pillarLbl.textContent = `${complianceRate}% Precision (${activeCount}/${total})`;
      }

      // Prioritize stream items: Overdue & Expired first, then Active items
      const urgentItems = records.filter(r => r.status === 'Expired' || r.status === 'Service Overdue');
      const normalItems = records.filter(r => r.status !== 'Expired' && r.status !== 'Service Overdue');
      const combined = urgentItems.concat(normalItems);

      streamItems = combined.map(buildStreamEvent);

      // Render initial event immediately
      if (streamItems.length) {
        const first = streamItems[0];
        if (titleEl) titleEl.innerHTML = first.title;
        if (metaEl) metaEl.innerHTML = first.meta;
        if (badgeEl) {
          badgeEl.textContent = first.badge;
          badgeEl.className = 'live-event-badge ' + first.badgeClass;
        }
        if (iconEl) {
          iconEl.innerHTML = first.svgPath;
          iconEl.setAttribute('stroke', first.iconColor);
        }
      }

      if (streamInterval) clearInterval(streamInterval);
      streamInterval = setInterval(displayNextEvent, 3400);
    }

    // Fetch live AMC records directly
    async function loadLiveAmc() {
      try {
        const res = await fetch(`${WEB_APP_URL}?action=amcData&_ts=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store'
        });
        if (res.ok) {
          const text = await res.text();
          const data = JSON.parse(text);
          if (Array.isArray(data) && data.length) {
            processLiveAmcData(data);
          }
        }
      } catch (e) {
        console.warn('Live telemetry fetch error, using local fallback:', e);
      }
    }

    // Initial load
    loadLiveAmc();
  }


  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
