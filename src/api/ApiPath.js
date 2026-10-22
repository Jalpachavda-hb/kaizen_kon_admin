// Base API Configuration
export const BASE_URL = 'http://192.168.29.201:8000';
export const API_BASE_URL = `${BASE_URL}/api`;

// Compatibility aliases
export const Baase_url = `${API_BASE_URL}/`;
export const Base_url = `${API_BASE_URL}/`;

// API Endpoints
export const API_ENDPOINTS = {
  ADMIN_LOGIN: `${API_BASE_URL}/admin_login`,
  SPEAKERS: `${API_BASE_URL}/speakers`,
  SCHEDULES: `${API_BASE_URL}/schedules`,
  DELEGATES: `${API_BASE_URL}/delegates`,
  SESSIONS: `${API_BASE_URL}/sessions`,
  EMAIL_AGENT_CONTACTS: `${BASE_URL}/api/v1/email-agent/contacts`,
  EMAIL_AGENT_CAMPAIGNS: `${BASE_URL}/api/v1/email-agent/campaigns`,
};

/**
 * Admin Login API
 * Endpoint: POST http://192.168.29.201:8000/api/admin_login
 *
 * Expected Request Body:
 * {
 *   "email": "admin@example.com",
 *   "password": "your_password"
 * }
 *
 * Expected Response Structure:
 * {
 *   code: 200,
 *   message: "Login successful",
 *   results: [ ...adminDetails ]
 * }
 *
 * @param {Object|string} credentials - Credentials object { email, password } or email string
 * @param {string} [optionalPassword] - Password if called as adminLogin(email, password)
 * @returns {Promise<any>} API response object { code, message, results }
 */
export const adminLogin = async (credentials, optionalPassword) => {
  try {
    const payload =
      typeof credentials === 'object' && credentials !== null
        ? {
            email: credentials.email || credentials.username || '',
            password: credentials.password || '',
          }
        : {
            email: credentials || '',
            password: optionalPassword || '',
          };

    const response = await fetch(API_ENDPOINTS.ADMIN_LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Extract descriptive error message from FastAPI validation or custom responses
      let errorMessage = 'Login failed';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          errorMessage = data.detail[0].msg;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in adminLogin API:', error);
    throw error;
  }
};

/**
 * Delegates API
 * Endpoint: GET http://192.168.29.201:8000/api/delegates
 *
 * @returns {Promise<any>} API response object { code, message, results }
 */
export const getDelegates = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.DELEGATES, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getDelegates API:', error);
    throw error;
  }
};

/**
 * Speakers API
 * Endpoint: GET http://192.168.29.201:8000/api/speakers
 * Optional query parameter: ?id=123
 *
 * @param {number|string} [id] - Optional speaker ID to fetch single speaker
 * @returns {Promise<any>} API response object { code, message, results, isUser }
 */
export const getSpeakers = async (id) => {
  try {
    const url = id !== undefined && id !== null ? `${API_ENDPOINTS.SPEAKERS}?id=${encodeURIComponent(id)}` : API_ENDPOINTS.SPEAKERS;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getSpeakers API:', error);
    throw error;
  }
};

/**
 * Save Speaker (Create or Update) API
 * Endpoint: POST http://192.168.29.201:8000/api/speakers
 *
 * Accepts FormData (for multipart file uploads like profile_image) or standard object.
 * If 'id' is present, updates the existing speaker. If not, creates a new one.
 *
 * @param {FormData|object} speakerData
 * @returns {Promise<any>} API response object { code, message, results, isUser }
 */
export const saveSpeaker = async (speakerData) => {
  try {
    let body;
    if (speakerData instanceof FormData) {
      body = speakerData;
      // If id is empty, null, 'undefined', or '0', remove it so backend creates a new record
      if (body.has('id')) {
        const idVal = body.get('id');
        if (!idVal || idVal === 'null' || idVal === 'undefined' || idVal === '' || idVal === '0') {
          body.delete('id');
        }
      }
    } else {
      body = new FormData();
      Object.entries(speakerData).forEach(([key, value]) => {
        // Only append id if it's a valid ID
        if (key === 'id') {
          if (value !== undefined && value !== null && value !== '' && Number(value) > 0) {
            body.append('id', String(value));
          }
          return;
        }
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'boolean') {
            body.append(key, value ? 'true' : 'false');
          } else {
            body.append(key, value);
          }
        }
      });
    }

    const response = await fetch(API_ENDPOINTS.SPEAKERS, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to save speaker';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveSpeaker API:', error);
    throw error;
  }
};

/**
 * Delete Speaker API
 * Endpoint: DELETE http://192.168.29.201:8000/api/speakers/{speaker_id}
 *
 * @param {number|string} speakerId - The ID of the speaker to delete
 * @returns {Promise<any>} API response object
 */
export const deleteSpeaker = async (speakerId) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.SPEAKERS}/${encodeURIComponent(speakerId)}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in deleteSpeaker API:', error);
    throw error;
  }
};

