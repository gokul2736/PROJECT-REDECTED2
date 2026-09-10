"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   EVENT CONFIG — EDIT THESE BEFORE RUNNING THE EVENT
========================================================= */

const MAX_QUESTIONS = 6;
const FREE_TEXT_MAX_LENGTH = 300;
const ADMIN_PASSCODE = ""; // Set through a server-side/admin authentication flow; do not hardcode a production secret in client code.
const ROUND_STATUS_POLL_MS = 4000;
const ADMIN_REFRESH_MS = 5000;

// GM: set this to the Evidence IDs (E-01..E-12) that actually support the
// true solution. This MUST match the printed scoring manual.
const RELEVANT_EVIDENCE_IDS = ["E-02", "E-04", "E-05", "E-06", "E-08", "E-10", "E-14"];

// Scoring weights — see round3-scoring-manual.md for rationale.
const SCORE_UNUSED_QUESTION = 10;
const SCORE_RELEVANT_EVIDENCE = 15;
const SCORE_IRRELEVANT_EVIDENCE_PENALTY = 5;
const SCORE_CATEGORY_BONUS = 5;
const SCORE_CATEGORY_BONUS_CAP = 7;

/* =========================================================
   TYPES
========================================================= */

type Evidence = { id: string; title: string; content: string; source: string };
type QuestionResponse = { id: string; keywords: string[]; category: string; response: string; evidence: Evidence };
type AskedQuestion = { question: string; response: string; category: string; id: string };
type GuidedQuestion = { id: string; label: string; prompt: string; description: string; category: string };
type RoundStatus = "locked" | "open" | "closed";
type RoundState = { status: RoundStatus; startedAt?: number; closedAt?: number };
type TeamState = {
  teamId: string;
  questionsRemaining: number;
  history: AskedQuestion[];
  evidence: Evidence[];
  updatedAt: number;
};
type View = "role" | "team-name" | "waiting" | "playing" | "closed" | "admin-passcode" | "admin";

/* =========================================================
   DATA
========================================================= */

const echoResponses: QuestionResponse[] = [
  { id: "E01", keywords: ["terminal", "active", "security interruption", "system continued"], category: "SYSTEMS", response: "The laboratory terminal remained active during the security interruption. The interruption does not establish that the laboratory system stopped recording.", evidence: { id: "E-01", title: "ACTIVE LABORATORY TERMINAL", content: "The laboratory terminal remained active during the security interruption.", source: "R1 STUDY REPORT" } },
  { id: "E02", keywords: ["22:17", "time", "disappearance", "missing", "when", "timeline"], category: "TIMELINE", response: "The BLACKBOX was recorded as missing at exactly 22:17. That establishes the reported disappearance time, not necessarily the exact physical moment it was removed.", evidence: { id: "E-02", title: "22:17 DISAPPEARANCE", content: "BLACKBOX was recorded as missing exactly at 22:17.", source: "R1 STUDY REPORT" } },
  { id: "E03", keywords: ["badge", "credential", "physical user", "identity", "who used", "access identity"], category: "ACCESS", response: "A credential was linked to restricted laboratory access. The credential record does not prove who physically used or possessed it.", evidence: { id: "E-03", title: "CREDENTIAL LIMITATION", content: "The credential is linked to restricted access, but the record does not prove the physical user.", source: "R1 STUDY REPORT" } },
  { id: "E04", keywords: ["22:08", "encrypted", "communication", "message", "deleted", "communication time"], category: "COMMUNICATION", response: "A communication associated with the incident was recorded at 22:08. The timing is relevant to the sequence surrounding the later access and disappearance events.", evidence: { id: "E-04", title: "22:08 COMMUNICATION", content: "A deleted communication was recorded at 22:08.", source: "R1 STUDY REPORT" } },
  { id: "E05", keywords: ["22:11", "restricted access", "access event", "credential event"], category: "ACCESS", response: "A restricted-access event occurred at 22:11. The event establishes that the credential was used or recorded, but does not establish the physical identity of the person using it.", evidence: { id: "E-05", title: "22:11 RESTRICTED ACCESS", content: "A restricted-access event was recorded at 22:11; the credential does not establish the physical user.", source: "R1 STUDY REPORT" } },
  { id: "E06", keywords: ["cctv", "camera", "22:16:53", "last frame", "visual", "surveillance"], category: "CCTV", response: "The last recovered CCTV frame before the reported 22:17 disappearance is timestamped 22:16:53. It is the last recovered visual point immediately before the BLACKBOX was reported missing.", evidence: { id: "E-06", title: "22:16:53 LAST CCTV FRAME", content: "CCTV recovered a frame at 22:16:53 immediately before the 22:17 disappearance.", source: "R1 STUDY REPORT" } },
  { id: "E07", keywords: ["main entrance", "main door", "route", "removed", "exit", "entrance"], category: "LOCATION", response: "There is no direct record proving that the BLACKBOX was removed through the main laboratory entrance. The evidence does not establish that route.", evidence: { id: "E-07", title: "NO MAIN-ENTRANCE PROOF", content: "There is no direct record proving BLACKBOX removal through the main entrance.", source: "R1 STUDY REPORT" } },
  { id: "E08", keywords: ["transfer note", "handwritten", "22:11", "note"], category: "TRANSFER", response: "The handwritten transfer note contains the time 22:11. Its significance becomes stronger when compared with the transfer preparation evidence and restricted transfer infrastructure.", evidence: { id: "E-08", title: "22:11 TRANSFER NOTE", content: "The handwritten transfer note contains 22:11.", source: "R1 STUDY REPORT" } },
  { id: "E09", keywords: ["wall clock", "22:16", "clock", "unsynchronized"], category: "RELIABILITY", response: "The wall clock displays 22:16, but it is an environmental observation and is not independently synchronized. It should not override the verified system timestamps.", evidence: { id: "E-09", title: "UNSYNCED WALL CLOCK", content: "The wall clock displays 22:16 but is not independently synchronized.", source: "R1 STUDY REPORT" } },
  { id: "E10", keywords: ["transfer fragments", "preparation", "prep", "22:08", "storage drive", "transfer"], category: "DIGITAL", response: "Transfer fragments show preparation activity at 22:08. This becomes significant when compared with the restricted transfer network connection.", evidence: { id: "E-10", title: "22:08 TRANSFER PREPARATION", content: "Storage-drive transfer fragments show preparation activity at 22:08.", source: "R1 STUDY REPORT" } },
  { id: "E11", keywords: ["corridor camera", "camera affected", "interruption", "corridor"], category: "CCTV", response: "The corridor camera was affected during the security interruption. This limits the visual record but does not by itself identify who caused the interruption.", evidence: { id: "E-11", title: "CORRIDOR CAMERA GAP", content: "The corridor camera was affected during the interruption.", source: "R1 STUDY REPORT" } },
  { id: "E12", keywords: ["locker key", "locker", "movement route", "key"], category: "LOCATION", response: "The locker key does not establish a movement route for the BLACKBOX. It should not be treated as proof of where the object travelled.", evidence: { id: "E-12", title: "LOCKER KEY LIMITATION", content: "The locker key does not establish the BLACKBOX movement route.", source: "R1 STUDY REPORT" } },
  { id: "E13", keywords: ["discard bin", "ordinary material", "responsibility", "bin"], category: "RELIABILITY", response: "The discard bin contains ordinary material and does not independently establish responsibility.", evidence: { id: "E-13", title: "DISCARD BIN LIMITATION", content: "The discard bin does not independently establish responsibility.", source: "R1 STUDY REPORT" } },
  { id: "E14", keywords: ["maintenance panel", "transfer network", "restricted network", "network"], category: "SYSTEMS", response: "The maintenance panel is connected to the restricted transfer network. This establishes relevant infrastructure, but infrastructure access alone does not prove who used it.", evidence: { id: "E-14", title: "RESTRICTED TRANSFER NETWORK", content: "The maintenance panel is connected to the restricted transfer network.", source: "R1 STUDY REPORT" } },
  { id: "E15", keywords: ["chain of custody", "custody", "envelope", "proof"], category: "RELIABILITY", response: "The chain-of-custody record documents handling of evidence. It does not independently establish responsibility for the BLACKBOX disappearance.", evidence: { id: "E-15", title: "CHAIN OF CUSTODY", content: "Chain of custody documents evidence handling but does not identify responsibility.", source: "R1 STUDY REPORT" } },
  { id: "E16", keywords: ["emergency network", "procedure", "procedure tag", "emergency"], category: "SYSTEMS", response: "The emergency network procedure explains an available technical procedure. It does not establish who used the procedure or who was responsible.", evidence: { id: "E-16", title: "EMERGENCY NETWORK PROCEDURE", content: "The procedure tag does not establish responsibility.", source: "R1 STUDY REPORT" } },
];

