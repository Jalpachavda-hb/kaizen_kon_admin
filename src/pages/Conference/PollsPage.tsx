import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import { useToast } from "../../context/ToastContext";
import { createPoll, votePoll, getPolls, getPollQrCodeUrl, downloadPollQrCode, BASE_URL } from "../../api/ApiPath";
import Swal from "sweetalert2";

export interface PollOption {
  id: string | number;
  text: string;
  votes: number;
}

export interface PollItem {
  id: string;
  question: string;
  sessionTitle: string;
  speakerName?: string;
  type: "single" | "multiple" | "rating";
  status: "active" | "draft" | "closed" | "scheduled";
  options: PollOption[];
  totalVotes: number;
  allowAnonymous: boolean;
  showLiveResults: boolean;
  createdAt: string;
  timerMinutes?: number;
  category?: string;
  poll_url?: string;
  qr_code_url?: string;
}

export default function PollsPage() {
  const { success, error: toastError, info } = useToast();

  // Polls State
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filtering & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Create & Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<PollItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Code Preview Modal State
  const [viewingQrPoll, setViewingQrPoll] = useState<PollItem | null>(null);

  // Form State (Default 4 choices as required by API)
  const [question, setQuestion] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [pollType, setPollType] = useState<"single" | "multiple" | "rating">("single");
  const [pollStatus, setPollStatus] = useState<"active" | "draft" | "closed" | "scheduled">("active");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [showLiveResults, setShowLiveResults] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [category, setCategory] = useState("");

  // Live Presentation View Modal
  const [presenterPoll, setPresenterPoll] = useState<PollItem | null>(null);

  // Live Results Monitor Modal (uses GET /polling/api/polls/{poll_id})
  const [liveResultsPoll, setLiveResultsPoll] = useState<PollItem | null>(null);
  const [isLiveAutoSync, setIsLiveAutoSync] = useState<boolean>(true);
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [syncingPollId, setSyncingPollId] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");

  // Currently Selected Poll for Live Results on this page
  const [currentPollId, setCurrentPollId] = useState<string | null>(null);

  // Cast Vote / Test Poll Modal
  const [votingPoll, setVotingPoll] = useState<PollItem | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | number | null>(null);
  const [isVoting, setIsVoting] = useState<boolean>(false);

  // QR Code PNG Download state
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);

  const handleDownloadQr = async (pollId: string | number) => {
    try {
      setIsDownloadingQr(true);
      await downloadPollQrCode(pollId, `kaizen-con-poll-${pollId}-qr.png`);
      success(`QR Code PNG for Poll #${pollId} downloaded successfully!`);
    } catch (err: any) {
      console.error("Failed to download QR code:", err);
      toastError(err?.message || "Failed to download QR code image.");
    } finally {
      setIsDownloadingQr(false);
    }
  };

  // Fetch Polls List: calls unified getPolls() WITHOUT passing ID -> GET /polling/api/admin/polls
  const fetchPolls = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const remotePolls = await getPolls(); // No ID passed -> fetches full polls list
      if (Array.isArray(remotePolls)) {
        const mapped: PollItem[] = remotePolls.map((p: any) => ({
          id: String(p.id),
          question: p.question,
          sessionTitle: p.session_title || `Live Session #${p.id}`,
          speakerName: p.speaker_name,
          type: "single",
          status: p.is_active ? "active" : "closed",
          options: (p.options || []).map((o: any) => ({
            id: String(o.id),
            text: o.text,
            votes: typeof o.votes === "number" ? o.votes : 0,
          })),
          totalVotes: (p.options || []).reduce((sum: number, o: any) => sum + (o.votes || 0), 0),
          allowAnonymous: true,
          showLiveResults: true,
          createdAt: p.created_at || new Date().toISOString(),
          poll_url: p.poll_url,
          qr_code_url: p.qr_code_url
            ? p.qr_code_url.startsWith("http")
              ? p.qr_code_url
              : `${BASE_URL}${p.qr_code_url}`
            : getPollQrCodeUrl(p.id),
        }));
        setPolls(mapped);
        if (mapped.length > 0) {
          setCurrentPollId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0].id));
        }
        setFetchError(null);
        if (showToast) {
          success(`Polls list refreshed successfully (${mapped.length} active questions).`);
        }
      }
    } catch (err: any) {
      console.error("Failed to load polls:", err);
      const msg = err?.message || "Failed to load live polls from server.";
      setFetchError(msg);
      if (showToast) {
        toastError(msg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [success, toastError]);

  // Initial Load on Mount
  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Sync / Show Poll Results: calls unified getPolls(pollId) PASSING the ID -> GET /polling/api/polls/{poll_id}
  const syncPollResults = useCallback(
    async (pollId: string | number, silent = false) => {
      try {
        if (!silent) setIsSyncingLive(true);
        setSyncingPollId(String(pollId));
        // Passing ID to get current poll & live results
        const liveData = await getPolls(pollId);
        if (liveData && liveData.id) {
          const opts: PollOption[] = (liveData.options || []).map((o: any) => ({
            id: String(o.id),
            text: o.text,
            votes: typeof o.votes === "number" ? o.votes : 0,
          }));
          const totalVotes = opts.reduce((sum, o) => sum + o.votes, 0);

          // Update main polls list in place
          setPolls((prev) =>
            prev.map((item) => {
              if (String(item.id) === String(pollId)) {
                return {
                  ...item,
                  question: liveData.question || item.question,
                  status: liveData.is_active ? "active" : "closed",
                  options: opts,
                  totalVotes,
                };
              }
              return item;
            })
          );

          // Update presenter view if open
          setPresenterPoll((prev) => {
            if (!prev || String(prev.id) !== String(pollId)) return prev;
            return {
              ...prev,
              question: liveData.question || prev.question,
              status: liveData.is_active ? "active" : "closed",
              options: opts,
              totalVotes,
            };
          });

          // Update liveResultsPoll view if open
          setLiveResultsPoll((prev) => {
            if (!prev || String(prev.id) !== String(pollId)) return prev;
            return {
              ...prev,
              question: liveData.question || prev.question,
              status: liveData.is_active ? "active" : "closed",
              options: opts,
              totalVotes,
            };
          });

          setLastSyncedTime(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );

          if (!silent) {
            success(`Live results for Poll #${pollId} updated.`);
          }
        }
      } catch (err: any) {
        if (!silent) {
          console.error("Failed to sync live poll:", err);
          toastError(err?.message || "Failed to fetch live poll results.");
        }
      } finally {
        setIsSyncingLive(false);
        setSyncingPollId(null);
      }
    },
    [success, toastError]
  );

  // Auto-sync interval when Presenter, Live Results modal, or Current Poll showcase is active
  useEffect(() => {
    const activePollId = presenterPoll?.id || liveResultsPoll?.id || currentPollId;
    if (!activePollId || !isLiveAutoSync) return;

    // Initial immediate fetch
    syncPollResults(activePollId, true);

    const interval = setInterval(() => {
      syncPollResults(activePollId, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [presenterPoll?.id, liveResultsPoll?.id, currentPollId, isLiveAutoSync, syncPollResults]);

  // Compute Categories for Filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    polls.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [polls]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = polls.length;
    const active = polls.filter((p) => p.status === "active").length;
    const closed = polls.filter((p) => p.status === "closed").length;
    const drafts = polls.filter((p) => p.status === "draft").length;
    const totalVotes = polls.reduce((acc, curr) => acc + curr.totalVotes, 0);
    return { total, active, closed, drafts, totalVotes };
  }, [polls]);

  // Current Poll Object (defaults to currentPollId or first available poll)
  const currentPoll = useMemo(() => {
    return polls.find((p) => p.id === currentPollId) || (polls.length > 0 ? polls[0] : null);
  }, [polls, currentPollId]);

  // Filtered Polls
  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const matchSearch =
        poll.question.toLowerCase().includes(search.toLowerCase()) ||
        poll.sessionTitle.toLowerCase().includes(search.toLowerCase()) ||
        (poll.speakerName && poll.speakerName.toLowerCase().includes(search.toLowerCase())) ||
        poll.options.some((opt) => opt.text.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && poll.status === "active") ||
        (statusFilter === "Closed" && poll.status === "closed") ||
        (statusFilter === "Draft" && poll.status === "draft") ||
        (statusFilter === "Scheduled" && poll.status === "scheduled");

      const matchCategory =
        categoryFilter === "All" || poll.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [polls, search, statusFilter, categoryFilter]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPoll(null);
    setQuestion("");
    setSessionTitle("");
    setSpeakerName("");
    setPollType("single");
    setPollStatus("active");
    setOptions(["", "", "", ""]);
    setAllowAnonymous(true);
    setShowLiveResults(true);
    setTimerMinutes(5);
    setCategory("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: PollItem) => {
    setEditingPoll(p);
    setQuestion(p.question);
    setSessionTitle(p.sessionTitle);
    setSpeakerName(p.speakerName || "");
    setPollType(p.type);
    setPollStatus(p.status);
    setOptions(p.options.map((o) => o.text));
    setAllowAnonymous(p.allowAnonymous);
    setShowLiveResults(p.showLiveResults);
    setTimerMinutes(p.timerMinutes || 5);
    setCategory(p.category || "");
    setIsModalOpen(true);
  };

  // Options input management
  const handleAddOptionField = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOptionField = (idx: number) => {
    if (options.length <= 4) {
      toastError("A poll must contain at least 4 choices as required by the API.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  // Save / Update Poll Form
  const handleSavePoll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toastError("Please enter a poll question.");
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanOptions.length < 4) {
      toastError("Please provide at least 4 non-empty options (required by API).");
      return;
    }

    if (editingPoll) {
      // Local Update
      const updated: PollItem = {
        ...editingPoll,
        question: question.trim(),
        sessionTitle: sessionTitle.trim(),
        speakerName: speakerName.trim() || undefined,
        type: pollType,
        status: pollStatus,
        allowAnonymous,
        showLiveResults,
        timerMinutes: Number(timerMinutes),
        category: category.trim(),
        options: cleanOptions.map((text, idx) => {
          const existing = editingPoll.options[idx];
          return {
            id: existing ? existing.id : `opt-${Date.now()}-${idx}`,
            text,
            votes: existing ? existing.votes : 0,
          };
        }),
      };

      setPolls((prev) => prev.map((p) => (p.id === editingPoll.id ? updated : p)));
      success("Poll updated successfully!");
      setIsModalOpen(false);
    } else {
      // Call createPoll API
      setIsSubmitting(true);
      try {
        await createPoll({
          question: question.trim(),
          options: cleanOptions,
        });

        success("Live poll created successfully via API!");
        setIsModalOpen(false);
        await fetchPolls();
      } catch (err: any) {
        console.error("Failed to create poll via API:", err);
        toastError(err?.message || "Failed to create poll on API");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Delete Poll with SweetAlert2
  const handleDeletePoll = async (p: PollItem) => {
    const result = await Swal.fire({
      title: "Delete Poll?",
      html: `Are you sure you want to delete this poll:<br/><strong>"${p.question}"</strong>?<br/>This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#AA2D7B",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      background: "#ffffff",
      customClass: {
        popup: "rounded-2xl shadow-xl border border-gray-100",
      },
    });

    if (result.isConfirmed) {
      setPolls((prev) => prev.filter((item) => item.id !== p.id));
      success("Poll deleted successfully.");
    }
  };

  // Reset Votes with SweetAlert2
  const handleResetVotes = async (p: PollItem) => {
    const result = await Swal.fire({
      title: "Reset Vote Counts?",
      text: "All attendee votes for this poll will be reset back to 0.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#AA2D7B",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Reset to Zero",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setPolls((prev) =>
        prev.map((item) => {
          if (item.id === p.id) {
            return {
              ...item,
              totalVotes: 0,
              options: item.options.map((o) => ({ ...o, votes: 0 })),
            };
          }
          return item;
        })
      );
      success("Vote counts have been reset.");
    }
  };

  // Toggle Poll Status (Active / Closed / Draft)
  const handleToggleStatus = (p: PollItem, newStatus: "active" | "closed" | "draft") => {
    setPolls((prev) =>
      prev.map((item) => {
        if (item.id === p.id) {
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
    if (newStatus === "active") {
      success(`Poll is now LIVE for attendees!`);
    } else if (newStatus === "closed") {
      info(`Poll has been closed.`);
    } else {
      info(`Poll set to Draft.`);
    }
  };

  // Cast a Test Vote via API
  const handleCastVote = async () => {
    if (!votingPoll || !selectedOptionId) {
      toastError("Please choose an option to vote.");
      return;
    }

    setIsVoting(true);
    try {
      const numericPollId = Number(votingPoll.id);
      const numericOptionId = Number(selectedOptionId);

      if (!isNaN(numericPollId) && !isNaN(numericOptionId)) {
        await votePoll(numericPollId, numericOptionId);
        success("Vote recorded successfully via API!");
        await syncPollResults(numericPollId, true);
        await fetchPolls();
      } else {
        // Fallback local update
        setPolls((prev) =>
          prev.map((p) => {
            if (p.id === votingPoll.id) {
              const updatedOptions = p.options.map((o) => {
                if (String(o.id) === String(selectedOptionId)) {
                  return { ...o, votes: o.votes + 1 };
                }
                return o;
              });
              const updatedTotal = p.totalVotes + 1;
              return { ...p, options: updatedOptions, totalVotes: updatedTotal };
            }
            return p;
          })
        );
        success("Vote recorded locally!");
      }
      setSelectedOptionId(null);
      setVotingPoll(null);
    } catch (err: any) {
      console.error("Failed to cast vote:", err);
      toastError(err?.message || "Failed to cast vote on server.");
    } finally {
      setIsVoting(false);
    }
  };

  // Export Poll Results as CSV
  const handleExportCSV = (p: PollItem) => {
    let csv = `Poll Question,"${p.question.replace(/"/g, '""')}"\n`;
    csv += `Session,"${p.sessionTitle.replace(/"/g, '""')}"\n`;
    csv += `Speaker,"${(p.speakerName || "N/A").replace(/"/g, '""')}"\n`;
    csv += `Status,${p.status.toUpperCase()}\n`;
    csv += `Total Votes,${p.totalVotes}\n\n`;
    csv += `Option,Votes,Percentage\n`;

    p.options.forEach((opt) => {
      const pct = p.totalVotes > 0 ? ((opt.votes / p.totalVotes) * 100).toFixed(1) : "0.0";
      csv += `"${opt.text.replace(/"/g, '""')}",${opt.votes},${pct}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `poll_${p.id}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Poll results downloaded as CSV.");
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <PageMeta
        title="Conference Polls | Kaizen Con Admin"
        description="Manage live interactive voting, audience polling, and instant feedback for conference sessions."
      />

      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Polls Card */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Polls
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-[#AA2D7B]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8" />
                <path d="M7 16V12" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 16V8" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M17 16V10" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">active tracks</span>
          </div>
        </div>

        {/* Live Active Polls */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Live Active
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">accepting votes</span>
          </div>
        </div>

        {/* Total Votes Cast */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Votes Cast
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats.totalVotes.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">delegate votes</span>
          </div>
        </div>

        {/* Avg Engagement / Participation */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Avg. Per Poll
            </span>
            <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-[#D85A9A]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats.total > 0 ? Math.round(stats.totalVotes / stats.total) : 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">votes / question</span>
          </div>
        </div>
      </div>

      {/* Main Container with AdminPageContainer */}
      <AdminPageContainer
        title="Live Interactive Polls"
        subtitle="Manage live audience questions, instant voting, and projector stage screen for plenary sessions."
        searchPlaceholder="Search polls by question, session, speaker or options..."
        searchValue={search}
        onSearchChange={setSearch}
        actionButton={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchPolls(true)}
              disabled={isRefreshing}
              title="Refresh polls list from API"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              <svg
                className={`w-4 h-4 text-gray-500 ${isRefreshing ? "animate-spin text-[#AA2D7B]" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#AA2D7B] hover:bg-[#8e2466] active:scale-98 rounded-xl shadow-sm transition-all duration-150 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Poll</span>
            </button>
          </div>
        }
      >
        {/* Error Alert with Retry */}
        {fetchError && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => fetchPolls(true)}
              className="px-3 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-900 dark:text-rose-200 rounded-lg font-semibold transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <svg className="w-8 h-8 animate-spin text-[#AA2D7B] mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Loading live polls from server...
            </p>
          </div>
        )}
        {/* Filters Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-5 mb-5 border-b border-gray-100 dark:border-gray-800">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl text-xs font-medium">
            {["All", "Active", "Closed", "Draft"].map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-white dark:bg-gray-900 text-[#AA2D7B] dark:text-purple-300 font-semibold shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  {tab === "Active" ? "● Live (Active)" : tab}
                </button>
              );
            })}
          </div>

          {/* Category / Session Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Track Filter:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#AA2D7B]"
            >
              <option value="All">All Tracks / Sessions</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Empty State */}
        {!isLoading && filteredPolls.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#AA2D7B] flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8" />
                <path d="M7 16V12" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 16V8" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M17 16V10" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No polls found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
              {search || statusFilter !== "All" || categoryFilter !== "All"
                ? "No polls match your current filter criteria. Try clearing search or filters."
                : "Get started by creating the first live voting poll for your conference attendees."}
            </p>
            <div className="mt-5">
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#AA2D7B] hover:bg-[#8e2466] rounded-xl shadow-xs cursor-pointer"
              >
                + Create Poll Now
              </button>
            </div>
          </div>
        )}

        {/* CURRENT ACTIVE POLL LIVE RESULTS SHOWCASE */}
        {!isLoading && currentPoll && (
          <div className="mb-8 rounded-2xl border-2 border-[#AA2D7B]/30 dark:border-[#AA2D7B]/40 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent p-5 sm:p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  CURRENT LIVE POLL RESULTS
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  ID #{currentPoll.id} • {currentPoll.sessionTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Auto-Sync Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLiveAutoSync((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                    isLiveAutoSync
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                  title="Toggle 3s live polling"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLiveAutoSync ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}></span>
                  <span>{isLiveAutoSync ? "Live (3s)" : "Paused"}</span>
                </button>

                {/* Manual Sync Button calling getPolls(currentPoll.id) */}
                <button
                  type="button"
                  onClick={() => syncPollResults(currentPoll.id)}
                  disabled={isSyncingLive}
                  title="Sync live results via GET /polling/api/polls/{id}"
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${isSyncingLive ? "animate-spin text-[#AA2D7B]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sync Now</span>
                </button>
              </div>
            </div>

            {/* Current Poll Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#AA2D7B] dark:text-[#D85A9A]">
                      Live Question
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug mt-1">
                      {currentPoll.question}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-[#AA2D7B] dark:text-[#D85A9A]">
                      {currentPoll.totalVotes}
                    </span>
                    <span className="text-[10px] block uppercase tracking-wider text-gray-500 font-semibold">
                      Total Votes
                    </span>
                  </div>
                </div>

                {/* Live Options Bars */}
                <div className="space-y-2.5 pt-1">
                  {currentPoll.options.map((opt, idx) => {
                    const percentage = currentPoll.totalVotes > 0
                      ? Math.round((opt.votes / currentPoll.totalVotes) * 100)
                      : 0;
                    const highest = Math.max(...currentPoll.options.map((o) => o.votes), 0);
                    const isLead = highest > 0 && opt.votes === highest;

                    return (
                      <div key={opt.id} className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-700 font-mono text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                              {opt.text}
                            </span>
                            {isLead && currentPoll.totalVotes > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                🏆 LEADING
                              </span>
                            )}
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-gray-900 dark:text-white mr-1.5">
                              {percentage}%
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              ({opt.votes} votes)
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isLead && currentPoll.totalVotes > 0
                                ? "bg-gradient-to-r from-[#AA2D7B] to-[#D85A9A]"
                                : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Controls for Current Poll */}
              <div className="flex flex-col justify-between p-4 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 space-y-3">
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Current Poll Actions
                  </h4>

                  <button
                    type="button"
                    onClick={() => {
                      setPresenterPoll(currentPoll);
                      syncPollResults(currentPoll.id);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-[#AA2D7B] hover:bg-[#8e2466] rounded-xl transition cursor-pointer shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Stage Presenter View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVotingPoll(currentPoll);
                      setSelectedOptionId(null);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl transition cursor-pointer border border-purple-200 dark:border-purple-800"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Simulate Attendee Vote</span>
                  </button>

                  {currentPoll.qr_code_url && (
                    <button
                      type="button"
                      onClick={() => setViewingQrPoll(currentPoll)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition cursor-pointer border border-emerald-200 dark:border-emerald-800"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <span>Show QR Code</span>
                    </button>
                  )}

                  {currentPoll.poll_url && (
                    <a
                      href={currentPoll.poll_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition border border-blue-200 dark:border-blue-800"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>Public Voting Link</span>
                    </a>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-center text-[11px] text-gray-500 dark:text-gray-400">
                  {lastSyncedTime ? `Synced: ${lastSyncedTime}` : "Click 'Show Results' on any question below"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Header: All Conference Questions */}
        {!isLoading && filteredPolls.length > 0 && (
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>All Conference Questions ({filteredPolls.length})</span>
              <span className="text-xs font-normal text-gray-500 hidden sm:inline">
                • Click "Show Results" on any question to view its live results
              </span>
            </h3>
          </div>
        )}

        {/* Polls Cards Grid */}
        {!isLoading && filteredPolls.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredPolls.map((poll) => {
              // Find highest voted option
              let highestVotes = 0;
              poll.options.forEach((o) => {
                if (o.votes > highestVotes) highestVotes = o.votes;
              });

              const isSelected = poll.id === currentPollId;

              return (
                <div
                  key={poll.id}
                  className={`flex flex-col justify-between bg-white dark:bg-gray-900/90 border rounded-2xl p-5 shadow-xs transition-all duration-200 ${
                    isSelected
                      ? "border-[#AA2D7B] ring-2 ring-[#AA2D7B]/20 shadow-md"
                      : "border-gray-200 dark:border-gray-800 hover:border-[#AA2D7B]/40"
                  }`}
                >
                  {/* Header Information */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Currently Selected Indicator */}
                        {isSelected && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/70 text-[#AA2D7B] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#AA2D7B]"></span>
                            Selected Current Poll
                          </span>
                        )}
                        {/* Status Badge */}
                        {poll.status === "active" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            LIVE NOW
                          </span>
                        )}
                      {poll.status === "closed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          CLOSED
                        </span>
                      )}
                      {poll.status === "draft" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          DRAFT
                        </span>
                      )}
                      {poll.status === "scheduled" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                          SCHEDULED
                        </span>
                      )}

                      {/* Track Category */}
                      {poll.category && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-purple-50 dark:bg-purple-950/50 text-[#AA2D7B] dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                          {poll.category}
                        </span>
                      )}
                    </div>

                    {/* Quick Total Votes & Real-Time Sync */}
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {poll.totalVotes}{" "}
                        <span className="font-normal text-gray-500 dark:text-gray-400">votes</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          syncPollResults(poll.id);
                        }}
                        title="Sync live results for this poll (GET /polling/api/polls/{id})"
                        className="p-1 rounded-md text-gray-400 hover:text-[#AA2D7B] hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${syncingPollId === poll.id ? "animate-spin text-[#AA2D7B]" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Question */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug mb-1.5">
                    {poll.question}
                  </h3>

                  {/* Session & Speaker info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {poll.sessionTitle}
                    </span>
                    {poll.speakerName && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {poll.speakerName}
                      </span>
                    )}
                  </div>

                  {/* Options & Progress Bars */}
                  <div className="space-y-2.5 my-4">
                    {poll.options.map((opt) => {
                      const percentage =
                        poll.totalVotes > 0
                          ? Math.round((opt.votes / poll.totalVotes) * 100)
                          : 0;
                      const isLeading = highestVotes > 0 && opt.votes === highestVotes;

                      return (
                        <div key={opt.id} className="group relative">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                              {isLeading && poll.totalVotes > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold">
                                  LEAD
                                </span>
                              )}
                              {opt.text}
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {opt.votes}{" "}
                              <span className="text-gray-400 font-normal">({percentage}%)</span>
                            </span>
                          </div>

                          {/* Progress track */}
                          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                isLeading && poll.totalVotes > 0
                                  ? "bg-gradient-to-r from-[#AA2D7B] to-[#D85A9A]"
                                  : "bg-gray-400 dark:bg-gray-600"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls & Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-2 flex flex-wrap items-center justify-between gap-2">
                  {/* Left: Quick Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Show Results Button (selects this question as Current Poll & calls getPolls(poll.id)) */}
                    <button
                      onClick={() => {
                        setCurrentPollId(poll.id);
                        syncPollResults(poll.id);
                      }}
                      title="Show and inspect live results for this question"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        currentPollId === poll.id
                          ? "bg-[#AA2D7B] text-white shadow-xs"
                          : "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60"
                      }`}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentPollId === poll.id ? "bg-white" : "bg-purple-500"}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${currentPollId === poll.id ? "bg-white" : "bg-purple-600"}`}></span>
                      </span>
                      <span>{currentPollId === poll.id ? "Current Poll" : "Show Results"}</span>
                    </button>

                    {/* Live Results Monitor Modal Button */}
                    <button
                      onClick={() => {
                        setLiveResultsPoll(poll);
                        syncPollResults(poll.id);
                      }}
                      title="Monitor Live Poll Results in Dialog"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Results Dialog</span>
                    </button>

                    {/* Stage Presentation Mode */}
                    <button
                      onClick={() => {
                        setPresenterPoll(poll);
                        syncPollResults(poll.id);
                      }}
                      title="Open Stage Projector Mode"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-[#AA2D7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Stage View</span>
                    </button>

                    {/* Test Vote */}
                    <button
                      onClick={() => {
                        setVotingPoll(poll);
                        setSelectedOptionId(null);
                      }}
                      title="Test Vote as Delegate"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Test Vote</span>
                    </button>

                    {/* QR Code Preview / Scan Button */}
                    {poll.qr_code_url && (
                      <button
                        onClick={() => setViewingQrPoll(poll)}
                        title="View / Scan QR Code"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span>QR Code</span>
                      </button>
                    )}

                    {/* Live Voting Page Link if returned by API */}
                    {poll.poll_url && (
                      <a
                        href={poll.poll_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Live Voting Page"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Voting Link</span>
                      </a>
                    )}

                    {/* Export */}
                    <button
                      onClick={() => handleExportCSV(poll)}
                      title="Download CSV Results"
                      className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>

                  {/* Right: State Toggles & Edit/Delete */}
                  <div className="flex items-center gap-1.5">
                    {/* Status Toggle Button */}
                    {poll.status === "active" ? (
                      <button
                        onClick={() => handleToggleStatus(poll, "closed")}
                        className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg transition cursor-pointer"
                      >
                        Close Poll
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(poll, "active")}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg transition cursor-pointer"
                      >
                        Make Live
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEditModal(poll)}
                      title="Edit Poll"
                      className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Reset Votes */}
                    <button
                      onClick={() => handleResetVotes(poll)}
                      title="Reset Votes"
                      className="p-1.5 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeletePoll(poll)}
                      title="Delete Poll"
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </AdminPageContainer>

      {/* CREATE / EDIT POLL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg md:max-w-xl lg:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {editingPoll ? "Edit Conference Poll" : "Create New Live Poll"}
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Configure voting options, session track, and live projector settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form with Scrollable Body and Fixed Footer */}
            <form onSubmit={handleSavePoll} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-3.5">
                {/* Question */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Poll Question / Prompt <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Will robotic surgery outperform human precision by 2030?"
                    className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 sm:p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#AA2D7B]/30 resize-y"
                  />
                </div>

                {/* Session Track & Speaker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Conference Session / Title
                    </label>
                    <input
                      type="text"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      placeholder="e.g. Keynote Robotics"
                      className="w-full text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 sm:py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#AA2D7B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Moderator / Speaker Name
                    </label>
                    <input
                      type="text"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      placeholder="e.g. Dr. Maya Lin"
                      className="w-full text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 sm:py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#AA2D7B]"
                    />
                  </div>
                </div>

                {/* Track Code & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Track Code / Tag
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. SURG-AI, CLINICAL, BCI"
                      className="w-full text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 sm:py-2 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Initial Status
                    </label>
                    <select
                      value={pollStatus}
                      onChange={(e) => setPollStatus(e.target.value as any)}
                      className="w-full text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 sm:py-2 text-gray-900 dark:text-white focus:outline-none"
                    >
                      <option value="active">Active (Live Voting Now)</option>
                      <option value="draft">Draft (Hidden)</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Options Dynamic List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Poll Choices / Options <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOptionField}
                      className="text-xs font-semibold text-[#AA2D7B] hover:text-[#8e2466] flex items-center gap-1 cursor-pointer"
                    >
                      + Add Choice
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-gray-400 font-mono text-center shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 sm:py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#AA2D7B]"
                        />
                        {options.length > 4 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionField(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowAnonymous}
                      onChange={(e) => setAllowAnonymous(e.target.checked)}
                      className="rounded text-[#AA2D7B] focus:ring-[#AA2D7B]"
                    />
                    <span>Allow anonymous delegate voting</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLiveResults}
                      onChange={(e) => setShowLiveResults(e.target.checked)}
                      className="rounded text-[#AA2D7B] focus:ring-[#AA2D7B]"
                    />
                    <span>Show real-time percentage bars</span>
                  </label>
                </div>
              </div>

              {/* Modal Fixed Footer */}
              <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition flex items-center gap-2 ${
                    isSubmitting
                      ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
                      : "bg-[#AA2D7B] hover:bg-[#8e2466] cursor-pointer"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating Poll...</span>
                    </>
                  ) : editingPoll ? (
                    "Save Changes"
                  ) : (
                    "Create Poll"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE RESULTS MONITOR MODAL (GET /polling/api/polls/{poll_id}) */}
      {liveResultsPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-purple-500/5 to-transparent shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Live Poll Results
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        liveResultsPoll.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {liveResultsPoll.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                    ID #{liveResultsPoll.id} • {liveResultsPoll.sessionTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Auto-Sync Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLiveAutoSync((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                    isLiveAutoSync
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                  }`}
                  title={isLiveAutoSync ? "Auto-refresh active every 3s" : "Auto-refresh is paused"}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLiveAutoSync ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                    }`}
                  ></span>
                  <span>{isLiveAutoSync ? "Live (3s)" : "Paused"}</span>
                </button>

                {/* Manual Sync Button */}
                <button
                  type="button"
                  onClick={() => syncPollResults(liveResultsPoll.id)}
                  disabled={isSyncingLive}
                  title="Sync latest live votes from server (GET /polling/api/polls/{id})"
                  className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
                >
                  <svg
                    className={`w-4 h-4 ${isSyncingLive ? "animate-spin text-[#AA2D7B]" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setLiveResultsPoll(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Question & Total Count Banner */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                    {liveResultsPoll.question}
                  </h4>
                  <div className="text-right shrink-0">
                    <span className="text-xl sm:text-2xl font-black text-[#AA2D7B] dark:text-[#D85A9A]">
                      {liveResultsPoll.totalVotes}
                    </span>
                    <span className="text-[11px] block text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                      Total Votes
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Result Bars */}
              <div className="space-y-3">
                {liveResultsPoll.options.map((opt, idx) => {
                  const percentage =
                    liveResultsPoll.totalVotes > 0
                      ? Math.round((opt.votes / liveResultsPoll.totalVotes) * 100)
                      : 0;
                  const highestVotes = Math.max(
                    ...liveResultsPoll.options.map((o) => o.votes),
                    0
                  );
                  const isLeading = highestVotes > 0 && opt.votes === highestVotes;

                  return (
                    <div
                      key={opt.id}
                      className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs transition"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">
                            {opt.text}
                          </span>
                          {isLeading && liveResultsPoll.totalVotes > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              🏆 LEADING
                            </span>
                          )}
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-gray-900 dark:text-white mr-1.5">
                            {percentage}%
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            ({opt.votes} votes)
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isLeading && liveResultsPoll.totalVotes > 0
                              ? "bg-gradient-to-r from-[#AA2D7B] to-[#D85A9A]"
                              : "bg-gray-300 dark:bg-gray-700"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions inside Live Modal */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPresenterPoll(liveResultsPoll);
                      setLiveResultsPoll(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-[#AA2D7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Stage Presenter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVotingPoll(liveResultsPoll);
                      setSelectedOptionId(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-medium transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Simulate Vote</span>
                  </button>

                  {liveResultsPoll.qr_code_url && (
                    <button
                      type="button"
                      onClick={() => setViewingQrPoll(liveResultsPoll)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <span>Show QR</span>
                    </button>
                  )}
                </div>

                {lastSyncedTime && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    Synced: {lastSyncedTime}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Live endpoint: <code className="font-mono text-[#AA2D7B]">GET /polling/api/polls/{liveResultsPoll.id}</code>
              </span>
              <button
                type="button"
                onClick={() => setLiveResultsPoll(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE PRESENTER VIEW (FULLSCREEN PROJECTOR VIEW) */}
      {presenterPoll && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b border-gray-800/80 bg-gray-900/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE STAGE POLL
              </span>
              <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                {presenterPoll.sessionTitle}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Auto Sync Toggle */}
              <button
                type="button"
                onClick={() => setIsLiveAutoSync((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition cursor-pointer ${
                  isLiveAutoSync
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                }`}
                title="Toggle real-time auto sync"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isLiveAutoSync ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`}></span>
                <span>{isLiveAutoSync ? "Live (3s)" : "Paused"}</span>
              </button>

              {/* Sync Now button */}
              <button
                type="button"
                onClick={() => syncPollResults(presenterPoll.id)}
                disabled={isSyncingLive}
                title="Refresh live poll results immediately (GET /polling/api/polls/{id})"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 ${isSyncingLive ? "animate-spin text-[#D85A9A]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isSyncingLive ? "Syncing..." : "Sync"}</span>
              </button>

              <span className="text-sm font-semibold text-purple-300">
                {presenterPoll.totalVotes} Total Votes
              </span>
              <button
                onClick={() => setPresenterPoll(null)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition cursor-pointer"
              >
                ✕ Close Presenter
              </button>
            </div>
          </div>

          {/* Presentation Body */}
          <div className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto p-8 sm:p-12">
            <span className="text-sm font-semibold text-[#D85A9A] tracking-wider uppercase mb-2">
              Audience Interactive Question
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-8">
              {presenterPoll.question}
            </h1>

            {/* Live Animated Options */}
            <div className="space-y-4">
              {presenterPoll.options.map((opt, idx) => {
                const percentage =
                  presenterPoll.totalVotes > 0
                    ? Math.round((opt.votes / presenterPoll.totalVotes) * 100)
                    : 0;

                return (
                  <div
                    key={opt.id}
                    className="relative overflow-hidden bg-gray-900/80 border border-gray-800 rounded-2xl p-4 sm:p-5"
                  >
                    {/* Background Progress Bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#AA2D7B]/30 to-[#D85A9A]/20 transition-all duration-700 ease-out"
                      style={{ width: `${percentage}%` }}
                    />

                    {/* Content */}
                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-gray-800/90 text-gray-300 font-mono text-xs flex items-center justify-center font-bold">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-base sm:text-lg font-medium text-white">
                          {opt.text}
                        </span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-lg sm:text-2xl font-bold text-white">
                          {percentage}%
                        </span>
                        <span className="text-xs text-gray-400 block">
                          {opt.votes} votes
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live QR Code & Link if returned by API */}
            {presenterPoll.qr_code_url && (
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-gray-900/80 border border-gray-800">
                <img
                  src={presenterPoll.qr_code_url}
                  alt="Poll QR Code"
                  className="w-24 h-24 rounded-lg bg-white p-1.5 object-contain"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">Scan to Vote on your Device</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Open your camera and scan the QR code to submit your response in real-time.
                  </p>
                  {presenterPoll.poll_url && (
                    <a
                      href={presenterPoll.poll_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#D85A9A] hover:underline mt-1.5 block truncate max-w-md font-mono"
                    >
                      {presenterPoll.poll_url}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Quick Test Vote in Presenter */}
            <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>Scan QR code with badge / open Kaizen Con app to submit vote</span>
              <button
                onClick={() => {
                  setVotingPoll(presenterPoll);
                  setSelectedOptionId(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 transition cursor-pointer"
              >
                + Simulate Attendee Vote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEST / SIMULATE ATTENDEE VOTE MODAL */}
      {votingPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md max-h-[90vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Cast Test Vote (Delegate Preview)
              </h3>
              <button
                type="button"
                onClick={() => setVotingPoll(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-3">
              <p className="text-[11px] font-semibold text-[#AA2D7B] uppercase tracking-wider">
                {votingPoll.sessionTitle}
              </p>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                {votingPoll.question}
              </h4>

              <div className="space-y-2 pt-1 max-h-60 overflow-y-auto">
                {votingPoll.options.map((opt) => {
                  const selected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                        selected
                          ? "border-[#AA2D7B] bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-semibold ring-1 ring-[#AA2D7B]"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span>{opt.text}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          selected
                            ? "border-[#AA2D7B] bg-[#AA2D7B]"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2 bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
              <button
                type="button"
                onClick={() => setVotingPoll(null)}
                className="px-3.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCastVote}
                disabled={!selectedOptionId || isVoting}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition ${
                  selectedOptionId && !isVoting
                    ? "bg-[#AA2D7B] hover:bg-[#8e2466] cursor-pointer"
                    : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                }`}
              >
                {isVoting ? "Submitting..." : "Submit Vote"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QR CODE PREVIEW MODAL (GET /polling/api/polls/{poll_id}/qr) */}
      {viewingQrPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Attendee QR Code
              </h3>
              <button
                type="button"
                onClick={() => setViewingQrPoll(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
              {viewingQrPoll.question}
            </p>

            <div className="p-3 bg-white rounded-2xl border border-gray-200 inline-block shadow-sm">
              <img
                src={getPollQrCodeUrl(viewingQrPoll.id)}
                alt="Poll QR Code PNG"
                className="w-48 h-48 mx-auto object-contain rounded-lg"
              />
            </div>

            {/* Direct PNG download and view actions */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => handleDownloadQr(viewingQrPoll.id)}
                disabled={isDownloadingQr}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-60"
              >
                <svg className={`w-3.5 h-3.5 ${isDownloadingQr ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{isDownloadingQr ? "Downloading..." : "Download PNG"}</span>
              </button>

              <a
                href={getPollQrCodeUrl(viewingQrPoll.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>View Raw PNG</span>
              </a>
            </div>

            {viewingQrPoll.poll_url && (
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  readOnly
                  value={viewingQrPoll.poll_url}
                  className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-center text-gray-600 dark:text-gray-300 select-all"
                />
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingQrPoll.poll_url!);
                      success("Voting URL copied to clipboard!");
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#8e2466] rounded-lg transition cursor-pointer"
                  >
                    Copy Link
                  </button>
                  <a
                    href={viewingQrPoll.poll_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    Open Voting Page
                  </a>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 font-mono">
              GET /polling/api/polls/{viewingQrPoll.id}/qr
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