/**
 * Sessions / Schedules API - Get All Sessions
 * Endpoint: GET http://192.168.29.201:8000/api/schedules
 * Optional query parameter: ?id=1
 *
 * Expected Response Structure:
 * {
 *   code: 200,
 *   message: "Request successful",
 *   results: [
 *     {
 *       id: 1,
 *       speaker_id: 2,
 *       category: "Cardiology",
 *       title: "Preventive Cardiology in Modern Practice",
 *       description: "...",
 *       event_date: "2027-01-01",
 *       start_time: "09:00:00",
 *       end_time: "10:00:00",
 *       venue: "RK Hospital Conference Hall",
 *       room: "Hall A"
 *     }
 *   ],
 *   isUser: true
 * }
 *
 * @param {string|number} [id] - Optional schedule ID to filter/retrieve single session
 * @returns {Promise<any>} Array of session schedules or single session
 */
export const getSessions = async (id) => {
  try {
    const url = id !== undefined && id !== null && id !== ''
      ? `${API_ENDPOINTS.SCHEDULES}?id=${encodeURIComponent(id)}`
      : API_ENDPOINTS.SCHEDULES;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
      const error = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (data && Array.isArray(data.results)) {
      if (id !== undefined && id !== null && id !== '') {
        return data.results.length > 0 ? data.results[0] : null;
      }
      return data.results;
    }

    if (Array.isArray(data)) {
      return data;
    }

    return data;
  } catch (error) {
    console.error('Error in getSessions API (schedules):', error);
    throw error;
  }
};

/**
 * Get Session / Schedule By ID API
 * Looks up schedule session details by ID
 * Endpoint: GET http://192.168.29.201:8000/api/schedules?id={id}
 *
 * @param {string|number} id - The schedule ID
 * @returns {Promise<any>} Session details object
 */
export const getSessionById = async (id) => {
  try {
    if (!id && id !== 0) {
      throw new Error('Session ID is required to fetch session details');
    }

    const response = await fetch(`${API_ENDPOINTS.SCHEDULES}?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }

    if (data && Array.isArray(data.results) && data.results.length > 0) {
      return data.results[0];
    }

    throw new Error(`Session with ID "${id}" was not found.`);
  } catch (error) {
    console.error('Error in getSessionById API:', error);
    throw error;
  }
};

/**
 * Create or Update Session Schedule API
 * Endpoint: POST http://192.168.29.201:8000/api/schedules
 *
 * @param {Object} sessionData
 * @returns {Promise<any>} Created or updated session schedule object
 */
export const createSession = async (sessionData) => {
  try {
    const payload = {
      id: sessionData.id ? Number(sessionData.id) : null,
      speaker_id: sessionData.speaker_id !== undefined && sessionData.speaker_id !== null && sessionData.speaker_id !== ''
        ? Number(sessionData.speaker_id)
        : null,
      category: sessionData.category || sessionData.track || '',
      title: sessionData.title || '',
      description: sessionData.description || '',
      event_date: sessionData.event_date || sessionData.date || '2027-01-01',
      start_time: sessionData.start_time || sessionData.startTime || '09:00:00',
      end_time: sessionData.end_time || sessionData.endTime || '10:00:00',
      venue: sessionData.venue || 'RK Hospital Conference Hall',
      room: sessionData.room || 'Hall A',
    };

    const response = await fetch(API_ENDPOINTS.SCHEDULES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to save session';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          errorMessage = `${data.detail[0].loc ? data.detail[0].loc.join('.') + ': ' : ''}${data.detail[0].msg}`;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createSession API:', error);
    throw error;
  }
};

/**
 * Delete Session Schedule API
 * Endpoint: DELETE http://192.168.29.201:8000/api/schedules/{schedule_id}
 *
 * @param {number|string} scheduleId
 * @returns {Promise<any>}
 */
export const deleteSession = async (scheduleId) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.SCHEDULES}/${encodeURIComponent(scheduleId)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || `Failed to delete schedule with status ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('Error in deleteSession API:', error);
    throw error;
  }
};

// Aliases for compatibility
export const getSchedules = getSessions;
export const getScheduleById = getSessionById;
export const saveSchedule = createSession;
export const deleteSchedule = deleteSession;

/**
 * Get Email Agent Contacts API
 * Endpoint: GET http://192.168.29.201:8000/api/v1/email-agent/contacts?offset=0&limit=100
 *
 * @param {number} [offset=0]
 * @param {number} [limit=100]
 * @returns {Promise<any[]>}
 */
export const getEmailAgentContacts = async (offset = 0, limit = 100) => {
  try {
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CONTACTS}?offset=${encodeURIComponent(offset)}&limit=${encodeURIComponent(limit)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
      const error = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.value)) {
      return data.value;
    }

    if (data && Array.isArray(data.results)) {
      return data.results;
    }

    return [];
  } catch (error) {
    console.error('Error in getEmailAgentContacts API:', error);
    throw error;
  }
};

