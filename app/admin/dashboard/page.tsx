/* app/admin/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  email: string;
  register_number: string | null;
  college_name: string | null;
  year_of_study: string | null;
  department: string | null;
  is_saveetha_student: boolean | null;
  whatsapp_number: string | null;
};

type Team = {
  id: string;
  team_code: string;
  team_name: string;
  case_code: string | null;
  current_round: number;
  status: string;
  created_at: string;
  updated_at: string;
  members: Member[];
};

type RoundSummary = {
  round_number: number;
  round_name: string;
  status: string;
  max_score: number;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  teams_started: number;
  teams_completed: number;
  average_score: number | null;
  highest_score: number | null;
};

type LiveResult = {
  team_id: string;
  team_name: string;
  team_code: string;
  current_round: number;
  team_status: string;
  round1_score: number;
  round2_score: number;
  round3_score: number;
  round4_score: number;
  total_score: number;
};

type RoundScore = {
  id: string;
  team_id: string;
  round_number: number;
  score: number;
  max_score: number;
  breakdown: Record<string, unknown>;
  is_final: boolean;
  updated_at: string;
};

type EvaluationCriterion = {
  label: string;
  max: number;
};

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type SolutionRow = {
  id: string;
  title: string;
  answer: string;
  support?: string;
  category?: string;
};

const EVENT_EVALUATION: string[] = [
  "Evidence collected",
  "Accuracy of the final deduction",
  "Logical reasoning",
  "Speed",
  "Strategic decision-making",
  "Final presentation",
];

const ROUND_EVALUATION: Record<number, EvaluationCriterion[]> = {
  1: [
    { label: "Evidence collected", max: 45 },
    { label: "Team efficiency", max: 15 },
    { label: "MCQ accuracy", max: 20 },
    { label: "Speed", max: 10 },
    { label: "Strategic discipline", max: 10 },
  ],
  2: [
    { label: "Correct lead decisions", max: 20 },
    { label: "Trail challenges", max: 18 },
    { label: "Reasoning completeness", max: 5 },
    { label: "Final trail", max: 7 },
  ],
  3: [
    { label: "Unused Questions Efficiency", max: 15 },
    { label: "Relevant Evidence Recovered", max: 15 },
    { label: "Category Cross-Examination", max: 10 },
    { label: "Final Verdict & Contradictions", max: 10 },
  ],
};

const R1_BONUSES_AND_CONTROLS = [
  { label: "Early investigation bonus", value: "+10", detail: "4 of 5 core evidence items studied within 20 minutes." },
  { label: "No-hint efficiency bonus", value: "+5", detail: "Awarded when the team finishes Round 1 without using any hint." },
  { label: "Hints 1–2", value: "FREE", detail: "The first two investigation hints cost nothing." },
  { label: "Hints 3+", value: "−5 PTS", detail: "Later Round 1 hints deduct 5 points." },
  { label: "Forensic credits", value: "5", detail: "Limited forensic analyses available during the investigation." },
  { label: "Forensic processing", value: "8 SEC", detail: "Each forensic request has an 8-second processing delay." },
  { label: "Round 1 timer", value: "35 MIN", detail: "30-minute investigation window followed by the 5-question MCQ phase." },
];

const R2_BONUSES_AND_CONTROLS = [
  { label: "Round 2 timer", value: "25 MIN", detail: "One team-wide investigation clock." },
  { label: "Hint penalty", value: "+20 SEC", detail: "Each Round 2 hint adds a 20-second time penalty." },
  { label: "Wrong lead decision", value: "+30 SEC", detail: "Incorrect IMPORTANT / IGNORE decisions add time." },
  { label: "Wrong challenge", value: "+15 SEC", detail: "Incorrect trail challenge attempts add time." },
  { label: "Wrong cross-check", value: "+15 SEC", detail: "Incorrect cross-check attempts add time." },
  { label: "Wrong final trail", value: "+30 SEC", detail: "An incorrect final trail submission adds time." },
  { label: "Wrong-answer score penalty", value: "−0.5", detail: "Each incorrect attempt reduces the hidden Round 2 score by 0.5 points." },
  { label: "Hidden archive link", value: "+5", detail: "The archive cross-reference is worth 5 points." },
];

const R1_MCQ_SOLUTIONS: SolutionRow[] = [
  { id: "Q01", category: "TIME", title: "At what time was BLACKBOX reported missing?", answer: "22:17", support: "E-02" },
  { id: "Q02", category: "TIME", title: "What timestamp was recorded on the recovered CCTV frame?", answer: "22:16:53", support: "E-06" },
  { id: "Q03", category: "PEOPLE", title: "What does the credential record not prove by itself?", answer: "That the credential was used", support: "E-03, E-05" },
  { id: "Q04", category: "PEOPLE", title: "What does the recovered security evidence fail to establish?", answer: "Who physically used the credential", support: "E-03" },
  { id: "Q05", category: "LOCATION", title: "Which network is connected to the restricted transfer infrastructure?", answer: "Restricted transfer network", support: "E-14" },
  { id: "Q06", category: "LOCATION", title: "Where was BLACKBOX reported missing?", answer: "Laboratory 3", support: "E-02" },
  { id: "Q07", category: "DIGITAL", title: "What time was the deleted communication recovered from the phone?", answer: "22:08", support: "E-04" },
  { id: "Q08", category: "DIGITAL", title: "What was recovered from the storage drive?", answer: "Transfer fragments", support: "E-10" },
  { id: "Q09", category: "EVENT", title: "What remained active during the security interruption?", answer: "The laboratory process", support: "E-01" },
  { id: "Q10", category: "EVENT", title: "What happened to the corridor camera during the interruption?", answer: "It was interrupted", support: "E-11" },
];

const R2_SOLUTION_ROWS: SolutionRow[] = [
  { id: "A", category: "LOGIC", title: "THE TIMELINE WINDOW — lead decision", answer: "IMPORTANT", support: "Challenge: E-06 · Cross-check: E-06 + E-02" },
  { id: "B", category: "OBSERVATION", title: "CAFETERIA RECEIPT — lead decision", answer: "IGNORE", support: "Challenge: The purchase is outside the critical incident window · Cross-check: E-13" },
  { id: "C", category: "DATA", title: "THE NETWORK FRAGMENT — lead decision", answer: "IMPORTANT", support: "Challenge: E-10 · Cross-check: E-10 + E-14" },
  { id: "D", category: "CIPHER", title: "THE WHITEBOARD NOTE — lead decision", answer: "IMPORTANT", support: "Challenge: CASE · Cross-check: E-08 + E-10" },
  { id: "E", category: "LOGIC", title: "MAINTENANCE TIME DISCREPANCY — lead decision", answer: "IGNORE", support: "Challenge: NO · Cross-check: One record may be insufficient to establish responsibility." },
  { id: "F", category: "LOGIC", title: "THE ACCESS PATH — lead decision", answer: "IMPORTANT", support: "Challenge: BLACKBOX could have been moved through a route that did not use the main door · Cross-check: E-14 + E-16" },
  { id: "G", category: "OBSERVATION", title: "THE UNSIGNED ACCUSATION — lead decision", answer: "IGNORE", support: "Challenge: It is anonymous and unsupported · Cross-check: A record may not independently establish responsibility." },
  { id: "H", category: "OBSERVATION", title: "THE CCTV GAP — lead decision", answer: "IMPORTANT", support: "Challenge: The last recovered visual point immediately before the 22:17 report · Cross-check: E-06 + E-02" },
  { id: "I", category: "DATA", title: "TRANSFER NOTE — lead decision", answer: "IMPORTANT", support: "Challenge: E-10 · Cross-check: E-10 + E-14" },
  { id: "J", category: "CIPHER", title: "LOCKER KEY — lead decision", answer: "IGNORE", support: "Challenge: The movement route of BLACKBOX · Cross-check: It gives no independent route evidence." },
];

const R2_FINAL_SOLUTION = "A → C → D → F → H → I";

const ROUND_META: Record<number, { label: string; subtitle: string; color: string; available: boolean }> = {
  1: {
    label: "THE CRIME SCENE",
    subtitle: "Evidence investigation",
    color: "yellow",
    available: true,
  },
  2: {
    label: "FOLLOW THE TRAIL",
    subtitle: "Lead selection & reasoning",
    color: "cyan",
    available: true,
  },
  3: {
    label: "THE INTERROGATION & FINAL VERDICT",
    subtitle: "Interrogation + Final Deduction",
    color: "purple",
    available: true,
  },
};

function formatScore(value: number | null | undefined) {
  return value == null ? "—" : Number(value).toFixed(1).replace(".0", "");
}

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${String(remaining).padStart(2, "0")}s`;
}

function statusClass(status: string) {
  const value = status.toUpperCase();

  if (value === "LIVE" || value === "ACTIVE") {
    return "text-green-400 border-green-500/20 bg-green-500/[0.05]";
  }

  if (value === "COMPLETED" || value === "FINALIZED") {
    return "text-blue-300 border-blue-500/20 bg-blue-500/[0.05]";
  }

  if (value === "LOCKED") {
    return "text-white/50 border-white/10 bg-white/[0.03]";
  }

  return "text-yellow-400 border-yellow-500/20 bg-yellow-500/[0.04]";
}

export default function AdminDashboard() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [moveMemberId, setMoveMemberId] = useState("");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [activeView, setActiveView] = useState("dashboard");

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading) {
      const refresh = window.setInterval(() => {
        loadDashboardData();
        loadTeams();
        loadAdmins();
      }, 10000);

      return () => window.clearInterval(refresh);
    }
  }, [loading]);

  const checkAdmin = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setErrorMessage(sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("id, email, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (adminError) {
        setErrorMessage("Admin verification failed: " + adminError.message);
        setLoading(false);
        return;
      }

      if (!admin) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setEmail(session.user.email || admin.email || "");

      await Promise.all([loadTeams(), loadDashboardData(), loadAdmins()]);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("An unexpected error occurred while loading the dashboard.");
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    setTeamsLoading(true);

    const { data, error } = await supabase.rpc("admin_get_teams");

    if (error) {
      console.error("Team load error:", error);
      setErrorMessage("Unable to load teams: " + error.message);
      setTeamsLoading(false);
      return;
    }

    setTeams((data || []) as Team[]);
    setTeamsLoading(false);
  };

  const loadAdmins = async () => {
    const { data, error } = await supabase.rpc("admin_get_admins");

    if (error) {
      console.error("Admin list error:", error);
      return;
    }

    setAdmins((data || []) as AdminUser[]);
  };

  const loadDashboardData = async () => {
    setDashboardLoading(true);

    const [roundResponse, resultResponse, scoreResponse, roundStatesResponse] = await Promise.all([
      supabase.rpc("admin_get_round_dashboard"),
      supabase.rpc("admin_get_live_results"),
      supabase
        .from("team_round_scores")
        .select("id, team_id, round_number, score, max_score, breakdown, is_final, updated_at")
        .order("round_number", { ascending: true })
        .order("score", { ascending: false }),
      supabase
        .from("round_states")
        .select("round_number, status, started_at, ended_at")
        .in("round_number", [1, 2, 3]),
    ]);

    if (roundResponse.error) {
      console.error("Round dashboard error:", roundResponse.error);
    }

    if (resultResponse.error) {
      console.error("Live results error:", resultResponse.error);
    }

    if (scoreResponse.error) {
      console.error("Round score error:", scoreResponse.error);
    }

    const authoritativeStates = new Map(
      ((roundStatesResponse.data || []) as { round_number: number; status: string; started_at: string | null; ended_at: string | null }[])
        .map((rs) => [rs.round_number, rs])
    );

    const mergedRounds = ((roundResponse.data || []) as RoundSummary[]).map((r) => {
      const auth = authoritativeStates.get(r.round_number);
      if (auth) {
        return { ...r, status: auth.status, started_at: auth.started_at, ended_at: auth.ended_at };
      }
      return r;
    });

    setRounds(mergedRounds);
    setLiveResults((resultResponse.data || []) as LiveResult[]);
    setRoundScores((scoreResponse.data || []) as RoundScore[]);
    setDashboardLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const handleRoundStatus = async (roundNumber: number, status: string) => {
    const label = ROUND_META[roundNumber]?.label || `Round ${roundNumber}`;
    const action = status === "LIVE" ? "start" : status === "PAUSED" ? "pause" : status === "COMPLETED" ? "end" : "update";
    const confirmed = window.confirm(`${action === "end" ? "End" : action === "pause" ? "Pause" : "Start"} ${label}?`);

    if (!confirmed) return;

    setActionLoading(true);
    setNotice("");

    const { error } = await supabase.rpc("admin_set_round_status", {
      p_round_number: roundNumber,
      p_status: status,
    });

    if (error) {
      setNotice(error.message);
      setActionLoading(false);
      return;
    }

    setNotice(`${label} status updated to ${status}.`);
    await loadDashboardData();
    setActionLoading(false);
  };

  const handleLockTeam = async () => {
    if (!selectedTeam) return;

    if (selectedTeam.members.length < 2) {
      setNotice("A team needs at least 2 members before it can be locked.");
      return;
    }

    const confirmed = window.confirm(
      `Lock ${selectedTeam.team_name}? Once locked, its members cannot be changed.`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setNotice("");

    const { error } = await supabase.rpc("admin_lock_team", {
      p_team_id: selectedTeam.id,
    });

    if (error) {
      setNotice(error.message);
      setActionLoading(false);
      return;
    }

    setNotice("Team locked successfully.");
    await loadTeams();

    setSelectedTeam((current) =>
      current ? { ...current, status: "LOCKED" } : null
    );

    setActionLoading(false);
  };

  const handleRemoveMember = async (member: Member) => {
    if (!selectedTeam) return;

    const confirmed = window.confirm(
      `Remove ${member.name} from ${selectedTeam.team_name}?`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setNotice("");

    const { error } = await supabase.rpc("admin_remove_member", {
      p_member_id: member.id,
    });

    if (error) {
      setNotice(error.message);
      setActionLoading(false);
      return;
    }

    setNotice(`${member.name} removed.`);
    await loadTeams();
    setSelectedTeam(null);
    setActionLoading(false);
  };

  const handleMoveMember = async () => {
    if (!moveMemberId || !targetTeamId) {
      setNotice("Select a member and target team.");
      return;
    }

    setActionLoading(true);
    setNotice("");

    const { error } = await supabase.rpc("admin_move_member", {
      p_member_id: moveMemberId,
      p_target_team_id: targetTeamId,
    });

    if (error) {
      setNotice(error.message);
      setActionLoading(false);
      return;
    }

    setNotice("Member moved successfully.");
    await loadTeams();

    setMoveMemberId("");
    setTargetTeamId("");
    setSelectedTeam(null);
    setActionLoading(false);
  };

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return teams;

    return teams.filter((team) => {
      return (
        team.team_name.toLowerCase().includes(query) ||
        team.team_code.toLowerCase().includes(query) ||
        team.members.some(
          (member) =>
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query)
        )
      );
    });
  }, [teams, search]);

  const totalMembers = teams.reduce(
    (sum, team) => sum + team.members.length,
    0
  );

  const formingTeams = teams.filter((team) => team.status === "FORMING").length;
  const lockedTeams = teams.filter((team) => team.status === "LOCKED").length;

  const availableMoveTargets = teams.filter(
    (team) =>
      team.status === "FORMING" &&
      team.id !== selectedTeam?.id &&
      team.members.length < 4
  );

  const roundByNumber = new Map(rounds.map((round) => [round.round_number, round]));

  const highestLiveScore =
    liveResults.length > 0
      ? Math.max(...liveResults.map((team) => Number(team.total_score || 0)))
      : 0;


  const openView = (view: string) => {
    setSelectedTeam(null);
    setNotice("");
    setActiveView(view);
  };

  const goBack = () => {
    setActiveView("dashboard");
    setSelectedTeam(null);
  };

  const detailRound = activeView.startsWith("round")
    ? Number(activeView.replace("round", ""))
    : 0;
  const detailRoundMeta = ROUND_META[detailRound];
  const detailRoundData = roundByNumber.get(detailRound);

  const detailRoundScores = roundScores
    .filter((score) => score.round_number === detailRound)
    .sort((a, b) => Number(b.score) - Number(a.score));

  const scoreByTeamAndRound = (teamId: string, roundNumber: number) =>
    roundScores.find(
      (score) => score.team_id === teamId && score.round_number === roundNumber
    );

  const roundEvaluation = ROUND_EVALUATION[detailRound] || [];

  const readableBreakdown = (breakdown: Record<string, unknown>) =>
    Object.entries(breakdown || {}).filter(
      ([, value]) => typeof value === "number" || typeof value === "string"
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-yellow-400 text-xs uppercase tracking-[0.3em]">
            PROJECT: REDACTED²
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Verifying Admin Clearance
          </h1>
          <p className="mt-2 text-sm text-white/40">Please wait...</p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg border border-white/10 rounded-2xl p-8 bg-[#0b0b0b]">
          <p className="text-yellow-400 text-xs uppercase tracking-[0.25em]">
            Access Error
          </p>
          <h1 className="text-2xl font-semibold mt-3">
            Admin Dashboard Error
          </h1>
          <p className="mt-4 text-red-400 text-sm">{errorMessage}</p>
          <button
            onClick={() => router.replace("/admin/login")}
            className="mt-6 w-full rounded-xl bg-white text-black py-3 font-semibold hover:bg-yellow-300 transition"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }


  if (activeView !== "dashboard") {
    const detailTitle =
      activeView === "teams"
        ? "Teams"
        : activeView === "live"
        ? "Live Results"
        : activeView === "results"
        ? "Results"
        : activeView === "evaluation"
        ? "Evaluation Details"
        : activeView === "secrets"
        ? "Secrets & Controls"
        : activeView === "solutions"
        ? "Solutions / Answer Key"
        : activeView === "admins"
        ? "Administrators"
        : detailRoundMeta?.label || "Round";

    return (
      <main className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-yellow-400 text-xs uppercase tracking-[0.3em]">
                PROJECT: REDACTED²
              </p>
              <h1 className="text-2xl font-semibold mt-1">{detailTitle}</h1>
              <p className="text-sm text-white/40 mt-1">{email}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={goBack} className="border border-white/15 rounded-lg px-4 py-2 text-sm hover:bg-white hover:text-black transition">
                ← Dashboard
              </button>
              <button onClick={handleLogout} className="border border-white/15 rounded-lg px-4 py-2 text-sm hover:bg-white hover:text-black transition">
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {(activeView === "round1" || activeView === "round2" || activeView === "round3") && (
            <>
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">Round {detailRound}</p>
                <h2 className="text-3xl font-semibold mt-2">{detailTitle}</h2>
              </div>

              {!detailRoundMeta?.available ? (
                <section className="border border-dashed border-white/10 bg-[#080808] rounded-2xl p-8">
                  <p className="text-xs uppercase tracking-widest text-white/30">Not classified</p>
                  <h3 className="text-xl font-semibold mt-2">Round {detailRound} is reserved</h3>
                  <p className="text-sm text-white/40 mt-2">
                    Gameplay, scoring and admin controls can be added here after this round is finalized.
                  </p>
                </section>
              ) : (
                <>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-widest text-white/35">Status</p>
                    <p className="mt-2 font-semibold text-yellow-400">{detailRoundData?.status || "NOT STARTED"}</p>
                  </div>
                  <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-widest text-white/35">Maximum</p>
                    <p className="mt-2 text-2xl font-semibold">{detailRoundData?.max_score ?? (detailRound === 1 ? 100 : 50)}</p>
                  </div>
                  <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-widest text-white/35">Started</p>
                    <p className="mt-2 text-2xl font-semibold">{detailRoundData?.teams_started ?? 0}</p>
                  </div>
                  <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-widest text-white/35">Completed</p>
                    <p className="mt-2 text-2xl font-semibold">{detailRoundData?.teams_completed ?? 0}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {(detailRoundData?.status === "NOT_STARTED" || !detailRoundData?.status) && (
                    <button disabled={actionLoading} onClick={() => handleRoundStatus(detailRound, "LIVE")} className="rounded-xl bg-green-400 text-black px-5 py-3 font-bold disabled:opacity-40">Start Round</button>
                  )}
                  {detailRoundData?.status === "LIVE" && (
                    <>
                      <button disabled={actionLoading} onClick={() => handleRoundStatus(detailRound, "PAUSED")} className="rounded-xl border border-yellow-400/30 text-yellow-300 px-5 py-3 font-semibold disabled:opacity-40">Pause</button>
                      <button disabled={actionLoading} onClick={() => handleRoundStatus(detailRound, "COMPLETED")} className="rounded-xl border border-red-400/30 text-red-300 px-5 py-3 font-semibold disabled:opacity-40">End Round</button>
                    </>
                  )}
                  {detailRoundData?.status === "PAUSED" && (
                    <>
                      <button disabled={actionLoading} onClick={() => handleRoundStatus(detailRound, "LIVE")} className="rounded-xl bg-green-400 text-black px-5 py-3 font-bold disabled:opacity-40">Resume</button>
                      <button disabled={actionLoading} onClick={() => handleRoundStatus(detailRound, "COMPLETED")} className="rounded-xl border border-red-400/30 text-red-300 px-5 py-3 font-semibold disabled:opacity-40">End Round</button>
                    </>
                  )}
                </div>

                <div className="grid lg:grid-cols-[1fr_360px] gap-5 mt-6">
                  <section className="border border-white/10 bg-[#0b0b0b] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/35">Team Evaluation</p>
                      <h3 className="text-xl font-semibold mt-1">Round {detailRound} scores</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[620px]">
                        <div className="grid grid-cols-[50px_1fr_100px_100px_100px] gap-3 px-5 py-3 border-b border-white/10 text-[10px] uppercase tracking-widest text-white/30">
                          <span>#</span><span>Team</span><span>Score</span><span>Max</span><span>Status</span>
                        </div>
                        {detailRoundScores.length === 0 ? (
                          <div className="px-5 py-8 text-sm text-white/35">No team scores recorded yet.</div>
                        ) : (
                          detailRoundScores.map((score, index) => {
                            const team = teams.find((item) => item.id === score.team_id);
                            return (
                              <button key={score.id} onClick={() => team && setSelectedTeam(team)} className="w-full grid grid-cols-[50px_1fr_100px_100px_100px] gap-3 px-5 py-4 text-left border-b border-white/5 hover:bg-white/[0.03] items-center">
                                <span className="text-white/35">{index + 1}</span>
                                <div><p className="font-semibold">{team?.team_name || "Unknown Team"}</p><p className="text-xs text-yellow-400/60 tracking-widest mt-1">{team?.team_code || score.team_id}</p></div>
                                <span className="font-semibold text-yellow-400">{formatScore(score.score)}</span>
                                <span className="text-white/45">{formatScore(score.max_score)}</span>
                                <span className={score.is_final ? "text-xs text-green-400" : "text-xs text-yellow-300"}>{score.is_final ? "FINAL" : "LIVE"}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Evaluation Framework</p>
                    <h3 className="text-xl font-semibold mt-1">How this round is scored</h3>
                    <div className="mt-5 space-y-3">
                      {roundEvaluation.map((criterion) => (
                        <div key={criterion.label} className="flex items-center justify-between border-b border-white/5 pb-3">
                          <span className="text-sm text-white/65">{criterion.label}</span>
                          <span className="font-semibold">{criterion.max}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-sm text-white/40">Round maximum</span>
                      <span className="text-xl font-bold text-yellow-400">{roundEvaluation.reduce((sum, item) => sum + item.max, 0)}</span>
                    </div>
                  </section>
                </div>

                {detailRoundScores.length > 0 && (
                  <section className="mt-5 border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Recorded Breakdown</p>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                      {detailRoundScores.slice(0, 6).map((score) => {
                        const team = teams.find((item) => item.id === score.team_id);
                        const entries = readableBreakdown(score.breakdown);
                        return (
                          <div key={`${score.id}-breakdown`} className="border border-white/8 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold truncate">{team?.team_name || "Unknown Team"}</p>
                              <span className="text-yellow-400 font-semibold">{formatScore(score.score)}/{formatScore(score.max_score)}</span>
                            </div>
                            {entries.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {entries.map(([key, value]) => (
                                  <div key={key} className="flex justify-between gap-3 text-xs">
                                    <span className="text-white/35">{key.replaceAll("_", " ")}</span>
                                    <span className="text-white/70">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-white/30 mt-3">No breakdown stored.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                </>
              )}
            </>
          )}

          {activeView === "teams" && (
            <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Operations</p>
                  <h2 className="text-3xl font-semibold mt-1">Team Management</h2>
                  <p className="text-sm text-white/35 mt-1">Select a team to lock, remove or move members.</p>
                </div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team, code or participant..." className="w-full sm:w-80 bg-[#0b0b0b] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400/60" />
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1fr_100px_110px_110px_40px] gap-4 px-5 py-3 border-b border-white/10 text-[11px] uppercase tracking-widest text-white/35">
                    <span>Team</span><span>Members</span><span>Status</span><span>Round</span><span />
                  </div>
                  {filteredTeams.map((team) => (
                    <button key={team.id} onClick={() => setSelectedTeam(team)} className="w-full grid grid-cols-[1fr_100px_110px_110px_40px] gap-4 px-5 py-5 text-left border-b border-white/5 hover:bg-white/[0.03] transition items-center">
                      <div><p className="font-semibold">{team.team_name}</p><p className="text-xs text-yellow-400 mt-1 tracking-widest">{team.team_code}</p></div>
                      <p className="text-sm text-white/70">{team.members.length}/4</p>
                      <span className={team.status === "LOCKED" ? "text-xs font-semibold text-green-400" : "text-xs font-semibold text-yellow-400"}>{team.status}</span>
                      <p className="text-xs text-white/50">R{team.current_round || 0}</p>
                      <span className="text-white/30 text-lg">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeView === "live" && (
            <section className="border border-white/10 bg-[#080808] rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/10">
                <p className="text-xs uppercase tracking-[0.25em] text-green-400">Live Scoring</p>
                <h2 className="text-3xl font-semibold mt-1">Live Results</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[850px]">
                  <div className="grid grid-cols-[60px_1fr_90px_90px_110px_110px] gap-4 px-6 py-3 border-b border-white/10 text-[11px] uppercase tracking-widest text-white/35">
                    <span>#</span><span>Team</span><span>R1</span><span>R2</span><span>R3 (Final)</span><span>Total</span>
                  </div>
                  {liveResults.map((team, index) => (
                    <div key={team.team_id} className="grid grid-cols-[60px_1fr_90px_90px_110px_110px] gap-4 px-6 py-4 border-b border-white/5 items-center">
                      <span className="text-white/40">{index + 1}</span>
                      <div><p className="font-semibold">{team.team_name}</p><p className="text-xs text-yellow-400/70 tracking-widest">{team.team_code}</p></div>
                      <span>{formatScore(team.round1_score)}</span><span>{formatScore(team.round2_score)}</span>
                      <span className="text-yellow-400 font-semibold">{formatScore(team.round3_score)}</span>
                      <span className="font-semibold text-yellow-400">{formatScore((team.round1_score || 0) + (team.round2_score || 0) + (team.round3_score || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeView === "evaluation" && (
            <div className="space-y-5">
              <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-blue-300">Official Evaluation</p>
                <h2 className="text-3xl font-semibold mt-1">Event Evaluation Criteria</h2>
                <p className="text-sm text-white/40 mt-2">These are the criteria the adjudicators use across the investigation.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                  {EVENT_EVALUATION.map((criterion, index) => (
                    <div key={criterion} className="border border-white/10 rounded-xl p-5">
                      <p className="text-[10px] uppercase tracking-widest text-white/25">0{index + 1}</p>
                      <p className="mt-2 font-semibold">{criterion}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid lg:grid-cols-2 gap-5">
                {[1, 2].map((roundNumber) => (
                  <section key={roundNumber} className="border border-white/10 bg-[#080808] rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Round {roundNumber}</p>
                    <h3 className="text-2xl font-semibold mt-1">{ROUND_META[roundNumber].label}</h3>
                    <div className="mt-5 space-y-3">
                      {(ROUND_EVALUATION[roundNumber] || []).map((criterion) => (
                        <div key={criterion.label} className="flex items-center justify-between border-b border-white/5 pb-3">
                          <span className="text-sm text-white/60">{criterion.label}</span>
                          <span className="font-bold text-yellow-400">{criterion.max}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-between">
                      <span className="text-sm text-white/35">Round maximum</span>
                      <span className="font-bold">{(ROUND_EVALUATION[roundNumber] || []).reduce((sum, item) => sum + item.max, 0)}</span>
                    </div>
                  </section>
                ))}
              </div>

              <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">Adjudicator note</p>
                <p className="mt-3 text-sm leading-7 text-white/55">Round scores are the quantitative game score. Final adjudication should also consider the quality of the team’s evidence, accuracy of deduction, logical reasoning, speed, strategic decision-making and final presentation.</p>
              </section>
            </div>
          )}

          {activeView === "secrets" && (
            <AdminSecretsPanel teams={liveResults} />
          )}

          {activeView === "solutions" && (
            <div className="space-y-5">
              <section className="border border-red-500/20 bg-red-500/[0.03] rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-red-300">ADMIN ONLY — ANSWER KEY</p>
                <h2 className="text-3xl font-semibold mt-1">Solutions</h2>
                <p className="text-sm text-white/40 mt-2">Use this section for coordinator verification and manual evaluation. Never expose it to teams.</p>
              </section>

              <section className="border border-white/10 bg-[#080808] rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10"><p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Round 1</p><h3 className="text-2xl font-semibold mt-1">MCQ Answer Key</h3></div>
                <div className="p-5 grid lg:grid-cols-2 gap-3">
                  {R1_MCQ_SOLUTIONS.map((row) => (
                    <div key={row.id} className="border border-white/8 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] text-white/25 tracking-widest">{row.id} · {row.category}</span><p className="font-semibold mt-1">{row.title}</p></div><span className="text-yellow-400 font-bold text-right">{row.answer}</span></div>
                      <p className="text-xs text-white/30 mt-3">Support: {row.support}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-white/10 bg-[#080808] rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10"><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Round 2</p><h3 className="text-2xl font-semibold mt-1">Lead Answer Key</h3></div>
                <div className="p-5 space-y-3">
                  {R2_SOLUTION_ROWS.map((row) => (
                    <div key={row.id} className="border border-white/8 rounded-xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><span className="text-[10px] text-white/25 tracking-widest">LEAD {row.id} · {row.category}</span><p className="font-semibold mt-1">{row.title}</p></div><span className="text-cyan-300 font-bold">{row.answer}</span></div>
                      <p className="text-xs text-white/35 mt-3 leading-5">{row.support}</p>
                    </div>
                  ))}
                </div>
                <div className="mx-5 mb-5 border border-yellow-500/20 bg-yellow-500/[0.03] rounded-xl p-5"><p className="text-xs uppercase tracking-widest text-yellow-400">Final trail</p><p className="text-2xl font-black mt-2">{R2_FINAL_SOLUTION}</p><p className="text-xs text-white/35 mt-2">7 points · final answer is intentionally not shown to teams during the round.</p></div>
              </section>
            </div>
          )}

          {activeView === "admins" && (
            <section className="border border-white/10 bg-[#080808] rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/10"><p className="text-xs uppercase tracking-[0.25em] text-purple-300">Access Control</p><h2 className="text-3xl font-semibold mt-1">Administrators</h2><p className="text-sm text-white/35 mt-2">Accounts currently authorized to enter the admin dashboard.</p></div>
              <div className="p-5 space-y-3">
                {admins.length === 0 ? <p className="text-sm text-white/35">No admin records returned.</p> : admins.map((admin, index) => (
                  <div key={admin.id} className="border border-white/8 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div><p className="text-xs text-white/25 uppercase tracking-widest">Admin {index + 1}</p><p className="font-semibold mt-1">{admin.email}</p><p className="text-xs text-white/25 mt-1 break-all">{admin.id}</p></div>
                    <div className="flex items-center gap-3"><span className="px-3 py-1 rounded-full border border-green-500/20 bg-green-500/[0.05] text-xs text-green-400">ACTIVE</span><span className="text-xs text-white/45 uppercase tracking-widest">{admin.role}</span></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeView === "results" && (
            <div className="space-y-5">
              <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-blue-300">Official Evaluation</p>
                <h2 className="text-3xl font-semibold mt-1">Evaluation Criteria</h2>
                <p className="text-sm text-white/40 mt-2">The final adjudication considers the same core criteria across the investigation.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                  {EVENT_EVALUATION.map((criterion) => (
                    <div key={criterion} className="border border-white/10 rounded-xl p-4">
                      <p className="text-sm text-white/70">{criterion}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-blue-300">Scoring</p>
                <h2 className="text-3xl font-semibold mt-1">Round Results</h2>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  {[1,2,3].map((n) => {
                    const r = roundByNumber.get(n);
                    const criteria = ROUND_EVALUATION[n] || [];
                    return (
                      <div key={n} className="border border-white/10 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-widest text-white/30">Round {n}</p>
                        <h3 className="font-semibold mt-1">{ROUND_META[n]?.label || `Round ${n}`}</h3>
                        {ROUND_META[n]?.available ? (
                          <>
                            <div className="grid grid-cols-2 gap-4 mt-5">
                              <div><p className="text-xs text-white/30">Average</p><p className="mt-1 font-semibold">{formatScore(r?.average_score)}</p></div>
                              <div><p className="text-xs text-white/30">Highest</p><p className="mt-1 font-semibold text-yellow-400">{formatScore(r?.highest_score)}</p></div>
                            </div>
                            <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                              {criteria.map((criterion) => (
                                <div key={criterion.label} className="flex justify-between text-xs">
                                  <span className="text-white/35">{criterion.label}</span>
                                  <span className="text-white/70">{criterion.max}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : <p className="text-sm text-white/30 mt-5">Scoring will be added after classification.</p>}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Leaderboard</p>
                <h2 className="text-2xl font-semibold mt-1">Current Team Totals</h2>
                <div className="overflow-x-auto mt-5">
                  <div className="min-w-[820px]">
                    <div className="grid grid-cols-[60px_1fr_90px_90px_110px_110px] gap-3 px-4 py-3 border-b border-white/10 text-[10px] uppercase tracking-widest text-white/30">
                      <span>#</span><span>Team</span><span>R1</span><span>R2</span><span>R3 (Final)</span><span>Total</span>
                    </div>
                    {liveResults.map((team, index) => (
                      <div key={`result-${team.team_id}`} className="grid grid-cols-[60px_1fr_90px_90px_110px_110px] gap-3 px-4 py-4 border-b border-white/5 items-center">
                        <span className="text-white/35">{index + 1}</span>
                        <div><p className="font-semibold">{team.team_name}</p><p className="text-xs text-yellow-400/60 tracking-widest mt-1">{team.team_code}</p></div>
                        <span>{formatScore(team.round1_score)}</span><span>{formatScore(team.round2_score)}</span><span className="text-yellow-400 font-semibold">{formatScore(team.round3_score)}</span><span className="font-semibold text-yellow-400">{formatScore((team.round1_score || 0) + (team.round2_score || 0) + (team.round3_score || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {selectedTeam && (
          <div className="fixed inset-0 z-50">
            <button className="absolute inset-0 bg-black/70" onClick={() => setSelectedTeam(null)} aria-label="Close panel" />
            <aside className="absolute top-0 right-0 h-full w-full max-w-xl bg-[#0a0a0a] border-l border-white/10 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10 px-6 py-5 flex justify-between items-start">
                <div><p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Team Details</p><h2 className="text-2xl font-semibold mt-2">{selectedTeam.team_name}</h2><p className="text-sm text-white/40 mt-1">{selectedTeam.team_code}</p></div>
                <button onClick={() => setSelectedTeam(null)} className="text-white/40 hover:text-white text-xl">✕</button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-white/10 rounded-xl p-4"><p className="text-xs text-white/35 uppercase tracking-widest">Status</p><p className={`mt-2 font-semibold ${selectedTeam.status === "LOCKED" ? "text-green-400" : "text-yellow-400"}`}>{selectedTeam.status}</p></div>
                  <div className="border border-white/10 rounded-xl p-4"><p className="text-xs text-white/35 uppercase tracking-widest">Members</p><p className="mt-2 font-semibold">{selectedTeam.members.length} / 4</p></div>
                  <div className="border border-white/10 rounded-xl p-4"><p className="text-xs text-white/35 uppercase tracking-widest">Team Code</p><p className="mt-2 font-semibold text-yellow-400">{selectedTeam.team_code}</p></div>
                  <div className="border border-white/10 rounded-xl p-4"><p className="text-xs text-white/35 uppercase tracking-widest">Current Round</p><p className="mt-2 font-semibold">{selectedTeam.current_round ? `Round ${selectedTeam.current_round}` : "Not started"}</p></div>
                </div>
                <section>
                  <h3 className="font-semibold mb-3">Members</h3>
                  <div className="space-y-3">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="border border-white/10 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div><p className="font-semibold">{member.name}</p><p className="text-sm text-white/45 mt-1">{member.email}</p></div>
                          {selectedTeam.status === "FORMING" && <button disabled={actionLoading} onClick={() => handleRemoveMember(member)} className="text-xs text-red-400">Remove</button>}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                          <div><p className="text-white/30">College</p><p className="mt-1 text-white/70">{member.college_name || "—"}</p></div>
                          <div><p className="text-white/30">Department</p><p className="mt-1 text-white/70">{member.department || "—"}</p></div>
                          <div><p className="text-white/30">Year</p><p className="mt-1 text-white/70">{member.year_of_study || "—"}</p></div>
                          <div><p className="text-white/30">Contact</p><p className="mt-1 text-white/70">{member.whatsapp_number || "—"}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                {selectedTeam.status === "FORMING" && availableMoveTargets.length > 0 && (
                  <section className="border border-white/10 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-white/35">Team Management</p>
                    <h3 className="font-semibold mt-2">Move Member</h3>
                    <div className="mt-4 space-y-3">
                      <select value={moveMemberId} onChange={(e) => setMoveMemberId(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm"><option value="">Select member</option>{selectedTeam.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                      <select value={targetTeamId} onChange={(e) => setTargetTeamId(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm"><option value="">Select target team</option>{availableMoveTargets.map(t => <option key={t.id} value={t.id}>{t.team_name} — {t.members.length}/4</option>)}</select>
                      <button disabled={actionLoading || !moveMemberId || !targetTeamId} onClick={handleMoveMember} className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-40">Move Member</button>
                    </div>
                  </section>
                )}
                {selectedTeam.status === "FORMING" && (
                  <section className="border border-yellow-500/20 bg-yellow-500/[0.04] rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-yellow-400">Finalize Team</p>
                    <h3 className="font-semibold mt-2">Lock this team</h3>
                    <p className="text-sm text-white/40 mt-2">Once locked, members cannot leave, move or be removed.</p>
                    <button disabled={actionLoading || selectedTeam.members.length < 2} onClick={handleLockTeam} className="w-full mt-4 rounded-xl bg-yellow-400 text-black py-3 font-bold disabled:opacity-40">{selectedTeam.members.length < 2 ? "Need at Least 2 Members" : actionLoading ? "Processing..." : "Lock Team"}</button>
                  </section>
                )}
                {selectedTeam.status === "LOCKED" && <section className="border border-green-500/20 bg-green-500/[0.04] rounded-xl p-5"><p className="text-xs uppercase tracking-widest text-green-400">Team Secured</p><h3 className="font-semibold mt-2">Team is locked</h3></section>}
                {notice && <div className="border border-white/10 rounded-xl p-4 text-sm text-white/70">{notice}</div>}
              </div>
            </aside>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-5">
          <div>
            <p className="text-yellow-400 text-xs uppercase tracking-[0.3em]">
              PROJECT: REDACTED²
            </p>
            <h1 className="text-2xl font-semibold mt-1">
              Admin Control Center
            </h1>
            <p className="text-sm text-white/40 mt-1">{email}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadDashboardData();
                loadTeams();
                loadAdmins();
              }}
              className="border border-white/15 rounded-lg px-4 py-2 text-sm hover:bg-white hover:text-black transition"
            >
              Refresh
            </button>

            <button
              onClick={handleLogout}
              className="border border-white/15 rounded-lg px-4 py-2 text-sm hover:bg-white hover:text-black transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* TOP STATS */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Teams
            </p>
            <p className="text-3xl font-semibold mt-2">{teams.length}</p>
          </div>

          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Participants
            </p>
            <p className="text-3xl font-semibold mt-2">{totalMembers}</p>
          </div>

          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Live Teams
            </p>
            <p className="text-3xl font-semibold mt-2 text-green-400">
              {liveResults.filter((team) => team.current_round > 0).length}
            </p>
          </div>

          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Top Live Score
            </p>
            <p className="text-3xl font-semibold mt-2 text-yellow-400">
              {formatScore(highestLiveScore)}
            </p>
          </div>
        </section>

        {/* ROUND CARDS */}
        <section>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Event Control
            </p>
            <h2 className="text-2xl font-semibold mt-1">Rounds</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((roundNumber) => {
              const meta = ROUND_META[roundNumber];
              const round = roundByNumber.get(roundNumber);
              const available = meta?.available;

              return (
                <button
                  key={roundNumber}
                  onClick={() => openView(`round${roundNumber}`)}
                  className={`w-full text-left rounded-2xl border p-6 hover:border-yellow-400/30 transition ${
                    available
                      ? "border-white/10 bg-[#0b0b0b]"
                      : "border-white/5 bg-[#080808] opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                        Round {roundNumber}
                      </p>
                      <h3 className="text-xl font-semibold mt-2">
                        {meta.label}
                      </h3>
                      <p className="text-sm text-white/40 mt-1">
                        {meta.subtitle}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                        !available
                          ? "text-white/40 border-white/10 bg-white/[0.03]"
                          : statusClass(round?.status || "NOT STARTED")
                      }`}
                    >
                      {!available ? "CLASSIFY LATER" : round?.status || "NOT STARTED"}
                    </span>
                  </div>

                  {available ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Max
                          </p>
                          <p className="mt-1 font-semibold">
                            {round?.max_score ?? (roundNumber === 1 ? 100 : 50)}
                          </p>
                        </div>

                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Duration
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDuration(round?.duration_seconds || 0)}
                          </p>
                        </div>

                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Started
                          </p>
                          <p className="mt-1 font-semibold">
                            {round?.teams_started ?? 0}
                          </p>
                        </div>

                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Completed
                          </p>
                          <p className="mt-1 font-semibold">
                            {round?.teams_completed ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-white/40">
                          Average score
                        </span>
                        <span className="font-semibold">
                          {formatScore(round?.average_score)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-white/40">
                          Highest score
                        </span>
                        <span className="font-semibold text-yellow-400">
                          {formatScore(round?.highest_score)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 border border-dashed border-white/10 rounded-xl p-5">
                      <p className="text-sm text-white/45">
                        Round structure is not classified yet.
                      </p>
                      <p className="text-xs text-white/25 mt-2">
                        This card is intentionally reserved so the dashboard
                        does not need to be rebuilt later.
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* NAVIGATION CARDS */}
        <section className="grid md:grid-cols-3 gap-4">
          <button onClick={() => openView("teams")} className="text-left border border-white/10 bg-[#080808] rounded-2xl p-6 hover:border-yellow-400/30 transition">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Operations</p>
            <h2 className="text-2xl font-semibold mt-1">Teams</h2>
            <p className="text-sm text-white/35 mt-2">Manage members, lock teams and move participants.</p>
            <p className="text-white/30 text-xl mt-5">→</p>
          </button>

          <button onClick={() => openView("live")} className="text-left border border-white/10 bg-[#080808] rounded-2xl p-6 hover:border-green-400/30 transition">
            <p className="text-xs uppercase tracking-[0.25em] text-green-400">Live</p>
            <h2 className="text-2xl font-semibold mt-1">Live Results</h2>
            <p className="text-sm text-white/35 mt-2">Open the live leaderboard and current round scores.</p>
            <p className="text-white/30 text-xl mt-5">→</p>
          </button>

          <button onClick={() => openView("results")} className="text-left border border-white/10 bg-[#080808] rounded-2xl p-6 hover:border-blue-300/30 transition">
            <p className="text-xs uppercase tracking-[0.25em] text-blue-300">Scoring</p>
            <h2 className="text-2xl font-semibold mt-1">Results</h2>
            <p className="text-sm text-white/35 mt-2">Round-wise results and final winner calculation.</p>
            <p className="text-white/30 text-xl mt-5">→</p>
          </button>

          <button onClick={() => openView("evaluation")} className="text-left border border-white/10 bg-[#080808] rounded-2xl p-6 hover:border-blue-300/30 transition">
            <p className="text-xs uppercase tracking-[0.25em] text-blue-300">Judging</p>
            <h2 className="text-2xl font-semibold mt-1">Evaluation Details</h2>
            <p className="text-sm text-white/35 mt-2">Official event criteria and round-by-round scoring weights.</p>
            <p className="text-white/30 text-xl mt-5">→</p>
          </button>

          <button onClick={() => openView("secrets")} className="text-left border border-red-500/15 bg-[#080808] rounded-2xl p-6 hover:border-red-400/30 transition">
            <p className="text-xs uppercase tracking-[0.25em] text-red-300">Restricted</p>
            <h2 className="text-2xl font-semibold mt-1">Secrets & Controls</h2>
            <p className="text-sm text-white/35 mt-2">Hidden bonuses, hint costs, penalties and admin-only mechanics.</p>
            <p className="text-white/30 text-xl mt-5">→</p>
          </button>

          <button onClick={() => openView("solutions")} className="text-left border border-red-500/15 bg-[#080808] rounded-2xl p-6 hover:border-red-400/30 transition">
            <p className="text-xs uppercase tracking-[0.25em] text-red-300">Restricted</p>
            <h2 className="text-2xl font-semibold mt-1">Solutions / Answer Key</h2>
            <p className="text-sm text-white/35 mt-2">R1 MCQ answers, R2 lead solutions and final trail.</p>
            <p className="text-white/30 text-xl mt-5">→</p>
          </button>

          <button onClick={() => openView("admins")} className="text-left border border-white/10 bg-[#080808] rounded-2xl p-6 hover:border-purple-400/30 transition">
            <p className="text-xs uppercase tracking-[0.25em] text-purple-300">Access Control</p>
            <h2 className="text-2xl font-semibold mt-1">Administrators</h2>
            <p className="text-sm text-white/35 mt-2">View the accounts currently authorized for admin access.</p>
            <p className="text-white/30 text-xl mt-5">→</p>
          </button>
        </section>

        {/* FINAL WINNER PLACEHOLDER */}
        <section className="border border-yellow-500/20 bg-yellow-500/[0.03] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">
            Final Results
          </p>
          <h2 className="text-xl font-semibold mt-2">
            Winner calculation is reserved
          </h2>
          <p className="text-sm text-white/40 mt-2 max-w-2xl">
            Once Rounds 3 and 4 are classified, the final results card can
            calculate the official winner from all four finalized round scores
            without changing this dashboard structure.
          </p>
        </section>
      </div>

      {/* TEAM SIDE PANEL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelectedTeam(null)}
            aria-label="Close panel"
          />

          <aside className="absolute top-0 right-0 h-full w-full max-w-xl bg-[#0a0a0a] border-l border-white/10 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10 px-6 py-5 flex justify-between items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">
                  Team Details
                </p>
                <h2 className="text-2xl font-semibold mt-2">
                  {selectedTeam.team_name}
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {selectedTeam.team_code}
                </p>
              </div>

              <button
                onClick={() => setSelectedTeam(null)}
                className="text-white/40 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Status
                  </p>
                  <p
                    className={`mt-2 font-semibold ${
                      selectedTeam.status === "LOCKED"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {selectedTeam.status}
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Members
                  </p>
                  <p className="mt-2 font-semibold">
                    {selectedTeam.members.length} / 4
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Team Code
                  </p>
                  <p className="mt-2 font-semibold text-yellow-400">
                    {selectedTeam.team_code}
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Current Round
                  </p>
                  <p className="mt-2 font-semibold">
                    {selectedTeam.current_round
                      ? `Round ${selectedTeam.current_round}`
                      : "Not started"}
                  </p>
                </div>
              </div>

              <section className="border border-white/10 rounded-xl p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Evaluation Record</p>
                <h3 className="font-semibold mt-2">Round-by-round scoring</h3>
                <div className="mt-4 space-y-3">
                  {[1, 2, 3, 4].map((roundNumber) => {
                    const score = scoreByTeamAndRound(selectedTeam.id, roundNumber);
                    const criteria = ROUND_EVALUATION[roundNumber] || [];
                    return (
                      <div key={roundNumber} className="border border-white/8 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-white/30">Round {roundNumber}</p>
                            <p className="font-semibold mt-1">{ROUND_META[roundNumber].label}</p>
                          </div>
                          <p className="text-lg font-bold text-yellow-400">{score ? `${formatScore(score.score)} / ${formatScore(score.max_score)}` : "—"}</p>
                        </div>
                        {score && criteria.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/8 space-y-2">
                            {criteria.map((criterion) => (
                              <div key={criterion.label} className="flex justify-between text-xs">
                                <span className="text-white/35">{criterion.label}</span>
                                <span className="text-white/60">max {criterion.max}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Members</h3>
                  <span className="text-xs text-white/35">
                    {selectedTeam.members.length} participant
                    {selectedTeam.members.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedTeam.members.map((member) => (
                    <div
                      key={member.id}
                      className="border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-white/45 mt-1">
                            {member.email}
                          </p>
                        </div>

                        {selectedTeam.status === "FORMING" && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleRemoveMember(member)}
                            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                        <div>
                          <p className="text-white/30">College</p>
                          <p className="mt-1 text-white/70">
                            {member.college_name || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/30">Department</p>
                          <p className="mt-1 text-white/70">
                            {member.department || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/30">Year</p>
                          <p className="mt-1 text-white/70">
                            {member.year_of_study || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/30">Contact</p>
                          <p className="mt-1 text-white/70">
                            {member.whatsapp_number || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {selectedTeam.status === "FORMING" &&
                availableMoveTargets.length > 0 && (
                  <section className="border border-white/10 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-white/35">
                      Team Management
                    </p>

                    <h3 className="font-semibold mt-2">Move Member</h3>

                    <div className="mt-4 space-y-3">
                      <select
                        value={moveMemberId}
                        onChange={(event) =>
                          setMoveMemberId(event.target.value)
                        }
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                      >
                        <option value="">Select member</option>
                        {selectedTeam.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={targetTeamId}
                        onChange={(event) =>
                          setTargetTeamId(event.target.value)
                        }
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                      >
                        <option value="">Select target team</option>
                        {availableMoveTargets.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.team_name} — {team.members.length}/4
                          </option>
                        ))}
                      </select>

                      <button
                        disabled={
                          actionLoading || !moveMemberId || !targetTeamId
                        }
                        onClick={handleMoveMember}
                        className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-40 hover:bg-yellow-300 transition"
                      >
                        {actionLoading ? "Processing..." : "Move Member"}
                      </button>
                    </div>
                  </section>
                )}

              {selectedTeam.status === "FORMING" && (
                <section className="border border-yellow-500/20 bg-yellow-500/[0.04] rounded-xl p-5">
                  <p className="text-xs uppercase tracking-widest text-yellow-400">
                    Finalize Team
                  </p>

                  <h3 className="font-semibold mt-2">Lock this team</h3>

                  <p className="text-sm text-white/40 mt-2">
                    Once locked, members cannot leave, move or be removed.
                  </p>

                  <button
                    disabled={
                      actionLoading || selectedTeam.members.length < 2
                    }
                    onClick={handleLockTeam}
                    className="w-full mt-4 rounded-xl bg-yellow-400 text-black py-3 font-bold disabled:opacity-40 hover:bg-yellow-300 transition"
                  >
                    {selectedTeam.members.length < 2
                      ? "Need at Least 2 Members"
                      : actionLoading
                      ? "Processing..."
                      : "Lock Team"}
                  </button>
                </section>
              )}

              {selectedTeam.status === "LOCKED" && (
                <section className="border border-green-500/20 bg-green-500/[0.04] rounded-xl p-5">
                  <p className="text-xs uppercase tracking-widest text-green-400">
                    Team Secured
                  </p>

                  <h3 className="font-semibold mt-2">Team is locked</h3>

                  <p className="text-sm text-white/40 mt-2">
                    Team composition is now frozen.
                  </p>
                </section>
              )}

              {notice && (
                <div className="border border-white/10 rounded-xl p-4 text-sm text-white/70">
                  {notice}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function AdminSecretsPanel({ teams }: { teams: LiveResult[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [activeRound, setActiveRound] = useState(1);
  const [saving, setSaving] = useState(false);

  // R1 state
  const [r1Secrets, setR1Secrets] = useState({
    speed_bonus_enabled: false,
    no_hint_bonus_enabled: false,
    secret_bonus_enabled: false,
    secret_penalty_enabled: false,
  });
  const [r1Base, setR1Base] = useState(0);

  // R2 state
  const [r2Base, setR2Base] = useState(0);
  const [r2Bonus, setR2Bonus] = useState(0);

  // R3 state
  const [r3Base, setR3Base] = useState(0);
  const [r3Bonus, setR3Bonus] = useState(0);

  // Load scores for selected team
  useEffect(() => {
    if (!selectedTeamId) return;
    async function load() {
      // Load R1 secrets
      const { data: s1 } = await supabase.rpc("admin_get_team_secrets", {
        p_team_id: selectedTeamId, p_round_number: 1,
      });
      if (s1) setR1Secrets({
        speed_bonus_enabled: !!s1.speed_bonus_enabled,
        no_hint_bonus_enabled: !!s1.no_hint_bonus_enabled,
        secret_bonus_enabled: !!s1.secret_bonus_enabled,
        secret_penalty_enabled: !!s1.secret_penalty_enabled,
      });

      // Load all round submissions
      const { data: subs } = await supabase
        .from("team_round_submissions")
        .select("round_number, score, metadata")
        .eq("team_id", selectedTeamId);

      if (subs) {
        for (const sub of subs) {
          if (sub.round_number === 1) {
            setR1Base(sub.metadata?.rawScore ? sub.metadata.rawScore / 2 : (sub.score ?? 0));
          }
          if (sub.round_number === 2) {
            setR2Base(sub.score ?? 0);
            setR2Bonus(sub.metadata?.admin_bonus ?? 0);
          }
          if (sub.round_number === 3) {
            setR3Base(sub.score ?? 0);
            setR3Bonus(sub.metadata?.admin_bonus ?? 0);
          }
        }
      }
    }
    load();
  }, [selectedTeamId]);

  // R1 toggle handler
  const handleR1Toggle = async (key: keyof typeof r1Secrets) => {
    const next = { ...r1Secrets, [key]: !r1Secrets[key] };
    if (key === "secret_bonus_enabled" && next.secret_bonus_enabled) next.secret_penalty_enabled = false;
    if (key === "secret_penalty_enabled" && next.secret_penalty_enabled) next.secret_bonus_enabled = false;
    setR1Secrets(next);
    await supabase.rpc("admin_set_team_secrets", {
      p_team_id: selectedTeamId, p_round_number: 1,
      p_speed_bonus: next.speed_bonus_enabled,
      p_no_hint_bonus: next.no_hint_bonus_enabled,
      p_secret_bonus: next.secret_bonus_enabled,
      p_secret_penalty: next.secret_penalty_enabled,
    });
  };

  // R1 adjusted
  let r1Adjusted = r1Base;
  if (r1Secrets.speed_bonus_enabled) r1Adjusted += 5;
  if (r1Secrets.no_hint_bonus_enabled) r1Adjusted += 2.5;
  if (r1Secrets.secret_bonus_enabled) r1Adjusted += 5;
  if (r1Secrets.secret_penalty_enabled) r1Adjusted -= 5;
  r1Adjusted = Math.max(0, Math.min(50, r1Adjusted));

  // R2 adjusted (capped at 50)
  const r2MaxBonus = Math.max(0, 50 - r2Base);
  const r2SafeBonus = Math.min(r2Bonus, r2MaxBonus);
  const r2Final = Math.min(50, r2Base + r2SafeBonus);

  // R3 adjusted (capped at 50)
  const r3MaxBonus = Math.max(0, 50 - r3Base);
  const r3SafeBonus = Math.min(r3Bonus, r3MaxBonus);
  const r3Final = Math.min(50, r3Base + r3SafeBonus);

  // Finalize R1
  const finalizeR1 = async () => {
    setSaving(true);
    await supabase.rpc("admin_recalculate_r1_score", { p_team_id: selectedTeamId });
    setSaving(false);
    alert("Round 1 official score finalized.");
  };

  // Finalize R2 or R3
  const finalizeRound = async (rnd: 2 | 3, finalScore: number, bonus: number) => {
    setSaving(true);
    await supabase.from("team_round_submissions").update({
      score: finalScore,
      score_final: true,
      metadata: supabase.rpc as any, // placeholder; we update via raw below
      updated_at: new Date().toISOString(),
    }).eq("team_id", selectedTeamId).eq("round_number", rnd);

    // Save using upsert with admin_bonus in metadata
    const { data: existing } = await supabase
      .from("team_round_submissions")
      .select("metadata")
      .eq("team_id", selectedTeamId)
      .eq("round_number", rnd)
      .single();

    const newMeta = { ...(existing?.metadata ?? {}), admin_bonus: bonus };
    await supabase.from("team_round_submissions").upsert({
      team_id: selectedTeamId,
      round_number: rnd,
      score: finalScore,
      score_final: true,
      metadata: newMeta,
      updated_at: new Date().toISOString(),
    }, { onConflict: "team_id,round_number" });

    setSaving(false);
    alert(`Round ${rnd} official score finalized: ${finalScore.toFixed(1)} / 50`);
  };

  const roundColors: Record<number, string> = { 1: "yellow", 2: "cyan", 3: "purple" };
  const roundLabels: Record<number, string> = { 1: "THE CRIME SCENE", 2: "FOLLOW THE TRAIL", 3: "THE INTERROGATION" };

  return (
    <div className="space-y-5">
      <section className="border border-red-500/20 bg-red-500/[0.03] rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-red-300">ADMIN ONLY</p>
        <h2 className="text-3xl font-semibold mt-1">Secrets & Hidden Controls</h2>
        <p className="text-sm text-white/40 mt-2">Hidden from all participants. Adjust per round. Final scores are capped at 50 per round.</p>
      </section>

      <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
        <label className="block text-xs uppercase tracking-[0.25em] text-yellow-400 mb-2">Select Team</label>
        <select
          className="w-full bg-black border border-white/20 rounded p-3 text-white focus:outline-none focus:border-yellow-400"
          value={selectedTeamId}
          onChange={e => setSelectedTeamId(e.target.value)}
        >
          <option value="">-- CHOOSE TEAM --</option>
          {teams.map(t => (
            <option key={t.team_id} value={t.team_id}>{t.team_name} ({t.team_code})</option>
          ))}
        </select>
      </section>

      {selectedTeamId && (
        <>
          {/* Round selector tabs */}
          <div className="flex gap-3">
            {[1, 2, 3].map(r => (
              <button
                key={r}
                onClick={() => setActiveRound(r)}
                className={`flex-1 py-3 font-bold rounded-xl border text-sm tracking-widest transition-all ${
                  activeRound === r
                    ? r === 1 ? "bg-yellow-400 text-black border-yellow-400"
                      : r === 2 ? "bg-cyan-400 text-black border-cyan-400"
                      : "bg-purple-500 text-white border-purple-500"
                    : "bg-transparent text-white/40 border-white/10 hover:border-white/30"
                }`}
              >
                ROUND {r}
              </button>
            ))}
          </div>

          {/* ROUND 1 */}
          {activeRound === 1 && (
            <section className="border border-yellow-400/20 bg-[#080808] rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Round 1 — {roundLabels[1]}</p>
              <h3 className="text-xl font-semibold mt-1">Hidden Scoring Toggles</h3>
              <p className="text-xs text-white/30 mt-1">Base: {r1Base.toFixed(1)} / 50 → Final: <span className="text-yellow-400 font-bold">{r1Adjusted.toFixed(1)} / 50</span></p>

              <div className="mt-6 space-y-3 max-w-lg">
                {([
                  ["speed_bonus_enabled", "20-Min Speed Bonus", "+5 pts — 4 of 5 core evidence within 20 min", "green"],
                  ["no_hint_bonus_enabled", "No-Hint Bonus", "+2.5 pts — zero hints used", "green"],
                  ["secret_bonus_enabled", "Secret Bonus", "+5 pts — admin adjudication (mutually exclusive)", "red"],
                  ["secret_penalty_enabled", "Secret Penalty", "-5 pts — admin adjudication (mutually exclusive)", "red"],
                ] as const).map(([key, label, detail, color]) => (
                  <div key={key} className="flex items-center justify-between border border-white/8 rounded-xl p-4">
                    <div>
                      <p className={`font-semibold ${color === "red" ? "text-red-400" : ""}`}>{label}</p>
                      <p className="text-xs text-white/40 mt-1">{detail}</p>
                    </div>
                    <button
                      onClick={() => handleR1Toggle(key)}
                      className={`px-5 py-2 font-black rounded text-sm ${
                        r1Secrets[key]
                          ? color === "green" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {r1Secrets[key] ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-black border border-yellow-400/20 p-5 rounded-xl max-w-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/40">Base score (raw ÷ 2)</span>
                  <span>{r1Base.toFixed(1)} / 50</span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-yellow-400 font-bold">Adjusted Final</span>
                  <span className="text-yellow-400 font-bold text-lg">{r1Adjusted.toFixed(1)} / 50</span>
                </div>
                <button onClick={finalizeR1} disabled={saving}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3 rounded tracking-widest">
                  {saving ? "SAVING..." : "FINALIZE R1 SCORE"}
                </button>
              </div>
            </section>
          )}

          {/* ROUND 2 */}
          {activeRound === 2 && (
            <section className="border border-cyan-400/20 bg-[#080808] rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">Round 2 — {roundLabels[2]}</p>
              <h3 className="text-xl font-semibold mt-1">Admin Bonus Points</h3>
              <p className="text-xs text-white/30 mt-1">Base score from gameplay. Add admin bonus below. Max cap: 50 / 50.</p>

              <div className="mt-6 max-w-lg space-y-5">
                <div className="border border-white/8 rounded-xl p-5">
                  <div className="flex justify-between mb-4 text-sm">
                    <span className="text-white/40">Base R2 Score (from gameplay)</span>
                    <span className="font-bold">{r2Base.toFixed(1)} / 50</span>
                  </div>

                  <label className="block text-xs text-cyan-400 uppercase tracking-widest mb-2">
                    Admin Bonus Points (max you can add: {r2MaxBonus.toFixed(1)})
                  </label>
                  <input
                    type="number" min={0} max={r2MaxBonus} step={0.5}
                    value={r2Bonus}
                    onChange={e => setR2Bonus(Math.min(r2MaxBonus, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full bg-black border border-cyan-400/40 text-white text-xl font-bold p-3 rounded focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-xs text-white/30 mt-2">Enter 0 to remove bonus. Capped automatically so score never exceeds 50.</p>
                </div>

                <div className="bg-black border border-cyan-400/20 p-5 rounded-xl">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/40">Base</span><span>{r2Base.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/40">Admin Bonus</span><span>+{r2SafeBonus.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-white/10">
                    <span className="text-cyan-400">Final R2 Score</span>
                    <span className="text-cyan-400">{r2Final.toFixed(1)} / 50</span>
                  </div>
                </div>

                <button onClick={() => finalizeRound(2, r2Final, r2SafeBonus)} disabled={saving}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded tracking-widest">
                  {saving ? "SAVING..." : "FINALIZE R2 SCORE"}
                </button>
              </div>
            </section>
          )}

          {/* ROUND 3 */}
          {activeRound === 3 && (
            <section className="border border-purple-500/20 bg-[#080808] rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-purple-400">Round 3 — {roundLabels[3]}</p>
              <h3 className="text-xl font-semibold mt-1">Admin Bonus Points</h3>
              <p className="text-xs text-white/30 mt-1">Base score from gameplay. Add admin bonus below. Max cap: 50 / 50.</p>

              <div className="mt-6 max-w-lg space-y-5">
                <div className="border border-white/8 rounded-xl p-5">
                  <div className="flex justify-between mb-4 text-sm">
                    <span className="text-white/40">Base R3 Score (from gameplay)</span>
                    <span className="font-bold">{r3Base.toFixed(1)} / 50</span>
                  </div>

                  <label className="block text-xs text-purple-400 uppercase tracking-widest mb-2">
                    Admin Bonus Points (max you can add: {r3MaxBonus.toFixed(1)})
                  </label>
                  <input
                    type="number" min={0} max={r3MaxBonus} step={0.5}
                    value={r3Bonus}
                    onChange={e => setR3Bonus(Math.min(r3MaxBonus, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full bg-black border border-purple-500/40 text-white text-xl font-bold p-3 rounded focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-xs text-white/30 mt-2">Enter 0 to remove bonus. Capped automatically so score never exceeds 50.</p>
                </div>

                <div className="bg-black border border-purple-500/20 p-5 rounded-xl">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/40">Base</span><span>{r3Base.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/40">Admin Bonus</span><span>+{r3SafeBonus.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-white/10">
                    <span className="text-purple-400">Final R3 Score</span>
                    <span className="text-purple-400">{r3Final.toFixed(1)} / 50</span>
                  </div>
                </div>

                <button onClick={() => finalizeRound(3, r3Final, r3SafeBonus)} disabled={saving}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded tracking-widest">
                  {saving ? "SAVING..." : "FINALIZE R3 SCORE"}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
