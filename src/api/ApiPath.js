// Base API Configuration
export const BASE_URL = 'https://kaizencondemo2027-1.onrender.com';
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
  EMAIL_AGENT_TEMPLATES: `${BASE_URL}/api/v1/email-agent/templates`,
  POLLS_ADMIN: `${BASE_URL}/polling/api/admin/polls`,
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
        if (key === 'role') {
          if (value !== undefined && value !== null && value !== '') {
            body.append('role', String(Number(value)));
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
 * Get Contact By ID API
 * Endpoint: GET {BASE_URL}/api/v1/email-agent/contacts/{contact_id}
 *
 * @param {string} contactId
 * @returns {Promise<any>} Contact object
 */
export const getContactById = async (contactId) => {
  try {
    if (!contactId) throw new Error('Contact ID is required');
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CONTACTS}/${encodeURIComponent(contactId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Failed to fetch contact with status ${response.status}`;
      const error = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getContactById API:', error);
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

/**
 * Pause Campaign API
 * Endpoint: POST {BASE_URL}/api/v1/email-agent/campaigns/{campaign_id}/pause
 *
 * @param {string} campaignId - The UUID of the campaign
 * @returns {Promise<any>} Updated campaign object
 */
export const pauseCampaign = async (campaignId) => {
  try {
    if (!campaignId) throw new Error('Campaign ID is required to pause campaign');
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS}/${encodeURIComponent(campaignId)}/pause`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to pause campaign';
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
    console.error('Error in pauseCampaign API:', error);
    throw error;
  }
};

/**
 * Resume Campaign API
 * Endpoint: POST {BASE_URL}/api/v1/email-agent/campaigns/{campaign_id}/resume
 *
 * @param {string} campaignId - The UUID of the campaign
 * @returns {Promise<any>} Updated campaign object
 */
export const resumeCampaign = async (campaignId) => {
  try {
    if (!campaignId) throw new Error('Campaign ID is required to resume campaign');
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS}/${encodeURIComponent(campaignId)}/resume`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to resume campaign';
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
    console.error('Error in resumeCampaign API:', error);
    throw error;
  }
};

/**
 * Get Campaign Logs API
 * Endpoint: GET {BASE_URL}/api/v1/email-agent/campaigns/{campaign_id}/logs
 *
 * @param {string} campaignId - The UUID of the campaign
 * @returns {Promise<any[]>} Array of log objects
 */
export const getCampaignLogs = async (campaignId) => {
  try {
    if (!campaignId) throw new Error('Campaign ID is required to fetch logs');
    const url = `${API_ENDPOINTS.EMAIL_AGENT_CAMPAIGNS}/${encodeURIComponent(campaignId)}/logs`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to fetch campaign logs';
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

    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.logs)) {
      return data.logs;
    }

    if (data && Array.isArray(data.results)) {
      return data.results;
    }

    return [];
  } catch (error) {
    console.error('Error in getCampaignLogs API:', error);
    throw error;
  }
};

/**
 * Get Email Agent Templates API
 * Endpoint: GET http://192.168.29.201:8000/api/v1/email-agent/templates
 *
 * @returns {Promise<any[]>} Array of templates
 */
export const getTemplates = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.EMAIL_AGENT_TEMPLATES, {
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
    console.error('Error in getTemplates API:', error);
    throw error;
  }
};

/**
 * Create Email Agent Template API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/templates
 * Expects multipart/form-data: name, purpose (initial|followup|registration), subject, html_file, active (boolean)
 *
 * @param {FormData|Object} templateData
 * @returns {Promise<any>}
 */
export const createTemplate = async (templateData) => {
  try {
    let body;
    if (templateData instanceof FormData) {
      body = templateData;
    } else {
      body = new FormData();
      body.append('name', templateData.name);
      body.append('purpose', templateData.purpose);
      body.append('subject', templateData.subject);
      body.append('active', templateData.active !== undefined ? String(templateData.active) : 'true');

      if (templateData.html_file instanceof File || templateData.html_file instanceof Blob) {
        body.append('html_file', templateData.html_file, 'template.html');
      } else if (typeof templateData.html_body === 'string') {
        const blob = new Blob([templateData.html_body], { type: 'text/html' });
        body.append('html_file', blob, 'template.html');
      }
    }

    const response = await fetch(API_ENDPOINTS.EMAIL_AGENT_TEMPLATES, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to create template';
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
    console.error('Error in createTemplate API:', error);
    throw error;
  }
};

/**
 * Update Email Agent Template API
 * Endpoint: PATCH http://192.168.29.201:8000/api/v1/email-agent/templates/{template_id}
 *
 * @param {string} templateId
 * @param {FormData|Object} updateData
 * @returns {Promise<any>}
 */
export const updateTemplate = async (templateId, updateData) => {
  try {
    let body;
    if (updateData instanceof FormData) {
      body = updateData;
    } else {
      body = new FormData();
      if (updateData.name !== undefined && updateData.name !== null) {
        body.append('name', updateData.name);
      }
      if (updateData.subject !== undefined && updateData.subject !== null) {
        body.append('subject', updateData.subject);
      }
      if (updateData.active !== undefined && updateData.active !== null) {
        body.append('active', String(updateData.active));
      }
      if (updateData.html_file instanceof File || updateData.html_file instanceof Blob) {
        body.append('html_file', updateData.html_file, 'template.html');
      } else if (typeof updateData.html_body === 'string' && updateData.html_body.trim()) {
        const blob = new Blob([updateData.html_body], { type: 'text/html' });
        body.append('html_file', blob, 'template.html');
      }
    }

    const url = `${API_ENDPOINTS.EMAIL_AGENT_TEMPLATES}/${encodeURIComponent(templateId)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
      },
      body,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to update template';
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
    console.error('Error in updateTemplate API:', error);
    throw error;
  }
};

/**
 * Delete Email Agent Template API
 * Endpoint: DELETE http://192.168.29.201:8000/api/v1/email-agent/templates/{template_id}
 *
 * @param {string} templateId - UUID of the template to delete
 * @returns {Promise<any>}
 */
export const deleteTemplate = async (templateId) => {
  try {
    if (!templateId) {
      throw new Error('Template ID is required for deletion');
    }

    const url = `${API_ENDPOINTS.EMAIL_AGENT_TEMPLATES}/${encodeURIComponent(templateId)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = 'Failed to delete template';
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      const error = new Error(errorMessage || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in deleteTemplate API:', error);
    throw error;
  }
};


/**
 * Preview Email Agent Template API
 * Endpoint: POST http://192.168.29.201:8000/api/v1/email-agent/templates/{template_id}/preview?name={name}
 *
 * @param {string} templateId
 * @param {string} [name='Dr. Example']
 * @returns {Promise<any>}
 */
export const previewTemplate = async (templateId, name = 'Dr. Example') => {
  try {
    const url = `${API_ENDPOINTS.EMAIL_AGENT_TEMPLATES}/${encodeURIComponent(templateId)}/preview?name=${encodeURIComponent(name)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Failed to preview template (${response.status})`;
      const error = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in previewTemplate API:', error);
    throw error;
  }
};

/**
 * Create Live Poll API
 * Endpoint: POST http://192.168.29.201:8000/polling/api/admin/polls
 * Header: x-admin-api-key
 * Request: { question: string, options: string[] }
 * Response (201): { id, question, options: [{ id, text, votes }], is_active, poll_url, qr_code_url }
 */
export const createPoll = async (pollData) => {
  try {
    const adminApiKey =
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_POLL_KEY || import.meta.env.POLL_KEY)) ||
      '5IZNL1TLAMwzGOeHZudBXjsFkkWU5yuY3_VzJxeBXu1rv6EWWFLelJeujiIxKvEY';

    const headers = {
      'Content-Type': 'application/json',
      'accept': '*/*',
    };

    if (adminApiKey) {
      headers['x-admin-api-key'] = adminApiKey;
    }

    const payload = {
      question: pollData.question,
      options: pollData.options,
    };

    const response = await fetch(`${BASE_URL}/polling/api/admin/polls`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Failed to create poll: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((d) => d.msg || d.loc?.join('.') || JSON.stringify(d)).join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in createPoll API:', error);
    throw error;
  }
};

/**
 * Get Admin Polls API
 * Endpoint: GET http://192.168.29.201:8000/polling/api/admin/polls
 * Header: x-admin-api-key
 * Returns: Array of { id, question, options: [{ id, text, votes }], is_active, poll_url, qr_code_url }
 */
export const getAdminPolls = async () => {
  try {
    const adminApiKey =
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_POLL_KEY || import.meta.env.POLL_KEY)) ||
      '5IZNL1TLAMwzGOeHZudBXjsFkkWU5yuY3_VzJxeBXu1rv6EWWFLelJeujiIxKvEY';

    const headers = {
      'accept': 'application/json',
    };
    if (adminApiKey) {
      headers['x-admin-api-key'] = adminApiKey;
    }

    const response = await fetch(`${BASE_URL}/polling/api/admin/polls`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch polls: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((d) => d.msg || d.loc?.join('.') || JSON.stringify(d)).join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error in getAdminPolls API:', error);
    throw error;
  }
};

/**
 * Vote in Poll API
 * Endpoint: POST http://192.168.29.201:8000/polling/api/polls/{poll_id}/vote
 * Body: { option_id: number }
 */
export const votePoll = async (pollId, optionId) => {
  try {
    const response = await fetch(`${BASE_URL}/polling/api/polls/${pollId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        option_id: Number(optionId),
      }),
    });

    if (!response.ok) {
      let errorMessage = `Failed to submit vote: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in votePoll API:', error);
    throw error;
  }
};

/**
 * Get Poll and its current results (Live Poll API)
 * Endpoint: GET http://192.168.29.201:8000/polling/api/polls/{poll_id}
 *
 * Parameters:
 *   poll_id: number | string (integer required)
 *
 * Expected Response Structure (200):
 * {
 *   "id": 1,
 *   "question": "string",
 *   "options": [
 *     { "id": 1, "text": "string", "votes": 0 }
 *   ],
 *   "is_active": true
 * }
 *
 * @param {number|string} pollId - The ID of the poll to fetch
 * @returns {Promise<any>}
 */
export const getPollById = async (pollId) => {
  try {
    const id = Number(pollId);
    if (isNaN(id)) {
      throw new Error(`Invalid poll ID: ${pollId}`);
    }

    const response = await fetch(`${BASE_URL}/polling/api/polls/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Failed to get live poll: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getPollById API:', error);
    throw error;
  }
};

// Alias for convenience
export const getLivePoll = getPollById;

/**
 * Unified Polling API:
 * - When fetching the list: call without ID: getPolls() -> calls GET /polling/api/admin/polls
 * - When showing results of a current poll: call with ID: getPolls(pollId) -> calls GET /polling/api/polls/{poll_id}
 *
 * @param {number|string} [pollId] - Optional ID. Omit to fetch listing, pass ID to get current poll results.
 * @returns {Promise<any>}
 */
export const getPolls = async (pollId = null) => {
  if (pollId !== null && pollId !== undefined && String(pollId).trim() !== '') {
    // Show results for current poll (Passing ID)
    return await getPollById(pollId);
  } else {
    // List all polls for dashboard (Do NOT pass ID)
    return await getAdminPolls();
  }
};

export const getPollsApi = getPolls;

/**
 * Get Poll QR Code Image URL
 * Endpoint: GET http://192.168.29.201:8000/polling/api/polls/{poll_id}/qr
 * Returns a PNG QR code image.
 *
 * @param {number|string} pollId - Poll ID
 * @returns {string} Direct URL to the PNG image
 */
export const getPollQrCodeUrl = (pollId) => {
  const id = Number(pollId);
  return `${BASE_URL}/polling/api/polls/${id}/qr`;
};

/**
 * Download Poll QR Code as a PNG file directly in the browser
 * Endpoint: GET http://192.168.29.201:8000/polling/api/polls/{poll_id}/qr
 *
 * @param {number|string} pollId - Poll ID
 * @param {string} [filename] - Optional filename
 */
export const downloadPollQrCode = async (pollId, filename = null) => {
  try {
    const id = Number(pollId);
    const url = getPollQrCodeUrl(id);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch QR code image: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || `kaizen-con-poll-${id}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (error) {
    console.error('Error downloading QR code:', error);
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
  pauseCampaign,
  resumeCampaign,
  getCampaignLogs,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  createPoll,
  getAdminPolls,
  votePoll,
  getPollById,
  getLivePoll,
  getPolls,
  getPollsApi,
  getPollQrCodeUrl,
  downloadPollQrCode,
};