/**
 * Stop Contact API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/contacts/{contact_id}/stop
 *
 * @param {string} contactId
 * @returns {Promise<any>}
 */
export const stopContact = async (contactId) => {
  try {
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CONTACTS}/${encodeURIComponent(contactId)}/stop`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Failed to stop contact with status ${response.status}`;
      const error = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in stopContact API:', error);
    throw error;
  }
};

/**
 * Import Excel Contacts API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/contacts/import-excel
 *
 * @param {File|Blob} file - Excel (.xlsx or .xls) file
 * @returns {Promise<any>} Response with { imported, invalid, duplicate_count, preview_only }
 */
export const importExcelContacts = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_ENDPOINTS.EMAIL_AGENT_CONTACTS}/import-excel`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to import Excel contacts';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          errorMessage = data.detail[0].msg;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in importExcelContacts API:', error);
    throw error;
  }
};

/**
 * Get Email Agent Campaigns API
 * Endpoint: GET http://192.168.29.201:8000/api/v1/email-agent/campaigns?offset=0&limit=100
 * Optional query parameter: ?campaign_id={uuid}
 *
 * @param {number} [offset=0]
 * @param {number} [limit=100]
 * @param {string|null} [campaignId=null]
 * @returns {Promise<any[]>} Array of campaigns
 */
export const getCampaigns = async (offset = 0, limit = 100, campaignId = null) => {
  try {
    let url = `${API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS}?offset=${encodeURIComponent(offset)}&limit=${encodeURIComponent(limit)}`;
    if (campaignId) {
      url += `&campaign_id=${encodeURIComponent(campaignId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
      const error = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.value)) {
      return data.value;
    }

    if (data && Array.isArray(data.results)) {
      return data.results;
    }

    return [];
  } catch (error) {
    console.error('Error in getCampaigns API:', error);
    throw error;
  }
};

/**
 * Create Email Agent Campaign API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/campaigns
 *
 * Request Body:
 * {
 *   "name": "string",
 *   "contact_ids": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
 *   "registration_url": "https://example.com/",
 *   "followup_delay_minutes": 1,
 *   "sending_delay_seconds": 3600,
 *   "max_followups": 10,
 *   "max_sends_per_day": 1
 * }
 *
 * @param {Object} campaignData
 * @returns {Promise<any>} Created campaign response object
 */
export const createCampaign = async (campaignData) => {
  try {
    const payload = {
      name: campaignData.name || '',
      contact_ids: Array.isArray(campaignData.contact_ids) ? campaignData.contact_ids : [],
      registration_url: campaignData.registration_url || '',
      followup_delay_minutes: Number(campaignData.followup_delay_minutes ?? 1),
      sending_delay_seconds: Number(campaignData.sending_delay_seconds ?? 3600),
      max_followups: Number(campaignData.max_followups ?? 10),
      max_sends_per_day: Number(campaignData.max_sends_per_day ?? 1),
    };

    const response = await fetch(API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to create campaign';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createCampaign API:', error);
    throw error;
  }
};

/**
 * Approve Campaign API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/campaigns/{campaign_id}/approve
 *
 * @param {string} campaignId - The UUID of the campaign
 * @returns {Promise<any>} Updated campaign object
 */
export const approveCampaign = async (campaignId) => {
  try {
    if (!campaignId) throw new Error('Campaign ID is required to approve campaign');
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS}/${encodeURIComponent(campaignId)}/approve`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to approve campaign';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in approveCampaign API:', error);
    throw error;
  }
};

/**
 * Start Campaign API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/campaigns/{campaign_id}/start
 *
 * @param {string} campaignId - The UUID of the campaign
 * @returns {Promise<any>} Updated campaign object
 */
export const startCampaign = async (campaignId) => {
  try {
    if (!campaignId) throw new Error('Campaign ID is required to start campaign');
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS}/${encodeURIComponent(campaignId)}/start`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to start campaign';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in startCampaign API:', error);
    throw error;
  }
};

/**
 * Stop Campaign API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/campaigns/{campaign_id}/stop
 *
 * @param {string} campaignId - The UUID of the campaign
 * @returns {Promise<any>} Updated campaign object
 */
export const stopCampaign = async (campaignId) => {
  try {
    if (!campaignId) throw new Error('Campaign ID is required to stop campaign');
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS}/${encodeURIComponent(campaignId)}/stop`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to stop campaign';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in stopCampaign API:', error);
    throw error;
  }
};

export default {
  BASE_URL,
  API_BASE_URL,
  Baase_url,
  Base_url,
  API_ENDPOINTS,
  adminLogin,
  getDelegates,
  getSpeakers,
  saveSpeaker,
  deleteSpeaker,
  getSessions,
  getSessionById,
  createSession,
  deleteSession,
  getSchedules,
  getScheduleById,
  saveSchedule,
  deleteSchedule,
  getEmailAgentContacts,
  stopContact,
  importExcelContacts,
  getCampaigns,
  createCampaign,
  approveCampaign,
  startCampaign,
  stopCampaign,
};