import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import {
  createCampaign,
  getEmailAgentContacts,
  getTemplates,
} from "../../api/ApiPath";
import Swal from "sweetalert2";

export interface ContactOption {
  id: string;
  email: string;
  name: string | null;
  status: string;
  unsubscribed: boolean;
}

export interface TemplateOption {
  id: string;
  name: string;
  purpose?: string;
  subject?: string;
  active?: boolean;
  version?: number;
  [key: string]: any;
}

export default function CreateCampaignPage() {
  const navigate = useNavigate();

  // Templates State
  const [availableTemplates, setAvailableTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);

  // Contacts State
  const [availableContacts, setAvailableContacts] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(true);
  const [contactSearch, setContactSearch] = useState<string>("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    registration_url: "https://example.com/",
    followup_delay_minutes: 1,
    sending_delay_seconds: 3600,
    max_followups: 10,
    max_sends_per_day: 1,
    contact_ids: [] as string[],
  });

  // Load Contacts and Templates on Mount
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setLoadingContacts(true);
      setLoadingTemplates(true);

      try {
        const [contactsRes, templatesRes] = await Promise.allSettled([
          getEmailAgentContacts(0, 100),
          getTemplates(),
        ]);

        if (!isMounted) return;

        // Process Contacts
        if (contactsRes.status === "fulfilled" && Array.isArray(contactsRes.value)) {
          const contacts = contactsRes.value;
          setAvailableContacts(contacts);

          // Pre-select eligible contacts by default
          const eligibleIds = contacts
            .filter((c: ContactOption) => c.status === "eligible" && !c.unsubscribed)
            .map((c: ContactOption) => c.id);

          setFormData((prev) => ({
            ...prev,
            contact_ids: prev.contact_ids.length > 0 ? prev.contact_ids : eligibleIds,
          }));
        } else {
          console.warn("Failed to load contacts:", contactsRes);
        }

        // Process Templates
        if (templatesRes.status === "fulfilled" && Array.isArray(templatesRes.value)) {
          const tpls = templatesRes.value;
          setAvailableTemplates(tpls);
          if (tpls.length > 0) {
            setFormData((prev) => ({
              ...prev,
              template_id: prev.template_id || tpls[0].id,
            }));
          }
        } else {
          console.warn("Failed to load templates:", templatesRes);
        }
      } catch (err) {
        console.error("Error loading initial campaign form data:", err);
      } finally {
        if (isMounted) {
          setLoadingContacts(false);
          setLoadingTemplates(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter contacts by name or email
  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return availableContacts;
    return availableContacts.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [availableContacts, contactSearch]);

  // Contact Selection Handlers
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
    const eligibleIds = availableContacts
      .filter((c) => c.status === "eligible" && !c.unsubscribed)
      .map((c) => c.id);
    setFormData((prev) => ({
      ...prev,
      contact_ids: eligibleIds,
    }));
  };

  const handleClearSelectedContacts = () => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: [],
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      Swal.fire({
        title: "Missing Name",
        text: "Please provide a name for this campaign.",
        icon: "warning",
        confirmButtonColor: "#AA2D7B",
      });
      return;
    }

    if (!formData.registration_url.trim()) {
      Swal.fire({
        title: "Missing Registration URL",
        text: "Please provide a valid registration URL.",
        icon: "warning",
        confirmButtonColor: "#AA2D7B",
      });
      return;
    }

    const isDark = document.documentElement.classList.contains("dark");

    if (formData.contact_ids.length === 0) {
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

    try {
      const response = await createCampaign({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        template_id: formData.template_id ? formData.template_id : undefined,
        contact_ids: formData.contact_ids,
        registration_url: formData.registration_url.trim(),
        followup_delay_minutes: Number(formData.followup_delay_minutes),
        sending_delay_seconds: Number(formData.sending_delay_seconds),
        max_followups: Number(formData.max_followups),
        max_sends_per_day: Number(formData.max_sends_per_day),
      });

      setIsSubmitting(false);

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

      // Redirect back to campaigns list
      navigate("/campaigns");
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

  const selectedTemplate = availableTemplates.find((t) => t.id === formData.template_id);

  return (
    <>
      <PageMeta
        title="Create Campaign | Kaizen Con 2027"
        description="Configure automated email outreach campaign sequences, delivery throttling, and recipient lists."
      />

      <AdminPageContainer
        title="Create New Campaign"
        subtitle="Configure automated email outreach sequences, template parameters, throttling quotas, and recipient lists via Email Agent API."
        actionButton={
          <button
            type="button"
            onClick={() => navigate("/campaigns")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Campaigns</span>
          </button>
        }
      >
        <form onSubmit={handleSubmit} className="w-full space-y-7">
          {/* Section 1: Campaign Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#AA2D7B]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Campaign Information
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Core identity, purpose, and linked email outreach template
                </p>
              </div>
            </div>

            {/* Side-by-side grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Name & Template */}
              <div className="space-y-4">
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
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                  />
                </div>

                {/* Email Template */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Email Template <span className="text-gray-400 font-normal">(Select template for campaign)</span>
                    </label>
                    {loadingTemplates && (
                      <span className="text-[11px] text-[#AA2D7B] flex items-center gap-1 font-medium">
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Loading templates...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={formData.template_id}
                      onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B] cursor-pointer appearance-none pr-10"
                    >
                      <option value="">-- Choose an Email Template --</option>
                      {availableTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} {tpl.purpose ? `[${tpl.purpose.toUpperCase()}]` : ""} {tpl.subject ? `— ${tpl.subject}` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>

                  {/* Selected Template Preview Details */}
                  {selectedTemplate && (
                    <div className="mt-2.5 p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-purple-900 dark:text-purple-300 truncate">
                          Selected: {selectedTemplate.name}
                        </span>
                        {selectedTemplate.purpose && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-200/70 dark:bg-purple-800/60 text-purple-800 dark:text-purple-200 shrink-0">
                            {selectedTemplate.purpose}
                          </span>
                        )}
                      </div>
                      {selectedTemplate.subject && (
                        <p className="text-gray-600 dark:text-gray-400 truncate mt-1">
                          <span className="text-gray-400">Subject:</span> {selectedTemplate.subject}
                        </p>
                      )}
                      <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
                        UUID: {selectedTemplate.id}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Registration URL & Description */}
              <div className="space-y-4">
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
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                  />
                </div>

                {/* Campaign Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={selectedTemplate ? 4 : 3}
                    maxLength={2000}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief overview of the campaign objective, target audience, or workflow notes..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Automation & Delivery Settings */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#AA2D7B]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Automation & Timing Settings
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Delay intervals, followup sequences, and daily send limits
                </p>
              </div>
            </div>

            {/* 4 columns side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#AA2D7B]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Daily throttle quota for this campaign
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Target Recipients / Contacts */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#AA2D7B]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Target Contacts ({formData.contact_ids.length} selected)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select recipient contacts to include in this campaign sequence
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectEligibleOnly}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                >
                  Eligible Only
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllContacts}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  All ({availableContacts.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedContacts}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filter contacts search bar */}
            <div>
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Filter contacts by name or email..."
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#AA2D7B]"
              />
            </div>

            {/* Contacts List Box */}
            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800/40">
              {loadingContacts ? (
                <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin text-[#AA2D7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Loading available contacts...</span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400">
                  No matching contacts found.
                </div>
              ) : (
                filteredContacts.map((c) => {
                  const isSelected = formData.contact_ids.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleToggleContact(c.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isSelected ? "bg-[#AA2D7B]/5 dark:bg-[#AA2D7B]/15" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-[#AA2D7B] focus:ring-[#AA2D7B] cursor-pointer"
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
                        className={`shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
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

          {/* Form Action Buttons Bar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => navigate("/campaigns")}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#8F2266] rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Creating Campaign...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </AdminPageContainer>
    </>
  );
}
