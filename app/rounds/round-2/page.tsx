"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Clue {
  id: string;
  title: string;
  description: string;
}

export interface EvaluationMetrics {
  timeSpentSeconds: number;
  incorrectAttempts: number;
  hintsUsed: number;
  importantLeadsFound: number;
  correctLeadDecisions: number;
  challengePoints: number;
  hiddenClueFound: boolean;
  finalTrailCorrect: boolean;
  reasoningRecorded: number;
}

interface Round2Props {
  discoveredClues?: Clue[];
  onCompleteRound?: (score: number, metrics: EvaluationMetrics) => void;
  teamCode?: string;
}

type Category = "LOGIC" | "DATA" | "CIPHER" | "OBSERVATION";
type Decision = "IMPORTANT" | "IGNORE" | null;
type Phase = "decision" | "reason" | "challenge" | "crosscheck" | "done";

interface Lead {
  id: string;
  title: string;
  category: Category;
  description: string;
  evidenceIds: string[];
  evidenceText: string[];
  important: boolean;
  decisionQuestion: string;
  challengeTitle: string;
  challengeQuestion: string;
  challengeOptions: string[];
  challengeAnswer: string;
  pairQuestion: string;
  pairOptions: string[];
  pairAnswer: string;
  reward: string;
  hint: string;
}

const ROUND_DURATION = 25 * 60;

const IGNORE_REASONS = [
  "No direct connection to the incident",
  "Outside the critical timeline",
  "Not supported by another report",
  "Other",
];

const IMPORTANT_REASONS = [
  "Directly connected to the incident timeline",
  "Supported by another evidence item",
  "Reveals a possible route",
  "Connects two records",
];

const STUDY_REPORTS: Record<string, string> = {
  "E-01":
    "The laboratory terminal remained active during the security interruption. The security layer was affected, but the laboratory process itself continued running.",
  "E-02":
    "The official incident report records that BLACKBOX was reported missing at exactly 22:17.",
  "E-03":
    "The recovered security badge is associated with restricted laboratory access. A credential record does not by itself prove who physically used the credential.",
  "E-04":
    "Recovered phone data shows a deleted communication timestamped 22:08.",
  "E-05":
    "The access event log records a restricted access event at 22:11. The credential record alone cannot establish the physical identity of the user.",
  "E-06":
    "The recovered CCTV frame is timestamped 22:16:53 and was captured immediately before the reported 22:17 disappearance.",
  "E-07":
    "The secured storage cabinet contains no direct record establishing that BLACKBOX was removed through the main laboratory entrance.",
  "E-08":
    "The handwritten transfer note contains the reference 22:11 and indicates transfer activity was being prepared.",
  "E-09":
    "The laboratory wall clock displays 22:16. This clock is an environmental observation and is not an independently synchronized system record.",
  "E-10":
    "The unregistered storage drive contains transfer fragments. Recovered metadata shows preparation activity at 22:08, before BLACKBOX was reported missing.",
  "E-11":
    "The corridor security camera belongs to the laboratory security layer and was affected during the camera interruption.",
  "E-12":
    "The restricted locker key is a physical access item. It does not by itself establish the movement route of BLACKBOX.",
  "E-13":
    "The discard bin contains ordinary discarded material. No recovered item from the bin independently establishes responsibility for the incident.",
  "E-14":
    "The maintenance access panel provides access to infrastructure connected to the restricted transfer network.",
  "E-15":
    "The sealed evidence envelope preserves an item under chain-of-custody conditions. Its existence does not itself identify the person responsible.",
  "E-16":
    "The server room warning tag identifies an emergency network procedure. It does not itself establish who used the procedure.",
};

