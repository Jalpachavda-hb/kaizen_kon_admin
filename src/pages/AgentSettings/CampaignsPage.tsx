import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import { useToast } from "../../context/ToastContext";
import {
  getCampaigns,
  createCampaign,
  getEmailAgentContacts,
  approveCampaign,
  startCampaign,
  stopCampaign,
} from "../../api/ApiPath";
import Swal from "sweetalert2";

export interface CampaignConfiguration {
  registration_url?: string;
  followup_delay_minutes?: number;
  sending_delay_seconds?: number;
  max_followups?: number;
  max_sends_per_day?: number;
  template_ids?: Record<string, any>;
  contact_ids?: string[];
  [key: string]: any;
}

export interface CampaignItem {
  id: string;
  name: string;
  status: string;
  configuration?: CampaignConfiguration;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  started_at?: string | null;
  paused_at?: string | null;
  completed_at?: string | null;
}

export interface ContactOption {
  id: string;
  email: string;
  name: string | null;
  status: string;
  unsubscribed: boolean;
}

export default function CampaignsPage() {
  const { info } = useToast();

  // Campaign State
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Create Campaign Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [contactSearch, setContactSearch] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    registration_url: "https://example.com/",
    followup_delay_minutes: 1,
    sending_delay_seconds: 3600,
    max_followups: 10,
    max_sends_per_day: 1,
    contact_ids: [] as string[],
  });

  // View Details Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch campaigns from API
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getCampaigns(0, 100);
      if (Array.isArray(data)) {
        setCampaigns(data);
      } else {
        setCampaigns([]);
      }
    } catch (err: any) {
      console.error("Failed to load campaigns:", err);
      setFetchError(err?.message || "Failed to fetch campaigns from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Load available contacts when opening Create Modal
  const loadContactsForModal = async () => {
    setLoadingContacts(true);
    try {
      const data = await getEmailAgentContacts(0, 100);
      if (Array.isArray(data)) {
        setAvailableContacts(data);
        // Pre-select eligible contacts by default if none selected yet
        const eligibleIds = data
          .filter((c: ContactOption) => c.status === "eligible" && !c.unsubscribed)
          .map((c: ContactOption) => c.id);
        if (eligibleIds.length > 0) {
          setFormData((prev) => ({
            ...prev,
            contact_ids: eligibleIds,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load contacts for campaign:", err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      registration_url: "https://example.com/",
      followup_delay_minutes: 1,
      sending_delay_seconds: 3600,
      max_followups: 10,
      max_sends_per_day: 1,
      contact_ids: [],
    });
    setContactSearch("");
    setIsModalOpen(true);
    loadContactsForModal();
  };

  const handleToggleContact = (id: string) => {
    setFormData((prev) => {
      const exists = prev.contact_ids.includes(id);
      return {
        ...prev,
        contact_ids: exists
          ? prev.contact_ids.filter((cid) => cid !== id)
          : [...prev.contact_ids, id],
      };
    });
  };

  const handleSelectAllContacts = () => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: availableContacts.map((c) => c.id),
    }));
  };

  const handleSelectEligibleOnly = () => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: availableContacts
        .filter((c) => c.status === "eligible" && !c.unsubscribed)
        .map((c) => c.id),
    }));
  };

  const handleClearSelectedContacts = () => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: [],
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire({
        title: "Validation Error",
        text: "Please enter a campaign name.",
        icon: "warning",
        confirmButtonColor: "#AA2D7B",
      });
      return;
    }

    if (formData.contact_ids.length === 0) {
      const isDark = document.documentElement.classList.contains("dark");
      const confirmNoContacts = await Swal.fire({
        title: "No Contacts Selected",
        text: "You haven't selected any recipient contacts for this campaign. Do you still want to proceed?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#AA2D7B",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Yes, create without contacts",
        cancelButtonText: "Back to select contacts",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
      if (!confirmNoContacts.isConfirmed) return;
    }

    setIsSubmitting(true);
    const isDark = document.documentElement.classList.contains("dark");

    try {
      const response = await createCampaign({
        name: formData.name.trim(),
        contact_ids: formData.contact_ids,
        registration_url: formData.registration_url.trim(),
        followup_delay_minutes: Number(formData.followup_delay_minutes),
        sending_delay_seconds: Number(formData.sending_delay_seconds),
        max_followups: Number(formData.max_followups),
        max_sends_per_day: Number(formData.max_sends_per_day),
      });

      setIsSubmitting(false);
      setIsModalOpen(false);

      await Swal.fire({
        title: "Campaign Created!",
        html: `
          <div style="text-align: left; font-size: 13.5px; line-height: 1.6; padding: 4px 8px;">
            <p style="color: #10b981; font-weight: 600; margin-bottom: 8px;">
              ✓ Campaign "${response?.name || formData.name}" has been created successfully.
            </p>
            <p style="color: #6b7280; margin-bottom: 4px;"><b>Campaign ID:</b> <code style="background: rgba(170,45,123,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${response?.id || "N/A"}</code></p>
            <p style="color: #6b7280; margin-bottom: 4px;"><b>Status:</b> <span style="font-weight: 600; text-transform: uppercase;">${response?.status || "pending"}</span></p>
            <p style="color: #6b7280; margin-bottom: 4px;"><b>Target Contacts:</b> ${formData.contact_ids.length} recipients</p>
          </div>
        `,
        icon: "success",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });

      // Refresh dynamic campaigns list
      await fetchCampaigns();
    } catch (err: any) {
      setIsSubmitting(false);
      await Swal.fire({
        title: "Failed to Create Campaign",
        text: err?.message || "An unexpected error occurred while communicating with the Email Agent API.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    }
  };

  // API Call: Approve Campaign
  const handleApprove = async (c: CampaignItem) => {
    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title: "Approve Campaign?",
      text: `Are you sure you want to approve "${c.name}"? This authorizes the email sequence for dispatch.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel",
      background: isDark ? "#111827" : "#FFFFFF",
      color: isDark ? "#F9FAFB" : "#111827",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(c.id);
    try {
      const res = await approveCampaign(c.id);
      setActionLoadingId(null);
      await Swal.fire({
        title: "Campaign Approved!",
        text: `Campaign "${res?.name || c.name}" has been approved.`,
        icon: "success",
        confirmButtonColor: "#10B981",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
      await fetchCampaigns();
      if (selectedCampaign && selectedCampaign.id === c.id) {
        setSelectedCampaign(res || { ...selectedCampaign, status: "approved" });
      }
    } catch (err: any) {
      setActionLoadingId(null);
      await Swal.fire({
        title: "Approval Failed",
        text: err?.message || "Failed to approve campaign.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    }
  };

  // API Call: Start Campaign
  const handleStart = async (c: CampaignItem) => {
    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title: "Start Campaign?",
      text: `Launch and start sending emails for "${c.name}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Start Now",
      cancelButtonText: "Cancel",
      background: isDark ? "#111827" : "#FFFFFF",
      color: isDark ? "#F9FAFB" : "#111827",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(c.id);
    try {
      const res = await startCampaign(c.id);
      setActionLoadingId(null);
      await Swal.fire({
        title: "Campaign Started!",
        text: `"${res?.name || c.name}" is now running and actively dispatching.`,
        icon: "success",
        confirmButtonColor: "#10B981",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
      await fetchCampaigns();
      if (selectedCampaign && selectedCampaign.id === c.id) {
        setSelectedCampaign(res || { ...selectedCampaign, status: "running" });
      }
    } catch (err: any) {
      setActionLoadingId(null);
      await Swal.fire({
        title: "Start Failed",
        text: err?.message || "Failed to start campaign.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    }
  };

  // API Call: Stop Campaign
  const handleStop = async (c: CampaignItem) => {
    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title: "Stop Campaign?",
      text: `Are you sure you want to stop/halt email dispatch for "${c.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Stop Campaign",
      cancelButtonText: "Cancel",
      background: isDark ? "#111827" : "#FFFFFF",
      color: isDark ? "#F9FAFB" : "#111827",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(c.id);
    try {
      const res = await stopCampaign(c.id);
      setActionLoadingId(null);
      await Swal.fire({
        title: "Campaign Stopped",
        text: `"${res?.name || c.name}" has been paused/stopped.`,
        icon: "info",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
      await fetchCampaigns();
      if (selectedCampaign && selectedCampaign.id === c.id) {
        setSelectedCampaign(res || { ...selectedCampaign, status: "stopped" });
      }
    } catch (err: any) {
      setActionLoadingId(null);
      await Swal.fire({
        title: "Stop Failed",
        text: err?.message || "Failed to stop campaign.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    info(`Copied ID to clipboard`);
  };

  const handleViewDetails = (c: CampaignItem) => {
    setSelectedCampaign(c);
    setIsDetailsModalOpen(true);
  };

  // Helper formatting
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    const s = (status || "draft").toLowerCase();
    let badgeClass =
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700";
    let dotClass = "bg-gray-400";

    if (s === "running" || s === "active") {
      badgeClass =
        "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      dotClass = "bg-emerald-500 animate-pulse";
    } else if (s === "approved") {
      badgeClass =
        "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800";
      dotClass = "bg-teal-500";
    } else if (s === "paused" || s === "stopped" || s === "scheduled") {
      badgeClass =
        "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      dotClass = "bg-amber-500";
    } else if (s === "completed") {
      badgeClass =
        "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      dotClass = "bg-purple-500";
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        {status}
      </span>
    );
  };

  // Dynamic filter lists
  const availableStatuses = Array.from(
    new Set(campaigns.map((c) => (c.status || "Unknown").toLowerCase()))
  );

  const filteredCampaigns = campaigns.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.configuration?.registration_url &&
        c.configuration.registration_url.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter !== "All") {
      return (c.status || "").toLowerCase() === statusFilter.toLowerCase();
    }

    return true;
  });

  // KPI Metrics
  const totalCampaigns = campaigns.length;
  const runningCount = campaigns.filter(
    (c) => (c.status || "").toLowerCase() === "running"
  ).length;
  const completedCount = campaigns.filter(
    (c) => (c.status || "").toLowerCase() === "completed"
  ).length;
  const pausedCount = campaigns.filter((c) => {
    const s = (c.status || "").toLowerCase();
    return s === "paused" || s === "stopped";
  }).length;

  // Filter contacts inside Create Modal
  const modalFilteredContacts = availableContacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageMeta
        title="Campaigns | Kaizen Con 2027"
        description="Dynamic Email Agent Campaign Automation and Outreach Management"
      />

      <AdminPageContainer
        title="Email Campaigns"
        subtitle="Manage live email outreach sequences, approve workflows, and control start/stop automations via Email Agent API."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search campaigns by name, UUID, or registration URL..."
        actionButton={
          <div className="flex items-center gap-2">
            {/* Live Refresh button */}
            <button
              type="button"
              onClick={fetchCampaigns}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              title="Refresh campaigns from API"
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 ${
                  loading ? "animate-spin" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <span>Refresh</span>
            </button>

            {/* Create Campaign button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#8F2266] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Campaign</span>
            </button>
          </div>
        }
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Total Campaigns
              </span>
              <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#AA2D7B]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="m3 11 18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? "..." : totalCampaigns.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Synchronized via Agent API</p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Running Sequences
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? "..." : runningCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Actively dispatching</p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Paused / Completed
              </span>
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? "..." : (pausedCount + completedCount).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {pausedCount} Paused &bull; {completedCount} Done
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                API Service Endpoint
              </span>
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">Connected</p>
            <p className="mt-1 text-xs font-mono text-gray-400 truncate">192.168.29.201:8000</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-lg flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter("All")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === "All"
                  ? "bg-white dark:bg-gray-900 text-[#AA2D7B] dark:text-[#D85A9A] shadow-xs font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              All ({campaigns.length})
            </button>
            {availableStatuses.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer capitalize ${
                  statusFilter.toLowerCase() === st
                    ? "bg-white dark:bg-gray-900 text-[#AA2D7B] dark:text-[#D85A9A] shadow-xs font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {st} ({campaigns.filter((c) => (c.status || "").toLowerCase() === st).length})
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredCampaigns.length}</span> of {campaigns.length} campaigns
          </span>
        </div>

        {/* Fetch Error Alert */}
        {fetchError && (
          <div className="mb-4 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={fetchCampaigns}
              className="px-3 py-1 rounded-md bg-rose-600 text-white font-medium text-xs hover:bg-rose-700 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Campaigns Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Campaign Name & ID</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5">Registration Target</th>
                <th className="px-5 py-3.5">Delays & Throttle</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="inline-flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-5 h-5 animate-spin text-[#AA2D7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Loading campaigns from Email Agent API...
                    </div>
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path d="m3 11 18-5v12L3 14v-3z" />
                          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                        </svg>
                      </div>
                      <p className="font-medium text-gray-600 dark:text-gray-300">
                        No campaigns found
                      </p>
                      <p className="text-xs text-gray-400 max-w-sm">
                        Create your first automated email campaign to dispatch followups and registration sequences.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#8F2266] rounded-lg transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create Campaign Now
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => {
                  const regUrl = c.configuration?.registration_url;
                  const sendingDelay = c.configuration?.sending_delay_seconds;
                  const followupDelay = c.configuration?.followup_delay_minutes;
                  const maxSends = c.configuration?.max_sends_per_day;
                  const maxFollowups = c.configuration?.max_followups;

                  const isRunning = (c.status || "").toLowerCase() === "running";
                  const isApproved = Boolean(c.approved_at) || (c.status || "").toLowerCase() === "approved";
                  const isLoadingThis = actionLoadingId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {c.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] font-mono text-gray-400 truncate max-w-[200px]" title={c.id}>
                            {c.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(c.id)}
                            className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                            title="Copy Campaign UUID"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        {renderStatusBadge(c.status)}
                      </td>

                      {/* Registration URL */}
                      <td className="px-5 py-4 max-w-[240px]">
                        {regUrl ? (
                          <a
                            href={regUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#AA2D7B] hover:text-[#8F2266] dark:text-[#D85A9A] hover:underline font-mono truncate max-w-[220px]"
                            title={regUrl}
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            <span className="truncate">{regUrl}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No URL set</span>
                        )}
                      </td>

                      {/* Delays & Throttle info */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5 text-xs">
                          <div className="text-gray-700 dark:text-gray-300">
                            <span className="text-gray-400">Send Delay:</span>{" "}
                            <span className="font-semibold font-mono">{sendingDelay ?? "—"}s</span>
                            <span className="text-gray-300 dark:text-gray-700 mx-1.5">|</span>
                            <span className="text-gray-400">Followup:</span>{" "}
                            <span className="font-semibold font-mono">{followupDelay ?? "—"}m</span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            <span>Max {maxFollowups ?? 0} followups</span>
                            <span className="mx-1">&bull;</span>
                            <span>{maxSends ?? 0} sends/day</span>
                          </div>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="px-5 py-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                        {formatDate(c.created_at)}
                      </td>

                      {/* Actions: Approve, Start, Stop, Details */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* 1. APPROVE BUTTON (if not approved yet) */}
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleApprove(c)}
                              disabled={isLoadingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                              title="Approve Campaign"
                            >
                              {isLoadingThis ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                  <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                              <span>Approve</span>
                            </button>
                          )}

                          {/* 2. START BUTTON (if campaign is NOT running) */}
                          {!isRunning ? (
                            <button
                              type="button"
                              onClick={() => handleStart(c)}
                              disabled={isLoadingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer disabled:opacity-50"
                              title="Start Campaign"
                            >
                              {isLoadingThis ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                  <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                              )}
                              <span>Start</span>
                            </button>
                          ) : (
                            /* 3. STOP BUTTON (if campaign IS running) */
                            <button
                              type="button"
                              onClick={() => handleStop(c)}
                              disabled={isLoadingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                              title="Stop Campaign"
                            >
                              {isLoadingThis ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                  <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                              )}
                              <span>Stop</span>
                            </button>
                          )}

                          {/* 4. DETAILS BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                            title="View Campaign Details"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminPageContainer>

      {/* CREATE CAMPAIGN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#AA2D7B]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Create New Campaign
                  </h3>
                  <p className="text-xs text-gray-500">
                    Dispatch automated emails via Email Agent API POST /api/v1/email-agent/campaigns
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kaizen Con 2027 Registration Wave 1"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
              </div>

              {/* Registration URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Registration URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.registration_url}
                  onChange={(e) => setFormData({ ...formData, registration_url: e.target.value })}
                  placeholder="https://example.com/register"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
              </div>

              {/* Delays Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Sending Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sending_delay_seconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sending_delay_seconds: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Interval between outbound messages (e.g. 3600 = 1 hour)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Followup Delay (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.followup_delay_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        followup_delay_minutes: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Delay before sending automatic follow-up email
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Max Followups
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.max_followups}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_followups: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Maximum number of automatic follow-up reminders
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Max Sends Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.max_sends_per_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_sends_per_day: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Daily throttle quota for this campaign
                  </p>
                </div>
              </div>

              {/* Recipient Contacts Selection */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Target Contacts ({formData.contact_ids.length} selected)
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Select recipient UUIDs to include in this campaign
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectEligibleOnly}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Eligible Only
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllContacts}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 transition cursor-pointer"
                    >
                      All ({availableContacts.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedContacts}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded hover:bg-rose-100 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Filter contacts search bar */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Filter contacts by name or email..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#AA2D7B]"
                  />
                </div>

                {/* Contacts List Box */}
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800/40">
                  {loadingContacts ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      Loading available contacts...
                    </div>
                  ) : modalFilteredContacts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      No matching contacts found.
                    </div>
                  ) : (
                    modalFilteredContacts.map((c) => {
                      const isSelected = formData.contact_ids.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleContact(c.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            isSelected ? "bg-[#AA2D7B]/5 dark:bg-[#AA2D7B]/15" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-[#AA2D7B] focus:ring-[#AA2D7B] cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                {c.name || "Unnamed Recipient"}
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono truncate">
                                {c.email}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              c.status === "eligible" && !c.unsubscribed
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {c.unsubscribed ? "Unsubscribed" : c.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#8F2266] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Creating Campaign...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isDetailsModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {selectedCampaign.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-gray-400">
                    ID: {selectedCampaign.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(selectedCampaign.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Copy UUID"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Campaign Status</span>
                <div>{renderStatusBadge(selectedCampaign.status)}</div>
              </div>

              {/* Modal Direct Actions for Approve, Start, Stop */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                  Actions:
                </span>
                {!Boolean(selectedCampaign.approved_at) && (selectedCampaign.status || "").toLowerCase() !== "approved" && (
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedCampaign)}
                    disabled={actionLoadingId === selectedCampaign.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 hover:bg-emerald-200/80 rounded-lg border border-emerald-300 dark:border-emerald-800 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Approve Campaign</span>
                  </button>
                )}

                {(selectedCampaign.status || "").toLowerCase() !== "running" ? (
                  <button
                    type="button"
                    onClick={() => handleStart(selectedCampaign)}
                    disabled={actionLoadingId === selectedCampaign.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/60 hover:bg-blue-200/80 rounded-lg border border-blue-300 dark:border-blue-800 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Start Campaign</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStop(selectedCampaign)}
                    disabled={actionLoadingId === selectedCampaign.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/60 hover:bg-rose-200/80 rounded-lg border border-rose-300 dark:border-rose-800 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    <span>Stop Campaign</span>
                  </button>
                )}
              </div>

              {/* Configuration */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Configuration
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Registration URL</span>
                    <a
                      href={selectedCampaign.configuration?.registration_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#AA2D7B] hover:underline truncate block max-w-full"
                    >
                      {selectedCampaign.configuration?.registration_url || "—"}
                    </a>
                  </div>

                  <div>
                    <span className="text-gray-400 block">Sending Delay</span>
                    <span className="font-semibold font-mono text-gray-800 dark:text-gray-200">
                      {selectedCampaign.configuration?.sending_delay_seconds ?? "—"} seconds
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block">Followup Delay</span>
                    <span className="font-semibold font-mono text-gray-800 dark:text-gray-200">
                      {selectedCampaign.configuration?.followup_delay_minutes ?? "—"} minutes
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block">Max Followups</span>
                    <span className="font-semibold font-mono text-gray-800 dark:text-gray-200">
                      {selectedCampaign.configuration?.max_followups ?? "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block">Max Sends / Day</span>
                    <span className="font-semibold font-mono text-gray-800 dark:text-gray-200">
                      {selectedCampaign.configuration?.max_sends_per_day ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifecycle & Timestamps */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Timestamps & Auditing
                </h4>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created At:</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatDate(selectedCampaign.created_at)}
                    </span>
                  </div>
                  {selectedCampaign.approved_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Approved At:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(selectedCampaign.approved_at)}
                      </span>
                    </div>
                  )}
                  {selectedCampaign.started_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Started At:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(selectedCampaign.started_at)}
                      </span>
                    </div>
                  )}
                  {selectedCampaign.paused_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Paused At:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(selectedCampaign.paused_at)}
                      </span>
                    </div>
                  )}
                  {selectedCampaign.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed At:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(selectedCampaign.completed_at)}
                      </span>
                    </div>
                  )}
                  {selectedCampaign.created_by && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created By:</span>
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        {selectedCampaign.created_by}
                      </span>
                    </div>
                  )}
                  {selectedCampaign.approved_by && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Approved By:</span>
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        {selectedCampaign.approved_by}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
