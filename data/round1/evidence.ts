export type Importance =
  | "CRITICAL"
  | "HIGH"
  | "SUPPORTING"
  | "LOW"
  | "MISLEADING";

export type ClueCategory =
  | "PHYSICAL"
  | "DIGITAL"
  | "DOCUMENT"
  | "TIMELINE"
  | "COMMUNICATION"
  | "OBSERVATION";

export type ForensicAction =
  | "NONE"
  | "FORENSIC_IMAGE"
  | "DATA_RECOVERY"
  | "TIMELINE_ANALYSIS"
  | "ACCESS_TRACE"
  | "MESSAGE_RECOVERY";

export type Round1Clue = {
  id: string;
  title: string;
  category: ClueCategory;

  // Admin-side intelligence only.
  importance: Importance;

  description: string;
  discoveryText: string;
  hiddenDetail: string;

  position: [number, number, number];
  size: [number, number, number];
  color: string;

  forensicAction: ForensicAction;
  forensicTitle?: string;
  forensicReport?: string;

  hint1: string;
  hint2: string;

  questId?: string;
};

export type Character = {
  id: string;
  name: string;
  role: string;
  suspicion: string;
  description: string;
  secret: string;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  triggerClue: string;
  reward: number;
};

export const ROUND1_CLUES: Round1Clue[] = [
  {
    id: "E-01",
    title: "ACTIVE LABORATORY TERMINAL",
    category: "DIGITAL",
    importance: "CRITICAL",
    description:
      "The main laboratory terminal remains powered and operational after the reported security interruption.",
    discoveryText:
      "The workstation was still running during the 47-second security interruption. A restricted process remained active even though the security layer reported a failure.",
    hiddenDetail:
      "Terminal activity overlaps directly with the reported CCTV blackout window.",
    position: [-3.7, 0.25, -3.5],
    size: [1.5, 1.15, 0.75],
    color: "#131313",
    forensicAction: "FORENSIC_IMAGE",
    forensicTitle: "FORENSIC IMAGE // TERMINAL",
    forensicReport:
      "System imaging confirms the workstation remained operational throughout the security interruption. A restricted process continued executing instead of entering the expected fail-safe state.",
    hint1:
      "The important clue is not simply that the screen was on.",
    hint2:
      "Compare what the terminal was doing with the CCTV blackout window.",
  },

  {
    id: "E-02",
    title: "OFFICIAL INCIDENT REPORT",
    category: "DOCUMENT",
    importance: "HIGH",
    description:
      "A preliminary incident report prepared immediately after the lockdown.",
    discoveryText:
      "The report identifies 22:17 as the official discovery time for the missing BLACKBOX.",
    hiddenDetail:
      "One event in the report conflicts with an independently synchronized record.",
    position: [-1.9, 0.08, -2.1],
    size: [1.5, 0.05, 1.05],
    color: "#cfc8ad",
    forensicAction: "TIMELINE_ANALYSIS",
    forensicTitle: "TIMELINE CROSS-CHECK",
    forensicReport:
      "The official report is internally consistent but does not perfectly align with synchronized system records. The discrepancy occurs before the 22:17 discovery time.",
    hint1:
      "Do not treat the official report as the final timeline.",
    hint2:
      "Compare its timestamps with the access event log.",
    questId: "Q-01",
  },

  {
    id: "E-03",
    title: "RESTRICTED ACCESS BADGE",
    category: "PHYSICAL",
    importance: "SUPPORTING",
    description:
      "A restricted-wing access credential recovered near the laboratory entrance.",
    discoveryText:
      "The credential was active during the incident window.",
    hiddenDetail:
      "The credential identifies a device or account, not automatically the person physically carrying it.",
    position: [1.0, 0.18, -2.15],
    size: [0.65, 0.08, 0.9],
    color: "#292929",
    forensicAction: "ACCESS_TRACE",
    forensicTitle: "ACCESS CREDENTIAL TRACE",
    forensicReport:
      "Credential records confirm access activity but cannot independently establish who physically possessed the badge at each moment.",
    hint1:
      "A credential is not the same thing as a person.",
    hint2:
      "Trace the credential before deciding who used it.",
    questId: "Q-02",
  },

  {
    id: "E-04",
    title: "RECOVERED MOBILE PHONE",
    category: "COMMUNICATION",
    importance: "HIGH",
    description:
      "A mobile device recovered from the laboratory workstation area.",
    discoveryText:
      "The device contains incomplete communications from shortly before the interruption.",
    hiddenDetail:
      "A deleted message contains metadata consistent with a planned transfer window.",
    position: [2.4, 0.18, -2.8],
    size: [0.58, 0.08, 1.15],
    color: "#080808",
    forensicAction: "MESSAGE_RECOVERY",
    forensicTitle: "MESSAGE RECOVERY",
    forensicReport:
      "Recovered metadata confirms a deleted message was transmitted shortly before the security interruption. The original body is incomplete, but the timestamp survived.",
    hint1:
      "The timing of the deleted message matters.",
    hint2:
      "Use the metadata even if the full message cannot be recovered.",
  },

  {
    id: "E-05",
    title: "ACCESS EVENT LOG",
    category: "TIMELINE",
    importance: "CRITICAL",
    description:
      "A synchronized access-control record covering the restricted wing.",
    discoveryText:
      "Multiple access events occurred around the incident window.",
    hiddenDetail:
      "The sequence does not fit the simplest version of the official story.",
    position: [4.0, 0.45, -3.45],
    size: [1.55, 1.0, 0.35],
    color: "#171717",
    forensicAction: "ACCESS_TRACE",
    forensicTitle: "SYNCHRONIZED ACCESS TRACE",
    forensicReport:
      "Cross-reader reconstruction produces a sequence that cannot be interpreted correctly from a single door event. Credential movement must be compared against the wider system timeline.",
    hint1:
      "This is one of your strongest timeline anchors.",
    hint2:
      "Study the sequence, not just the name attached to it.",
    questId: "Q-01",
  },

  {
    id: "E-06",
    title: "RECOVERED CCTV FRAME",
    category: "DIGITAL",
    importance: "CRITICAL",
    description:
      "A recovered frame from the corridor camera immediately before the interruption.",
    discoveryText:
      "The frame establishes the state of the corridor just before the camera failure.",
    hiddenDetail:
      "The physical-removal theory becomes difficult to maintain when this frame is aligned with other evidence.",
    position: [0.0, 3.1, -7.75],
    size: [3.7, 2.0, 0.15],
    color: "#070707",
    forensicAction: "TIMELINE_ANALYSIS",
    forensicTitle: "CCTV TIMELINE RECOVERY",
    forensicReport:
      "Camera metadata places the frame immediately before the interruption. No continuous movement consistent with the simplest main-door removal theory is visible.",
    hint1:
      "Use this evidence to test the obvious theory.",
    hint2:
      "Ask what the frame proves did NOT happen.",
  },

  {
    id: "E-07",
    title: "SECURED STORAGE CABINET",
    category: "PHYSICAL",
    importance: "HIGH",
    description:
      "A restricted cabinet used for sensitive equipment and transfer containers.",
    discoveryText:
      "The cabinet is locked, but signs indicate it was recently accessed.",
    hiddenDetail:
      "Its recent use does not match the expected transfer record.",
    position: [-5.1, 0.95, -1.4],
    size: [1.15, 2.5, 1.0],
    color: "#171717",
    forensicAction: "NONE",
    hint1:
      "Locked does not mean untouched.",
    hint2:
      "Think about when the cabinet was last used.",
  },

  {
    id: "E-08",
    title: "HANDWRITTEN TRANSFER NOTE",
    category: "DOCUMENT",
    importance: "SUPPORTING",
    description:
      "A handwritten note using terminology associated with internal transfer procedures.",
    discoveryText:
      "The note refers to a transfer process using technical shorthand.",
    hiddenDetail:
      "The language suggests knowledge normally available only to technical or project personnel.",
    position: [-2.8, 0.08, -1.35],
    size: [1.25, 0.04, 0.8],
    color: "#d8d0b7",
    forensicAction: "NONE",
    hint1:
      "The terminology is more useful than the handwriting.",
    hint2:
      "Ask who would understand the process described.",
  },

  {
    id: "E-09",
    title: "LABORATORY WALL CLOCK",
    category: "OBSERVATION",
    importance: "LOW",
    description:
      "An analog clock mounted above the laboratory workstation.",
    discoveryText:
      "The clock differs slightly from synchronized digital records.",
    hiddenDetail:
      "It should not be treated as a primary timeline source.",
    position: [5.4, 3.4, -2.2],
    size: [0.85, 0.25, 0.85],
    color: "#252525",
    forensicAction: "NONE",
    hint1:
      "Not every clock is synchronized.",
    hint2:
      "Compare it with stronger digital records.",
  },

  {
    id: "E-10",
    title: "UNREGISTERED STORAGE DRIVE",
    category: "DIGITAL",
    importance: "CRITICAL",
    description:
      "A removable storage drive hidden beneath the workstation cable tray.",
    discoveryText:
      "The device is absent from the laboratory's registered hardware inventory.",
    hiddenDetail:
      "Recovered fragments indicate preparation of a controlled transfer package.",
    position: [0.8, 0.12, -4.55],
    size: [0.55, 0.12, 1.25],
    color: "#0f0f0f",
    forensicAction: "DATA_RECOVERY",
    forensicTitle: "STORAGE DRIVE RECOVERY",
    forensicReport:
      "Recovered fragments indicate a staged transfer package. System metadata shows preparation activity before the reported discovery of the missing BLACKBOX.",
    hint1:
      "This may be more important than the obvious physical evidence.",
    hint2:
      "Recover it only after establishing why the drive matters.",
    questId: "Q-03",
  },

  {
    id: "E-11",
    title: "CORRIDOR SECURITY CAMERA",
    category: "OBSERVATION",
    importance: "SUPPORTING",
    description:
      "A secondary security camera overlooking the corridor outside the lab.",
    discoveryText:
      "The secondary camera remained active while the primary laboratory feed failed.",
    hiddenDetail:
      "It helps determine what was happening outside the laboratory during the outage.",
    position: [5.9, 2.75, -5.9],
    size: [1.1, 0.8, 0.35],
    color: "#101010",
    forensicAction: "NONE",
    hint1:
      "Use the surviving camera as a control.",
    hint2:
      "Compare outside activity with the failed laboratory feed.",
  },

  {
    id: "E-12",
    title: "RESTRICTED LOCKER KEY",
    category: "PHYSICAL",
    importance: "LOW",
    description:
      "A key tagged for a restricted equipment locker.",
    discoveryText:
      "The key was left on an unsecured hook.",
    hiddenDetail:
      "The key provides little direct evidence about the missing BLACKBOX.",
    position: [-4.55, 0.3, 0.95],
    size: [0.2, 0.08, 0.8],
    color: "#969696",
    forensicAction: "NONE",
    hint1:
      "Some objects are context, not answers.",
    hint2:
      "Do not spend too much time on weak evidence.",
  },

  {
    id: "E-13",
    title: "DISCARD BIN CONTENT",
    category: "PHYSICAL",
    importance: "MISLEADING",
    description:
      "Discarded packaging and printed fragments near the workstation.",
    discoveryText:
      "Several fragments appear suspicious at first glance.",
    hiddenDetail:
      "Most fragments belong to normal laboratory operations.",
    position: [4.4, 0.3, 0.65],
    size: [0.95, 0.8, 0.95],
    color: "#333333",
    forensicAction: "NONE",
    hint1:
      "Suspicious-looking does not mean important.",
    hint2:
      "Ask whether it fits the synchronized timeline.",
  },

  {
    id: "E-14",
    title: "MAINTENANCE ACCESS PANEL",
    category: "PHYSICAL",
    importance: "HIGH",
    description:
      "A concealed service panel beneath the laboratory infrastructure desk.",
    discoveryText:
      "The panel provides access to infrastructure connected to the restricted transfer network.",
    hiddenDetail:
      "The service route creates an alternative path that does not depend on normal laboratory-door access.",
    position: [-5.2, 0.8, -4.45],
    size: [1.05, 1.35, 0.18],
    color: "#232323",
    forensicAction: "NONE",
    hint1:
      "Think beyond the main door.",
    hint2:
      "This clue is about infrastructure, not simply hiding something.",
    questId: "Q-04",
  },

  {
    id: "E-15",
    title: "SEALED EVIDENCE ENVELOPE",
    category: "DOCUMENT",
    importance: "SUPPORTING",
    description:
      "A sealed evidence envelope with a chain-of-custody label.",
    discoveryText:
      "The evidence was logged after the lockdown.",
    hiddenDetail:
      "Its main value is procedural and chronological.",
    position: [2.8, 0.07, -0.9],
    size: [1.1, 0.04, 0.75],
    color: "#beb8a2",
    forensicAction: "NONE",
    hint1:
      "Look at the chain of custody.",
    hint2:
      "Ask when the evidence was processed.",
  },

  {
    id: "E-16",
    title: "SERVER ROOM WARNING TAG",
    category: "OBSERVATION",
    importance: "LOW",
    description:
      "A warning tag describing an emergency network procedure.",
    discoveryText:
      "The procedure can explain part of the security interruption.",
    hiddenDetail:
      "The network failure itself does not automatically explain the disappearance.",
    position: [5.0, 0.9, -0.55],
    size: [0.8, 1.1, 0.08],
    color: "#751515",
    forensicAction: "NONE",
    hint1:
      "Do not automatically connect the blackout to the disappearance.",
    hint2:
      "Separate the cause of the outage from the cause of the missing object.",
  },
];