const fallbackResponse: QuestionResponse = {
  id: "E13",
  keywords: [],
  category: "UNRESOLVED",
  response: "The available memory does not provide a direct answer to that question. Instead of guessing a sentence, choose an investigation angle below. ECHO can guide the query toward a known evidence channel.",
  evidence: { id: "E-13", title: "UNRESOLVED QUERY", content: "The query did not map cleanly to a known evidence channel.", source: "ECHO" },
};

const guidedQuestions: GuidedQuestion[] = [
  { id: "timeline", label: "RECONSTRUCT THE TIMELINE", prompt: "What can ECHO confirm about the critical sequence from 22:08 to 22:17?", description: "Compare the communication, access, CCTV and disappearance timestamps.", category: "TIMELINE" },
  { id: "access", label: "CHECK ACCESS IDENTITY", prompt: "What can the 22:11 restricted-access record actually prove about the person who used the credential?", description: "Separate credential use from physical identity.", category: "ACCESS" },
  { id: "cctv", label: "INVESTIGATE THE CCTV GAP", prompt: "What is the last reliable visual point before the BLACKBOX was reported missing?", description: "Establish what CCTV can and cannot tell the team.", category: "CCTV" },
  { id: "digital", label: "FOLLOW THE DIGITAL TRAIL", prompt: "What digital activity occurred around 22:08 and how does it connect to the restricted transfer network?", description: "Cross-reference transfer preparation and infrastructure.", category: "DIGITAL" },
  { id: "location", label: "TEST THE REMOVAL ROUTE", prompt: "What does the evidence establish about how or where the BLACKBOX could have left the laboratory?", description: "Do not assume the main entrance was used.", category: "LOCATION" },
  { id: "communication", label: "TRACE COMMUNICATION", prompt: "What is known about the communication recorded at 22:08?", description: "Use timing without assuming the identity of a sender.", category: "COMMUNICATION" },
  { id: "reliability", label: "CHALLENGE THE EVIDENCE", prompt: "Which evidence should be treated cautiously because its timing or meaning is limited?", description: "Separate synchronized records from environmental observations and unsupported conclusions.", category: "RELIABILITY" },
];

const eventRows: [string, string, string][] = [
  ["21:58", "RESTRICTED WING ENTRY", "ACCESS"],
  ["22:03", "SECURITY ANOMALY", "SECURITY"],
  ["22:08", "ENCRYPTED COMMUNICATION", "DIGITAL"],
  ["22:11", "RESTRICTED ACCESS / CCTV GAP", "CRITICAL"],
  ["22:16:53", "LAST RECOVERED VISUAL FRAME", "VIDEO"],
  ["22:17", "BLACKBOX STATUS: MISSING", "CRITICAL"],
];

/* =========================================================
   MATCHING ENGINE (word-boundary, threshold-gated)
========================================================= */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildKeywordRegex(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
}
function findEchoResponse(question: string): QuestionResponse {
  const normalized = question.toLowerCase();
  let bestMatch: QuestionResponse | null = null;
  let highestScore = 0;
  for (const item of echoResponses) {
    let score = 0;
    for (const keyword of item.keywords) if (buildKeywordRegex(keyword).test(normalized)) score++;
    if (score > highestScore) { highestScore = score; bestMatch = item; }
  }
  return highestScore > 0 && bestMatch ? bestMatch : fallbackResponse;
}
function getSuggestions(response: QuestionResponse): GuidedQuestion[] {
  const byCategory: Record<string, string[]> = {
    TIMELINE: ["cctv", "digital", "reliability"],
    ACCESS: ["location", "cctv", "digital"],
    CCTV: ["timeline", "reliability", "access"],
    DIGITAL: ["communication", "access", "cctv"],
    LOCATION: ["access", "timeline", "reliability"],
    COMMUNICATION: ["digital", "timeline", "reliability"],
    RELIABILITY: ["timeline", "cctv", "location"],
    UNRESOLVED: ["timeline", "access", "reliability"],
  };
  const ids = byCategory[response.category] || byCategory.UNRESOLVED;
  return ids.map((id) => guidedQuestions.find((q) => q.id === id)).filter(Boolean) as GuidedQuestion[];
}

/* =========================================================
   SCORING ENGINE
========================================================= */

function computeScore(team: TeamState) {
  const relevantSet = new Set(RELEVANT_EVIDENCE_IDS);
  const relevantCount = team.evidence.filter((e) => relevantSet.has(e.id)).length;
  const irrelevantCount = team.evidence.length - relevantCount;
  const uniqueCategories = new Set(team.history.map((h) => h.category));
  const categoryBonusCount = Math.min(uniqueCategories.size, SCORE_CATEGORY_BONUS_CAP);
  const questionsUnused = team.questionsRemaining;

  const rawScore =
    questionsUnused * SCORE_UNUSED_QUESTION +
    relevantCount * SCORE_RELEVANT_EVIDENCE -
    irrelevantCount * SCORE_IRRELEVANT_EVIDENCE_PENALTY +
    categoryBonusCount * SCORE_CATEGORY_BONUS;

  // R3 internal raw maximum:
  // 6 unused questions (60) + 7 relevant evidence items (105) +
  // 7 coverage categories (35) = 200 raw.
  // Official event score is normalized to /50.
  const officialScore = Math.max(0, Math.min(50, rawScore / 4));

  return {
    rawScore,
    officialScore,
    questionsUnused,
    relevantCount,
    irrelevantCount,
    categoryBonusCount,
  };
}

