import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import { getDelegates } from "../../api/ApiPath";

export interface Delegate {
  id: number;
  registration_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  institution: string;
  designation: string;
  speciality: string;
  registration_status: "confirmed" | "pending" | string;
  consent_given: boolean;
  is_deleted: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fallback seed data matching the API response exactly
const fallbackDelegates: Delegate[] = [
  {
    id: 6,
    registration_id: "41d50b60-674f-40fe-832f-825d4922cd32",
    first_name: "Meera",
    last_name: "Iyer",
    email: "demo.delegate06@example.com",
    phone: "+919810000006",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    institution: "Madras Medical College",
    designation: "Senior Resident",
    speciality: "Obstetrics and Gynecology",
    registration_status: "confirmed",
    consent_given: true,
    is_deleted: false,
    is_active: true,
    created_at: "2026-10-19T13:06:29.787363Z",
    updated_at: "2026-10-19T13:06:29.787363Z",
  },
  {
    id: 5,
    registration_id: "572bc989-97f8-4357-9a69-7f576f1b009b",
    first_name: "Dev",
    last_name: "Chatterjee",
    email: "demo.delegate05@example.com",
    phone: "+919810000005",
    city: "Kolkata",
    state: "West Bengal",
    country: "India",
    institution: "IPGMER and SSKM Hospital",
    designation: "Assistant Professor",
    speciality: "Neurology",
    registration_status: "pending",
    consent_given: true,
    is_deleted: false,
    is_active: true,
    created_at: "2026-10-19T13:06:29.682181Z",
    updated_at: "2026-10-19T13:06:29.682181Z",
  },
  {
    id: 4,
    registration_id: "56df2c27-83d7-4efc-9c10-75f96d08432b",
    first_name: "Kavya",
    last_name: "Joshi",
    email: "demo.delegate04@example.com",
    phone: "+919810000004",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    institution: "B J Government Medical College",
    designation: "Medical Officer",
    speciality: "Community Medicine",
    registration_status: "confirmed",
    consent_given: true,
    is_deleted: false,
    is_active: true,
    created_at: "2026-10-19T13:06:29.568235Z",
    updated_at: "2026-10-19T13:06:29.568235Z",
  },
  {
    id: 3,
    registration_id: "cd9c812e-53cd-4f95-a30a-3934ad2d0333",
    first_name: "Arjun",
    last_name: "Nair",
    email: "demo.delegate03@example.com",
    phone: "+919810000003",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    institution: "Amrita Institute of Medical Sciences",
    designation: "Clinical Research Fellow",
    speciality: "Cardiology",
    registration_status: "pending",
    consent_given: true,
    is_deleted: false,
    is_active: true,
    created_at: "2026-10-19T13:06:29.475332Z",
    updated_at: "2026-10-19T13:06:29.475332Z",
  },
  {
    id: 2,
    registration_id: "05530aa7-a5d0-499d-923c-a5b5b67c536c",
    first_name: "Isha",
    last_name: "Reddy",
    email: "demo.delegate02@example.com",
    phone: "+919810000002",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    institution: "Osmania Medical College",
    designation: "Resident Doctor",
    speciality: "Pediatrics",
    registration_status: "confirmed",
    consent_given: true,
    is_deleted: false,
    is_active: true,
    created_at: "2026-10-19T13:06:29.342130Z",
    updated_at: "2026-10-19T13:06:29.342130Z",
  },
  {
    id: 1,
    registration_id: "07b6d578-3a28-4179-b96d-43bc42fc0ab8",
    first_name: "Rohan",
    last_name: "Kulkarni",
    email: "demo.delegate01@example.com",
    phone: "+919810000001",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    institution: "Seth GS Medical College",
    designation: "Consultant Physician",
    speciality: "Internal Medicine",
    registration_status: "confirmed",
    consent_given: true,
    is_deleted: false,
    is_active: true,
    created_at: "2026-10-19T13:06:29.208102Z",
    updated_at: "2026-10-19T13:06:29.208102Z",
  },
];

export default function DelegatesPage() {
  const [delegates, setDelegates] = useState<Delegate[]>(fallbackDelegates);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [specialityFilter, setSpecialityFilter] = useState<string>("All");

  // Selected Delegate for View Modal
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null);

