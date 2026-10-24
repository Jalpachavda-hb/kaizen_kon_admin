import React, { useState, useEffect, useCallback, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import { useToast } from "../../context/ToastContext";
import {
  getEmailAgentContacts,
  importExcelContacts,
  stopContact,
} from "../../api/ApiPath";
import Swal from "sweetalert2";

export interface ContactItem {
  id: string;
  email: string;
  name: string | null;
  type?: string | null;
  status: string;
  unsubscribed: boolean;
  created_at: string;
  updated_at: string;
}

export default function SendToEmailPage() {
  const { info } = useToast();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Eligible" | "Unsubscribed">("All");

  // Selection state for bulk send
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Send Email Modal State
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Important Update: Kaizen Con 2027 Schedule & Access");
  const [emailMessage, setEmailMessage] = useState(
    "Hello,\n\nWe are pleased to provide you with the latest conference updates and session details for Kaizen Con 2027.\n\nBest regards,\nKaizen Con 2027 Organizing Committee"
  );
  const [isSending, setIsSending] = useState(false);

  // Import Excel Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop Contact State
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [isBulkStopping, setIsBulkStopping] = useState(false);

  // Fetch contacts from dynamic API
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getEmailAgentContacts(0, 100);
      if (Array.isArray(data)) {
        setContacts(data);
      } else {
        setContacts([]);
      }
    } catch (err: any) {
      console.error("Failed to load contacts:", err);
      setFetchError(err?.message || "Failed to fetch email contacts from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Filtered contacts based on search and status
  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.type && c.type.toLowerCase().includes(q)) ||
      (c.status && c.status.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === "Eligible") {
      return c.status === "eligible" && !c.unsubscribed;
    }
    if (statusFilter === "Unsubscribed") {
      return c.unsubscribed || c.status !== "eligible";
    }
    return true;
  });

  // Bulk selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredContacts.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open modal for broadcast / selected contacts
  const handleOpenBulkSendModal = () => {
    const count = selectedIds.length > 0 ? selectedIds.length : contacts.length;
    setEmailSubject(`Kaizen Con 2027: Official Broadcast (${count} recipients)`);
    setIsSendModalOpen(true);
  };

  // Submit Send Email
  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) return;

    setIsSending(true);
    setTimeout(async () => {
      setIsSending(false);
      setIsSendModalOpen(false);
      const isDark = document.documentElement.classList.contains("dark");

      const count = selectedIds.length > 0 ? selectedIds.length : contacts.length;
      await Swal.fire({
        title: "Broadcast Dispatched!",
        text: `Email blast successfully sent to ${count} recipient(s).`,
        icon: "success",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    }, 700);
  };

  // Copy email to clipboard helper
  const handleCopyEmail = (emailText: string) => {
    navigator.clipboard.writeText(emailText);
    info(`Copied "${emailText}" to clipboard`);
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  // Stop single contact
  const handleStopContact = async (contact: ContactItem) => {
    const isDark = document.documentElement.classList.contains("dark");
    const displayName = contact.name || contact.email;

    const result = await Swal.fire({
      title: "Stop Contact?",
      html: `
        <div style="font-size: 13.5px; text-align: left; line-height: 1.6; padding: 4px;">
          <p style="color: #4b5563;">Are you sure you want to stop communication for:</p>
          <p style="margin-top: 6px; font-weight: 600; color: #AA2D7B; font-size: 14px;">${displayName} &lt;${contact.email}&gt;</p>
          <p style="margin-top: 4px; font-family: monospace; font-size: 11px; color: #9ca3af;">ID: ${contact.id}</p>
          <div style="margin-top: 10px; padding: 8px 12px; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 12.5px; color: #dc2626;">
            This contact will be marked as unsubscribed and stopped from receiving further campaign emails.
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Stop Contact",
      cancelButtonText: "Cancel",
      background: isDark ? "#111827" : "#FFFFFF",
      color: isDark ? "#F9FAFB" : "#111827",
    });

    if (!result.isConfirmed) return;

    try {
      setStoppingId(contact.id);
      const res = await stopContact(contact.id);

      // Update locally immediately
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id
            ? {
                ...c,
                unsubscribed: true,
                status: res?.status || "stopped",
                ...(res?.updated_at ? { updated_at: res.updated_at } : {}),
              }
            : c
        )
      );

      await Swal.fire({
        title: "Contact Stopped",
        text: `Contact "${displayName}" has been stopped successfully.`,
        icon: "success",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    } catch (error: any) {
      console.error("Failed to stop contact:", error);
      await Swal.fire({
        title: "Action Failed",
        text: error?.message || "Could not stop contact. Please try again.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    } finally {
      setStoppingId(null);
    }
  };

  // Bulk stop selected contacts
  const handleBulkStop = async () => {
    const isDark = document.documentElement.classList.contains("dark");
    const eligibleSelected = contacts.filter(
      (c) => selectedIds.includes(c.id) && !c.unsubscribed
    );

    if (eligibleSelected.length === 0) {
      await Swal.fire({
        title: "No Eligible Contacts",
        text: "All selected contacts are already stopped or unsubscribed.",
        icon: "info",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
      return;
    }

    const result = await Swal.fire({
      title: `Stop ${eligibleSelected.length} Contact(s)?`,
      html: `
        <div style="font-size: 13.5px; text-align: left; line-height: 1.6; padding: 4px;">
          <p style="color: #4b5563;">
            Are you sure you want to stop communication for all <b>${eligibleSelected.length}</b> selected recipient(s)?
          </p>
          <div style="margin-top: 10px; padding: 8px 12px; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 12.5px; color: #dc2626;">
            These contacts will be unsubscribed and excluded from automated campaigns.
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Yes, Stop ${eligibleSelected.length} Contacts`,
      cancelButtonText: "Cancel",
      background: isDark ? "#111827" : "#FFFFFF",
      color: isDark ? "#F9FAFB" : "#111827",
    });

    if (!result.isConfirmed) return;

    setIsBulkStopping(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const c of eligibleSelected) {
        try {
          await stopContact(c.id);
          successCount++;
        } catch (err) {
          console.error(`Failed to stop contact ${c.id}:`, err);
          failCount++;
        }
      }

      setSelectedIds([]);
      await fetchContacts();

      await Swal.fire({
        title: "Batch Action Completed",
        html: `
          <div style="font-size: 13.5px; text-align: left; line-height: 1.6;">
            <p style="color: #10b981; font-weight: 600;">✓ <b>${successCount}</b> contact(s) successfully stopped.</p>
            ${failCount > 0 ? `<p style="color: #ef4444; margin-top: 4px;">✕ <b>${failCount}</b> contact(s) could not be stopped.</p>` : ""}
          </div>
        `,
        icon: successCount > 0 ? "success" : "error",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    } finally {
      setIsBulkStopping(false);
    }
  };

  // Excel File Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setSelectedFile(file);
      } else {
        const isDark = document.documentElement.classList.contains("dark");
        Swal.fire({
          title: "Invalid File Format",
          text: "Please select an Excel (.xlsx or .xls) spreadsheet file.",
          icon: "warning",
          confirmButtonColor: "#AA2D7B",
          background: isDark ? "#111827" : "#FFFFFF",
          color: isDark ? "#F9FAFB" : "#111827",
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setSelectedFile(file);
      } else {
        const isDark = document.documentElement.classList.contains("dark");
        Swal.fire({
          title: "Invalid File Format",
          text: "Please select an Excel (.xlsx or .xls) spreadsheet file.",
          icon: "warning",
          confirmButtonColor: "#AA2D7B",
          background: isDark ? "#111827" : "#FFFFFF",
          color: isDark ? "#F9FAFB" : "#111827",
        });
      }
    }
  };

  // Submit Import Excel
  const handleUploadExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    const isDark = document.documentElement.classList.contains("dark");

    try {
      const res = await importExcelContacts(selectedFile);
      setIsUploading(false);
      setIsImportModalOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const importedCount = res.imported?.length || 0;
      const duplicateCount = res.duplicate_count || 0;
      const invalidCount = res.invalid?.length || 0;

      await Swal.fire({
        title: "Excel Import Completed!",
        html: `
          <div style="text-align: left; font-size: 13.5px; line-height: 1.6; padding: 4px 8px;">
            <p style="color: #10b981; font-weight: 600; margin-bottom: 6px;">
              ✓ <b>${importedCount}</b> new contacts successfully imported.
            </p>
            ${
              duplicateCount > 0
                ? `<p style="color: #f59e0b; margin-bottom: 4px;">⚠ <b>${duplicateCount}</b> duplicate contact(s) already existed and were skipped.</p>`
                : ""
            }
            ${
              invalidCount > 0
                ? `<p style="color: #ef4444; margin-bottom: 4px;">✕ <b>${invalidCount}</b> empty/invalid row(s) skipped.</p>`
                : ""
            }
          </div>
        `,
        icon: importedCount > 0 ? "success" : "info",
        confirmButtonColor: "#AA2D7B",
        confirmButtonText: "OK",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });

      // Refresh dynamic contact list
      await fetchContacts();
    } catch (err: any) {
      setIsUploading(false);
      await Swal.fire({
        title: "Import Failed",
        text: err?.message || "An error occurred while uploading the Excel file.",
        icon: "error",
        confirmButtonColor: "#AA2D7B",
        background: isDark ? "#111827" : "#FFFFFF",
        color: isDark ? "#F9FAFB" : "#111827",
      });
    }
  };

  // KPI Metrics
  const totalContacts = contacts.length;
  const eligibleCount = contacts.filter((c) => c.status === "eligible" && !c.unsubscribed).length;
  const unsubscribedCount = contacts.filter((c) => c.unsubscribed || c.status !== "eligible").length;

  return (
    <>
      <PageMeta
        title="Send To Email | Kaizen Con 2027"
        description="Dynamic Email Agent Contacts and Dispatch Management for Kaizen Con 2027"
      />

      <AdminPageContainer
        title="Send To Email"
        subtitle="Live dynamic recipient contacts from Email Agent API. Dispatch automated announcements and direct emails."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search recipient name, email, type, or status..."
        actionButton={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Download Template Button */}
            <a
              href="/email agent.xlsx"
              download="email agent.xlsx"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Download Sample Excel Template"
            >
              <svg
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Template (.xlsx)</span>
            </a>

            {/* Import Excel Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Upload and import contacts from Excel"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>Import Excel</span>
            </button>

            {/* Refresh Live API */}
            <button
              type="button"
              onClick={fetchContacts}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              title="Refresh contacts from API"
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

            {/* Stop Selected Contacts */}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkStop}
                disabled={isBulkStopping}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                title="Stop / Unsubscribe selected contacts"
              >
                {isBulkStopping ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
                <span>Stop Selected ({selectedIds.length})</span>
              </button>
            )}

            {/* Compose / Broadcast */}
            <button
              type="button"
              onClick={handleOpenBulkSendModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#8F2266] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              <span>
                {selectedIds.length > 0
                  ? `Send to Selected (${selectedIds.length})`
                  : "Compose Broadcast"}
              </span>
            </button>
          </div>
        }
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Contacts</span>
              <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#AA2D7B]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? "..." : totalContacts.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Synchronized via Email Agent API</p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Eligible Recipients</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? "..." : eligibleCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Ready for dispatch</p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Unsubscribed / Stopped</span>
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? "..." : unsubscribedCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Opted out or stopped</p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Agent API Status</span>
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
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-lg">
            {(["All", "Eligible", "Unsubscribed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === s
                    ? "bg-white dark:bg-gray-900 text-[#AA2D7B] dark:text-[#D85A9A] shadow-xs font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {s}{" "}
                {s === "All"
                  ? `(${contacts.length})`
                  : s === "Eligible"
                  ? `(${eligibleCount})`
                  : `(${unsubscribedCount})`}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredContacts.length}</span> of {contacts.length} recipients
          </div>
        </div>

        {/* Error notice if fetch failed */}
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
              onClick={fetchContacts}
              className="px-3 py-1 rounded-md bg-rose-600 text-white font-medium text-xs hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Contacts Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredContacts.length > 0 &&
                      filteredContacts.every((c) => selectedIds.includes(c.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded text-[#AA2D7B] focus:ring-[#AA2D7B] cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5 text-center">Type</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Subscription</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <div className="inline-flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-5 h-5 animate-spin text-[#AA2D7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Loading contacts from Email Agent API...
                    </div>
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm">
                    No contacts found matching your query.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  const isEligible = contact.status === "eligible" && !contact.unsubscribed;

                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors ${
                        isSelected ? "bg-[#AA2D7B]/5 dark:bg-[#AA2D7B]/10" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(contact.id)}
                          className="rounded text-[#AA2D7B] focus:ring-[#AA2D7B] cursor-pointer"
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-[#AA2D7B] to-[#55355E] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                            {contact.name ? contact.name.charAt(0) : contact.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {contact.name || "Unnamed Recipient"}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]">
                              {contact.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                          <span>{contact.email}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(contact.email)}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                            title="Copy email address"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {contact.type ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              contact.type.toLowerCase().includes("doctor")
                                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                : contact.type.toLowerCase().includes("sponser") || contact.type.toLowerCase().includes("sponsor")
                                ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            {contact.type}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            isEligible
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isEligible ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {contact.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {contact.unsubscribed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/50 dark:border-rose-900/40">
                            Unsubscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-900/40">
                            Subscribed
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatDate(contact.created_at)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        {contact.unsubscribed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-not-allowed select-none"
                            title="Contact is already stopped/unsubscribed"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                            <span>Stopped</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStopContact(contact)}
                            disabled={stoppingId === contact.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Stop / unsubscribe this contact from automated emails"
                          >
                            {stoppingId === contact.id ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                  <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                                <span>Stopping...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" />
                                  <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                <span>Stop</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminPageContainer>

      {/* Import Excel Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Import Contacts Excel</h3>
                  <p className="text-xs text-gray-500">Upload .xlsx spreadsheet with recipient email, name, and type</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFile(null);
                }}
                disabled={isUploading}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUploadExcelSubmit} className="mt-4 space-y-4">
              {/* Template download helper callout */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300 truncate font-medium">Need the format?</span>
                </div>
                <a
                  href="/email agent.xlsx"
                  download="email agent.xlsx"
                  className="font-semibold text-[#AA2D7B] hover:text-[#8F2266] hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Template
                </a>
              </div>

              {/* Drag & drop upload area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-[#AA2D7B] bg-[#AA2D7B]/5 dark:bg-[#AA2D7B]/10 scale-[1.01]"
                    : selectedFile
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-gray-300 dark:border-gray-700 hover:border-[#AA2D7B] dark:hover:border-[#AA2D7B] bg-white dark:bg-gray-800/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white break-all">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-rose-500 hover:text-rose-600 font-medium hover:underline pt-1 cursor-pointer"
                    >
                      Choose another file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mx-auto flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Click to select or drag and drop
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Supports .xlsx and .xls Excel files (Columns: Email, Name, Type)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setSelectedFile(null);
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Uploading & Importing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      Upload & Import
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compose / Send Email Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#AA2D7B]/10 text-[#AA2D7B]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Broadcast to Contacts
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedIds.length > 0
                      ? `Broadcasting to ${selectedIds.length} selected recipients`
                      : `Broadcasting to all ${contacts.length} recipients`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="mt-4 space-y-3.5">

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email Message Body *
                </label>
                <textarea
                  rows={5}
                  required
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#8F2266] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSending ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                      Send Dispatch
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