/* =========================================================
   SHARED STORAGE HELPERS
   All round/team state lives in shared storage so every
   team's device and the admin dashboard see the same data.
========================================================= */

async function loadRoundState(): Promise<RoundState> {
  try {
    const res = await window.storage.get("round:state", true);
    return res ? (JSON.parse(res.value) as RoundState) : { status: "locked" };
  } catch {
    return { status: "locked" };
  }
}
async function saveRoundState(state: RoundState): Promise<void> {
  try {
    await window.storage.set("round:state", JSON.stringify(state), true);
  } catch {
    // best-effort; UI still functions locally if this fails transiently
  }
}
async function loadTeamState(teamId: string): Promise<TeamState | null> {
  try {
    const res = await window.storage.get(`team:${teamId}`, true);
    return res ? (JSON.parse(res.value) as TeamState) : null;
  } catch {
    return null;
  }
}
async function saveTeamState(state: TeamState): Promise<void> {
  try {
    await window.storage.set(`team:${state.teamId}`, JSON.stringify(state), true);
  } catch {
    // best-effort
  }
}
async function loadAllTeams(): Promise<TeamState[]> {
  try {
    const list = await window.storage.list("team:", true);
    if (!list || !list.keys || list.keys.length === 0) return [];
    const results = await Promise.all(
      list.keys.map(async (key: string) => {
        try {
          const res = await window.storage.get(key, true);
          return res ? (JSON.parse(res.value) as TeamState) : null;
        } catch {
          return null;
        }
      })
    );
    return results.filter((t): t is TeamState => !!t);
  } catch {
    return [];
  }
}
async function deleteTeamState(teamId: string): Promise<void> {
  try {
    await window.storage.delete(`team:${teamId}`, true);
  } catch {
    // best-effort
  }
}

/* =========================================================
   PROGRESS RING
========================================================= */

