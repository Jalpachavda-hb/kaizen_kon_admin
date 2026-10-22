import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageContainer } from "../../components/common/AdminPageContainer";
import {
  SpeakersIcon,
  SessionsIcon,
  DelegatesIcon,
} from "../../icons/conferenceIcons";
import { getSpeakers, getSessions, getDelegates, BASE_URL } from "../../api/ApiPath";
import { ConferenceAnalyticsChart } from "../../components/dashboard/ConferenceAnalyticsChart";

interface SessionItem {
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
}

interface SpeakerItem {
  id: number;
  speaker_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  designation?: string;
  speciality?: string;
  institution?: string;
  bio?: string;
  profile_image_url?: string;
  session_status?: string;
}

interface DelegateItem {
  id: number;
  registration_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  institution?: string;
  designation?: string;
  speciality?: string;
  registration_status?: string;
  created_at?: string;
}

export default function Home() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [delegates, setDelegates] = useState<DelegateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real data for all 3 entities
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const [sessionsRes, speakersRes, delegatesRes] = await Promise.allSettled([
        getSessions(),
        getSpeakers(),
        getDelegates(),
      ]);

      // Process Sessions
      if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value)) {
        setSessions(sessionsRes.value as SessionItem[]);
      } else if (
        sessionsRes.status === "fulfilled" &&
        sessionsRes.value &&
        Array.isArray((sessionsRes.value as any).results)
      ) {
        setSessions((sessionsRes.value as any).results);
      }

      // Process Speakers
      if (speakersRes.status === "fulfilled" && speakersRes.value) {
        const val = speakersRes.value as any;
        if (Array.isArray(val.results)) {
          setSpeakers(val.results);
        } else if (Array.isArray(val)) {
          setSpeakers(val);
        }
      }

      // Process Delegates
      if (delegatesRes.status === "fulfilled" && delegatesRes.value) {
        const val = delegatesRes.value as any;
        if (Array.isArray(val.results)) {
          setDelegates(val.results);
        } else if (Array.isArray(val)) {
          setDelegates(val);
        }
      }
    } catch (err: any) {
      console.error("Error loading dashboard live data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Map of speaker_id -> Speaker details
  const speakerMap = useMemo(() => {
    const map = new Map<number, SpeakerItem>();
    speakers.forEach((s) => {
      map.set(s.id, s);
    });
    return map;
  }, [speakers]);

  // Unique Specialities / Tracks across all real data
  const uniqueSpecialities = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.category && s.category.toLowerCase() !== "break") {
        set.add(s.category.trim());
      }
    });
    speakers.forEach((sp) => {
      if (sp.speciality) set.add(sp.speciality.trim());
    });
    delegates.forEach((d) => {
      if (d.speciality) set.add(d.speciality.trim());
    });
    return Array.from(set).sort();
  }, [sessions, speakers, delegates]);

  // Derived real metrics
  const confirmedDelegatesCount = useMemo(
    () => delegates.filter((d) => (d.registration_status || "").toLowerCase() === "confirmed").length,
    [delegates]
  );
  const pendingDelegatesCount = useMemo(
    () => delegates.filter((d) => (d.registration_status || "").toLowerCase() === "pending").length,
    [delegates]
  );

  // Tracks / Categories Distribution from Real Sessions
  const tracksDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    const validSessions = sessions.filter((s) => s.category && s.category.toLowerCase() !== "break");
    validSessions.forEach((s) => {
      const cat = s.category.trim();
      map[cat] = (map[cat] || 0) + 1;
    });

    const colors = ["#AA2D7B", "#55355E", "#0284C7", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
    const total = validSessions.length || 1;

    return Object.entries(map).map(([name, count], index) => {
      const percent = Math.round((count / total) * 100);
      return {
        name,
        count: `${count} Session${count > 1 ? "s" : ""}`,
        percent,
        color: colors[index % colors.length],
      };
    });
  }, [sessions]);

  // Metrics cards config with 100% real data
  const metrics = [
    {
      title: "Registered Delegates",
      value: delegates.length.toString(),
      change: `${confirmedDelegatesCount} Confirmed • ${pendingDelegatesCount} Pending`,
      icon: <DelegatesIcon className="w-5 h-5 text-[#0284C7]" />,
      bg: "bg-sky-50/60 dark:bg-sky-950/20",
      border: "border-sky-200/80 dark:border-sky-900/40",
      description: "Live medical attendees enrolled across colleges",
      link: "/delegates",
    },
    {
      title: "Confirmed Speakers",
      value: speakers.length.toString(),
      change: "Specialist Faculty",
      icon: <SpeakersIcon className="w-5 h-5 text-[#55355E]" />,
      bg: "bg-[#f5eef4] dark:bg-[#55355E]/10",
      border: "border-[#55355E]/20 dark:border-[#55355E]/30",
      description: "Senior consultants across major departments",
      link: "/speakers",
    },
    {
      title: "Scheduled Sessions",
      value: sessions.length.toString(),
      change: "3 Event Days",
      icon: <SessionsIcon className="w-5 h-5 text-[#AA2D7B]" />,
      bg: "bg-[#faedf5] dark:bg-[#AA2D7B]/10",
      border: "border-[#AA2D7B]/20 dark:border-[#AA2D7B]/30",
      description: "RK Hospital Conference Hall & Auditorium",
      link: "/sessions",
    },
    {
      title: "Clinical Specialities",
      value: uniqueSpecialities.length.toString(),
      change: "Active Medical Tracks",
      icon: (
        <svg className="w-5 h-5 text-[#AA2D7B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
      border: "border-emerald-200/80 dark:border-emerald-900/40",
      description: "Cardiology, Neurology, Pediatrics, Gyn & more",
      link: "/sessions",
    },
  ];

  return (
    <>
      <PageMeta
        title="Dashboard | Kaizen Con 2027 Admin"
        description="Kaizen Con 2027 Medical & Healthcare Conference Administration"
      />

      <AdminPageContainer
        title="Conference Overview"
        subtitle="Live metrics, real-time schedule analytics, and faculty & delegate management for Kaizen Con 2027."
        searchPlaceholder="Type to search dashboard..."
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              to="/speakers"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#55355E] bg-white border border-[#AA2D7B]/30 hover:bg-[#faedf5] rounded-lg transition-colors shadow-xs"
            >
              <SpeakersIcon className="w-3.5 h-3.5" />
              Manage Speakers
            </Link>
            <Link
              to="/sessions"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#AA2D7B] hover:bg-[#D85A9A] rounded-lg shadow-xs transition-colors"
            >
              <SessionsIcon className="w-3.5 h-3.5" />
              Manage Sessions
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Welcome Hero Card with real live stats */}
          <div className="relative overflow-hidden rounded-2xl p-5 md:p-6 text-white bg-gradient-to-r from-[#55355E] via-[#AA2D7B] to-[#D85A9A] shadow-md">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white">
                  Live Conference Data
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/90">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Real API Connected
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Kaizen Con 2027 Administration Portal
              </h2>
              <p className="text-xs md:text-sm text-white/90 mt-1 leading-relaxed">
                Welcome to the central command hub. Track real-time delegate registrations, confirmed faculty speakers,
                and session schedules across all conference tracks.
              </p>
              <div className="flex flex-wrap gap-2.5 mt-4">
                <Link
                  to="/delegates"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-[#55355E] hover:bg-gray-100 transition-colors shadow-xs"
                >
                  <DelegatesIcon className="w-3.5 h-3.5 text-[#0284C7]" />
                  View All Delegates ({delegates.length})
                </Link>
                <Link
                  to="/sessions"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors"
                >
                  <SessionsIcon className="w-3.5 h-3.5 text-white" />
                  View Full Agenda ({sessions.length})
                </Link>
                <Link
                  to="/speakers"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors"
                >
                  <SpeakersIcon className="w-3.5 h-3.5 text-white" />
                  Faculty Speakers ({speakers.length})
                </Link>
              </div>
            </div>

            {/* Decorative background blurs */}
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute right-24 bottom-0 translate-y-12 w-48 h-48 rounded-full bg-[#D85A9A]/30 blur-2xl pointer-events-none" />
          </div>

          {/* Metric Stat Cards - 100% Real Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <Link
                key={m.title}
                to={m.link}
                className={`p-4 rounded-xl border ${m.border} ${m.bg} transition-all shadow-xs hover:shadow-md hover:scale-[1.01] duration-150 block`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {m.title}
                  </span>
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-2xs">
                    {m.icon}
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#55355E] dark:text-white tracking-tight">
                    {loading ? "..." : m.value}
                  </span>
                  <span className="text-[11px] font-bold text-[#AA2D7B] dark:text-[#f0c3df]">
                    {m.change}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {m.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Attractive Real Data Graph / Visual Analytics Component */}
          <ConferenceAnalyticsChart
            sessions={sessions}
            speakers={speakers}
            delegates={delegates}
          />

          {/* Two-Column Grid: Real Featured Sessions & Real Faculty Speakers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real Sessions Section (2 columns) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Live Conference Sessions</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#faedf5] text-[#55355E] dark:bg-[#55355E]/30 dark:text-[#f0c3df]">
                      {sessions.length} Scheduled
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Timetable entries loaded directly from schedules API
                  </p>
                </div>
                <Link
                  to="/sessions"
                  className="text-xs font-semibold text-[#AA2D7B] hover:text-[#D85A9A] transition-colors"
                >
                  Manage Sessions &rarr;
                </Link>
              </div>

              <div className="space-y-2.5">
                {sessions.slice(0, 5).map((s) => {
                  const speaker = s.speaker_id ? speakerMap.get(s.speaker_id) : null;
                  const isBreak = (s.category || "").toLowerCase() === "break";

                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-xl border ${
                        isBreak
                          ? "border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40"
                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-[#AA2D7B]/40"
                      } transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isBreak
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                : "bg-[#faedf5] text-[#55355E] dark:bg-[#55355E]/30 dark:text-[#f0c3df]"
                            }`}
                          >
                            {s.category}
                          </span>
                          <span className="text-[11px] font-semibold text-[#AA2D7B] dark:text-[#f0c3df]">
                            {s.room}
                          </span>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-[11px] font-medium text-gray-500">
                            {s.event_date}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {s.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate">
                          {speaker ? (
                            <>
                              Speaker: <span className="font-semibold text-gray-700 dark:text-gray-300">Dr. {speaker.first_name} {speaker.last_name}</span> ({speaker.speciality || speaker.designation})
                            </>
                          ) : (
                            <span>{s.description || "Networking and refreshments"}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                          {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {s.venue}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real Faculty Speakers Section (1 column) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Faculty &amp; Speakers</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#faedf5] text-[#55355E] dark:bg-[#55355E]/30 dark:text-[#f0c3df]">
                      {speakers.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Confirmed keynote and medical specialists
                  </p>
                </div>
                <Link
                  to="/speakers"
                  className="text-xs font-semibold text-[#AA2D7B] hover:text-[#D85A9A] transition-colors"
                >
                  Manage &rarr;
                </Link>
              </div>

              <div className="space-y-2.5">
                {speakers.slice(0, 5).map((sp) => {
                  const initials = `${sp.first_name?.[0] || ""}${sp.last_name?.[0] || ""}`.toUpperCase();
                  const photoUrl = sp.profile_image_url
                    ? sp.profile_image_url.startsWith("http")
                      ? sp.profile_image_url
                      : `${BASE_URL}${sp.profile_image_url}`
                    : null;

                  return (
                    <div
                      key={sp.id}
                      className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-[#AA2D7B]/30 transition-all flex items-center gap-3 shadow-2xs"
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={`${sp.first_name} ${sp.last_name}`}
                          className="w-10 h-10 rounded-full object-cover border border-[#AA2D7B]/20 shrink-0"
                          onError={(e) => {
                            // fallback to initials on error
                            (e.currentTarget as any).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#55355E] to-[#AA2D7B] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                          {initials || "DR"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          Dr. {sp.first_name} {sp.last_name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {sp.designation} • {sp.institution}
                        </div>
                        <div className="text-[10px] text-[#AA2D7B] font-semibold truncate mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#AA2D7B]" />
                          {sp.speciality || "Faculty"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real Delegates Snapshot & Clinical Tracks Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Registered Delegates (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Recent Registered Delegates</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                      {delegates.length} Enrolled
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Live attendee records from delegates API
                  </p>
                </div>
                <Link
                  to="/delegates"
                  className="text-xs font-semibold text-[#0284C7] hover:underline"
                >
                  View All Delegates &rarr;
                </Link>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3.5">Delegate</th>
                      <th className="py-2.5 px-3">Institution &amp; City</th>
                      <th className="py-2.5 px-3">Speciality</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {delegates.slice(0, 5).map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {d.first_name} {d.last_name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {d.designation}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                          <div className="truncate max-w-[180px]">{d.institution}</div>
                          <div className="text-[10px] text-gray-400">{d.city}, {d.state}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#faedf5] text-[#55355E] dark:bg-[#55355E]/30 dark:text-[#f0c3df]">
                            {d.speciality}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (d.registration_status || "").toLowerCase() === "confirmed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                            }`}
                          >
                            {(d.registration_status || "Pending").toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Real Clinical Tracks Distribution (1 col) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Tracks Distribution
                </h3>
                <span className="text-[11px] text-gray-500 font-medium">
                  {tracksDistribution.length} Tracks
                </span>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 space-y-3 shadow-2xs">
                {tracksDistribution.map((track) => (
                  <div key={track.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                        {track.name}
                      </span>
                      <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                        {track.count} ({track.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${track.percent}%`,
                          backgroundColor: track.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminPageContainer>
    </>
  );
}
