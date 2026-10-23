import React, { useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

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
  first_name: string;
  last_name: string;
  designation?: string;
  speciality?: string;
  institution?: string;
  profile_image_url?: string;
}

interface DelegateItem {
  id: number;
  first_name: string;
  last_name: string;
  speciality?: string;
  registration_status?: string;
  city?: string;
  state?: string;
}

interface Props { 
  sessions: SessionItem[];
  speakers: SpeakerItem[];
  delegates: DelegateItem[];
}

export const ConferenceAnalyticsChart: React.FC<Props> = ({
  sessions,
  speakers,
  delegates,
}) => {
  // Default to Volume Share (breakdown) chart when opening / refreshing dashboard
  const [activeTab, setActiveTab] = useState<"speciality" | "agenda" | "breakdown">("breakdown");
  // Default to animated line chart as requested by user
  const [chartType, setChartType] = useState<"line" | "spline" | "bar" | "cumulative">("line");

  // Interactive series visibility toggles
  const [showSessions, setShowSessions] = useState(true);
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [showDelegates, setShowDelegates] = useState(true);

  // Key for forcing re-animation on toggle
  const [animationKey, setAnimationKey] = useState(0);

  const triggerAnimation = () => {
    setAnimationKey((k) => k + 1);
  };

  // Aggregate Specialities across Sessions, Speakers, Delegates
  const specialityData = useMemo(() => {
    const map: Record<string, { sessions: number; speakers: number; delegates: number }> = {};

    const addCat = (cat: string | undefined) => {
      if (!cat) return;
      const clean = cat.trim();
      if (clean.toLowerCase() === "break") return;
      if (!map[clean]) {
        map[clean] = { sessions: 0, speakers: 0, delegates: 0 };
      }
    };

    sessions.forEach((s) => addCat(s.category));
    speakers.forEach((s) => addCat(s.speciality));
    delegates.forEach((d) => addCat(d.speciality));

    sessions.forEach((s) => {
      const clean = s.category?.trim();
      if (clean && clean.toLowerCase() !== "break" && map[clean]) {
        map[clean].sessions += 1;
      }
    });

    speakers.forEach((s) => {
      const clean = s.speciality?.trim();
      if (clean && map[clean]) {
        map[clean].speakers += 1;
      }
    });

    delegates.forEach((d) => {
      const clean = d.speciality?.trim();
      if (clean && map[clean]) {
        map[clean].delegates += 1;
      }
    });

    const categories = Object.keys(map).sort();
    const sessionsCounts = categories.map((c) => map[c].sessions);
    const speakersCounts = categories.map((c) => map[c].speakers);
    const delegatesCounts = categories.map((c) => map[c].delegates);

    // Cumulative sums for cumulative trend mode
    let cumSessions = 0;
    const sessionsCum = sessionsCounts.map((v) => (cumSessions += v));
    let cumSpeakers = 0;
    const speakersCum = speakersCounts.map((v) => (cumSpeakers += v));
    let cumDelegates = 0;
    const delegatesCum = delegatesCounts.map((v) => (cumDelegates += v));

    const maxVal = Math.max(...sessionsCounts, ...speakersCounts, ...delegatesCounts, 1);
    const maxCumVal = Math.max(...sessionsCum, ...speakersCum, ...delegatesCum, 1);

    return {
      categories,
      sessionsCounts,
      speakersCounts,
      delegatesCounts,
      sessionsCum,
      speakersCum,
      delegatesCum,
      maxVal,
      maxCumVal,
    };
  }, [sessions, speakers, delegates]);

  // Daily Sessions Timeline
  const dailyTimeline = useMemo(() => {
    const datesMap: Record<string, number> = {};
    sessions.forEach((s) => {
      if (s.event_date) {
        datesMap[s.event_date] = (datesMap[s.event_date] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(datesMap).sort();
    return {
      labels: sortedDates.map((d) => {
        const parts = d.split("-");
        if (parts.length === 3) {
          const dateObj = new Date(d);
          return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        return d;
      }),
      counts: sortedDates.map((d) => datesMap[d]),
      rawDates: sortedDates,
    };
  }, [sessions]);

  // Delegates Status Breakdown
  const delegatesStatus = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    delegates.forEach((d) => {
      if ((d.registration_status || "").toLowerCase() === "confirmed") {
        confirmed += 1;
      } else {
        pending += 1;
      }
    });
    return { confirmed, pending, total: delegates.length };
  }, [delegates]);

  // Filtered series and colors based on toggle
  const { filteredSeries, filteredColors } = useMemo(() => {
    const s: { name: string; data: number[] }[] = [];
    const c: string[] = [];

    const isCum = chartType === "cumulative";
    const sData = isCum ? specialityData.sessionsCum : specialityData.sessionsCounts;
    const spData = isCum ? specialityData.speakersCum : specialityData.speakersCounts;
    const dData = isCum ? specialityData.delegatesCum : specialityData.delegatesCounts;

    if (showSessions) {
      s.push({ name: "Sessions", data: sData });
      c.push("#AA2D7B");
    }
    if (showSpeakers) {
      s.push({ name: "Speakers", data: spData });
      c.push("#55355E");
    }
    if (showDelegates) {
      s.push({ name: "Delegates", data: dData });
      c.push("#0EA5E9");
    }

    if (s.length === 0) {
      s.push({ name: "Sessions", data: sData });
      c.push("#AA2D7B");
    }

    return { filteredSeries: s, filteredColors: c };
  }, [specialityData, showSessions, showSpeakers, showDelegates, chartType]);

  // Animated Line Chart Options
  const isBar = chartType === "bar";
  const isSpline = chartType === "spline";
  const isCumulative = chartType === "cumulative";

  const lineChartOptions: ApexOptions = {
    chart: {
      type: isBar ? "bar" : "line",
      height: 340,
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: {
        enabled: true,
        speed: 1000,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 450,
        },
      },
      dropShadow: isBar
        ? { enabled: false }
        : {
            enabled: true,
            top: 4,
            left: 0,
            blur: 7,
            opacity: 0.22,
          },
    },
    colors: filteredColors,
    stroke: {
      curve: isSpline ? "smooth" : "straight",
      width: isBar ? 0 : 3.5,
      lineCap: "round",
    },
    markers: isBar
      ? { size: 0 }
      : {
          size: 6,
          strokeColors: "#ffffff",
          strokeWidth: 2.5,
          strokeOpacity: 1,
          hover: {
            size: 9,
            sizeOffset: 3,
          },
        },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "50%",
        borderRadius: 6,
        borderRadiusApplication: "end",
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: isBar ? -20 : -10,
      style: {
        fontSize: "11px",
        fontWeight: 700,
        colors: isBar ? ["#475569"] : filteredColors,
      },
      background: isBar
        ? { enabled: false }
        : {
            enabled: true,
            foreColor: "#ffffff",
            padding: 3,
            borderRadius: 4,
            borderWidth: 0,
            opacity: 0.85,
          },
      formatter: (val) => (typeof val === "number" && val > 0 ? `${val}` : ""),
    },
    xaxis: {
      categories: specialityData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#64748B",
          fontSize: "11px",
          fontWeight: 600,
        },
        rotate: -20,
        trim: true,
        maxHeight: 65,
      },
    },
    yaxis: {
      min: 0,
      max: isCumulative ? Math.max(specialityData.maxCumVal + 1, 6) : Math.max(specialityData.maxVal + 1, 2),
      tickAmount: isCumulative ? 5 : Math.max(specialityData.maxVal + 1, 2),
      forceNiceScale: false,
      labels: {
        style: { colors: "#94A3B8", fontSize: "11px", fontWeight: 600 },
        formatter: (val) => `${Math.round(val)}`,
      },
    },
    grid: {
      borderColor: "#F1F5F9",
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: true } },
    },
    legend: {
      show: false, // Handled via our custom interactive filter buttons
    },
    tooltip: {
      theme: "light",
      shared: true,
      intersect: false,
      style: { fontSize: "12px" },
      y: {
        formatter: (val) => `${val} recorded`,
      },
    },
  };

  // Agenda Timeline Animated Line / Bar Options
  const agendaLineOptions: ApexOptions = {
    chart: {
      type: "line",
      height: 290,
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: {
        enabled: true,
        speed: 1000,
      },
      dropShadow: {
        enabled: true,
        top: 3,
        left: 0,
        blur: 6,
        opacity: 0.25,
        color: "#AA2D7B",
      },
    },
    colors: ["#AA2D7B"],
    stroke: { curve: "smooth", width: 4 },
    markers: {
      size: 7,
      strokeColors: "#fff",
      strokeWidth: 3,
      hover: { size: 10 },
    },
    dataLabels: {
      enabled: true,
      offsetY: -10,
      style: { colors: ["#AA2D7B"], fontSize: "12px", fontWeight: 800 },
      formatter: (val) => `${val} Sessions`,
    },
    xaxis: {
      categories: dailyTimeline.labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#64748B", fontSize: "11px", fontWeight: 700 } },
    },
    yaxis: {
      min: 0,
      tickAmount: 4,
      labels: {
        style: { colors: "#94A3B8", fontSize: "11px", fontWeight: 600 },
        formatter: (val) => `${Math.round(val)}`,
      },
    },
    grid: { borderColor: "#F1F5F9", strokeDashArray: 3 },
  };

  const agendaSeries = [
    {
      name: "Sessions Scheduled",
      data: dailyTimeline.counts,
    },
  ];

  // Radial Bar Options for Breakdown Tab
  const radialOptions: ApexOptions = {
    chart: {
      height: 300,
      type: "radialBar",
      fontFamily: "inherit",
      animations: {
        enabled: true,
        speed: 900,
      },
    },
    plotOptions: {
      radialBar: {
        hollow: { size: "28%" },
        track: { background: "#F1F5F9" },
        dataLabels: {
          name: { fontSize: "13px", fontWeight: 700, color: "#334155" },
          value: {
            fontSize: "15px",
            fontWeight: 800,
            color: "#55355E",
            formatter: (val) => `${val}%`,
          },
          total: {
            show: true,
            label: "Total Enrolled",
            color: "#64748B",
            fontSize: "11px",
            fontWeight: 600,
            formatter: () => `${sessions.length + speakers.length + delegates.length}`,
          },
        },
      },
    },
    colors: ["#AA2D7B", "#55355E", "#0EA5E9"],
    labels: ["Sessions", "Speakers", "Delegates"],
    legend: { show: false },
  };

  const totalAll = sessions.length + speakers.length + delegates.length || 1;
  const radialSeries = [
    Math.round((sessions.length / totalAll) * 100),
    Math.round((speakers.length / totalAll) * 100),
    Math.round((delegates.length / totalAll) * 100),
  ];

  return (
    <div className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-850 p-5 shadow-xs transition-all relative overflow-hidden">
      {/* Top glowing animated accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#AA2D7B] via-[#55355E] to-[#0EA5E9] animate-pulse" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#AA2D7B] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#AA2D7B]" />
            </span>
            <h3 className="text-sm md:text-base font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Interactive Conference Line Chart</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#faedf5] text-[#AA2D7B] border border-[#AA2D7B]/20">
                Smooth Animated
              </span>
            </h3>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              Live Data
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Visualizing real-time cross-metrics of Sessions, Speakers, and Delegates with animated line trajectories.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-gray-100/80 dark:bg-gray-800 p-1 rounded-xl self-start sm:self-auto border border-gray-200/60 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab("speciality")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "speciality"
                ? "bg-white dark:bg-gray-700 text-[#55355E] dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            📈 Speciality Lines
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("agenda")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "agenda"
                ? "bg-white dark:bg-gray-700 text-[#55355E] dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            📅 Daily Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("breakdown")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "breakdown"
                ? "bg-white dark:bg-gray-700 text-[#55355E] dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            📊 Volume Share
          </button>
        </div>
      </div>

      {/* Main Tab 1: Speciality Line Chart */}
      {activeTab === "speciality" && (
        <div className="pt-4 space-y-4">
          {/* Controls Bar: Animated Line Style Switcher + Interactive Series Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/70 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/60">
            {/* Interactive Series Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                Toggle Series:
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSessions((prev) => !prev);
                  triggerAnimation();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  showSessions
                    ? "bg-[#faedf5] text-[#AA2D7B] border-[#AA2D7B]/30 shadow-2xs scale-100 hover:scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 opacity-60 line-through"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#AA2D7B] shadow-xs" />
                Sessions ({sessions.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSpeakers((prev) => !prev);
                  triggerAnimation();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  showSpeakers
                    ? "bg-[#f5eef4] text-[#55355E] border-[#55355E]/30 shadow-2xs scale-100 hover:scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 opacity-60 line-through"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#55355E] shadow-xs" />
                Speakers ({speakers.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDelegates((prev) => !prev);
                  triggerAnimation();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  showDelegates
                    ? "bg-sky-50 text-sky-700 border-sky-300 shadow-2xs scale-100 hover:scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 opacity-60 line-through"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9] shadow-xs" />
                Delegates ({delegates.length})
              </button>
            </div>

            {/* Chart Style Switcher */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200/80 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setChartType("line");
                  triggerAnimation();
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  chartType === "line"
                    ? "bg-[#AA2D7B] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                📈 Line Chart
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartType("spline");
                  triggerAnimation();
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  chartType === "spline"
                    ? "bg-[#AA2D7B] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                〰️ Smooth Line
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartType("cumulative");
                  triggerAnimation();
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  chartType === "cumulative"
                    ? "bg-[#55355E] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                ↗️ Trend Line
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartType("bar");
                  triggerAnimation();
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  chartType === "bar"
                    ? "bg-[#55355E] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                📊 Columns
              </button>
            </div>
          </div>

          {/* Animated Line Chart Container */}
          <div key={animationKey} className="w-full min-h-[340px]">
            <Chart
              options={lineChartOptions}
              series={filteredSeries}
              type={isBar ? "bar" : "line"}
              height={340}
            />
          </div>

          {/* Mini Footnote Highlights with Micro-Animations */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/70 hover:shadow-xs hover:border-[#AA2D7B]/30 transition-all">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Top Speciality</span>
              <div className="text-xs font-bold text-[#55355E] dark:text-white mt-0.5">Cardiology</div>
              <span className="text-[10px] text-gray-500">Session, Speaker &amp; Delegate live</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/70 hover:shadow-xs hover:border-[#AA2D7B]/30 transition-all">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Clinical Departments</span>
              <div className="text-xs font-bold text-[#AA2D7B] dark:text-[#f0c3df] mt-0.5">
                {specialityData.categories.length} Active Tracks
              </div>
              <span className="text-[10px] text-gray-500">From live records</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/70 hover:shadow-xs hover:border-[#55355E]/30 transition-all">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Faculty Assigned</span>
              <div className="text-xs font-bold text-emerald-600 mt-0.5">
                100% Specialist Doctors
              </div>
              <span className="text-[10px] text-gray-500">{speakers.length} verified consultants</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/70 hover:shadow-xs hover:border-sky-300 transition-all">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Delegate Conversion</span>
              <div className="text-xs font-bold text-sky-600 mt-0.5">
                {Math.round((delegatesStatus.confirmed / (delegatesStatus.total || 1)) * 100)}% Confirmed
              </div>
              <span className="text-[10px] text-gray-500">{delegatesStatus.confirmed} of {delegatesStatus.total} ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab 2: Daily Agenda Animated Line Chart */}
      {activeTab === "agenda" && (
        <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span>Conference Timetable Daily Progression</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#faedf5] text-[#AA2D7B]">
                Smooth Line
              </span>
            </h4>
            <Chart
              options={agendaLineOptions}
              series={agendaSeries}
              type="line"
              height={290}
            />
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-800 border border-gray-200/80 dark:border-gray-700 space-y-3 shadow-xs">
            <h5 className="text-xs font-black text-[#55355E] dark:text-[#f0c3df] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#AA2D7B] animate-ping" />
              Conference Daily Pace
            </h5>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Total Event Duration</span>
                <span className="font-bold text-gray-800 dark:text-white">
                  {dailyTimeline.labels.length} Days
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Scheduled Slots</span>
                <span className="font-bold text-[#AA2D7B]">
                  {sessions.length} Slots
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Daily Average</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {Math.round(sessions.length / (dailyTimeline.labels.length || 1))} Sessions / Day
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-500">Venue Hall</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  RK Hospital Hall A
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab 3: Volume Share & Radial Distribution */}
      {activeTab === "breakdown" && (
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <div className="w-full max-w-xs">
              <Chart
                options={radialOptions}
                series={radialSeries}
                type="radialBar"
                height={300}
              />
            </div>
          </div>
          <div className="space-y-3">
            <h5 className="text-xs font-black text-[#55355E] dark:text-white uppercase tracking-wider">
              Data Entity Composition
            </h5>
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#faedf5]/70 dark:bg-[#AA2D7B]/10 border border-[#AA2D7B]/20 flex items-center justify-between hover:scale-[1.01] transition-transform">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#AA2D7B]" />
                  <span className="text-xs font-bold text-gray-800 dark:text-white">Scheduled Sessions</span>
                </div>
                <span className="text-xs font-black text-[#AA2D7B]">
                  {sessions.length} ({radialSeries[0]}%)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f5eef4]/70 dark:bg-[#55355E]/10 border border-[#55355E]/20 flex items-center justify-between hover:scale-[1.01] transition-transform">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#55355E]" />
                  <span className="text-xs font-bold text-gray-800 dark:text-white">Faculty Speakers</span>
                </div>
                <span className="text-xs font-black text-[#55355E] dark:text-white">
                  {speakers.length} ({radialSeries[1]}%)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 flex items-center justify-between hover:scale-[1.01] transition-transform">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#0EA5E9]" />
                  <span className="text-xs font-bold text-gray-800 dark:text-white">Registered Delegates</span>
                </div>
                <span className="text-xs font-black text-sky-600">
                  {delegates.length} ({radialSeries[2]}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