export const ROUND1_CHARACTERS: Character[] = [
  {
    id: "P-01",
    name: "DR. ADRIAN VALE",
    role: "PROJECT DIRECTOR",
    suspicion: "HIGH",
    description:
      "Senior authority over the BLACKBOX project and restricted transfer approvals.",
    secret:
      "Knows the project's emergency transfer procedure.",
  },
  {
    id: "P-02",
    name: "MIRA SEN",
    role: "SECURITY OFFICER",
    suspicion: "MEDIUM",
    description:
      "Responsible for access credentials and restricted-wing security.",
    secret:
      "A credential associated with her department appears during the incident window.",
  },
  {
    id: "P-03",
    name: "ETHAN COLE",
    role: "SYSTEMS ENGINEER",
    suspicion: "HIGH",
    description:
      "Maintains emergency network architecture and system transfer infrastructure.",
    secret:
      "Understands the technical route involved in the emergency transfer procedure.",
  },
  {
    id: "P-04",
    name: "LEAH MORGAN",
    role: "DATA ANALYST",
    suspicion: "LOW",
    description:
      "Detected irregularities in the system timeline.",
    secret:
      "Observed anomalies before the official report was finalized.",
  },
  {
    id: "P-05",
    name: "DANIEL CROSS",
    role: "EXTERNAL CONTRACTOR",
    suspicion: "HIGH",
    description:
      "External contractor repeatedly referenced in the preliminary investigation.",
    secret:
      "Some evidence implicates him, but not every item is independently trustworthy.",
  },
  {
    id: "P-06",
    name: "UNKNOWN CONTACT",
    role: "UNIDENTIFIED",
    suspicion: "UNKNOWN",
    description:
      "Referenced through incomplete communications.",
    secret:
      "Identity remains unresolved.",
  },
];

export const ROUND1_QUESTS: Quest[] = [
  {
    id: "Q-01",
    title: "TRACE THE TIMELINE",
    description:
      "Reconstruct the incident using independent synchronized records.",
    triggerClue: "E-02",
    reward: 8,
  },
  {
    id: "Q-02",
    title: "WHO USED THE CREDENTIAL?",
    description:
      "Determine whether credential ownership is enough to identify the person who used it.",
    triggerClue: "E-03",
    reward: 7,
  },
  {
    id: "Q-03",
    title: "THE HIDDEN TRANSFER",
    description:
      "Determine what the unregistered storage device reveals about the missing BLACKBOX.",
    triggerClue: "E-10",
    reward: 10,
  },
  {
    id: "Q-04",
    title: "THE SECOND ROUTE",
    description:
      "Investigate the infrastructure path that does not depend on the main laboratory entrance.",
    triggerClue: "E-14",
    reward: 9,
  },
];