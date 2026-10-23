import React, { useState, useEffect, useMemo, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import Swal from "sweetalert2";
import {
  getSpeakers,
  saveSpeaker,
  deleteSpeaker,
  BASE_URL,
} from "../../api/ApiPath";

export interface Speaker {
  id: number;
  speaker_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  designation: string;
  speciality: string | null;
  institution: string | null;
  bio: string | null;
  role: number | null; // 1 = speaker, 2 = chief guest, 3 = moderator
  profile_image_url: string | null;
  session_status: "scheduled" | "in_progress" | "completed" | "cancelled" | string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export const SPEAKER_ROLES: Record<number, string> = {
  1: "Speaker",
  2: "Chief Guest",
  3: "Moderator",
};

export const getRoleLabel = (role?: number | null): string => {
  if (role === 2) return "Chief Guest";
  if (role === 3) return "Moderator";
  return "Speaker";
};

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All"); // All | 1 | 2 | 3
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [specialityFilter, setSpecialityFilter] = useState<string>("All");

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // View Speaker Details Modal
  const [viewingSpeaker, setViewingSpeaker] = useState<Speaker | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [institution, setInstitution] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<number>(1); // 1 = speaker, 2 = chief guest, 3 = moderator
  const [sessionStatus, setSessionStatus] = useState<
    "scheduled" | "in_progress" | "completed" | "cancelled"
  >("scheduled");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Profile Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper for image URL
  const getFullImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const cleanBase = BASE_URL.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

  // Fetch Speakers List from API (GET /api/speakers)
  const fetchSpeakersData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getSpeakers();
      if (data && Array.isArray(data.results)) {
        setSpeakers(data.results);
      } else if (Array.isArray(data)) {
        setSpeakers(data);
      } else {
        setSpeakers([]);
      }
    } catch (err: any) {
      console.error("Error fetching speakers:", err);
      setError(err?.message || "Failed to load speakers from API.");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpeakersData();
  }, []);

  // Unique Specialities for Dropdown
  const availableSpecialities = useMemo(() => {
    const list = Array.from(
      new Set(speakers.map((s) => s.speciality).filter(Boolean))
    ) as string[];
    return list.sort();
  }, [speakers]);

  // Filtered Speakers
  const filteredSpeakers = useMemo(() => {
    return speakers.filter((s) => {
      const fullName = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
      const roleText = getRoleLabel(s.role).toLowerCase();
      const term = search.toLowerCase().trim();

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        roleText.includes(term) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term)) ||
        (s.designation && s.designation.toLowerCase().includes(term)) ||
        (s.speciality && s.speciality.toLowerCase().includes(term)) ||
        (s.institution && s.institution.toLowerCase().includes(term)) ||
        (s.bio && s.bio.toLowerCase().includes(term));

      const matchesRole =
        roleFilter === "All" ||
        String(s.role ?? 1) === roleFilter;

      const matchesStatus =
        statusFilter === "All" ||
        s.session_status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesSpeciality =
        specialityFilter === "All" || s.speciality === specialityFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesSpeciality;
    });
  }, [speakers, search, roleFilter, statusFilter, specialityFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = speakers.length;
    const speakerCount = speakers.filter((s) => (s.role ?? 1) === 1).length;
    const chiefGuestCount = speakers.filter((s) => s.role === 2).length;
    const moderatorCount = speakers.filter((s) => s.role === 3).length;
    const active = speakers.filter((s) => s.is_active).length;

    return { total, speakerCount, chiefGuestCount, moderatorCount, active };
  }, [speakers]);

  // Reset Form
  const resetForm = () => {
    setEditingSpeaker(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setSpeciality("");
    setInstitution("");
    setBio("");
    setRole(1); // Default to Speaker (1)
    setSessionStatus("scheduled");
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Open Add Speaker Modal (creates without ID)
  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open Edit Speaker Modal (fetches fresh data via GET ?id=...)
  const handleOpenEditModal = async (speaker: Speaker) => {
    resetForm();
    setEditingSpeaker(speaker);
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    // Initial fill from row
    setFirstName(speaker.first_name || "");
    setLastName(speaker.last_name || "");
    setEmail(speaker.email || "");
    setPhone(speaker.phone || "");
    setDesignation(speaker.designation || "");
    setSpeciality(speaker.speciality || "");
    setInstitution(speaker.institution || "");
    setBio(speaker.bio || "");
    setRole(speaker.role ? Number(speaker.role) : 1);
    setSessionStatus((speaker.session_status as any) || "scheduled");
    setIsActive(Boolean(speaker.is_active));
    if (speaker.profile_image_url) {
      setImagePreview(getFullImageUrl(speaker.profile_image_url));
    }

    // Fresh lookup from API GET /api/speakers?id={id}
    try {
      const res = await getSpeakers(speaker.id);
      if (res && Array.isArray(res.results) && res.results.length > 0) {
        const fresh: Speaker = res.results[0];
        setEditingSpeaker(fresh);
        setFirstName(fresh.first_name || "");
        setLastName(fresh.last_name || "");
        setEmail(fresh.email || "");
        setPhone(fresh.phone || "");
        setDesignation(fresh.designation || "");
        setSpeciality(fresh.speciality || "");
        setInstitution(fresh.institution || "");
        setBio(fresh.bio || "");
        setRole(fresh.role ? Number(fresh.role) : 1);
        setSessionStatus((fresh.session_status as any) || "scheduled");
        setIsActive(Boolean(fresh.is_active));
        if (fresh.profile_image_url) {
          setImagePreview(getFullImageUrl(fresh.profile_image_url));
        }
      }
    } catch (err) {
      console.warn("Could not fetch fresh speaker details, used local data:", err);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  // Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  // Save Speaker (Create if no id, Update if id exists via POST /api/speakers)
  const handleSaveSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields Missing",
        text: "Please enter First Name, Last Name, and Email.",
        confirmButtonColor: "#AA2D7B",
      });
      return;
    }

    if (!designation.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Designation Required",
        text: "Please enter Designation (e.g. Senior Consultant, Professor, etc.).",
        confirmButtonColor: "#AA2D7B",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // If updating, include the id; if creating, DO NOT include id
      if (editingSpeaker && editingSpeaker.id) {
        formData.append("id", String(editingSpeaker.id));
      }

      formData.append("first_name", firstName.trim());
      formData.append("last_name", lastName.trim());
      formData.append("email", email.trim());
      formData.append("designation", designation.trim());
      formData.append("role", String(role)); // Pass role as integer: 1=Speaker, 2=Chief Guest, 3=Moderator

      if (phone.trim()) formData.append("phone", phone.trim());
      if (speciality.trim()) formData.append("speciality", speciality.trim());
      if (institution.trim()) formData.append("institution", institution.trim());
      if (bio.trim()) formData.append("bio", bio.trim());

      formData.append("session_status", sessionStatus);
      formData.append("is_active", isActive ? "true" : "false");

      if (imageFile) {
        formData.append("profile_image", imageFile);
      }

      const res = await saveSpeaker(formData);

      if (res && (res.code === 200 || res.code === 201 || res.results)) {
        await Swal.fire({
          icon: "success",
          title: editingSpeaker ? "Profile Updated!" : "Profile Registered!",
          text: editingSpeaker
            ? `${getRoleLabel(role)} "${firstName} ${lastName}" has been successfully updated.`
            : `${getRoleLabel(role)} "${firstName} ${lastName}" has been successfully registered.`,
          confirmButtonColor: "#AA2D7B",
          timer: 2000,
          showConfirmButton: false,
        });

        setIsModalOpen(false);
        resetForm();
        await fetchSpeakersData(true);
      } else {
        throw new Error(res?.message || "Failed to save speaker.");
      }
    } catch (err: any) {
      console.error("Save speaker error:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Save",
        text: err?.message || "An error occurred while saving details.",
        confirmButtonColor: "#AA2D7B",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Speaker via DELETE /api/speakers/{speaker_id}
  const handleDeleteSpeaker = async (speaker: Speaker) => {
    const result = await Swal.fire({
      title: "Delete Faculty?",
      text: `Are you sure you want to delete ${getRoleLabel(speaker.role)} "${speaker.first_name} ${speaker.last_name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#AA2D7B",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "rounded-2xl shadow-2xl dark:bg-gray-900 dark:text-white border border-gray-100 dark:border-gray-800",
        title: "font-bold text-gray-900 dark:text-white text-lg",
        htmlContainer: "text-xs text-gray-500 dark:text-gray-400",
        confirmButton: "px-4 py-2 text-xs font-semibold rounded-lg shadow-sm cursor-pointer",
        cancelButton: "px-4 py-2 text-xs font-semibold rounded-lg shadow-sm cursor-pointer",
      },
    });

    if (!result.isConfirmed) return;

    setDeletingId(speaker.id);
    try {
      await deleteSpeaker(speaker.id);
      await Swal.fire({
        title: "Deleted!",
        text: `${getRoleLabel(speaker.role)} "${speaker.first_name} ${speaker.last_name}" has been removed.`,
        icon: "success",
        confirmButtonColor: "#AA2D7B",
        timer: 1800,
        showConfirmButton: false,
      });
      setSpeakers((prev) => prev.filter((s) => s.id !== speaker.id));
    } catch (err: any) {
      console.error("Delete speaker error:", err);
      Swal.fire({
        title: "Delete Failed",
        text: err?.message || "Failed to delete speaker from server.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "ID",
      "Speaker UUID",
      "First Name",
      "Last Name",
      "Role",
      "Email",
      "Phone",
      "Designation",
      "Speciality",
      "Institution",
      "Session Status",
      "Active",
      "Created At",
    ];

    const rows = filteredSpeakers.map((s) => [
      s.id,
      `"${s.speaker_id || ""}"`,
      `"${s.first_name || ""}"`,
      `"${s.last_name || ""}"`,
      `"${getRoleLabel(s.role)}"`,
      `"${s.email || ""}"`,
      `"${s.phone || ""}"`,
      `"${s.designation || ""}"`,
      `"${s.speciality || ""}"`,
      `"${s.institution || ""}"`,
      `"${s.session_status || ""}"`,
      s.is_active ? "Yes" : "No",
      `"${s.created_at || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kaizen_speakers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <PageMeta
        title="Speakers Management | Kaizen Con 2027"
        description="Manage conference keynote speakers, chief guests, moderators, and medical specialists."
      />

      <AdminPageContainer
        title="Speakers & Faculty"
        subtitle="Manage conference speakers, chief guests, session moderators, hall assignments, and profiles."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, role, email, designation, institution, speciality..."
        actionButton={
          <div className="flex items-center flex-wrap gap-2">
            {/* Role Filter (1 = Speaker, 2 = Chief Guest, 3 = Moderator) */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#AA2D7B]"
            >
              <option value="All">All Roles</option>
              <option value="1">Speakers (Role 1)</option>
              <option value="2">Chief Guests (Role 2)</option>
              <option value="3">Moderators (Role 3)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#AA2D7B]"
            >
              <option value="All">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Speciality Filter */}
            <select
              value={specialityFilter}
              onChange={(e) => setSpecialityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#AA2D7B] max-w-[150px] truncate"
            >
              <option value="All">All Specialities</option>
              {availableSpecialities.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export to CSV"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>

            {/* Refresh from API */}
            <button
              onClick={() => fetchSpeakersData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh from server"
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin text-[#AA2D7B]" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            {/* Add Speaker / Faculty Button */}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#D85A9A] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Speaker / Guest
            </button>
          </div>
        }
      >
        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchSpeakersData()}
              className="px-2 py-0.5 bg-red-200 dark:bg-red-900 font-semibold rounded text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Metrics Overview Cards with Role Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Faculty
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {metrics.total}
            </div>
          </div>
          <div className="p-3.5 bg-gradient-to-br from-[#faedf5]/60 to-white dark:from-purple-950/20 dark:to-gray-850 rounded-xl border border-[#AA2D7B]/20 dark:border-purple-900/40 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#AA2D7B] dark:text-pink-400">
              Speakers (Role 1)
            </div>
            <div className="text-2xl font-bold text-[#AA2D7B] dark:text-pink-300 mt-1">
              {metrics.speakerCount}
            </div>
          </div>
          <div className="p-3.5 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-gray-850 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Chief Guests (Role 2)
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-300 mt-1">
              {metrics.chiefGuestCount}
            </div>
          </div>
          <div className="p-3.5 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-gray-850 rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Moderators (Role 3)
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-300 mt-1">
              {metrics.moderatorCount}
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-sm text-gray-500">
            <svg className="w-5 h-5 animate-spin text-[#AA2D7B]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Loading speakers & faculty from backend...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSpeakers.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium text-gray-600 dark:text-gray-300">No speakers or faculty found matching your search.</p>
            <p className="text-xs text-gray-400 mt-1">Try resetting the role or search filters, or register a new speaker.</p>
          </div>
        )}

        {/* Speakers Table with Role column */}
        {!loading && filteredSpeakers.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px] bg-gray-50/70 dark:bg-gray-800/60">
                  <th className="py-3 px-4">Faculty / Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Designation & Institution</th>
                  <th className="py-3 px-4">Speciality</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Session Status</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {filteredSpeakers.map((speaker) => {
                  const imageUrl = getFullImageUrl(speaker.profile_image_url);
                  const initials = `${speaker.first_name?.[0] || ""}${speaker.last_name?.[0] || ""}`.toUpperCase();
                  const roleNum = speaker.role ?? 1;

                  return (
                    <tr
                      key={speaker.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`${speaker.first_name} ${speaker.last_name}`}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-2xs shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#55355E] to-[#AA2D7B] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0">
                              {initials || "SP"}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                              {speaker.first_name} {speaker.last_name}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              ID: #{speaker.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge (1 = Speaker, 2 = Chief Guest, 3 = Moderator) */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            roleNum === 2
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : roleNum === 3
                              ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                              : "bg-[#faedf5] text-[#AA2D7B] border border-[#AA2D7B]/20 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800"
                          }`}
                        >
                          {getRoleLabel(speaker.role)}
                        </span>
                      </td>

                      {/* Designation & Institution */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {speaker.designation || "—"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {speaker.institution || "—"}
                        </div>
                      </td>

                      {/* Speciality */}
                      <td className="py-3.5 px-4">
                        {speaker.speciality ? (
                          <span className="inline-block px-2.5 py-0.5  text-[11px] font-medium">
                            {speaker.speciality}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
                          {speaker.email}
                        </div>
                        {speaker.phone && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {speaker.phone}
                          </div>
                        )}
                      </td>

                      {/* Session Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            speaker.session_status === "scheduled"
                              ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              : speaker.session_status === "in_progress"
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : speaker.session_status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                          }`}
                        >
                          {speaker.session_status || "scheduled"}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            speaker.is_active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              speaker.is_active ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {speaker.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Button */}
                          <button
                            onClick={() => setViewingSpeaker(speaker)}
                            className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                            title="View Details"
                          >
                            View
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(speaker)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#AA2D7B] hover:text-[#55355E] bg-[#faedf5] hover:bg-[#faedf5]/80 rounded-md transition-colors cursor-pointer"
                            title="Edit Speaker via GET ?id="
                          >
                            Edit
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteSpeaker(speaker)}
                            disabled={deletingId === speaker.id}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete Speaker"
                          >
                            {deletingId === speaker.id ? "..." : "Delete"}
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

      {/* =========================================================================
          VIEW SPEAKER DETAILS MODAL
      ========================================================================= */}
      {viewingSpeaker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-[#faedf5]/30 shrink-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Faculty Profile Details
              </h3>
              <button
                onClick={() => setViewingSpeaker(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
              <div className="flex items-center gap-4">
                {getFullImageUrl(viewingSpeaker.profile_image_url) ? (
                  <img
                    src={getFullImageUrl(viewingSpeaker.profile_image_url)!}
                    alt={`${viewingSpeaker.first_name} ${viewingSpeaker.last_name}`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#AA2D7B] shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#55355E] to-[#AA2D7B] text-white flex items-center justify-center font-bold text-lg uppercase shadow-md">
                    {viewingSpeaker.first_name?.[0]}
                    {viewingSpeaker.last_name?.[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {viewingSpeaker.first_name} {viewingSpeaker.last_name}
                    </h4>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        viewingSpeaker.role === 2
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : viewingSpeaker.role === 3
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-[#faedf5] text-[#AA2D7B] border border-[#AA2D7B]/20"
                      }`}
                    >
                      {getRoleLabel(viewingSpeaker.role)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    {viewingSpeaker.designation}
                  </div>
                  <div className="text-xs text-[#AA2D7B] font-semibold mt-0.5">
                    {viewingSpeaker.institution}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-gray-400 text-[10px] font-semibold uppercase">Conference Role</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                    {getRoleLabel(viewingSpeaker.role)} (Role {viewingSpeaker.role ?? 1})
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-gray-400 text-[10px] font-semibold uppercase">Speciality</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                    {viewingSpeaker.speciality || "Not specified"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-gray-400 text-[10px] font-semibold uppercase">Session Status</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 capitalize">
                    {viewingSpeaker.session_status || "Scheduled"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-gray-400 text-[10px] font-semibold uppercase">Email</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 font-mono text-[11px] truncate">
                    {viewingSpeaker.email}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg col-span-2">
                  <div className="text-gray-400 text-[10px] font-semibold uppercase">Phone</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 font-mono text-[11px]">
                    {viewingSpeaker.phone || "—"}
                  </div>
                </div>
              </div>

              {viewingSpeaker.bio && (
                <div className="pt-2">
                  <div className="text-gray-400 text-[10px] font-semibold uppercase mb-1">
                    Biography / Overview
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-gray-700 dark:text-gray-300 leading-relaxed text-xs">
                    {viewingSpeaker.bio}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setViewingSpeaker(null)}
                  className="px-4 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT SPEAKER MODAL
          - Includes Role selection: 1 = Speaker, 2 = Chief Guest, 3 = Moderator
      ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col animate-fadeIn my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-[#faedf5]/30 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {editingSpeaker
                    ? `Edit Faculty: ${firstName} ${lastName}`
                    : "Register New Speaker / Faculty"}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {editingSpeaker
                    ? `Updating ID #${editingSpeaker.id} via POST /api/speakers`
                    : "Creates a new conference speaker record via POST /api/speakers"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            {isFetchingDetail ? (
              <div className="flex items-center justify-center py-16 gap-3 text-xs text-gray-500">
                <svg className="w-5 h-5 animate-spin text-[#AA2D7B]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Fetching details from API...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveSpeaker} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
                <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1">
                {/* Profile Image Preview & Upload */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                  <div className="relative shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#AA2D7B] shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#55355E] to-[#AA2D7B] text-white flex items-center justify-center font-bold text-lg uppercase shadow-sm">
                        {firstName?.[0] || "S"}
                        {lastName?.[0] || "P"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Profile Photo (Optional)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#AA2D7B] file:text-white hover:file:bg-[#D85A9A] cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      PNG, JPG, or WEBP image.
                    </p>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Aarav"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Sharma"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    />
                  </div>
                </div>

                {/* Role & Session Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Conference Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(Number(e.target.value))}
                      className="w-full px-3 py-2 font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    >
                      <option value={1}>1 - Speaker</option>
                      <option value={2}>2 - Chief Guest</option>
                      <option value={3}>3 - Moderator</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Sends integer {role} to backend API.
                    </p>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Session Status
                    </label>
                    <select
                      value={sessionStatus}
                      onChange={(e) => setSessionStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. doctor@hospital.org"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9814047911"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    />
                  </div>
                </div>

                {/* Designation & Speciality */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Senior Consultant Cardiologist"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Medical Speciality
                    </label>
                    <input
                      type="text"
                      value={speciality}
                      onChange={(e) => setSpeciality(e.target.value)}
                      placeholder="e.g. Cardiology"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                    />
                  </div>
                </div>

                {/* Institution */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Institution / Hospital
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. RK Hospital"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Faculty Bio / Profile Details
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Enter short bio, research interests, achievements..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:border-[#AA2D7B]"
                  />
                </div>

                {/* Is Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveSpeaker"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#AA2D7B] border-gray-300 rounded focus:ring-[#AA2D7B] cursor-pointer"
                  />
                  <label
                    htmlFor="isActiveSpeaker"
                    className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Faculty is Active on Portal
                  </label>
                </div>

                </div>

                {/* Actions Footer */}
                <div className="flex justify-end gap-2 px-5 py-3 sm:px-6 sm:py-3.5 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xs">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#AA2D7B] hover:bg-[#D85A9A] text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting && (
                      <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {editingSpeaker ? "Save Changes" : "Register Faculty"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
