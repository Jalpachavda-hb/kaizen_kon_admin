/**
 * SESSION MANAGEMENT SERVICE
 * Manages admin session lifecycle with a strict 2-hour timeout.
 */

export const STORAGE_TOKEN_KEY = 'ignito_auth_token';
export const STORAGE_USER_KEY = 'ignito_auth_user';
export const STORAGE_ADMIN_ID_KEY = 'ignito_admin_id';
export const STORAGE_LOGIN_TIME_KEY = 'ignito_session_login_time';

// 2 Hours in milliseconds = 2 * 60 * 60 * 1000 = 7,200,000 ms
export const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * Saves authenticated session credentials and records the login timestamp.
 * 
 * @param {object} params
 * @param {string} [params.token] - JWT / Auth Bearer token
 * @param {object} [params.user] - Admin user object
 * @param {number|string} [params.adminId] - Admin identifier
 */
export function saveAuthSession({ token, user, adminId } = {}) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    }
    if (adminId !== undefined && adminId !== null) {
      localStorage.setItem(STORAGE_ADMIN_ID_KEY, String(adminId));
    }
    // Record login timestamp
    localStorage.setItem(STORAGE_LOGIN_TIME_KEY, String(Date.now()));

    // Notify listeners in the current tab
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ignito_session_change'));
    }
  } catch (err) {
    console.error('Error saving auth session:', err);
  }
}

/**
 * Clears all authenticated session data from local storage.
 */
export function clearAuthSession() {
  try {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_ADMIN_ID_KEY);
    localStorage.removeItem(STORAGE_LOGIN_TIME_KEY);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ignito_session_change'));
    }
  } catch (err) {
    console.error('Error clearing auth session:', err);
  }
}

/**
 * Retrieves the timestamp (in ms) when the current admin session was initiated.
 * @returns {number|null}
 */
export function getSessionLoginTime() {
  try {
    const raw = localStorage.getItem(STORAGE_LOGIN_TIME_KEY);
    if (!raw) return null;
    const time = Number(raw);
    return isNaN(time) ? null : time;
  } catch {
    return null;
  }
}

/**
 * Returns the remaining session duration in milliseconds.
 * Returns 0 if expired or not logged in.
 * @returns {number}
 */
export function getSessionRemainingTime() {
  try {
    const loginTime = getSessionLoginTime();
    if (!loginTime) return 0;

    const elapsed = Date.now() - loginTime;
    const remaining = SESSION_DURATION_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/**
 * Determines whether the current 2-hour session has expired.
 * @returns {boolean}
 */
export function isSessionExpired() {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const user = localStorage.getItem(STORAGE_USER_KEY);

    // If there is no active token or user, session isn't expired; it simply doesn't exist
    if (!token && !user) {
      return false;
    }

    const loginTime = getSessionLoginTime();
    // If credentials exist but there is no login timestamp (e.g., legacy session),
    // treat it as expired so the admin logs in afresh under the 2-hour policy.
    if (!loginTime) {
      return true;
    }

    const elapsed = Date.now() - loginTime;
    return elapsed >= SESSION_DURATION_MS;
  } catch {
    return false;
  }
}

/**
 * Verifies whether the admin has an active, non-expired authenticated session.
 * Automatically clears expired sessions and returns false.
 * @returns {boolean}
 */
export function isAuthenticated() {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const user = localStorage.getItem(STORAGE_USER_KEY);

    if (!token && !user) {
      return false;
    }

    if (isSessionExpired()) {
      clearAuthSession();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Gets currently logged in user session from localStorage if available.
 */
export function getSavedUserSession() {
  try {
    if (isSessionExpired()) {
      clearAuthSession();
      return null;
    }
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Gets normalized admin profile data from saved session.
 */
export function getAdminProfile() {
  const user = getSavedUserSession();
  const firstName = user?.firstName || (user?.fullName ? user.fullName.split(' ')[0] : 'Admin');
  const lastName = user?.lastName || (user?.fullName && user.fullName.split(' ').length > 1 ? user.fullName.split(' ').slice(1).join(' ') : '');
  return {
    adminId: user?.adminId || user?.id || 1,
    firstName: firstName || 'Admin',
    lastName: lastName || '',
    fullName: user?.fullName || `${firstName} ${lastName}`.trim() || 'Admin User',
    emailId: user?.emailId || user?.email || 'user@example.com',
    mobileNumber: user?.mobileNumber || '',
    profileImage: user?.profileImage || user?.avatar || '',
    adminRoleName: user?.adminRoleName || user?.role || 'Super Administrator',
    dashboardPath: user?.dashboardPath || '/',
    adminDashboardId: user?.adminDashboardId || 1,
    adminPermissionsList: user?.adminPermissionsList || []
  };
}

/**
 * Gets currently logged in admin ID from localStorage.
 */
export function getSavedAdminId() {
  try {
    if (isSessionExpired()) {
      clearAuthSession();
      return 1;
    }
    const adminId = localStorage.getItem(STORAGE_ADMIN_ID_KEY);
    return adminId ? Number(adminId) : 1;
  } catch {
    return 1;
  }
}

export default {
  saveAuthSession,
  clearAuthSession,
  getSessionLoginTime,
  getSessionRemainingTime,
  isSessionExpired,
  isAuthenticated,
  getSavedUserSession,
  getAdminProfile,
  getSavedAdminId,
  SESSION_DURATION_MS
};