const LEADS: Lead[] = [
  {
    id: "A",
    title: "THE TIMELINE WINDOW",
    category: "LOGIC",
    description:
      "Several time-stamped records sit close to the disappearance. The useful question is not which time looks suspicious, but which records actually connect.",
    evidenceIds: ["E-02", "E-04", "E-05", "E-06"],
    evidenceText: [
      "E-04 — Deleted communication: 22:08",
      "E-05 — Restricted access: 22:11",
      "E-06 — Last recovered CCTV frame: 22:16:53",
      "E-02 — BLACKBOX reported missing: 22:17",
    ],
    important: true,
    decisionQuestion: "Does this lead belong to the core incident trail?",
    challengeTitle: "TIME LINK",
    challengeQuestion:
      "Which report is the final verified point immediately before the 22:17 disappearance report?",
    challengeOptions: ["E-04", "E-05", "E-06", "E-02"],
    challengeAnswer: "E-06",
    pairQuestion:
      "Which pair gives the clearest before/after boundary around the disappearance?",
    pairOptions: ["E-04 + E-05", "E-05 + E-06", "E-06 + E-02", "E-08 + E-09"],
    pairAnswer: "E-06 + E-02",
    reward:
      "TIME LINK: 22:16:53 is the last recovered visual point before the 22:17 report.",
    hint: "Use the exact timestamps. The strongest boundary is the last verified point before the official 22:17 report.",
  },
  {
    id: "B",
    title: "CAFETERIA RECEIPT",
    category: "OBSERVATION",
    description:
      "A routine purchase appears in a general building record. Real records can still be irrelevant.",
    evidenceIds: ["E-09", "E-13"],
    evidenceText: [
      "Receipt time: 20:12",
      "Location: Staff Cafeteria",
      "Purchase: Coffee + sandwich",
      "No restricted-access, transfer, or camera information attached.",
    ],
    important: false,
    decisionQuestion: "Should this lead be part of the core trail?",
    challengeTitle: "DECOY CHECK",
    challengeQuestion:
      "Which detail makes this lead weak for reconstructing the incident?",
    challengeOptions: [
      "The receipt is a real record.",
      "The purchase is outside the critical incident window.",
      "The record is digital.",
      "The cafeteria is inside the facility.",
    ],
    challengeAnswer: "The purchase is outside the critical incident window.",
    pairQuestion:
      "Which Round 1 item best supports the idea that a physical object can add no independent responsibility proof?",
    pairOptions: ["E-06", "E-10", "E-13", "E-14"],
    pairAnswer: "E-13",
    reward: "DECOY CLEARED: routine information with no independent incident connection.",
    hint: "A record can be genuine and still irrelevant. Compare its timing and content to the incident.",
  },
  {
    id: "C",
    title: "THE NETWORK FRAGMENT",
    category: "DATA",
    description:
      "Digital records suggest that transfer preparation happened before the disappearance.",
    evidenceIds: ["E-04", "E-08", "E-10", "E-14"],
    evidenceText: [
      "E-04 — Deleted communication recovered at 22:08",
      "E-08 — Transfer note references 22:11",
      "E-10 — Transfer preparation metadata at 22:08",
      "E-14 — Maintenance panel connects to restricted transfer network",
    ],
    important: true,
    decisionQuestion: "Does this lead connect digital preparation to the transfer path?",
    challengeTitle: "DATA TRACE",
    challengeQuestion:
      "Which report directly establishes transfer preparation activity at 22:08?",
    challengeOptions: ["E-04", "E-08", "E-10", "E-14"],
    challengeAnswer: "E-10",
    pairQuestion:
      "Which pair best connects preparation timing with infrastructure capable of supporting the transfer?",
    pairOptions: ["E-01 + E-02", "E-10 + E-14", "E-03 + E-09", "E-12 + E-15"],
    pairAnswer: "E-10 + E-14",
    reward:
      "NETWORK LINK: preparation at 22:08 + restricted transfer infrastructure.",
    hint: "One report supplies the preparation time. Another supplies the connected infrastructure.",
  },
  {
    id: "D",
    title: "THE WHITEBOARD NOTE",
    category: "CIPHER",
    description:
      "A short code appears beside transfer-related records. The decoding step is simple; the important part is deciding whether the information connects to the case.",
    evidenceIds: ["E-08", "E-10", "E-16"],
    evidenceText: [
      "TRANSFER NOTE reference: 22:11",
      "STORAGE DRIVE metadata: preparation at 22:08",
      "WARNING TAG: emergency network procedure",
      "Recovered coded text: FDWH",
    ],
    important: true,
    decisionQuestion: "Does this coded note provide a useful case connection?",
    challengeTitle: "CIPHER STEP",
    challengeQuestion: "Decode FDWH using a Caesar shift BACK by 3.",
    challengeOptions: ["CASE", "CAGE", "CAVE", "GATE"],
    challengeAnswer: "CASE",
    pairQuestion:
      "Which pair provides the strongest surrounding context for the decoded note?",
    pairOptions: ["E-08 + E-10", "E-02 + E-09", "E-12 + E-13", "E-03 + E-15"],
    pairAnswer: "E-08 + E-10",
    reward:
      "CODE LINK: CASE sits beside the 22:08 preparation and 22:11 transfer references.",
    hint: "Shift each letter backward by 3: F→C, D→A, W→T, H→E.",
  },
  {
    id: "E",
    title: "MAINTENANCE TIME DISCREPANCY",
    category: "LOGIC",
    description:
      "A maintenance record contains two start times. It looks suspicious, but suspicion is not the same as proof.",
    evidenceIds: ["E-14", "E-09", "E-15"],
    evidenceText: [
      "Reported start: 20:20",
      "System recorded start: 20:48",
      "Location: Electrical Panel B",
      "No direct record links the discrepancy to the BLACKBOX movement.",
    ],
    important: false,
    decisionQuestion: "Should this discrepancy be treated as a core trail lead?",
    challengeTitle: "LOGIC CHECK",
    challengeQuestion:
      "Does the timestamp discrepancy alone prove that the operator caused the incident?",
    challengeOptions: [
      "YES",
      "NO",
      "Only if the operator was nearby",
      "Only if CCTV was affected",
    ],
    challengeAnswer: "NO",
    pairQuestion: "Which reasoning principle best fits this record?",
    pairOptions: [
      "A credential always proves a physical user.",
      "One discrepancy can establish responsibility.",
      "One record may be insufficient to establish responsibility.",
      "A physical key proves the movement route.",
    ],
    pairAnswer: "One record may be insufficient to establish responsibility.",
    reward: "DECOY CLEARED: discrepancy noted, but causation is not established.",
    hint: "Separate an inconsistency from proof that someone caused the incident.",
  },
  {
    id: "F",
    title: "THE ACCESS PATH",
    category: "LOGIC",
    description:
      "Multiple reports indicate that an internal transfer route may exist without the main laboratory exit.",
    evidenceIds: ["E-07", "E-14", "E-16"],
    evidenceText: [
      "E-07 — No direct record proves removal through the main laboratory entrance",
      "E-14 — Maintenance panel connects to restricted transfer network",
      "E-16 — Emergency network procedure exists",
    ],
    important: true,
    decisionQuestion: "Is this lead useful for reconstructing how movement could have occurred?",
    challengeTitle: "ROUTE LOGIC",
    challengeQuestion: "Which conclusion is actually supported?",
    challengeOptions: [
      "BLACKBOX definitely left through the main door.",
      "BLACKBOX could have been moved through a route that did not use the main door.",
      "Only the director could move BLACKBOX.",
      "No technical access was involved.",
    ],
    challengeAnswer:
      "BLACKBOX could have been moved through a route that did not use the main door.",
    pairQuestion:
      "Which pair most directly supports the existence of that alternative route?",
    pairOptions: ["E-14 + E-16", "E-02 + E-06", "E-03 + E-09", "E-12 + E-15"],
    pairAnswer: "E-14 + E-16",
    reward:
      "ROUTE LINK: restricted infrastructure + emergency network procedure support an alternative route.",
    hint: "The evidence establishes a possible route, not the identity of the person who used it.",
  },
  {
    id: "G",
    title: "THE UNSIGNED ACCUSATION",
    category: "OBSERVATION",
    description:
      "An unsigned note names a person but contains no source and no supporting record.",
    evidenceIds: ["E-03", "E-15", "E-16"],
    evidenceText: [
      "\"Daniel did it.\"",
      "Sender: Unknown",
      "No supporting record attached",
      "No independent route or identity evidence supplied.",
    ],
    important: false,
    decisionQuestion: "Should this accusation enter the core trail?",
    challengeTitle: "SOURCE CHECK",
    challengeQuestion: "Why should this accusation be treated cautiously?",
    challengeOptions: [
      "It names a suspect.",
      "It is anonymous and unsupported.",
      "It is short.",
      "It was recovered digitally.",
    ],
    challengeAnswer: "It is anonymous and unsupported.",
    pairQuestion:
      "Which Round 1 reasoning principle matches this limitation?",
    pairOptions: [
      "A physical item proves the movement route.",
      "Chain of custody identifies the responsible person.",
      "A record may not independently establish responsibility.",
      "Every anonymous message is false.",
    ],
    pairAnswer: "A record may not independently establish responsibility.",
    reward: "SOURCE CHECK: accusation kept as unverified information.",
    hint: "The missing source and supporting evidence are the important details.",
  },
  {
    id: "H",
    title: "THE CCTV GAP",
    category: "OBSERVATION",
    description:
      "A recovered camera frame sits immediately before the official disappearance report.",
    evidenceIds: ["E-06", "E-09", "E-11"],
    evidenceText: [
      "E-06 — Last recovered frame: 22:16:53",
      "E-09 — Wall clock displays 22:16, but is not synchronized",
      "E-11 — Corridor camera belongs to the affected security layer",
    ],
    important: true,
    decisionQuestion: "Does this lead provide a useful observation point?",
    challengeTitle: "FRAME CHECK",
    challengeQuestion: "What can the recovered 22:16:53 frame establish?",
    challengeOptions: [
      "The exact identity of the person responsible.",
      "The last recovered visual point immediately before the 22:17 report.",
      "That BLACKBOX was already outside.",
      "That the wall clock was synchronized.",
    ],
    challengeAnswer:
      "The last recovered visual point immediately before the 22:17 report.",
    pairQuestion:
      "Which pair should be compared for the strongest timing boundary?",
    pairOptions: ["E-06 + E-02", "E-09 + E-12", "E-11 + E-13", "E-03 + E-15"],
    pairAnswer: "E-06 + E-02",
    reward:
      "CAMERA LINK: 22:16:53 is the last recovered visual point before 22:17.",
    hint: "Use the timestamp for what it proves. Do not infer identity from it.",
  },
  {
    id: "I",
    title: "TRANSFER NOTE",
    category: "DATA",
    description:
      "A handwritten note contains a time and a transfer reference. Its value becomes clearer when compared with the digital records.",
    evidenceIds: ["E-08", "E-10", "E-14"],
    evidenceText: [
      "E-08 — Transfer note reference: 22:11",
      "E-10 — Transfer preparation metadata: 22:08",
      "E-14 — Maintenance panel connects to restricted transfer network",
      "The note does not identify a person by itself.",
    ],
    important: true,
    decisionQuestion: "Does this lead strengthen the connection between preparation and the transfer path?",
    challengeTitle: "TRANSFER DATA",
    challengeQuestion:
      "Which report gives the earliest direct evidence of transfer preparation?",
    challengeOptions: ["E-08", "E-10", "E-14", "E-02"],
    challengeAnswer: "E-10",
    pairQuestion:
      "Which pair best links the preparation time to the restricted infrastructure?",
    pairOptions: ["E-08 + E-09", "E-10 + E-14", "E-02 + E-06", "E-03 + E-15"],
    pairAnswer: "E-10 + E-14",
    reward:
      "TRANSFER LINK: preparation at 22:08 connects to restricted transfer infrastructure.",
    hint: "Find the report that explicitly says preparation activity happened at 22:08.",
  },
  {
    id: "J",
    title: "LOCKER KEY",
    category: "CIPHER",
    description:
      "A physical key was recovered from a restricted locker. It looks important, but the report gives only a limited conclusion.",
    evidenceIds: ["E-12", "E-15"],
    evidenceText: [
      "E-12 — Restricted locker key recovered",
      "E-15 — Sealed evidence envelope under chain-of-custody",
      "No direct route from the key to the BLACKBOX movement is established.",
    ],
    important: false,
    decisionQuestion: "Should this physical key be treated as part of the core trail?",
    challengeTitle: "KEY CHECK",
    challengeQuestion:
      "What does the Round 1 report say the key does NOT establish by itself?",
    challengeOptions: [
      "That it is a physical access item",
      "That the key exists",
      "The movement route of BLACKBOX",
      "That it was recovered",
    ],
    challengeAnswer: "The movement route of BLACKBOX",
    pairQuestion:
      "Which statement best explains why the key should remain outside the core trail?",
    pairOptions: [
      "It proves who moved BLACKBOX.",
      "It gives no independent route evidence.",
      "It proves the main door was used.",
      "It proves the system was encrypted.",
    ],
    pairAnswer: "It gives no independent route evidence.",
    reward: "DECOY CLEARED: the key is real, but it does not independently establish the movement route.",
    hint: "Read E-12 carefully. Ask what the key fails to establish.",
  },
];

