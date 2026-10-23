import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import {
  getSessions,
  getSessionById,
  createSession,
  deleteSession,
  getSpeakers,
} from "../../api/ApiPath";
import { useToast } from "../../context/ToastContext";
import Swal from "sweetalert2";

export interface SessionItem {
  id: number;
  speaker_id: number | null;
  category: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  room: string;
  speaker_name?: string;
}

export interface SpeakerOption {
  id: number;
  first_name: string;
  last_name: string;
  speciality?: string;
  designation?: string;
}

export default function SessionsPage() {
  const { success, error: toastError } = useToast();

  // Sessions and Speakers state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All");

  // Create / Edit Session Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [speakerId, setSpeakerId] = useState<string>("");
  const [category, setCategory] = useState("Cardiology");
  const [eventDate, setEventDate] = useState("2027-01-01");
  const [startTime, setStartTime] = useState("09:00:00");
  const [endTime, setEndTime] = useState("10:00:00");
  const [venue, setVenue] = useState("RK Hospital Conference Hall");
  const [room, setRoom] = useState("Hall A");
  const [description, setDescription] = useState("");

  // Session Details (Get by ID) Modal State
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Quick ID Lookup bar
  const [lookupIdInput, setLookupIdInput] = useState("");
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [showLookupBox, setShowLookupBox] = useState(false);

  // Fetch Speakers list to map speaker_id -> speaker details
  const fetchSpeakersData = useCallback(async () => {
    try {
      const res: any = await getSpeakers();
      if (res && Array.isArray(res.results)) {
        setSpeakers(res.results);
      }
    } catch (err) {
      console.warn("Could not load speakers list for sessions:", err);
    }
  }, []);

  // Fetch all sessions from http://192.168.29.201:8000/api/schedules
  const fetchSessionsData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setApiError(null);

    try {
      const data: any = await getSessions();

      if (Array.isArray(data)) {
        setSessions(data as SessionItem[]);
      } else {
        setSessions([]);
      }
    } catch (err: any) {
      console.warn("Could not fetch sessions from live schedules API:", err);
      const message = err?.message || "Live schedules API not reachable.";
      setApiError(message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionsData();
    fetchSpeakersData();
  }, [fetchSessionsData, fetchSpeakersData]);

  // Helper to find speaker by ID
  const getSpeakerInfo = useCallback(
    (spId: number | null) => {
      if (!spId) return null;
      return speakers.find((s) => s.id === spId) || null;
    },
    [speakers]
  );

  // Helper to get formatted speaker display string
  const getSpeakerDisplayName = useCallback(
    (session: SessionItem) => {
      if (session.speaker_name) return session.speaker_name;
      if (!session.speaker_id) {
        return session.category?.toLowerCase() === "break" ? "Break / Refreshments" : "General Session";
      }
      const sp = getSpeakerInfo(session.speaker_id);
      return sp ? `Dr. ${sp.first_name} ${sp.last_name}` : `Speaker #${session.speaker_id}`;
    },
    [getSpeakerInfo]
  );

  // View session details by ID
  const handleViewSessionById = async (session: SessionItem) => {
    setSelectedSession(session);
    setIsDetailsModalOpen(true);
    setIsLoadingDetails(true);

    try {
      // Query GET /api/schedules?id={id}
      const freshData: any = await getSessionById(session.id);
      if (freshData && freshData.id) {
        setSelectedSession(freshData as SessionItem);
      }
    } catch (err) {
      console.log("Details lookup note:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Direct ID Lookup handler (GET /api/schedules?id={id})
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idToFind = lookupIdInput.trim();
    if (!idToFind) {
      toastError("Please enter a Session / Schedule ID");
      return;
    }

    setIsLookupLoading(true);
    try {
      const result: any = await getSessionById(Number(idToFind));
      if (result) {
        setSelectedSession(result as SessionItem);
        setIsDetailsModalOpen(true);
        success(`Found Session: "${result.title || result.id}"`);
        setLookupIdInput("");
        setShowLookupBox(false);
      } else {
        toastError(`Session with ID "${idToFind}" not found.`);
      }
    } catch (err: any) {
      toastError(err?.message || `Could not find session with ID "${idToFind}"`);
    } finally {
      setIsLookupLoading(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingSession(null);
    setTitle("");
    setSpeakerId("");
    setCategory("Cardiology");
    setEventDate("2027-01-01");
    setStartTime("09:00:00");
    setEndTime("10:00:00");
    setVenue("RK Hospital Conference Hall");
    setRoom("Hall A");
    setDescription("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (session: SessionItem) => {
    setEditingSession(session);
    setTitle(session.title || "");
    setSpeakerId(session.speaker_id ? String(session.speaker_id) : "");
    setCategory(session.category || "Cardiology");
    setEventDate(session.event_date || "2027-01-01");
    setStartTime(session.start_time || "09:00:00");
    setEndTime(session.end_time || "10:00:00");
    setVenue(session.venue || "RK Hospital Conference Hall");
    setRoom(session.room || "Hall A");
    setDescription(session.description || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Create or Update Session Submit Handler (POST /api/schedules)
  const handleSaveSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titleTrimmed = title.trim();
    if (!titleTrimmed) {
      setFormError("Session title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingSession ? editingSession.id : null,
        speaker_id: speakerId ? Number(speakerId) : null,
        category,
        title: titleTrimmed,
        description: description.trim(),
        event_date: eventDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        venue,
        room,
      };

      await createSession(payload);

      success(editingSession ? "Session schedule updated successfully!" : "Session schedule created successfully!");
      setIsModalOpen(false);
      fetchSessionsData(true);
    } catch (err: any) {
      console.error("Failed to save session schedule:", err);
      const msg = err?.message || "Failed to save session schedule.";
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Session Handler with SweetAlert2 confirmation
  const handleDeleteSession = async (session: SessionItem) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to remove session: "${session.title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#AA2D7B",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        popup: "rounded-2xl dark:bg-gray-900 dark:text-white",
        title: "text-gray-900 dark:text-white font-bold text-base",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteSession(session.id);
      await Swal.fire({
        title: "Deleted!",
        text: `Session "${session.title}" has been deleted.`,
        icon: "success",
        confirmButtonColor: "#AA2D7B",
        timer: 1800,
        showConfirmButton: false,
      });
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (selectedSession?.id === session.id) {
        setIsDetailsModalOpen(false);
      }
    } catch (err: any) {
      Swal.fire({
        title: "Error!",
        text: err?.message || "Failed to delete session schedule.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
      });
    }
  };

  // Format time (e.g. 09:00:00 -> 09:00 AM)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    try {
      const [h, m] = timeStr.split(":");
      const hours = parseInt(h, 10);
      if (isNaN(hours)) return timeStr;
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      return `${formattedHours.toString().padStart(2, "0")}:${m} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Unique Categories and Dates for filters
  const uniqueCategories = useMemo(() => {
    const set = new Set(sessions.map((s) => s.category).filter(Boolean));
    return Array.from(set).sort();
  }, [sessions]);

  const uniqueDates = useMemo(() => {
    const set = new Set(sessions.map((s) => s.event_date).filter(Boolean));
    return Array.from(set).sort();
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    const term = search.toLowerCase().trim();
    return sessions.filter((s) => {
      const spName = getSpeakerDisplayName(s).toLowerCase();
      const matchesSearch =
        !term ||
        (s.title && s.title.toLowerCase().includes(term)) ||
        (s.category && s.category.toLowerCase().includes(term)) ||
        (s.room && s.room.toLowerCase().includes(term)) ||
        (s.venue && s.venue.toLowerCase().includes(term)) ||
        String(s.id).includes(term) ||
        spName.includes(term);

      const matchesCategory = categoryFilter === "All" || s.category === categoryFilter;
      const matchesDate = dateFilter === "All" || s.event_date === dateFilter;

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [sessions, search, categoryFilter, dateFilter, getSpeakerDisplayName]);

  // Statistics
  const stats = useMemo(() => {
    const total = sessions.length;
    const keynotes = sessions.filter((s) => s.speaker_id !== null).length;
    const categoriesCount = new Set(sessions.map((s) => s.category).filter(Boolean)).size;
    const daysCount = new Set(sessions.map((s) => s.event_date).filter(Boolean)).size;
    return { total, keynotes, categoriesCount, daysCount };
  }, [sessions]);

  return (
    <>
      <PageMeta
        title="Conference Sessions | Kaizen Con 2027"
        description="Schedule and Track Conference Sessions, Halls, and Keynote Lectures"
      />

      <AdminPageContainer
        title="Sessions"
        subtitle="Manage conference schedules, hall allocations, and keynote speaking slots."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title, speaker, room, venue, or category..."
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#AA2D7B]"
            >
              <option value="All">All Categories ({sessions.length})</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Filter by Date */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#AA2D7B]"
            >
              <option value="All">All Dates</option>
              {uniqueDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Lookup by ID Button */}
            <button
              type="button"
              onClick={() => setShowLookupBox((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showLookupBox
                  ? "bg-[#55355E] text-white border-[#55355E]"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-[#AA2D7B]"
              }`}
              title="Lookup Session by ID"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Get by ID</span>
            </button>

            {/* Refresh Live API */}
            <button
              type="button"
              onClick={() => fetchSessionsData()}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-[#AA2D7B] transition-colors"
              title="Refresh sessions from server"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#AA2D7B]" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Create Session Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#D85A9A] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Schedule Session</span>
            </button>
          </div>
        }
      >
        {/* Error Notification if any */}
        {apiError && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => fetchSessionsData()}
              className="px-2 py-1 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 rounded font-semibold text-[11px] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Lookup by ID Dropdown Panel */}
        {showLookupBox && (
          <div className="mb-4 p-4 rounded-xl border border-[#AA2D7B]/30 bg-gradient-to-r from-pink-50/50 to-purple-50/40 dark:from-gray-800 dark:to-gray-800/80 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#AA2D7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                </svg>
                <span>Get Session by ID (/api/schedules?id=...)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowLookupBox(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleLookupSubmit} className="flex gap-2">
              <input
                type="number"
                value={lookupIdInput}
                onChange={(e) => setLookupIdInput(e.target.value)}
                placeholder="Enter Session / Schedule ID (e.g. 1, 2, 4)..."
                className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#AA2D7B]"
              />
              <button
                type="submit"
                disabled={isLookupLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#55355E] hover:bg-[#6c4377] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLookupLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Fetching...</span>
                  </>
                ) : (
                  <span>Fetch by ID</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-2xs">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Sessions</div>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-2xs">
            <div className="text-[11px] font-medium text-[#AA2D7B] uppercase tracking-wider">Speaker Sessions</div>
            <div className="text-xl font-black text-[#AA2D7B] mt-1">{stats.keynotes}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-2xs">
            <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Tracks / Specialties</div>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.categoriesCount}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-2xs">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Event Days</div>
            <div className="text-xl font-black text-gray-700 dark:text-gray-300 mt-1">{stats.daysCount}</div>
          </div>
        </div>

        {/* Sessions Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-xs">
            <svg className="w-8 h-8 text-[#AA2D7B] animate-spin mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Loading sessions from schedules API...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
            <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-950/60 text-[#AA2D7B] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">No sessions match your search</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or schedule a new session using the button above.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("All");
                setDateFilter("All");
              }}
              className="mt-3 px-3 py-1.5 text-xs text-[#AA2D7B] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold uppercase tracking-wider text-[11px] bg-gray-50/80 dark:bg-gray-800/60">
                  <th className="py-3 px-4">Session Details</th>
                  <th className="py-3 px-4">Speaker</th>
                  <th className="py-3 px-4">Schedule & Venue</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                {filteredSessions.map((session) => {
                  const speaker = getSpeakerInfo(session.speaker_id);
                  const isBreak = session.category?.toLowerCase() === "break" || !session.speaker_id;

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Session Title & Description */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div
                          className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1 hover:text-[#AA2D7B] cursor-pointer"
                          onClick={() => handleViewSessionById(session)}
                        >
                          {session.title}
                        </div>
                        {session.description && (
                          <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {session.description}
                          </div>
                        )}
                        <span className="font-mono text-[10px] text-gray-400 mt-0.5 block">
                          ID: #{session.id}
                        </span>
                      </td>

                      {/* Speaker Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${
                              isBreak
                                ? "bg-amber-500"
                                : "bg-gradient-to-tr from-[#55355E] to-[#AA2D7B]"
                            }`}
                          >
                            {isBreak ? "☕" : (speaker?.first_name || "S").charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {getSpeakerDisplayName(session)}
                            </div>
                            {speaker && (
                              <div className="text-[10px] text-gray-400 truncate max-w-[150px]">
                                {speaker.speciality || speaker.designation}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Time & Venue */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </div>
                        <div className="text-[11px] text-[#AA2D7B] font-medium flex items-center gap-1 mt-0.5">
                          <span>{session.room || "Hall A"}</span>
                          <span>•</span>
                          <span className="text-gray-500">{session.event_date}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isBreak
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-[#faedf5] text-[#55355E] dark:bg-[#55355E]/40 dark:text-[#f5d8e9] border border-[#AA2D7B]/20"
                          }`}
                        >
                          {session.category}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewSessionById(session)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#55355E] dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-pink-200"
                            title="View session details"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(session)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#AA2D7B] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="Edit session"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Delete session"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPageContainer>

      {/* CREATE / EDIT SESSION SCHEDULE MODAL (POST /api/schedules) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-scaleIn my-auto">
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-[#faedf5]/40 dark:bg-gray-800/60 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#AA2D7B]" />
                  <span>{editingSession ? "Edit Session Schedule" : "Schedule New Session"}</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  POST /api/schedules
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSessionSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-3.5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Preventive Cardiology in Modern Practice"
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                />
              </div>

              {/* Speaker & Category Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Presenter / Speaker
                  </label>
                  <select
                    value={speakerId}
                    onChange={(e) => setSpeakerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                  >
                    <option value="">None / Break Session</option>
                    {speakers.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        Dr. {sp.first_name} {sp.last_name} ({sp.speciality || "Speaker"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category / Track *
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Cardiology, Neurology, Break"
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>
              </div>

              {/* Date, Start Time, End Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>
              </div>

              {/* Venue & Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="RK Hospital Conference Hall"
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Hall A, Foyer"
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details, key topics, or discussion points..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#AA2D7B]"
                />
              </div>

              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 px-5 py-3 sm:px-6 sm:py-3.5 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/80 dark:bg-gray-900/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#AA2D7B] hover:bg-[#D85A9A] text-white font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingSession ? "Update Schedule" : "Schedule Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SESSION BY ID MODAL */}
      {isDetailsModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn my-auto">
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-[#55355E] text-white shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-pink-200">
                  Session #{selectedSession.id} Details (GET /api/schedules?id={selectedSession.id})
                </span>
                <h3 className="text-base font-bold text-white mt-0.5 line-clamp-1">
                  {selectedSession.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-7 h-7 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1 min-h-0">
              {isLoadingDetails && (
                <div className="flex items-center gap-2 p-2 bg-pink-50 dark:bg-gray-800 rounded-lg text-xs text-[#AA2D7B]">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Loading fresh schedule details from API...</span>
                </div>
              )}

              {/* 2-Column Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Presenter / Speaker</span>
                  <div className="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5">
                    {getSpeakerDisplayName(selectedSession)}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Category / Specialty</span>
                  <div className="font-bold text-[#AA2D7B] text-sm mt-0.5">
                    {selectedSession.category}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Event Date & Time</span>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 text-xs mt-0.5">
                    {selectedSession.event_date} • {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Venue & Hall</span>
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mt-0.5">
                    {selectedSession.room} — {selectedSession.venue}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedSession.description && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Description</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                    {selectedSession.description}
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-3.5 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/80 dark:bg-gray-900/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEditModal(selectedSession);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#55355E] hover:bg-[#6c4377] text-white font-semibold transition-colors cursor-pointer text-xs"
                >
                  Edit Schedule
                </button>

                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
