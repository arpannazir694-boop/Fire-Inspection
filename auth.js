/**
 * FACILIX - Authentication Guard & Session Controller
 * Protects index.html, validates user session, and provides profile/signout capabilities.
 */

(function () {
  'use strict';

  const AUTH_STORAGE_KEY = 'fire_audit_user';

  function getActiveSession() {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // 1. Enforce Authentication Guard
  const currentUser = getActiveSession();
  if (!currentUser || !currentUser.username) {
    // Smoothly redirect unauthenticated visitors to login page
    window.location.replace('login.html');
    return;
  }

  // 2. Global Sign Out Function
  window.fireAuditLogout = function () {
    if (window.confirm('Are you sure you want to sign out?')) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.replace('login.html?logout=true');
    }
  };

  // Expose current authenticated user details globally
  window.fireAuditCurrentUser = currentUser;

  // 3. UI Injections (Profile Tile & Logout Button in Menu Drawer)
  document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('headerMorePanel');
    if (!panel) return;

    // User Profile Widget
    const userWidget = document.createElement('div');
    userWidget.className = 'header-user-profile';
    userWidget.style.cssText = `
      padding: 12px 14px;
      margin: 10px 12px 14px;
      background: rgba(249, 115, 22, 0.08);
      border: 1px solid rgba(249, 115, 22, 0.22);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    const initial = (currentUser.displayName || currentUser.username || 'U').charAt(0).toUpperCase();
    const nameStr = currentUser.displayName || currentUser.username || 'User';

    userWidget.innerHTML = `
      <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #f97316, #ef4444); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 15px; flex-shrink: 0; box-shadow: 0 3px 10px rgba(249,115,22,0.35);">
        ${initial}
      </div>
      <div style="overflow: hidden; flex: 1;">
        <div style="font-size: 13.5px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${nameStr}
        </div>
        <div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 5px; margin-top: 2px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 6px #10b981;"></span>
          <span>Logged In &middot; FACILIX</span>
        </div>
      </div>
    `;

    // Sign Out Button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'header-more-item item-logout';
    logoutBtn.type = 'button';
    logoutBtn.setAttribute('aria-label', 'Sign Out');
    logoutBtn.style.cssText = `
      color: #ef4444;
      border-top: 1px solid rgba(255,255,255,0.07);
      margin-top: 10px;
      padding-top: 12px;
      transition: background 0.2s ease, color 0.2s ease;
    `;
    logoutBtn.innerHTML = `
      <span class="header-more-icon" style="color: #ef4444;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </span>
      <span class="header-more-label" style="font-weight: 600; color: #ef4444;">Sign Out</span>
    `;

    logoutBtn.addEventListener('click', window.fireAuditLogout);

    // Insert user widget under the status pill
    const statusPill = document.getElementById('statusPill');
    if (statusPill && statusPill.nextSibling) {
      panel.insertBefore(userWidget, statusPill.nextSibling);
    } else {
      panel.prepend(userWidget);
    }

    panel.appendChild(logoutBtn);
  });

})();
