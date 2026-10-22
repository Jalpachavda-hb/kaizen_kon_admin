/**
 * AUTHENTICATION SERVICE
 * Integrates Login UI with Kaizen Con Admin Login API (ApiPath.js)
 * Enforces a 2-hour session expiration rule for admin security.
 */

import { adminLogin as callAdminLoginApi } from '../api/ApiPath';
import {
  saveAuthSession,
  clearAuthSession,
  isAuthenticated as checkIsAuthenticated,
  getSavedUserSession as checkSavedUserSession,
  getAdminProfile as checkAdminProfile,
  getSavedAdminId as checkSavedAdminId,
  isSessionExpired as checkSessionExpired,
  getSessionRemainingTime as checkSessionRemainingTime,
  SESSION_DURATION_MS
} from './sessionManager';

// Re-export session management utilities and constants
export {
  SESSION_DURATION_MS,
  saveAuthSession,
  clearAuthSession
};

/**
 * Checks if session has passed the 2-hour timeout limit.
 * @returns {boolean}
 */
export function isSessionExpired() {
  return checkSessionExpired();
}

/**
 * Gets remaining time before session expires in milliseconds.
 * @returns {number}
 */
export function getSessionRemainingTime() {
  return checkSessionRemainingTime();
}

/**
 * Authenticates admin against Kaizen Con Admin Login API (/api/admin_login).
 * 
 * @param {string} emailOrUsername - Admin email or username
 * @param {string} password - Admin password
 * @returns {Promise<object>} Result Object `{ success, user, token, adminId, message, error }`
 */
export async function validateAdminCredential(emailOrUsername, password) {
  try {
    const data = await callAdminLoginApi(emailOrUsername, password);

    // Extract details from backend response: { code: 200, message: "...", results: [...] }
    const adminRecord =
      Array.isArray(data?.results) && data.results.length > 0
        ? data.results[0]
        : (data?.results || data?.user || {});

    const token =
      adminRecord?.token ||
      adminRecord?.access_token ||
      data?.token ||
      data?.access_token ||
      `kaizen_auth_${Date.now()}`;

    const adminUser = {
      id: adminRecord?.id || adminRecord?.admin_id || 1,
      adminId: adminRecord?.admin_id || adminRecord?.id || 1,
      firstName: adminRecord?.first_name || adminRecord?.firstName || 'Kaizen',
      lastName: adminRecord?.last_name || adminRecord?.lastName || 'Admin',
      fullName:
        adminRecord?.full_name ||
        (adminRecord?.first_name ? `${adminRecord.first_name} ${adminRecord.last_name || ''}`.trim() : 'Kaizen Administrator'),
      email: adminRecord?.email || emailOrUsername,
      role: adminRecord?.role || adminRecord?.admin_role || 'Super Administrator',
      profileImage: adminRecord?.profile_image || adminRecord?.avatar || '',
    };

    // Save session with 2-hour timestamp
    saveAuthSession({
      token,
      user: adminUser,
      adminId: adminUser.id,
    });

    return {
      success: true,
      message: data?.message || 'Login successful',
      user: adminUser,
      token,
      adminId: adminUser.id,
      data,
    };
  } catch (error) {
    console.error('Login error in validateAdminCredential:', error);
    return {
      success: false,
      message: error.message || 'Invalid email or password.',
      error,
    };
  }
}

/**
 * Direct alias for login
 */
export async function loginUser(email, password) {
  return validateAdminCredential(email, password);
}

/**
 * Logs out user and clears local session.
 */
export function logoutUser() {
  clearAuthSession();
}

/**
 * Checks if admin has an active authenticated session within the 2-hour lifetime.
 * @returns {boolean} True if authenticated and session is fresh, false otherwise.
 */
export function isAuthenticated() {
  return checkIsAuthenticated();
}

/**
 * Gets currently logged in user session from localStorage if available.
 */
export function getSavedUserSession() {
  return checkSavedUserSession();
}

/**
 * Gets normalized admin profile data from saved session.
 */
export function getAdminProfile() {
  return checkAdminProfile();
}

/**
 * Gets currently logged in admin ID from localStorage.
 */
export function getSavedAdminId() {
  return checkSavedAdminId();
}

export default {
  validateAdminCredential,
  loginUser,
  logoutUser,
  isAuthenticated,
  isSessionExpired,
  getSessionRemainingTime,
  getSavedUserSession,
  getAdminProfile,
  getSavedAdminId,
  saveAuthSession,
  clearAuthSession,
  SESSION_DURATION_MS
};