function ProgressRing({ remaining }: { remaining: number }) {
  const used = MAX_QUESTIONS - remaining;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (remaining / MAX_QUESTIONS);
  return (
    <div className="r3-ring-wrap">
      <svg viewBox="0 0 80 80" className="r3-ring" role="img" aria-label={`${remaining} of ${MAX_QUESTIONS} questions remaining`}>
        <circle cx="40" cy="40" r={radius} className="r3-ring-track" />
        <circle cx="40" cy="40" r={radius} className="r3-ring-value" style={{ strokeDasharray: `${dash} ${circumference}` }} />
      </svg>
      <div className="r3-ring-center"><strong>{remaining}</strong><span>LEFT</span></div>
      <div className="r3-ring-used">{used}/{MAX_QUESTIONS} USED</div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function Page() {
  const [view, setView] = useState<View>("role");
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("locked");

  const [teamId, setTeamId] = useState("");
  const [teamNameInput, setTeamNameInput] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  const [questionsRemaining, setQuestionsRemaining] = useState(MAX_QUESTIONS);
  const [question, setQuestion] = useState("");
  const [currentResponse, setCurrentResponse] = useState<QuestionResponse | null>(null);
  const [history, setHistory] = useState<AskedQuestion[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<GuidedQuestion | null>(null);
  const [activeTab, setActiveTab] = useState<"guide" | "free" | "log">("guide");
  const [showRules, setShowRules] = useState(false);

  const [adminTeams, setAdminTeams] = useState<TeamState[]>([]);
  const [adminConfirmReset, setAdminConfirmReset] = useState(false);

  const modalCloseRef = useRef<HTMLButtonElement>(null);

  /* ---------- poll shared round status ---------- */
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const state = await loadRoundState();
      if (!cancelled) setRoundStatus(state.status || "locked");
    };
    poll();
    const interval = setInterval(poll, ROUND_STATUS_POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  /* ---------- react to round status changes for a team session ---------- */
  useEffect(() => {
    if (!teamId) return;
    if (roundStatus === "open" && view === "waiting") setView("playing");
    if (roundStatus === "closed" && (view === "playing" || view === "waiting")) setView("closed");
    if (roundStatus === "locked" && view === "playing") setView("waiting");
  }, [roundStatus, teamId, view]);

  /* ---------- admin dashboard polling ---------- */
  useEffect(() => {
    if (view !== "admin") return;
    let cancelled = false;
    const poll = async () => {
      const teams = await loadAllTeams();
      if (!cancelled) setAdminTeams(teams);
    };
    poll();
    const interval = setInterval(poll, ADMIN_REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [view]);

  /* ---------- persist team progress to shared storage as it changes ---------- */
  useEffect(() => {
    if (!teamId) return;
    if (view !== "playing" && view !== "closed") return;
    const state: TeamState = { teamId, questionsRemaining, history, evidence, updatedAt: Date.now() };
    saveTeamState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsRemaining, history, evidence, teamId]);

  /* ---------- rules modal: scroll lock + escape + focus ---------- */
  useEffect(() => {
    if (!showRules) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setShowRules(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [showRules]);

  const suggestions = useMemo(
    () => (currentResponse ? getSuggestions(currentResponse) : guidedQuestions.slice(0, 4)),
    [currentResponse]
  );
  const lastAsked = history.length > 0 ? history[history.length - 1] : null;
  const evidenceAlreadySaved = !!currentResponse && evidence.some((item) => item.id === currentResponse.evidence.id);
  const finalScore = useMemo(
    () => computeScore({ teamId, questionsRemaining, history, evidence, updatedAt: Date.now() }),
    [teamId, questionsRemaining, history, evidence]
  );

  /* ---------- team-name submit ---------- */
  const submitTeamName = async () => {
    const trimmed = teamNameInput.trim();
    if (!trimmed) return;
    const id = trimmed.toUpperCase();
    setTeamId(id);

    const existing = await loadTeamState(id);
    if (existing) {
      setQuestionsRemaining(existing.questionsRemaining);
      setHistory(existing.history);
      setEvidence(existing.evidence);
    }

    const state = await loadRoundState();
    setRoundStatus(state.status || "locked");
    setView(state.status === "open" ? "playing" : state.status === "closed" ? "closed" : "waiting");
  };

  /* ---------- admin passcode ---------- */
  const submitPasscode = () => {
    if (passcodeInput === ADMIN_PASSCODE) {
      setPasscodeError("");
      setView("admin");
    } else {
      setPasscodeError("INCORRECT PASSCODE.");
    }
  };

  /* ---------- interrogation actions ---------- */
  const transmit = (prompt?: string) => {
    const finalQuestion = (prompt ?? question).trim();
    if (!finalQuestion) { setError("SELECT AN INVESTIGATION ANGLE OR ENTER A QUESTION."); return; }
    if (questionsRemaining <= 0) { setError("NO INTERROGATION ATTEMPTS REMAIN."); return; }

    const response = findEchoResponse(finalQuestion);
    if (response.id !== "E13" && history.some((item) => item.id === response.id)) {
      setError(`THE ${response.category} CHANNEL HAS ALREADY BEEN EXPLORED. TRY A DIFFERENT INVESTIGATION ROUTE — NO QUESTION WAS SPENT.`);
      return;
    }

    setCurrentResponse(response);
    setHistory((previous) => [...previous, { question: finalQuestion, response: response.response, category: response.category, id: response.id }]);
    setQuestionsRemaining((previous) => previous - 1);
    setQuestion("");
    setSelectedGuide(null);
    setError("");
    setActiveTab("guide");
  };

  const saveEvidence = () => {
    if (!currentResponse || currentResponse.id === "E13") return;
    if (!evidence.some((item) => item.id === currentResponse.evidence.id)) {
      setEvidence((previous) => [...previous, currentResponse.evidence]);
    }
  };

  const resetQuestion = () => { setSelectedGuide(null); setQuestion(""); setError(""); };

  /* ---------- admin actions ---------- */
  const startRound = async () => { await saveRoundState({ status: "open", startedAt: Date.now() }); setRoundStatus("open"); };
  const lockRound = async () => { await saveRoundState({ status: "closed", closedAt: Date.now() }); setRoundStatus("closed"); };
  const reopenLocked = async () => { await saveRoundState({ status: "locked" }); setRoundStatus("locked"); };
  const resetAllData = async () => {
    const teams = await loadAllTeams();
    await Promise.all(teams.map((t) => deleteTeamState(t.teamId)));
    await saveRoundState({ status: "locked" });
    setRoundStatus("locked");
    setAdminTeams([]);
    setAdminConfirmReset(false);
  };

  const rankedTeams = useMemo(
    () => adminTeams.map((t) => ({ team: t, ...computeScore(t) })).sort((a, b) => b.officialScore - a.officialScore),
    [adminTeams]
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="r3-shell">
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #030303; }
        button, textarea, input { font: inherit; }
        button:disabled { cursor: not-allowed; opacity: 0.5; }
        .r3-shell { min-height: 100vh; background: radial-gradient(circle at 75% 15%, rgba(255,204,0,.07), transparent 28%), #030303; color: #eee; font-family: Inter, ui-sans-serif, system-ui, sans-serif; position: relative; overflow-x: hidden; }
        .r3-shell:before { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: .035; background-image: linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px); background-size: 100% 4px; z-index: 50; }
        .r3-topline { height: 2px; background: linear-gradient(90deg, transparent, #ffcc00 20%, #ffcc00 80%, transparent); box-shadow: 0 0 24px rgba(255,204,0,.25); }
        .r3-header { border-bottom: 1px solid #222; background: rgba(7,7,7,.94); position: sticky; top: 0; z-index: 20; backdrop-filter: blur(14px); }
        .r3-header-inner { max-width: 1450px; margin: auto; padding: 18px 28px; display: flex; justify-content: space-between; gap: 20px; align-items: center; flex-wrap: wrap; }
        .r3-kicker { color: #ffcc00; letter-spacing: 4px; font-size: 10px; font-weight: 800; }
        .r3-title { margin: 5px 0 0; font-size: clamp(20px, 3vw, 30px); letter-spacing: 1.5px; font-weight: 800; }
        .r3-subtitle { margin-top: 5px; color: #7a7a7a; font-size: 11px; letter-spacing: 1.5px; }
        .r3-header-status { display: flex; align-items: center; gap: 14px; }
        .r3-live { display: flex; gap: 8px; align-items: center; color: #999; font-size: 10px; letter-spacing: 2px; }
        .r3-dot { width: 7px; height: 7px; background: #ffcc00; border-radius: 50%; box-shadow: 0 0 12px #ffcc00; animation: r3pulse 1.5s infinite; }
        .r3-dot.off { background: #555; box-shadow: none; animation: none; }
        @keyframes r3pulse { 50% { opacity: .3; transform: scale(.7); } }
        .r3-ring-wrap { width: 70px; height: 70px; position: relative; }
        .r3-ring { transform: rotate(-90deg); width: 70px; height: 70px; }
        .r3-ring-track, .r3-ring-value { fill: none; stroke-width: 5; }
        .r3-ring-track { stroke: #242424; }
        .r3-ring-value { stroke: #ffcc00; transition: stroke-dasharray .35s ease; filter: drop-shadow(0 0 5px rgba(255,204,0,.35)); }
        .r3-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .r3-ring-center strong { font-size: 19px; line-height: 1; color: #ffcc00; }
        .r3-ring-center span, .r3-ring-used { font-size: 7px; letter-spacing: 1px; color: #999; }
        .r3-ring-used { position: absolute; width: 100%; text-align: center; top: 72px; }
        .r3-layout { max-width: 1450px; margin: auto; padding: 24px 28px 40px; display: grid; grid-template-columns: minmax(0, 1.5fr) 360px; gap: 20px; }
        .r3-card { border: 1px solid #242424; background: linear-gradient(145deg, #0c0c0c, #080808); box-shadow: 0 20px 70px rgba(0,0,0,.3); }
        .r3-card-head { padding: 15px 18px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; gap: 15px; align-items: center; }
        .r3-label { font-size: 9px; letter-spacing: 3px; color: #ffcc00; font-weight: 800; }
        .r3-meta { color: #888; font-size: 9px; letter-spacing: 1px; }
        .r3-tabs { display: flex; border-bottom: 1px solid #222; background: #080808; }
        .r3-tab { flex: 1; padding: 13px 10px; border: 0; border-right: 1px solid #1c1c1c; color: #888; background: transparent; cursor: pointer; font-size: 9px; letter-spacing: 2px; }
        .r3-tab:focus-visible, .r3-guide:focus-visible, .r3-btn:focus-visible, .r3-suggest:focus-visible, .r3-rule-btn:focus-visible, .r3-text-input:focus-visible { outline: 2px solid #ffcc00; outline-offset: 2px; }
        .r3-tab.active { color: #ffcc00; background: #101010; box-shadow: inset 0 -2px #ffcc00; }
        .r3-guide-grid { padding: 18px; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        .r3-guide { text-align: left; min-height: 112px; padding: 15px; border: 1px solid #292929; background: #090909; color: #eee; cursor: pointer; transition: .18s; position: relative; overflow: hidden; }
        .r3-guide:hover:not(:disabled) { border-color: #665500; transform: translateY(-1px); background: #0d0d0d; }
        .r3-guide.selected { border-color: #ffcc00; background: linear-gradient(145deg, rgba(255,204,0,.08), #0a0a0a); box-shadow: inset 0 0 0 1px rgba(255,204,0,.12); }
        .r3-guide-num { color: #777; font: 10px monospace; }
        .r3-guide-cat { color: #ffcc00; float: right; font-size: 8px; letter-spacing: 1px; }
        .r3-guide-title { margin-top: 12px; font-size: 12px; font-weight: 800; letter-spacing: .5px; }
        .r3-guide-desc { margin-top: 7px; color: #888; font-size: 10px; line-height: 1.5; }
        .r3-selected { margin: 0 18px 18px; padding: 15px; border: 1px solid #3a3300; background: rgba(255,204,0,.045); }
        .r3-selected-title { font-size: 10px; color: #ffcc00; letter-spacing: 2px; }
        .r3-selected-prompt { margin-top: 8px; font-family: monospace; line-height: 1.6; color: #ddd; font-size: 12px; }
        .r3-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 13px; align-items: center; }
        .r3-btn { border: 1px solid #3a3a3a; background: #111; color: #bbb; padding: 10px 14px; cursor: pointer; font-size: 9px; letter-spacing: 1.5px; }
        .r3-btn:hover:not(:disabled) { border-color: #ffcc00; color: #ffcc00; }
        .r3-btn.primary { background: #ffcc00; color: #050505; border-color: #ffcc00; font-weight: 900; }
        .r3-btn.primary:hover:not(:disabled) { box-shadow: 0 0 22px rgba(255,204,0,.15); }
        .r3-btn.primary:disabled { background: #4d4318; color: #8a7c3c; border-color: #4d4318; }
        .r3-btn.danger { border-color: #663333; color: #e08888; }
        .r3-btn.danger:hover:not(:disabled) { border-color: #e05555; color: #ff8080; }
        .r3-free { padding: 18px; }
        .r3-textarea { width: 100%; min-height: 125px; resize: vertical; background: #030303; color: #eee; border: 1px solid #292929; outline: none; padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.7; }
        .r3-textarea:focus { border-color: #ffcc00; box-shadow: 0 0 0 1px rgba(255,204,0,.1); }
        .r3-textarea::placeholder { color: #555; }
        .r3-free-note { color: #888; font-size: 9px; margin: 10px 0 4px; line-height: 1.6; }
        .r3-char-count { color: #666; font-size: 8px; text-align: right; margin-bottom: 10px; }
        .r3-response { margin-top: 20px; }
        .r3-response-body { padding: 20px; min-height: 280px; }
        .r3-response-question { border-left: 2px solid #ffcc00; padding: 10px 13px; background: #090909; color: #aaa; font: 10px/1.6 monospace; margin-bottom: 18px; }
        .r3-transmission { color: #eee; font: 13px/1.85 ui-monospace, monospace; }
        .r3-signal { margin-top: 20px; padding: 13px; border: 1px solid #272300; background: rgba(255,204,0,.035); }
        .r3-signal strong { color: #ffcc00; font-size: 9px; letter-spacing: 2px; }
        .r3-signal p { color: #999; font: 10px/1.6 monospace; margin: 7px 0 0; }
        .r3-evidence-status { align-self: center; color: #888; font-size: 9px; }
        .r3-evidence-status.saved { color: #ffcc00; }
        .r3-suggestions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 18px; }
        .r3-suggest { padding: 11px; text-align: left; background: #0a0a0a; border: 1px solid #252525; color: #bbb; cursor: pointer; }
        .r3-suggest:hover:not(:disabled) { border-color: #665500; color: #eee; }
        .r3-suggest small { display: block; color: #ffcc00; font-size: 7px; letter-spacing: 1.5px; margin-bottom: 6px; }
        .r3-suggest span { font-size: 10px; line-height: 1.4; display: block; }
        .r3-log { padding: 18px; }
        .r3-log-row { display: grid; grid-template-columns: 55px 1fr; gap: 12px; padding: 13px 0; border-bottom: 1px solid #1d1d1d; }
        .r3-log-index { color: #ffcc00; font: 9px monospace; }
        .r3-log-question { font-size: 11px; color: #ddd; line-height: 1.5; }
        .r3-log-answer { margin-top: 5px; color: #888; font: 10px/1.6 monospace; }
        .r3-side-stack { display: flex; flex-direction: column; gap: 20px; }
        .r3-status-grid { padding: 16px 18px; display: grid; gap: 14px; }
        .r3-status-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; font-size: 9px; color: #888; }
        .r3-status-value { color: #ccc; }
        .r3-bar { grid-column: 1 / -1; height: 3px; background: #1c1c1c; overflow: hidden; }
        .r3-bar i { display: block; height: 100%; background: #ffcc00; box-shadow: 0 0 10px rgba(255,204,0,.3); }
        .r3-timeline { padding: 8px 18px 16px; }
        .r3-event { display: grid; grid-template-columns: 58px 1fr auto; gap: 9px; align-items: center; padding: 10px 0; border-bottom: 1px solid #171717; }
        .r3-event time { color: #ffcc00; font: 9px monospace; }
        .r3-event span { color: #ccc; font-size: 9px; }
        .r3-event em { color: #777; font-size: 7px; font-style: normal; letter-spacing: 1px; }
        .r3-evidence { padding: 16px 18px; }
        .r3-evidence-empty { color: #777; font: 10px/1.6 monospace; }
        .r3-evidence-item { padding: 10px 0 13px 12px; border-left: 2px solid #ffcc00; margin-bottom: 12px; }
        .r3-evidence-id { color: #ffcc00; font: 8px monospace; }
        .r3-evidence-title { margin-top: 4px; color: #ddd; font-size: 10px; font-weight: 800; }
        .r3-evidence-content { margin-top: 5px; color: #999; font: 9px/1.55 monospace; }
        .r3-warning { padding: 16px 18px; background: linear-gradient(145deg, #ffcc00, #d5a900); color: #050505; }
        .r3-warning strong { font-size: 10px; letter-spacing: 1px; }
        .r3-warning p { font-size: 9px; line-height: 1.55; margin: 8px 0 0; }
        .r3-error { margin: 0 18px 18px; padding: 10px; border: 1px solid #4b3e00; background: rgba(255,204,0,.06); color: #ffcc00; font: 9px/1.6 monospace; }
        .r3-footer { max-width: 1450px; margin: auto; padding: 0 28px 30px; display: flex; justify-content: space-between; color: #666; font: 8px monospace; letter-spacing: 1px; }
        .r3-rule-btn { background: transparent; border: 0; color: #888; cursor: pointer; font-size: 9px; }
        .r3-rule-btn:hover { color: #ffcc00; }
        .r3-modal { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.78); display: grid; place-items: center; padding: 20px; backdrop-filter: blur(8px); }
        .r3-modal-card { width: min(620px, 100%); background: #090909; border: 1px solid #333; box-shadow: 0 30px 100px #000; }
        .r3-modal-body { padding: 20px; color: #999; font: 11px/1.8 monospace; }
        .r3-modal-body b { color: #ddd; }

        /* ---- gate screens (role select / team name / waiting / closed / admin passcode) ---- */
        .r3-gate { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
        .r3-gate-card { width: min(520px, 100%); border: 1px solid #242424; background: linear-gradient(145deg, #0c0c0c, #080808); box-shadow: 0 20px 70px rgba(0,0,0,.35); padding: 30px; text-align: center; }
        .r3-gate-kicker { color: #ffcc00; letter-spacing: 4px; font-size: 10px; font-weight: 800; }
        .r3-gate-title { margin: 10px 0 6px; font-size: 22px; letter-spacing: 1px; font-weight: 800; }
        .r3-gate-sub { color: #999; font-size: 11px; line-height: 1.7; margin-bottom: 22px; }
        .r3-role-row { display: flex; flex-direction: column; gap: 10px; }
        .r3-text-input { width: 100%; background: #030303; color: #eee; border: 1px solid #292929; outline: none; padding: 14px 16px; font-size: 13px; letter-spacing: 1px; text-align: center; text-transform: uppercase; }
        .r3-text-input:focus { border-color: #ffcc00; }
        .r3-gate-pulse { width: 14px; height: 14px; margin: 0 auto 18px; background: #ffcc00; border-radius: 50%; box-shadow: 0 0 18px #ffcc00; animation: r3pulse 1.4s infinite; }
        .r3-score-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; text-align: left; }
        .r3-score-item { border: 1px solid #242424; padding: 12px; background: #090909; }
        .r3-score-item span { display: block; color: #888; font-size: 8px; letter-spacing: 1.5px; margin-bottom: 6px; }
        .r3-score-item strong { color: #ffcc00; font-size: 18px; }
        .r3-score-total { margin-top: 6px; padding: 16px; background: linear-gradient(145deg, #ffcc00, #d5a900); color: #050505; }
        .r3-score-total span { display: block; font-size: 9px; letter-spacing: 2px; }
        .r3-score-total strong { font-size: 34px; }

        /* ---- admin dashboard ---- */
        .r3-admin-wrap { max-width: 1100px; margin: auto; padding: 24px 28px 50px; }
        .r3-admin-controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 20px; }
        .r3-status-pill { padding: 8px 14px; border: 1px solid #333; font-size: 9px; letter-spacing: 2px; color: #999; }
        .r3-status-pill.open { border-color: #ffcc00; color: #ffcc00; }
        .r3-status-pill.closed { border-color: #663333; color: #e08888; }
        .r3-admin-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .r3-admin-table th { text-align: left; color: #ffcc00; font-size: 9px; letter-spacing: 1.5px; padding: 10px 12px; border-bottom: 1px solid #222; }
        .r3-admin-table td { padding: 10px 12px; border-bottom: 1px solid #171717; color: #ccc; }
        .r3-admin-table tr:first-child td { color: #ffcc00; font-weight: 800; }
        .r3-admin-empty { color: #777; font: 11px/1.7 monospace; padding: 30px 0; text-align: center; }
        .r3-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

        @media (max-width: 1050px) { .r3-layout { grid-template-columns: 1fr; } .r3-side-stack { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 700px) { .r3-header-inner { padding: 15px; } .r3-header-status .r3-live { display: none; } .r3-layout { padding: 15px; } .r3-guide-grid { grid-template-columns: 1fr; } .r3-suggestions { grid-template-columns: 1fr; } .r3-side-stack { grid-template-columns: 1fr; } .r3-footer { padding: 0 15px 25px; } .r3-score-grid { grid-template-columns: 1fr; } .r3-admin-table { font-size: 10px; } }
      `}</style>

      <div className="r3-topline" />

      {/* ===================== ROLE SELECT ===================== */}
      {view === "role" && (
        <div className="r3-gate">
          <div className="r3-gate-card">
            <div className="r3-gate-kicker">PROJECT: REDACTED² // CLASSIFIED CHANNEL</div>
            <div className="r3-gate-title">ROUND 03 — THE INTERROGATION</div>
            <div className="r3-gate-sub">Choose how you're joining this session.</div>
            <div className="r3-role-row">
              <button className="r3-btn primary" style={{ padding: 16 }} onClick={() => setView("team-name")}>I'M ON AN INVESTIGATION TEAM</button>
              <button className="r3-btn" style={{ padding: 16 }} onClick={() => setView("admin-passcode")}>I'M THE GAME MASTER</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TEAM NAME ENTRY ===================== */}
      {view === "team-name" && (
        <div className="r3-gate">
          <div className="r3-gate-card">
            <div className="r3-gate-kicker">TEAM REGISTRATION</div>
            <div className="r3-gate-title">ENTER YOUR TEAM NAME</div>
            <div className="r3-gate-sub">This identifies your team on the ECHO channel and on the scoreboard. Use the exact same name if you reconnect.</div>
            <input
              className="r3-text-input"
              value={teamNameInput}
              maxLength={40}
              placeholder="E.G. TEAM ORION"
              onChange={(e) => setTeamNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitTeamName(); }}
            />
            <div style={{ marginTop: 16 }}>
              <button className="r3-btn primary" style={{ width: "100%", padding: 14 }} onClick={submitTeamName} disabled={!teamNameInput.trim()}>ENTER ECHO CHANNEL</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== WAITING FOR ROUND TO OPEN ===================== */}
      {view === "waiting" && (
        <div className="r3-gate">
          <div className="r3-gate-card">
            <div className="r3-gate-pulse" />
            <div className="r3-gate-kicker">TEAM: {teamId}</div>
            <div className="r3-gate-title">WAITING FOR ROUND TO START</div>
            <div className="r3-gate-sub">The Game Master has not opened this round yet. This screen updates automatically — no need to refresh.</div>
          </div>
        </div>
      )}

      {/* ===================== ROUND CLOSED / RESULTS ===================== */}
      {view === "closed" && (
        <div className="r3-gate">
          <div className="r3-gate-card">
            <div className="r3-gate-kicker">TEAM: {teamId}</div>
            <div className="r3-gate-title">ROUND CLOSED</div>
            <div className="r3-gate-sub">The Game Master has locked this round. Your final state has been recorded.</div>
            <div className="r3-score-grid">
              <div className="r3-score-item"><span>QUESTIONS UNUSED</span><strong>{finalScore.questionsUnused}/{MAX_QUESTIONS}</strong></div>
              <div className="r3-score-item"><span>RELEVANT EVIDENCE</span><strong>{finalScore.relevantCount}</strong></div>
              <div className="r3-score-item"><span>IRRELEVANT EVIDENCE</span><strong>{finalScore.irrelevantCount}</strong></div>
              <div className="r3-score-item"><span>CATEGORIES EXPLORED</span><strong>{finalScore.categoryBonusCount}</strong></div>
            </div>
            <div className="r3-score-total"><span>ROUND 03 SCORE</span><strong>{finalScore.officialScore.toFixed(2)} / 50</strong></div>
          </div>
        </div>
      )}

      {/* ===================== ADMIN PASSCODE ===================== */}
      {view === "admin-passcode" && (
        <div className="r3-gate">
          <div className="r3-gate-card">
            <div className="r3-gate-kicker">GAME MASTER ACCESS</div>
            <div className="r3-gate-title">ENTER PASSCODE</div>
            <input
              className="r3-text-input"
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitPasscode(); }}
              placeholder="PASSCODE"
            />
            {passcodeError && <div className="r3-error" style={{ margin: "14px 0 0" }} role="alert">{passcodeError}</div>}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button className="r3-btn" style={{ flex: 1 }} onClick={() => setView("role")}>BACK</button>
              <button className="r3-btn primary" style={{ flex: 1 }} onClick={submitPasscode}>ENTER</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADMIN DASHBOARD ===================== */}
      {view === "admin" && (
        <div className="r3-admin-wrap">
          <header style={{ marginBottom: 20 }}>
            <div className="r3-kicker">GAME MASTER CONSOLE</div>
            <h1 className="r3-title">ROUND 03 — LIVE STANDINGS</h1>
          </header>

          <div className="r3-admin-controls">
            <span className={`r3-status-pill ${roundStatus}`}>ROUND STATUS: {roundStatus.toUpperCase()}</span>
            <button className="r3-btn primary" onClick={startRound} disabled={roundStatus === "open"}>START ROUND</button>
            <button className="r3-btn" onClick={lockRound} disabled={roundStatus === "closed"}>LOCK ROUND</button>
            <button className="r3-btn" onClick={reopenLocked} disabled={roundStatus === "locked"}>RESET TO LOCKED</button>
            {!adminConfirmReset ? (
              <button className="r3-btn danger" onClick={() => setAdminConfirmReset(true)}>RESET ALL TEAM DATA</button>
            ) : (
              <>
                <span style={{ color: "#e08888", fontSize: 9 }}>ERASE ALL TEAM PROGRESS?</span>
                <button className="r3-btn danger" onClick={resetAllData}>CONFIRM ERASE</button>
                <button className="r3-btn" onClick={() => setAdminConfirmReset(false)}>CANCEL</button>
              </>
            )}
          </div>

          <div className="r3-card">
            <div className="r3-card-head">
              <div className="r3-label">TEAMS RANKED BY SCORE</div>
              <div className="r3-meta">{adminTeams.length} TEAM(S) REPORTING // AUTO-REFRESHES</div>
            </div>
            {rankedTeams.length === 0 ? (
              <div className="r3-admin-empty">No team data yet. Scores appear as teams start answering.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="r3-admin-table">
                  <thead>
                    <tr>
                      <th>RANK</th><th>TEAM</th><th>UNUSED</th><th>RELEVANT</th><th>IRRELEVANT</th><th>CATEGORIES</th><th>RAW</th><th>OFFICIAL /50</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedTeams.map((row, index) => (
                      <tr key={row.team.teamId}>
                        <td>{index + 1}</td>
                        <td>{row.team.teamId}</td>
                        <td>{row.questionsUnused}/{MAX_QUESTIONS}</td>
                        <td>{row.relevantCount}</td>
                        <td>{row.irrelevantCount}</td>
                        <td>{row.categoryBonusCount}/7</td>
                        <td>{row.rawScore}</td>
                        <td>{row.officialScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== INTERROGATION CONSOLE (view === "playing") ===================== */}
      {view === "playing" && (
        <>
          <header className="r3-header">
            <div className="r3-header-inner">
              <div>
                <div className="r3-kicker">PROJECT: REDACTED² // CLASSIFIED CHANNEL</div>
                <h1 className="r3-title">ROUND 03 — THE INTERROGATION</h1>
                <div className="r3-subtitle">TEAM: {teamId} // SUBJECT: ECHO // VIRTUAL WITNESS</div>
              </div>
              <div className="r3-header-status">
                <div className="r3-live"><i className="r3-dot" /> ECHO ONLINE</div>
                <ProgressRing remaining={questionsRemaining} />
              </div>
            </div>
          </header>

          <main className="r3-layout">
            <section>
              <div className="r3-card">
                <div className="r3-card-head">
                  <div className="r3-label">INTERROGATION CONSOLE</div>
                  <div className="r3-meta">{MAX_QUESTIONS} TOTAL QUESTIONS // SHARED TEAM BUDGET</div>
                </div>

                <div className="r3-tabs" role="tablist" aria-label="Interrogation mode">
                  <button role="tab" aria-selected={activeTab === "guide"} className={`r3-tab ${activeTab === "guide" ? "active" : ""}`} onClick={() => setActiveTab("guide")}>GUIDED INVESTIGATION</button>
                  <button role="tab" aria-selected={activeTab === "free"} className={`r3-tab ${activeTab === "free" ? "active" : ""}`} onClick={() => setActiveTab("free")}>CUSTOM QUESTION</button>
                  <button role="tab" aria-selected={activeTab === "log"} className={`r3-tab ${activeTab === "log" ? "active" : ""}`} onClick={() => setActiveTab("log")}>INTERROGATION LOG</button>
                </div>

                {activeTab === "guide" && (
                  <>
                    <div className="r3-guide-grid">
                      {guidedQuestions.map((guide, index) => (
                        <button
                          key={guide.id}
                          className={`r3-guide ${selectedGuide?.id === guide.id ? "selected" : ""}`}
                          onClick={() => { setSelectedGuide(guide); setError(""); }}
                          disabled={questionsRemaining === 0}
                          aria-pressed={selectedGuide?.id === guide.id}
                        >
                          <span className="r3-guide-num">{String(index + 1).padStart(2, "0")}</span>
                          <span className="r3-guide-cat">{guide.category}</span>
                          <div className="r3-guide-title">{guide.label}</div>
                          <div className="r3-guide-desc">{guide.description}</div>
                        </button>
                      ))}
                    </div>
                    {selectedGuide && (
                      <div className="r3-selected">
                        <div className="r3-selected-title">SELECTED INVESTIGATION ROUTE // {selectedGuide.category}</div>
                        <div className="r3-selected-prompt">{selectedGuide.prompt}</div>
                        <div className="r3-actions">
                          <button className="r3-btn primary" onClick={() => transmit(selectedGuide.prompt)} disabled={questionsRemaining === 0}>TRANSMIT THIS QUESTION</button>
                          <button className="r3-btn" onClick={resetQuestion}>CLEAR</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "free" && (
                  <div className="r3-free">
                    <label htmlFor="r3-free-textarea" className="r3-label" style={{ display: "block", marginBottom: 10 }}>FREE INTERROGATION CHANNEL</label>
                    <textarea
                      id="r3-free-textarea"
                      className="r3-textarea"
                      value={question}
                      maxLength={FREE_TEXT_MAX_LENGTH}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); transmit(); } }}
                      placeholder="You do NOT need an exact phrase. Ask naturally — ECHO will route the query to the closest evidence channel."
                      disabled={questionsRemaining === 0}
                    />
                    <div className="r3-char-count">{question.length}/{FREE_TEXT_MAX_LENGTH}</div>
                    <div className="r3-free-note">TIP // Ask about a person, timestamp, access credential, CCTV, communication, BLACKBOX movement, evidence reliability, or collaboration. Press ENTER to transmit.</div>
                    <button className="r3-btn primary" onClick={() => transmit()} disabled={questionsRemaining === 0}>TRANSMIT CUSTOM QUERY</button>
                  </div>
                )}

                {activeTab === "log" && (
                  <div className="r3-log">
                    {history.length === 0 ? (
                      <div className="r3-evidence-empty">NO QUESTIONS ASKED. Your team has the full {MAX_QUESTIONS}-question budget available.</div>
                    ) : (
                      history.map((item, index) => (
                        <div className="r3-log-row" key={`${item.id}-${index}`}>
                          <div className="r3-log-index">Q-{String(index + 1).padStart(2, "0")}<br />{item.category}</div>
                          <div><div className="r3-log-question">{item.question}</div><div className="r3-log-answer">{item.response}</div></div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {error && <div className="r3-error" role="alert">SYSTEM // {error}</div>}
              </div>

              <div className="r3-card r3-response">
                <div className="r3-card-head">
                  <div className="r3-label">ECHO // RESPONSE</div>
                  <div className="r3-meta">{currentResponse ? `CHANNEL: ${currentResponse.category}` : "AWAITING TRANSMISSION"}</div>
                </div>
                <div className="r3-response-body" aria-live="polite">
                  {!currentResponse ? (
                    <div style={{ minHeight: 245, display: "grid", placeItems: "center", textAlign: "center", color: "#666", fontFamily: "monospace" }}>
                      <div><div style={{ color: "#ffcc00", fontSize: 32, marginBottom: 10 }}>◉</div><div>SELECT AN INVESTIGATION ROUTE</div><div style={{ marginTop: 8, fontSize: 10 }}>ECHO will help you formulate the interrogation.</div></div>
                    </div>
                  ) : (
                    <>
                      <div className="r3-response-question">
                        QUERY RECEIVED // {currentResponse.category}<br />
                        <span style={{ color: "#ddd" }}>{lastAsked?.question}</span>
                      </div>
                      <div className="r3-transmission">{currentResponse.response}</div>
                      {currentResponse.id !== "E13" && (
                        <>
                          <div className="r3-signal"><strong>INVESTIGATION SIGNAL</strong><p>{currentResponse.evidence.content}</p></div>
                          <div className="r3-actions">
                            <button className="r3-btn primary" onClick={saveEvidence} disabled={evidenceAlreadySaved}>
                              {evidenceAlreadySaved ? "✓ RECORDED" : "+ RECORD AS EVIDENCE"}
                            </button>
                            <span className={`r3-evidence-status ${evidenceAlreadySaved ? "saved" : ""}`}>
                              {evidenceAlreadySaved ? "SAVED TO TEAM VAULT" : "PRESERVE THIS RESPONSE FOR ROUND 04"}
                            </span>
                          </div>
                        </>
                      )}
                      <div style={{ marginTop: 24, color: "#888", fontSize: 9, letterSpacing: 1.5 }}>ECHO SUGGESTS YOUR NEXT INVESTIGATION</div>
                      <div className="r3-suggestions">
                        {suggestions.map((guide) => (
                          <button
                            key={guide.id}
                            className="r3-suggest"
                            onClick={() => { setSelectedGuide(guide); setActiveTab("guide"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            disabled={questionsRemaining === 0}
                          >
                            <small>{guide.category}</small><span>{guide.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            <aside className="r3-side-stack">
              <div className="r3-card">
                <div className="r3-card-head"><div className="r3-label">CASE SIGNALS</div><div className="r3-meta">LIVE</div></div>
                <div className="r3-status-grid">
                  {[["MEMORY", "PARTIAL", "68%"], ["TRUTH", "UNVERIFIED", "42%"], ["TIMELINE", "INCOMPLETE", "54%"], ["IDENTITY", "UNKNOWN", "25%"]].map(([label, value, width]) => (
                    <div className="r3-status-row" key={label}>
                      <span>{label}</span><span className="r3-status-value">{value}</span>
                      <div className="r3-bar"><i style={{ width }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="r3-card">
                <div className="r3-card-head"><div className="r3-label">KNOWN EVENT WINDOW</div><div className="r3-meta">REFERENCE</div></div>
                <div className="r3-timeline">
                  {eventRows.map(([time, event, tag]) => (
                    <div className="r3-event" key={time}><time>{time}</time><span>{event}</span><em>{tag}</em></div>
                  ))}
                </div>
              </div>

              <div className="r3-card">
                <div className="r3-card-head"><div className="r3-label">TEAM EVIDENCE VAULT</div><div className="r3-meta">{evidence.length} SAVED</div></div>
                <div className="r3-evidence">
                  {evidence.length === 0 ? (
                    <div className="r3-evidence-empty">Nothing recorded yet.<br /><br />A good interrogation response can become a reusable evidence fragment.</div>
                  ) : (
                    evidence.map((item) => (
                      <div className="r3-evidence-item" key={item.id}>
                        <div className="r3-evidence-id">{item.id}</div>
                        <div className="r3-evidence-title">{item.title}</div>
                        <div className="r3-evidence-content">{item.content}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="r3-warning">
                <strong>INVESTIGATOR PROTOCOL</strong>
                <p>Do not waste questions searching for a magic sentence. Use the investigation routes, compare answers with Round 1 evidence, and preserve only useful signals.</p>
              </div>
            </aside>
          </main>

          <footer className="r3-footer">
            <span>PROJECT: REDACTED² // ECHO INTERROGATION SYSTEM // CHANNEL 03</span>
            <button className="r3-rule-btn" onClick={() => setShowRules(true)}>VIEW INTERROGATION RULES</button>
          </footer>

          {showRules && (
            <div className="r3-modal" role="presentation" onClick={() => setShowRules(false)}>
              <div className="r3-modal-card" role="dialog" aria-modal="true" aria-labelledby="r3-rules-title" onClick={(e) => e.stopPropagation()}>
                <div className="r3-card-head">
                  <div className="r3-label" id="r3-rules-title">INTERROGATION RULES</div>
                  <button ref={modalCloseRef} className="r3-rule-btn" onClick={() => setShowRules(false)}>CLOSE</button>
                </div>
                <div className="r3-modal-body">
                  <b>01 // {MAX_QUESTIONS} QUESTIONS</b><br />
                  The entire team shares one pool of {MAX_QUESTIONS} questions.<br /><br />
                  <b>02 // NO MAGIC WORDING</b><br />
                  Guided routes are provided so teams do not need to guess the exact question syntax.<br /><br />
                  <b>03 // SCORING</b><br />
                  Unused questions, relevant saved evidence, and investigation breadth all contribute to your score — see the Game Master for details.<br /><br />
                  <b>04 // EVIDENCE</b><br />
                  Record useful responses. They remain available as the team's interrogation evidence.<br /><br />
                  <b>05 // CROSS-CHECK</b><br />
                  ECHO responses are not automatically proof. Compare them against earlier investigation material.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