  // Fetch from API
  const fetchDelegatesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDelegates();
      if (data && Array.isArray(data.results)) {
        setDelegates(data.results);
        setIsLiveApi(true);
      } else {
        // Fallback
        setDelegates(fallbackDelegates);
        setIsLiveApi(false);
      }
    } catch (err: any) {
      console.warn("Could not fetch delegates from live API, using fallback data:", err);
      setError(err?.message || "Live API not reachable. Showing fallback data.");
      setDelegates(fallbackDelegates);
      setIsLiveApi(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelegatesData();
  }, []);

  // Unique Specialities for Filter
  const availableSpecialities = useMemo(() => {
    const list = Array.from(new Set(delegates.map((d) => d.speciality).filter(Boolean)));
    return list.sort();
  }, [delegates]);

  // Filtered Delegates
  const filteredDelegates = useMemo(() => {
    return delegates.filter((d) => {
      const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
      const term = search.toLowerCase().trim();

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        (d.email && d.email.toLowerCase().includes(term)) ||
        (d.institution && d.institution.toLowerCase().includes(term)) ||
        (d.speciality && d.speciality.toLowerCase().includes(term)) ||
        (d.designation && d.designation.toLowerCase().includes(term)) ||
        (d.city && d.city.toLowerCase().includes(term)) ||
        (d.registration_id && d.registration_id.toLowerCase().includes(term)) ||
        (d.phone && d.phone.includes(term));

      const matchesStatus =
        statusFilter === "All" ||
        d.registration_status.toLowerCase() === statusFilter.toLowerCase();

      const matchesSpeciality =
        specialityFilter === "All" || d.speciality === specialityFilter;

      return matchesSearch && matchesStatus && matchesSpeciality;
    });
  }, [delegates, search, statusFilter, specialityFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = delegates.length;
    const confirmed = delegates.filter(
      (d) => d.registration_status.toLowerCase() === "confirmed"
    ).length;
    const pending = delegates.filter(
      (d) => d.registration_status.toLowerCase() === "pending"
    ).length;
    const institutions = new Set(delegates.map((d) => d.institution)).size;

    return { total, confirmed, pending, institutions };
  }, [delegates]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Registration ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Institution",
      "Designation",
      "Speciality",
      "City",
      "State",
      "Country",
      "Status",
      "Consent Given",
      "Created At",
    ];

    const rows = filteredDelegates.map((d) => [
      d.id,
      `"${d.registration_id}"`,
      `"${d.first_name}"`,
      `"${d.last_name}"`,
      `"${d.email}"`,
      `"${d.phone}"`,
      `"${d.institution}"`,
      `"${d.designation}"`,
      `"${d.speciality}"`,
      `"${d.city}"`,
      `"${d.state}"`,
      `"${d.country}"`,
      `"${d.registration_status}"`,
      d.consent_given ? "Yes" : "No",
      `"${d.created_at}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kaizen_delegates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <PageMeta
        title="Delegates Management | Kaizen Con 2027"
        description="View and manage conference registered delegates, medical specialists, and attendees."
      />

      <AdminPageContainer
        title="Delegates"
        subtitle="Manage conference attendees, registration credentials, and participant specialities."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search delegates by name, email, institution, speciality, reg ID..."
        actionButton={
          <div className="flex items-center flex-wrap gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#AA2D7B]"
            >
              <option value="All">All Status</option>
              <option value="confirmed">Confirmed Only</option>
              <option value="pending">Pending Only</option>
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

            {/* Export CSV Button */}
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export current list to CSV file"
            >
              <svg
                className="w-3.5 h-3.5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export CSV
            </button>

            {/* Refresh / Reload API */}
            <button
              onClick={fetchDelegatesData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#D85A9A] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Reload from API"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? "Fetching..." : "Refresh API"}
            </button>
          </div>
        }
      >
        {/* API Status Banner */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveApi ? "bg-emerald-500" : "bg-amber-500"
              } animate-pulse`}
            />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Data Source:{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                {isLiveApi
                  ? "Live API (http://192.168.29.201:8000/api/delegates)"
                  : "Local Dataset (API fallback)"}
              </span>
            </span>
            {error && (
              <span className="text-amber-600 dark:text-amber-400 text-[11px] truncate max-w-xs">
                ({error})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-[11px]">
            <span>Showing {filteredDelegates.length} of {delegates.length} records</span>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 shadow-2xs">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Delegates
            </div>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
              {metrics.total}
            </div>
            <div className="text-[11px] text-[#AA2D7B] font-medium mt-0.5">
              100% active delegates
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-2xs">
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Confirmed
            </div>
            <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
              {metrics.confirmed}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Pass issued & valid
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-950/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs">
            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Pending Verification
            </div>
            <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">
              {metrics.pending}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              Awaiting confirmation
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-purple-100 dark:border-purple-950/40 bg-purple-50/30 dark:bg-purple-950/20 shadow-2xs">
            <div className="text-[11px] font-medium text-[#55355E] dark:text-purple-300 uppercase tracking-wider">
              Institutions
            </div>
            <div className="text-xl font-extrabold text-[#55355E] dark:text-purple-200 mt-1">
              {metrics.institutions}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Medical & Research orgs
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-[#AA2D7B] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Loading delegates from server...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredDelegates.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              No delegates found
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search query or reset the filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
                setSpecialityFilter("All");
              }}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-[#AA2D7B] hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Delegates Table */}
        {!loading && filteredDelegates.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px] bg-gray-50/80 dark:bg-gray-800/60">
                  <th className="py-3 px-4">Delegate</th>
                  <th className="py-3 px-4">Registration ID</th>
                  <th className="py-3 px-4">Designation & Institution</th>
                  <th className="py-3 px-4">Speciality</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Consent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {filteredDelegates.map((delegate) => {
                  const fullName = `${delegate.first_name} ${delegate.last_name}`.trim();
                  const initials = `${delegate.first_name.charAt(0)}${delegate.last_name.charAt(0)}`.toUpperCase();
                  const isConfirmed = delegate.registration_status.toLowerCase() === "confirmed";

                  return (
                    <tr
                      key={delegate.id}
                      className="hover:bg-[#faedf5]/20 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#55355E] to-[#AA2D7B] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                              {fullName}
                              {delegate.is_active && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                                  title="Active Delegate"
                                />
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {delegate.email}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {delegate.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Registration ID & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[11px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700"
                            title={delegate.registration_id}
                          >
                            {delegate.registration_id.slice(0, 8)}...
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(delegate.registration_id, delegate.registration_id)
                            }
                            className="text-gray-400 hover:text-[#AA2D7B] transition-colors p-1"
                            title="Copy full Registration ID"
                          >
                            {copiedId === delegate.registration_id ? (
                              <span className="text-[10px] font-bold text-emerald-600">Copied</span>
                            ) : (
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          Reg: {formatDate(delegate.created_at)}
                        </div>
                      </td>

                      {/* Designation & Institution */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {delegate.designation}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {delegate.institution}
                        </div>
                      </td>

                      {/* Speciality */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#faedf5] text-[#55355E] dark:bg-[#55355E]/30 dark:text-[#f5d8e9] border border-[#AA2D7B]/20">
                          {delegate.speciality}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-gray-800 dark:text-gray-200 font-medium">
                          {delegate.city}, {delegate.state}
                        </div>
                        <div className="text-[10px] text-gray-400">{delegate.country}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isConfirmed
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isConfirmed ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {delegate.registration_status}
                        </span>
                      </td>

                      {/* Consent Given */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {delegate.consent_given ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Given
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">No</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDelegate(delegate)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#AA2D7B] hover:text-[#55355E] dark:hover:text-[#D85A9A] bg-[#faedf5]/70 hover:bg-[#faedf5] dark:bg-gray-800 rounded transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPageContainer>

      {/* Delegate Detail Modal */}
      {selectedDelegate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-[#faedf5]/30 dark:bg-gray-800/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#55355E] to-[#AA2D7B] text-white flex items-center justify-center font-bold text-sm uppercase shadow-xs shrink-0">
                  {selectedDelegate.first_name.charAt(0)}
                  {selectedDelegate.last_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {selectedDelegate.first_name} {selectedDelegate.last_name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedDelegate.designation} • {selectedDelegate.institution}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDelegate(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Status and Registration Box */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[11px] block">
                    Registration ID (UUID)
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-gray-900 dark:text-gray-100 font-semibold break-all text-[11px]">
                      {selectedDelegate.registration_id}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          selectedDelegate.registration_id,
                          `modal-${selectedDelegate.registration_id}`
                        )
                      }
                      className="text-gray-400 hover:text-[#AA2D7B] shrink-0"
                      title="Copy UUID"
                    >
                      {copiedId === `modal-${selectedDelegate.registration_id}` ? (
                        <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[11px] block">
                    Registration Status
                  </span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedDelegate.registration_status.toLowerCase() === "confirmed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {selectedDelegate.registration_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2.5">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      Email Address
                    </span>
                    <a
                      href={`mailto:${selectedDelegate.email}`}
                      className="font-medium text-[#AA2D7B] hover:underline break-all mt-0.5 block"
                    >
                      {selectedDelegate.email}
                    </a>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      Phone Number
                    </span>
                    <a
                      href={`tel:${selectedDelegate.phone}`}
                      className="font-medium text-gray-900 dark:text-gray-100 font-mono mt-0.5 block"
                    >
                      {selectedDelegate.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Professional Profile */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2.5">
                  Professional Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      Medical Speciality
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 block">
                      {selectedDelegate.speciality}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      Designation
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 block">
                      {selectedDelegate.designation}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sm:col-span-2">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      Institution / Hospital
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 block">
                      {selectedDelegate.institution}
                    </span>
                  </div>
                </div>
              </div>

              {/* Geographic Location & Consent */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2.5">
                  Location & Preferences
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">City</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 block">
                      {selectedDelegate.city}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">State</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 block">
                      {selectedDelegate.state}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Country</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 block">
                      {selectedDelegate.country}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamps & Audit */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between text-[11px] text-gray-400">
                <span>Created: {new Date(selectedDelegate.created_at).toLocaleString()}</span>
                <span>Updated: {new Date(selectedDelegate.updated_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <button
                onClick={() => setSelectedDelegate(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#55355E] hover:bg-[#6e4679] rounded-lg transition-colors cursor-pointer"
              >
                Print Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