const FINAL_OPTIONS = [
  "A → C → D → F → H → I",
  "A → B → D → E → H → J",
  "B → C → E → F → G → J",
  "A → C → E → G → H → I",
];

const FINAL_ANSWER = "A → C → D → F → H → I";

function hashSeed(input: string) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], seed: number) {
  const result = [...items];
  const random = seededRandom(seed);

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function buildScrambledLeads(seedText: string) {
  const baseSeed = hashSeed(seedText || "ROUND2-DEMO");

  return shuffled(LEADS, baseSeed).map((lead, index) => {
    const seed = baseSeed + index * 7919;

    return {
      ...lead,
      challengeOptions: shuffled(lead.challengeOptions, seed + 17),
      pairOptions: shuffled(lead.pairOptions, seed + 29),
    };
  });
}

function Round2FollowTheTrail({
  discoveredClues = [],
  onCompleteRound,
  teamCode = "",
}: Round2Props) {
  /*
    Every team gets its own deterministic scramble.
    If teamCode is supplied, the same team keeps the same presentation
    after refresh. The underlying correct answers never change.
  */
  const scrambleKey =
    teamCode.trim().toUpperCase() ||
    discoveredClues.map((clue) => clue.id).join("|") ||
    "ROUND2-DEMO";

  const scrambledLeads = useMemo(
    () => buildScrambledLeads(scrambleKey),
    [scrambleKey]
  );

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_DURATION);

  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [challengeAnswers, setChallengeAnswers] = useState<
    Record<string, string>
  >({});
  const [pairAnswers, setPairAnswers] = useState<Record<string, string>>({});
  const [challengeSolved, setChallengeSolved] = useState<Record<string, boolean>>(
    {}
  );
  const [pairSolved, setPairSolved] = useState<Record<string, boolean>>({});

  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timePenaltySeconds, setTimePenaltySeconds] = useState(0);

  const [hiddenClueFound, setHiddenClueFound] = useState(false);
  const [showHiddenTrace, setShowHiddenTrace] = useState(false);

  const [showReports, setShowReports] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [activeReportId, setActiveReportId] = useState("E-10");

  const [feedback, setFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);

  const [finalChoice, setFinalChoice] = useState("");
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const [finalError, setFinalError] = useState("");
  const [finalScore, setFinalScore] = useState(0);

  const activeLead =
    scrambledLeads.find((lead) => lead.id === activeLeadId) ?? null;

  const decidedCount = Object.keys(decisions).length;

  const correctLeadDecisions = scrambledLeads.filter((lead) => {
    const decision = decisions[lead.id];

    return (
      decision &&
      ((lead.important && decision === "IMPORTANT") ||
        (!lead.important && decision === "IGNORE"))
    );
  }).length;

  const importantLeadsFound = scrambledLeads.filter(
    (lead) => lead.important && decisions[lead.id] === "IMPORTANT"
  ).length;

  const relevantLeadsSolved = scrambledLeads.filter(
    (lead) =>
      lead.important &&
      decisions[lead.id] === "IMPORTANT" &&
      challengeSolved[lead.id] &&
      pairSolved[lead.id]
  ).length;

  const challengePoints = scrambledLeads.reduce((sum, lead) => {
    if (!lead.important) return sum;

    let total = sum;

    if (challengeSolved[lead.id]) total += 2;
    if (pairSolved[lead.id]) total += 2;

    return total;
  }, 0);

  const allLeadsDecided = decidedCount === scrambledLeads.length;

  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    const entries = Object.entries(STUDY_REPORTS);

    if (!q) return entries;

    return entries.filter(([id, text]) =>
      `${id} ${text}`.toLowerCase().includes(q)
    );
  }, [reportSearch]);

  useEffect(() => {
    if (!started || finished || !startTime) return;

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(
        0,
        ROUND_DURATION - elapsed - timePenaltySeconds
      );

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        window.clearInterval(interval);
        completeRound(true);
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [started, finished, startTime, timePenaltySeconds]);

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
      2,
      "0"
    )}`;
  }

  function startRound() {
    const now = Date.now();

    setStarted(true);
    setFinished(false);
    setStartTime(now);
    setSecondsLeft(ROUND_DURATION);
    setActiveLeadId(scrambledLeads[0]?.id ?? null);
  }

  function openLead(id: string) {
    if (!started || finished) return;

    setActiveLeadId(id);
    setShowHint(false);
    setFeedback("");
    setFinalError("");
  }

  function chooseDecision(choice: "IMPORTANT" | "IGNORE") {
    if (!activeLead || finished) return;
    if (decisions[activeLead.id]) return;

    setDecisions((prev) => ({
      ...prev,
      [activeLead.id]: choice,
    }));

    setFeedback("DECISION RECORDED");
  }

  function chooseReason(reason: string) {
    if (!activeLead || finished) return;
    if (!decisions[activeLead.id]) return;

    setReasons((prev) => ({
      ...prev,
      [activeLead.id]: reason,
    }));

    setFeedback("REASON RECORDED");

    if (activeLead.important && decisions[activeLead.id] === "IMPORTANT") {
      setShowHint(false);
    }
  }

  function submitChallenge(choice: string) {
    if (!activeLead || finished) return;
    if (!activeLead.important) return;
    if (decisions[activeLead.id] !== "IMPORTANT") return;
    if (!reasons[activeLead.id]) return;
    if (challengeSolved[activeLead.id]) return;

    setChallengeAnswers((prev) => ({
      ...prev,
      [activeLead.id]: choice,
    }));

    if (choice === activeLead.challengeAnswer) {
      setChallengeSolved((prev) => ({
        ...prev,
        [activeLead.id]: true,
      }));

      setFeedback("TRACE RECORDED");
    } else {
      setIncorrectAttempts((prev) => prev + 1);
      setTimePenaltySeconds((prev) => prev + 15);
      setFeedback("RESPONSE RECORDED");
    }
  }

  function submitPair(choice: string) {
    if (!activeLead || finished) return;
    if (!challengeSolved[activeLead.id]) return;
    if (pairSolved[activeLead.id]) return;

    setPairAnswers((prev) => ({
      ...prev,
      [activeLead.id]: choice,
    }));

    if (choice === activeLead.pairAnswer) {
      setPairSolved((prev) => ({
        ...prev,
        [activeLead.id]: true,
      }));

      setFeedback("CROSS-CHECK RECORDED");
    } else {
      setIncorrectAttempts((prev) => prev + 1);
      setTimePenaltySeconds((prev) => prev + 15);
      setFeedback("RESPONSE RECORDED");
    }
  }

  function useHint() {
    if (!activeLead || finished || showHint) return;

    setHintsUsed((prev) => prev + 1);
    setTimePenaltySeconds((prev) => prev + 20);
    setShowHint(true);
    setFeedback("HINT REQUEST RECORDED");
  }

  function revealHiddenTrace() {
    if (finished) return;

    setHiddenClueFound(true);
    setShowHiddenTrace(true);
    setFeedback("ARCHIVE CROSS-REFERENCE OPENED");
  }

  function currentScore(finalBonus: number) {
    /*
      50 marks total:
      20 — correct Important/Ignore decisions
      18 — six important leads × two connected trace steps (1 + 2 each)
       5 — hidden archive connection
       7 — final trail
    */
    const decisionPoints = correctLeadDecisions * 2;
    const tracePoints = Math.min(18, challengePoints);
    const hiddenPoints = hiddenClueFound ? 5 : 0;

    return Math.max(
      0,
      Math.min(
        50,
        Math.round(
          decisionPoints +
            tracePoints +
            hiddenPoints +
            finalBonus -
            incorrectAttempts * 0.5
        )
      )
    );
  }

  function submitFinalTrail() {
    if (!allLeadsDecided || finished) return;
    if (relevantLeadsSolved < 3) return;

    if (finalChoice !== FINAL_ANSWER) {
      setIncorrectAttempts((prev) => prev + 1);
      setTimePenaltySeconds((prev) => prev + 30);
      setFinalError("TRAIL RESPONSE RECORDED");
      return;
    }

    const score = currentScore(7);
    setFinalScore(score);
    setFinalSubmitted(true);
    setFinished(true);

    const elapsed = startTime
      ? Math.floor((Date.now() - startTime) / 1000)
      : 0;

    const metrics: EvaluationMetrics = {
      timeSpentSeconds: elapsed,
      incorrectAttempts,
      hintsUsed,
      importantLeadsFound,
      correctLeadDecisions,
      challengePoints: Math.min(18, challengePoints),
      hiddenClueFound,
      finalTrailCorrect: true,
      reasoningRecorded: Object.keys(reasons).length,
    };

    window.setTimeout(() => {
      onCompleteRound?.(score, metrics);
    }, 900);
  }

  function completeRound(expired: boolean) {
    if (finished) return;

    const score = currentScore(0);

    setFinalScore(score);
    setFinished(true);

    if (!expired) return;

    const elapsed = startTime
      ? Math.floor((Date.now() - startTime) / 1000)
      : ROUND_DURATION;

    const metrics: EvaluationMetrics = {
      timeSpentSeconds: elapsed,
      incorrectAttempts,
      hintsUsed,
      importantLeadsFound,
      correctLeadDecisions,
      challengePoints: Math.min(18, challengePoints),
      hiddenClueFound,
      finalTrailCorrect: false,
      reasoningRecorded: Object.keys(reasons).length,
    };

    onCompleteRound?.(score, metrics);
  }

  const selectedReasonPool =
    activeLead && decisions[activeLead.id] === "IGNORE"
      ? IGNORE_REASONS
      : IMPORTANT_REASONS;

  const stepForActiveLead = activeLead
    ? !decisions[activeLead.id]
      ? "DECISION"
      : !reasons[activeLead.id]
        ? "REASON"
        : activeLead.important && decisions[activeLead.id] === "IMPORTANT"
          ? !challengeSolved[activeLead.id]
            ? "CHALLENGE"
            : !pairSolved[activeLead.id]
              ? "CROSS-CHECK"
              : "COMPLETE"
          : "COMPLETE"
    : "SELECT LEAD";

  return (
    <div className="min-h-screen w-full bg-[#050505] text-zinc-200 font-mono">
      <div className="mx-auto min-h-screen max-w-[1550px] px-3 py-3 md:px-5 md:py-5">
        <header className="border border-zinc-800 bg-[#0a0a0a] px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[10px] tracking-[0.35em] text-amber-500">
                DRESTEIN // ROUND 02
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[0.12em] text-white">
                FOLLOW THE TRAIL
              </h1>
              <p className="mt-1 text-[10px] tracking-[0.08em] text-zinc-600">
                REVIEW • FILTER • CONNECT
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="border border-zinc-800 bg-black px-4 py-2">
                <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                  TIME
                </div>
                <div
                  className={`text-2xl font-bold ${
                    secondsLeft <= 120 ? "text-red-400" : "text-white"
                  }`}
                >
                  {formatTime(secondsLeft)}
                </div>
              </div>

              <div className="border border-zinc-800 bg-black px-4 py-2">
                <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                  MAX
                </div>
                <div className="text-2xl font-bold text-amber-400">50</div>
              </div>

              <button
                onClick={() => setShowReports(true)}
                disabled={!started || finished}
                className="border border-zinc-700 bg-black px-4 py-3 text-[9px] font-bold tracking-wider text-zinc-300 hover:border-amber-600 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ROUND 1 DOSSIER
              </button>
            </div>
          </div>
        </header>

        {!started && (
          <main className="mt-4 flex min-h-[760px] items-center justify-center border border-zinc-800 bg-[#090909] p-6 md:p-12">
            <div className="max-w-3xl text-center">
              <div className="text-[10px] tracking-[0.4em] text-amber-500">
                25 MINUTES // 50 MARKS
              </div>

              <h2 className="mt-4 text-4xl font-black tracking-wide text-white md:text-5xl">
                FOLLOW THE TRAIL
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-zinc-500">
                Ten leads are presented in a scrambled order. Some matter.
                Some are distractions. Use the Round 1 study reports, discuss
                as a team, record why you made each decision, and connect the
                useful information into the final trail.
              </p>

              <div className="mt-8 grid gap-3 md:grid-cols-4">
                {[
                  ["LOGIC", "Connect facts"],
                  ["DATA", "Compare records"],
                  ["CIPHER", "Decode evidence"],
                  ["OBSERVATION", "Spot useful detail"],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="border border-zinc-800 bg-black p-4 text-left"
                  >
                    <div className="text-[10px] font-bold text-zinc-300">
                      {title}
                    </div>
                    <div className="mt-2 text-[9px] leading-5 text-zinc-700">
                      {text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border border-amber-900/50 bg-amber-950/10 p-5 text-xs leading-7 text-amber-300">
                TEAM RULE
                <br />
                <span className="text-amber-500">
                  Discuss first. Captain clicks.
                </span>
                <br />
                All 16 Round 1 study reports remain available.
                <br />
                Correctness is not revealed during the round.
              </div>

              <button
                onClick={startRound}
                className="mt-8 border border-amber-500 bg-amber-500/10 px-10 py-4 text-xs font-black tracking-[0.18em] text-amber-400 hover:bg-amber-500/20"
              >
                BEGIN ROUND 02
              </button>
            </div>
          </main>
        )}

        {started && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[245px_minmax(0,1fr)_325px]">
            {/* LEADS */}
            <aside className="border border-zinc-800 bg-[#0a0a0a] p-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="text-[10px] tracking-[0.25em] text-zinc-500">
                  AVAILABLE LEADS
                </div>
                <div className="text-[10px] text-zinc-600">
                  {decidedCount}/10 REVIEWED
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {scrambledLeads.map((lead, index) => {
                  const decision = decisions[lead.id];
                  const complete =
                    lead.important &&
                    decision === "IMPORTANT" &&
                    challengeSolved[lead.id] &&
                    pairSolved[lead.id];

                  return (
                    <button
                      key={lead.id}
                      onClick={() => openLead(lead.id)}
                      disabled={finished}
                      className={`w-full border p-3 text-left transition ${
                        activeLeadId === lead.id
                          ? "border-amber-500/70 bg-amber-950/10"
                          : "border-zinc-800 bg-black hover:border-zinc-600"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-zinc-600">
                          LEAD {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[8px] text-zinc-600">
                          {decision
                            ? complete
                              ? "CLOSED"
                              : "REVIEWED"
                            : "OPEN"}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] font-bold text-zinc-200">
                        {lead.title}
                      </div>

                      <div className="mt-1 text-[8px] tracking-wider text-zinc-700">
                        {lead.category}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-zinc-800 pt-4 text-[9px] leading-5 text-zinc-700">
                The order shown here is unique to this team.
                <br />
                Do not rely on another team's lead order.
              </div>
            </aside>

            {/* CENTER */}
            <main className="min-h-[800px] border border-zinc-800 bg-[#090909] p-4 md:p-6">
              {activeLead ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeLead.id}-${stepForActiveLead}-${reasons[activeLead.id] ?? ""}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-h-[740px]"
                  >
                    <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-[9px] tracking-[0.25em] text-zinc-600">
                          LEAD // {activeLead.category}
                        </div>
                        <h2 className="mt-2 text-2xl font-black text-white">
                          {activeLead.title}
                        </h2>
                        <p className="mt-2 max-w-3xl text-xs leading-6 text-zinc-600">
                          {activeLead.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const firstEvidence = activeLead.evidenceIds[0];
                          if (firstEvidence) setActiveReportId(firstEvidence);
                          setShowReports(true);
                        }}
                        className="border border-zinc-700 px-3 py-2 text-[9px] text-zinc-500 hover:border-amber-600 hover:text-amber-400"
                      >
                        OPEN LINKED REPORTS
                      </button>
                    </div>

                    <div className="mt-5 grid gap-2 md:grid-cols-4">
                      {[
                        ["01", "RELEVANCE", !decisions[activeLead.id]],
                        ["02", "WHY", Boolean(decisions[activeLead.id] && !reasons[activeLead.id])],
                        [
                          "03",
                          "TRACE",
                          Boolean(
                            activeLead.important &&
                              decisions[activeLead.id] === "IMPORTANT" &&
                              !pairSolved[activeLead.id]
                          ),
                        ],
                        ["04", "RECORDED", Boolean(pairSolved[activeLead.id])],
                      ].map(([number, label, active]) => (
                        <div
                          key={label as string}
                          className={`border px-3 py-2 ${
                            active
                              ? "border-amber-700/60 bg-amber-950/10"
                              : "border-zinc-800 bg-black"
                          }`}
                        >
                          <div className="text-[8px] text-zinc-700">
                            {number as string}
                          </div>
                          <div className="mt-1 text-[9px] text-zinc-500">
                            {label as string}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                      <section className="border border-zinc-800 bg-black p-5">
                        <div className="text-[9px] tracking-[0.2em] text-amber-500">
                          LEAD EVIDENCE
                        </div>

                        <div className="mt-4 space-y-3">
                          {activeLead.evidenceText.map((line) => (
                            <div
                              key={line}
                              className="border-l border-zinc-700 pl-3 text-xs leading-6 text-zinc-300"
                            >
                              {line}
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 border-t border-zinc-800 pt-5">
                          <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                            LINKED ROUND 1 EVIDENCE
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {activeLead.evidenceIds.map((id) => (
                              <button
                                key={id}
                                onClick={() => {
                                  setActiveReportId(id);
                                  setShowReports(true);
                                }}
                                className={`border px-3 py-2 text-left text-[9px] transition ${
                                  activeReportId === id
                                    ? "border-amber-700/60 bg-amber-950/10 text-amber-400"
                                    : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-600"
                                }`}
                              >
                                {id}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 border-t border-zinc-800 pt-5">
                          <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                            TEAM DISCUSSION
                          </div>
                          <p className="mt-2 text-[10px] leading-5 text-zinc-700">
                            The interface does not tell you whether the team is
                            correct. Use the reports and decide together.
                          </p>
                        </div>
                      </section>

                      <section className="border border-zinc-800 bg-[#0a0a0a] p-5">
                        {!decisions[activeLead.id] ? (
                          <>
                            <div className="text-[9px] tracking-[0.2em] text-amber-500">
                              STEP 01 // RELEVANCE
                            </div>

                            <h3 className="mt-4 text-xl font-bold leading-7 text-white">
                              {activeLead.decisionQuestion}
                            </h3>

                            <div className="mt-6 space-y-3">
                              <button
                                onClick={() => chooseDecision("IMPORTANT")}
                                className="w-full border border-amber-700/70 bg-amber-950/15 px-4 py-4 text-left text-[11px] font-bold text-amber-300 hover:bg-amber-900/20"
                              >
                                THIS LEAD IS IMPORTANT
                              </button>

                              <button
                                onClick={() => chooseDecision("IGNORE")}
                                className="w-full border border-zinc-700 bg-black px-4 py-4 text-left text-[11px] font-bold text-zinc-300 hover:border-zinc-500"
                              >
                                IGNORE THIS LEAD
                              </button>
                            </div>
                          </>
                        ) : !reasons[activeLead.id] ? (
                          <>
                            <div className="text-[9px] tracking-[0.2em] text-amber-500">
                              STEP 02 // REASON
                            </div>

                            <h3 className="mt-4 text-lg font-bold leading-7 text-white">
                              Why did your team choose{" "}
                              <span className="text-amber-400">
                                {decisions[activeLead.id]}
                              </span>
                              ?
                            </h3>

                            <div className="mt-5 space-y-2">
                              {selectedReasonPool.map((reason) => (
                                <button
                                  key={reason}
                                  onClick={() => chooseReason(reason)}
                                  className="w-full border border-zinc-800 bg-black px-4 py-3 text-left text-[10px] leading-5 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-950"
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>

                            <p className="mt-5 text-[9px] leading-5 text-zinc-700">
                              Select the reason that best represents the team's
                              thinking. The round does not reveal whether the
                              reasoning is correct.
                            </p>
                          </>
                        ) : activeLead.important &&
                          decisions[activeLead.id] === "IMPORTANT" ? (
                          <>
                            <div className="text-[9px] tracking-[0.2em] text-amber-500">
                              STEP 03 // {activeLead.challengeTitle}
                            </div>

                            <h3 className="mt-4 text-lg font-bold leading-7 text-white">
                              {activeLead.challengeQuestion}
                            </h3>

                            <div className="mt-5 space-y-2">
                              {activeLead.challengeOptions.map((option) => {
                                const selected =
                                  challengeAnswers[activeLead.id] === option;

                                return (
                                  <button
                                    key={option}
                                    onClick={() => submitChallenge(option)}
                                    disabled={challengeSolved[activeLead.id]}
                                    className={`w-full border px-4 py-3 text-left text-[10px] leading-5 transition ${
                                      selected
                                        ? "border-amber-700/70 bg-amber-950/10 text-amber-300"
                                        : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600"
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>

                            {challengeSolved[activeLead.id] && (
                              <div className="mt-6 border border-zinc-800 bg-black p-4">
                                <div className="text-[9px] tracking-[0.2em] text-amber-500">
                                  STEP 04 // CROSS-CHECK
                                </div>

                                <h3 className="mt-3 text-sm font-bold leading-6 text-white">
                                  {activeLead.pairQuestion}
                                </h3>

                                <div className="mt-4 space-y-2">
                                  {activeLead.pairOptions.map((option) => {
                                    const selected =
                                      pairAnswers[activeLead.id] === option;

                                    return (
                                      <button
                                        key={option}
                                        onClick={() => submitPair(option)}
                                        disabled={pairSolved[activeLead.id]}
                                        className={`w-full border px-4 py-3 text-left text-[10px] leading-5 transition ${
                                          selected
                                            ? "border-amber-700/70 bg-amber-950/10 text-amber-300"
                                            : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-600"
                                        } disabled:cursor-not-allowed disabled:opacity-60`}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {!pairSolved[activeLead.id] && (
                              <button
                                onClick={useHint}
                                disabled={showHint}
                                className="mt-5 border border-zinc-700 px-3 py-2 text-[9px] text-zinc-500 hover:border-amber-700 hover:text-amber-400 disabled:opacity-40"
                              >
                                {showHint
                                  ? "HINT ACTIVE"
                                  : "REQUEST HINT (-20 SEC)"}
                              </button>
                            )}

                            {showHint && (
                              <div className="mt-3 border border-amber-800/50 bg-amber-950/10 p-3 text-[10px] leading-5 text-amber-400">
                                {activeLead.hint}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex min-h-[470px] items-center justify-center text-center">
                            <div>
                              <div className="text-5xl text-zinc-800">✓</div>
                              <div className="mt-4 text-[10px] tracking-[0.2em] text-zinc-500">
                                LEAD RECORDED
                              </div>
                              <p className="mt-2 max-w-xs text-[10px] leading-5 text-zinc-700">
                                Continue to another lead.
                              </p>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>

                    {feedback && (
                      <div className="mt-5 border border-zinc-800 bg-black px-4 py-3 text-[10px] text-zinc-600">
                        {feedback}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex min-h-[700px] items-center justify-center text-center">
                  <div>
                    <div className="text-[10px] tracking-[0.3em] text-amber-500">
                      ROUND IN PROGRESS
                    </div>
                    <h2 className="mt-3 text-3xl font-black text-white">
                      SELECT A LEAD
                    </h2>
                    <p className="mt-3 max-w-md text-xs leading-6 text-zinc-700">
                      Discuss with your team before opening and reviewing the
                      next lead.
                    </p>
                  </div>
                </div>
              )}
            </main>

            {/* RIGHT */}
            <aside className="border border-zinc-800 bg-[#0a0a0a] p-3">
              <div className="text-[10px] tracking-[0.25em] text-zinc-500">
                TRAIL BOARD
              </div>

              <div className="mt-3 border border-zinc-800 bg-black p-4">
                <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                  LEADS REVIEWED
                </div>
                <div className="mt-2 text-3xl font-black text-white">
                  {decidedCount} / 8
                </div>
              </div>

              <div className="mt-3 border border-zinc-800 bg-black p-4">
                <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                  CONNECTED ITEMS
                </div>

                <div className="mt-3 space-y-2">
                  {scrambledLeads
                    .filter(
                      (lead) =>
                        lead.important &&
                        challengeSolved[lead.id] &&
                        pairSolved[lead.id]
                    )
                    .map((lead) => (
                      <div
                        key={lead.id}
                        className="border-l border-amber-700/50 pl-3 text-[9px] leading-5 text-zinc-500"
                      >
                        <span className="text-amber-400">LEAD {lead.id}</span>{" "}
                        — connection recorded
                      </div>
                    ))}

                  {relevantLeadsSolved === 0 && (
                    <div className="text-[10px] text-zinc-800">
                      Nothing connected yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 border border-zinc-800 bg-black p-4">
                <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                  ROUND 1 ARCHIVE
                </div>

                <p className="mt-2 text-[10px] leading-5 text-zinc-700">
                  All 16 study reports stay available. Search them, compare
                  timestamps, and look for repeated references.
                </p>

                <button
                  onClick={() => setShowReports(true)}
                  className="mt-3 w-full border border-zinc-700 px-3 py-2 text-[9px] font-bold text-zinc-400 hover:border-amber-600 hover:text-amber-400"
                >
                  OPEN ALL 16 REPORTS
                </button>

                <div className="mt-4 border-t border-zinc-900 pt-3">
                  <button
                    onClick={revealHiddenTrace}
                    className="text-left text-[8px] leading-5 text-zinc-900 underline decoration-zinc-900 hover:text-zinc-500 hover:decoration-zinc-500"
                  >
                    archive index // cross-reference // transfer // 10 / 14 / 16
                  </button>
                </div>

                {showHiddenTrace && (
                  <div className="mt-3 border border-amber-900/50 bg-amber-950/10 p-3 text-[9px] leading-5 text-amber-400">
                    HIDDEN CONNECTION:
                    <br />
                    E-10 → preparation at 22:08
                    <br />
                    E-14 → restricted transfer infrastructure
                    <br />
                    E-16 → emergency network procedure
                  </div>
                )}
              </div>

              <div className="mt-3 border border-zinc-800 bg-black p-4">
                <div className="text-[9px] tracking-[0.2em] text-zinc-600">
                  TEAM ACTIVITY
                </div>

                <div className="mt-3 space-y-2 text-[10px] text-zinc-700">
                  <div className="flex justify-between">
                    <span>Reasons recorded</span>
                    <span className="text-zinc-400">
                      {Object.keys(reasons).length}/8
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connections recorded</span>
                    <span className="text-zinc-400">
                      {relevantLeadsSolved}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round score</span>
                    <span className="text-zinc-700">
                      HIDDEN
                    </span>
                  </div>
                </div>
              </div>

              {allLeadsDecided && !finished && (
                <div className="mt-3 border border-amber-700/60 bg-amber-950/10 p-4">
                  <div className="text-[9px] tracking-[0.2em] text-amber-500">
                    FINAL TRAIL
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-zinc-600">
                    Select the six leads that, taken together, form the
                    strongest connected trail.
                  </p>

                  <div className="mt-3 space-y-2">
                    {shuffled(
                      FINAL_OPTIONS,
                      hashSeed(scrambleKey) + 5001
                    ).map((option) => (
                      <button
                        key={option}
                        onClick={() => setFinalChoice(option)}
                        className={`w-full border px-3 py-3 text-left text-[9px] transition ${
                          finalChoice === option
                            ? "border-amber-600 bg-amber-950/20 text-amber-300"
                            : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={submitFinalTrail}
                    disabled={!finalChoice || relevantLeadsSolved < 3}
                    className="mt-3 w-full border border-amber-600 bg-amber-500/10 px-3 py-3 text-[9px] font-bold tracking-wider text-amber-400 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    SUBMIT FINAL TRAIL
                  </button>

                  <div className="mt-2 text-[8px] leading-5 text-zinc-700">
                    Final response becomes available only after all ten leads
                    are reviewed and at least three relevant traces are
                    connected.
                  </div>

                  {finalError && (
                    <div className="mt-3 text-[9px] leading-5 text-zinc-700">
                      {finalError}
                    </div>
                  )}
                </div>
              )}

              {finalSubmitted && (
                <div className="mt-3 border border-green-800/60 bg-green-950/10 p-4 text-center">
                  <div className="text-[9px] tracking-[0.2em] text-green-500">
                    ROUND COMPLETE
                  </div>
                  <div className="mt-2 text-4xl font-black text-white">
                    {finalScore}/50
                  </div>
                  <div className="mt-2 text-[9px] text-green-700">
                    TEAM SCORE
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        <footer className="mt-4 flex flex-col gap-2 border border-zinc-800 bg-[#0a0a0a] px-4 py-3 text-[9px] text-zinc-700 md:flex-row md:items-center md:justify-between">
          <span>ROUND 02 // TEAM MODE // 50 MARKS // 25 MINUTES</span>
          <span>DISCUSS FIRST. CAPTAIN CLICKS. CORRECTNESS STAYS HIDDEN.</span>
        </footer>
      </div>

      {/* FULL ROUND 1 REPORT ARCHIVE */}
      <AnimatePresence>
        {showReports && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 p-3 md:p-5"
          >
            <div className="mx-auto flex h-full max-w-7xl flex-col border border-zinc-800 bg-[#090909]">
              <div className="border-b border-zinc-800 bg-[#090909] p-4 md:p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-[9px] tracking-[0.3em] text-amber-500">
                      ROUND 1 // EVIDENCE ARCHIVE
                    </div>
                    <h2 className="mt-1 text-xl font-black text-white">
                      ALL 16 STUDY REPORTS
                    </h2>
                    <p className="mt-1 text-[9px] text-zinc-600">
                      The complete Round 1 report set remains accessible
                      throughout the round.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder="Search time / access / network..."
                      className="w-56 border border-zinc-800 bg-black px-3 py-2 text-[9px] text-zinc-300 outline-none focus:border-amber-600"
                    />
                    <button
                      onClick={() => setShowReports(false)}
                      className="border border-zinc-700 px-4 py-2 text-[9px] text-zinc-400 hover:border-amber-600 hover:text-amber-400"
                    >
                      CLOSE
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {filteredReports.map(([id]) => (
                    <button
                      key={id}
                      onClick={() => setActiveReportId(id)}
                      className={`border px-2 py-1 text-[8px] transition ${
                        activeReportId === id
                          ? "border-amber-600 bg-amber-950/10 text-amber-400"
                          : "border-zinc-800 text-zinc-600 hover:border-zinc-600"
                      }`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid min-h-0 flex-1 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="hidden overflow-y-auto border-r border-zinc-800 p-3 md:block">
                  <div className="space-y-1">
                    {filteredReports.map(([id]) => (
                      <button
                        key={id}
                        onClick={() => setActiveReportId(id)}
                        className={`w-full border px-3 py-2 text-left text-[9px] ${
                          activeReportId === id
                            ? "border-amber-600/60 bg-amber-950/10 text-amber-400"
                            : "border-zinc-900 bg-black text-zinc-600 hover:border-zinc-700"
                        }`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto p-5 md:p-8">
                  <div className="mx-auto max-w-3xl">
                    <div className="text-[10px] tracking-[0.25em] text-zinc-600">
                      STUDY REPORT
                    </div>

                    <div className="mt-3 text-3xl font-black text-white">
                      {activeReportId}
                    </div>

                    <div className="mt-6 border border-zinc-800 bg-black p-6">
                      <p className="text-sm leading-8 text-zinc-300">
                        {STUDY_REPORTS[activeReportId]}
                      </p>
                    </div>

                    <div className="mt-6 border border-amber-900/40 bg-amber-950/10 p-4">
                      <div className="text-[9px] tracking-[0.2em] text-amber-500">
                        OBSERVER NOTE
                      </div>
                      <p className="mt-2 text-[10px] leading-6 text-amber-300/80">
                        Useful links are not highlighted. Compare timestamps,
                        infrastructure references, and repeated wording across
                        different reports.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Round2Wrapper() {
  const router = useRouter();
  const [team, setTeam] = useState<any>(null);
  const [roundState, setRoundState] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: any;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: tRows } = await supabase.rpc("get_my_team");
      const t = Array.isArray(tRows) ? tRows[0] : tRows;
      if (!t?.team_id) {
        setErrorMessage("You are not assigned to a team yet.");
        setLoading(false);
        return;
      }
      setTeam(t);
      const { data: rs } = await supabase.rpc("student_get_round_state", { p_round_number: 2 });
      if (rs) setRoundState(rs);
      setLoading(false);

      interval = setInterval(async () => {
        const { data: pollRs } = await supabase.rpc("student_get_round_state", { p_round_number: 2 });
        if (pollRs) setRoundState(pollRs);
      }, 4000);
    }
    load();
    return () => clearInterval(interval);
  }, [router]);

  const handleComplete = async (score: number, metrics: any) => {
    if (!team) return;
    await supabase.rpc("student_submit_round", {
      p_round_number: 2,
      p_metadata: { officialScore: score, metrics }
    });
    setRoundState((prev: any) => ({ ...prev, round_status: "COMPLETED", score_final: true }));
  };

  if (errorMessage && !team) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black p-8 text-center text-white font-sans">
        <h1 className="text-3xl font-black text-amber-500 mb-4">ACCESS ERROR</h1>
        <p className="text-zinc-400">{errorMessage} Return to the lobby to join or create one.</p>
        <button onClick={() => router.push("/lobby")} className="mt-8 border border-amber-600 bg-amber-950/20 px-6 py-3 text-amber-500 transition hover:bg-amber-600 hover:text-black">
          RETURN TO LOBBY
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-black text-amber-500 tracking-[0.2em] font-sans">LOADING ROUND 02...</div>;
  }

  if (roundState?.round_status === "COMPLETED" || roundState?.score_final) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black p-8 text-center text-white font-sans">
        <h1 className="text-3xl font-black text-amber-500 mb-4">ROUND 02 // SUBMITTED</h1>
        <p className="text-zinc-400">Your team's investigation has been locked and recorded.</p>
        <button onClick={() => router.push("/lobby")} className="mt-8 border border-amber-600 bg-amber-950/20 px-6 py-3 text-amber-500 transition hover:bg-amber-600 hover:text-black">
          RETURN TO LOBBY
        </button>
      </div>
    );
  }

  if (roundState?.round_status !== "LIVE") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black p-8 text-center text-white font-sans">
        <h1 className="text-3xl font-black text-amber-500 mb-4">ROUND 02 // NOT ACTIVE</h1>
        <p className="text-zinc-400">Waiting for Admin to start the round...</p>
        <div className="mt-8 animate-spin h-8 w-8 rounded-full border-t-2 border-amber-500 border-opacity-50 mx-auto"></div>
      </div>
    );
  }

  return <Round2FollowTheTrail teamCode={team.team_code} onCompleteRound={handleComplete} />;
}
