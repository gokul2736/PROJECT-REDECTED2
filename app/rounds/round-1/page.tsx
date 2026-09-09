"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Text } from "@react-three/drei";
import * as THREE from "three";

import {
  ROUND1_CHARACTERS,
  ROUND1_CLUES,
  type Round1Clue,
} from "@/data/round1/evidence";

import { supabase } from "@/lib/supabase";

/* =========================================================
   ROUND CONFIG
========================================================= */

const ROUND_DURATION = 30 * 60;
const FORENSIC_CREDITS = 5;
const FORENSIC_PROCESSING_SECONDS = 8;

const FREE_HINTS = 2;
const HINT_COST = 5;

const EARLY_CUTOFF_SECONDS = 20 * 60;
const MCQ_EARLY_UNLOCK_SECONDS = 25 * 60;
const INVESTIGATION_DEADLINE_SECONDS = 30 * 60;
const MCQ_DURATION_SECONDS = 5 * 60;

// Round 1 weighting: 45 evidence + 15 team efficiency + 20 MCQ + 10 speed + 10 discipline = 100.
const MAX_EVIDENCE_SCORE = 45;
const MAX_TEAM_EFFICIENCY_SCORE = 15;
const MAX_MCQ_SCORE = 20;
const MAX_SPEED_SCORE = 10;
const MAX_DISCIPLINE_SCORE = 10;
const EARLY_BONUS_POINTS = 10;

const CORE_EVIDENCE = [
  "E-01",
  "E-05",
  "E-06",
  "E-10",
  "E-14",
];

/* =========================================================
   HIDDEN EVIDENCE SCORING
========================================================= */

const EVIDENCE_SCORE: Record<string, number> = {
  "E-01": 7,
  "E-02": 4,
  "E-03": 0,
  "E-04": 4,
  "E-05": 7,
  "E-06": 7,
  "E-07": 4,
  "E-08": 0,
  "E-09": 0,
  "E-10": 7,
  "E-11": 0,
  "E-12": 0,
  "E-13": 0,
  "E-14": 5,
  "E-15": 0,
  "E-16": 0,
};

/* =========================================================
   STUDY REPORTS
   These are deliberately explicit because the final MCQs
   must be answerable directly from information the team
   obtained during investigation.
========================================================= */

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

/* =========================================================
   FORENSIC REPORTS
========================================================= */

const FORENSIC_REPORTS: Record<string, string> = {
  "E-01":
    "Forensic terminal analysis confirms that the laboratory process remained active during the security interruption.",

  "E-04":
    "Forensic phone recovery restored deleted message metadata. The recovered communication is timestamped 22:08.",

  "E-05":
    "Forensic access reconstruction confirms a restricted access event at 22:11 and shows that the credential event cannot alone identify the physical user.",

  "E-06":
    "Forensic CCTV recovery confirms the recovered frame timestamp as 22:16:53.",

  "E-10":
    "Forensic storage recovery found transfer fragments and metadata showing preparation activity at 22:08.",

  "E-02":
    "Timeline analysis confirms that the official incident report records BLACKBOX as missing at 22:17.",

  "E-07":
    "Storage analysis does not establish that BLACKBOX was removed through the main laboratory entrance.",

  "E-14":
    "Infrastructure review confirms that the maintenance access panel connects to the restricted transfer network.",
};

/* =========================================================
   EASY HINTS
========================================================= */

const HINTS: Record<string, string[]> = {
  "E-01": [
    "Look at what remained active while the security layer was interrupted.",
    "Compare the terminal state with the CCTV and access timeline.",
  ],

  "E-02": [
    "The important information here is a specific time.",
    "Find the exact time at which the report says BLACKBOX was missing.",
  ],

  "E-03": [
    "The important distinction is between a credential and a person.",
    "A badge record tells you about a credential, not automatically its user.",
  ],

  "E-04": [
    "The phone contains time-stamped communication information.",
    "Look carefully at the recovered message timing.",
  ],

  "E-05": [
    "Use this evidence to establish a specific access time.",
    "Compare the access record with the other time-stamped evidence.",
  ],

  "E-06": [
    "The strongest information here is the exact timestamp.",
    "Compare the CCTV timestamp with the 22:17 incident report.",
  ],

  "E-07": [
    "This cabinet is more about what it fails to prove.",
    "Do not assume the obvious entrance was the route used.",
  ],

  "E-08": [
    "There is a specific time hidden in the transfer note.",
    "Compare the note time with the access records.",
  ],

  "E-09": [
    "Treat this as an observation rather than a perfectly synchronized system.",
    "Compare the wall clock with independently recorded timestamps.",
  ],

  "E-10": [
    "The important information is when the preparation happened.",
    "Look for transfer activity before the reported disappearance.",
  ],

  "E-11": [
    "This is part of the security layer.",
    "Compare its state with the other security evidence.",
  ],

  "E-12": [
    "A key proves physical access capability, not necessarily responsibility.",
    "Do not treat possession of a key as proof of the route.",
  ],

  "E-13": [
    "This may be a distracting piece of evidence.",
    "Look for anything here that independently proves responsibility.",
  ],

  "E-14": [
    "This panel is connected to infrastructure rather than the main entrance.",
    "Look at what network or route is connected to the panel.",
  ],

  "E-15": [
    "This item is mainly about chain of custody.",
    "Do not confuse preservation of evidence with proof of guilt.",
  ],

  "E-16": [
    "This is an operational warning rather than direct proof of responsibility.",
    "Use stronger technical evidence before drawing a conclusion.",
  ],
};

/* =========================================================
   MCQ TYPES
========================================================= */

type QuestionCategory =
  | "TIME"
  | "PEOPLE"
  | "LOCATION"
  | "DIGITAL"
  | "EVENT";

type MCQ = {
  id: string;
  category: QuestionCategory;
  question: string;
  options: string[];
  answer: string;
  supportingEvidence: string[];
};

/* =========================================================
   10 QUESTION POOL
   One question from each category is selected per team,
   so each team gets 5 questions but different combinations.
========================================================= */

const QUESTION_POOL: MCQ[] = [
  {
    id: "Q01",
    category: "TIME",
    question:
      "At what time was BLACKBOX reported missing?",
    options: ["22:03", "22:08", "22:17", "22:21"],
    answer: "22:17",
    supportingEvidence: ["E-02"],
  },

  {
    id: "Q02",
    category: "TIME",
    question:
      "What timestamp was recorded on the recovered CCTV frame?",
    options: [
      "22:11",
      "22:16:53",
      "22:17",
      "22:21",
    ],
    answer: "22:16:53",
    supportingEvidence: ["E-06"],
  },

  {
    id: "Q03",
    category: "PEOPLE",
    question:
      "What does a security credential record establish?",
    options: [
      "The physical identity of the user",
      "That the credential was used",
      "The reason for the incident",
      "The final route used",
    ],
    answer:
      "That the credential was used",
    supportingEvidence: ["E-03", "E-05"],
  },

  {
    id: "Q04",
    category: "PEOPLE",
    question:
      "What can the badge record not prove by itself?",
    options: [
      "That a credential exists",
      "That restricted access occurred",
      "Who physically used the credential",
      "That the lab exists",
    ],
    answer:
      "Who physically used the credential",
    supportingEvidence: ["E-03"],
  },

  {
    id: "Q05",
    category: "LOCATION",
    question:
      "What network is connected to the maintenance access panel?",
    options: [
      "Guest network",
      "Public network",
      "Restricted transfer network",
      "External network",
    ],
    answer:
      "Restricted transfer network",
    supportingEvidence: ["E-14"],
  },

  {
    id: "Q06",
    category: "LOCATION",
    question:
      "Which location is directly identified by the official incident report?",
    options: [
      "Laboratory 3",
      "Server room",
      "Main entrance",
      "Contractor loading area",
    ],
    answer: "Laboratory 3",
    supportingEvidence: ["E-02"],
  },

  {
    id: "Q07",
    category: "DIGITAL",
    question:
      "What time was the deleted communication recovered from the phone?",
    options: [
      "22:03",
      "22:08",
      "22:11",
      "22:17",
    ],
    answer: "22:08",
    supportingEvidence: ["E-04"],
  },

  {
    id: "Q08",
    category: "DIGITAL",
    question:
      "What did the unregistered storage drive contain?",
    options: [
      "Access cards",
      "Transfer fragments",
      "Door keys",
      "CCTV cameras",
    ],
    answer: "Transfer fragments",
    supportingEvidence: ["E-10"],
  },

  {
    id: "Q09",
    category: "EVENT",
    question:
      "What remained active during the security interruption?",
    options: [
      "The laboratory process",
      "The wall clock",
      "The main door",
      "The evidence envelope",
    ],
    answer: "The laboratory process",
    supportingEvidence: ["E-01"],
  },

  {
    id: "Q10",
    category: "EVENT",
    question:
      "What happened to the security camera layer during the interruption?",
    options: [
      "It was unaffected",
      "It recorded the entire event",
      "It was interrupted",
      "It was physically removed",
    ],
    answer: "It was interrupted",
    supportingEvidence: ["E-11"],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);

  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");

  const secs = (safe % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secs}`;
}

function currentClock() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createEmptyProgress(): Record<
  string,
  EvidenceProgress
> {
  return Object.fromEntries(
    ROUND1_CLUES.map((clue) => [
      clue.id,
      {
        discovered: false,
        studied: false,
        forensicComplete: false,
      },
    ]),
  );
}

function isRealTeamId(teamId?: string | null) {
  return Boolean(
    teamId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      teamId,
    ),
  );
}

/* =========================================================
   STATE TYPES
========================================================= */

type EvidenceProgress = {
  discovered: boolean;
  studied: boolean;
  forensicComplete: boolean;
};

type Team = {
  has_team: boolean;
  team_id?: string;
  team_code?: string;
  team_name?: string;
  case_code?: string | null;
  current_round?: number | null;
  status?: string | null;
  members?: {
    name: string;
    email: string | null;
  }[];
};

type ContributionKind =
  | "DISCOVER"
  | "STUDY"
  | "FORENSIC_COMPLETE";

type MemberContribution = {
  name: string;
  email: string;
  units: number;
  discoveries: number;
  studies: number;
  forensics: number;
};

type ActivityEvent = {
  id: string;
  text: string;
  at: string;
  remote?: boolean;
  actorEmail?: string;
  actorName?: string;
  contributionKind?: ContributionKind;
  contributionUnits?: number;
  clueId?: string;
};

/* =========================================================
   PLAYER CAMERA
========================================================= */

function PlayerCamera({
  active,
}: {
  active: boolean;
}) {
  const { camera, gl } = useThree();

  const keys = useRef<Record<string, boolean>>(
    {},
  );

  const yaw = useRef(0);
  const pitch = useRef(-0.05);

  const dragging = useRef(false);

  const lastPointer = useRef({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    camera.position.set(0, 1.55, 5.25);
    camera.rotation.order = "YXZ";

    const onKeyDown = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    window.addEventListener(
      "keyup",
      onKeyUp,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );

      window.removeEventListener(
        "keyup",
        onKeyUp,
      );
    };
  }, [camera]);

  useEffect(() => {
    const element = gl.domElement;

    const onPointerDown = (
      event: PointerEvent,
    ) => {
      if (!active || event.button !== 0) {
        return;
      }

      dragging.current = true;

      lastPointer.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onPointerMove = (
      event: PointerEvent,
    ) => {
      if (!active || !dragging.current) {
        return;
      }

      const dx =
        event.clientX -
        lastPointer.current.x;

      const dy =
        event.clientY -
        lastPointer.current.y;

      lastPointer.current = {
        x: event.clientX,
        y: event.clientY,
      };

      yaw.current -= dx * 0.0022;

      pitch.current -= dy * 0.0018;

      pitch.current = THREE.MathUtils.clamp(
        pitch.current,
        -1.05,
        1.05,
      );
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    element.addEventListener(
      "pointerdown",
      onPointerDown,
    );

    window.addEventListener(
      "pointermove",
      onPointerMove,
    );

    window.addEventListener(
      "pointerup",
      onPointerUp,
    );

    return () => {
      element.removeEventListener(
        "pointerdown",
        onPointerDown,
      );

      window.removeEventListener(
        "pointermove",
        onPointerMove,
      );

      window.removeEventListener(
        "pointerup",
        onPointerUp,
      );
    };
  }, [active, gl]);

  useFrame((_, delta) => {
    if (!active) {
      return;
    }

    camera.rotation.order = "YXZ";

    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    const input = new THREE.Vector3();

    if (keys.current.w) {
      input.z -= 1;
    }

    if (keys.current.s) {
      input.z += 1;
    }

    if (keys.current.a) {
      input.x -= 1;
    }

    if (keys.current.d) {
      input.x += 1;
    }

    if (input.lengthSq() === 0) {
      return;
    }

    input.normalize();

    const forward = new THREE.Vector3(
      0,
      0,
      -1,
    ).applyQuaternion(camera.quaternion);

    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(
      1,
      0,
      0,
    ).applyQuaternion(camera.quaternion);

    right.y = 0;
    right.normalize();

    const movement = new THREE.Vector3();

    movement.addScaledVector(
      forward,
      -input.z,
    );

    movement.addScaledVector(
      right,
      input.x,
    );

    movement.normalize();

    camera.position.addScaledVector(
      movement,
      3 * delta,
    );

    camera.position.x =
      THREE.MathUtils.clamp(
        camera.position.x,
        -8.3,
        8.3,
      );

    camera.position.z =
      THREE.MathUtils.clamp(
        camera.position.z,
        -6.8,
        6.4,
      );

    camera.position.y = 1.55;
  });

  return null;
}

/* =========================================================
   ROOM LIGHT
========================================================= */

function CeilingLight({
  position,
  warm = false,
}: {
  position: [number, number, number];
  warm?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry
          args={[2.4, 0.08, 0.62]}
        />

        <meshStandardMaterial
          color={
            warm ? "#d8ce98" : "#dedede"
          }
          emissive={
            warm ? "#f2c300" : "#d9d9d9"
          }
          emissiveIntensity={
            warm ? 0.45 : 0.12
          }
        />
      </mesh>

      <pointLight
        position={[0, -0.2, 0]}
        intensity={
          warm ? 1.75 : 2
        }
        distance={7.5}
        decay={1.4}
        color={
          warm
            ? "#f2c300"
            : "#fff4d0"
        }
      />
    </group>
  );
}

/* =========================================================
   WALL DETAILS
========================================================= */

function WallDetails() {
  return (
    <group>
      {[
        -7.5,
        -4.8,
        -2.1,
        0.6,
        3.3,
      ].map((x) => (
        <mesh
          key={x}
          position={[
            x,
            3,
            -7.82,
          ]}
        >
          <boxGeometry
            args={[
              0.025,
              7.4,
              0.025,
            ]}
          />

          <meshStandardMaterial
            color="#292929"
          />
        </mesh>
      ))}

      <mesh
        position={[
          0,
          2.25,
          -7.82,
        ]}
      >
        <boxGeometry
          args={[
            19.2,
            0.025,
            0.025,
          ]}
        />

        <meshStandardMaterial
          color="#292929"
        />
      </mesh>

      <mesh
        position={[
          -7.2,
          2.5,
          -7.7,
        ]}
        rotation={[
          0,
          0,
          Math.PI / 2,
        ]}
      >
        <cylinderGeometry
          args={[
            0.07,
            0.07,
            5,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#3b3b3b"
          metalness={0.55}
          roughness={0.45}
        />
      </mesh>

      <group
        position={[
          -7.4,
          4.35,
          -7.65,
        ]}
      >
        <mesh>
          <boxGeometry
            args={[
              1.9,
              0.9,
              0.12,
            ]}
          />

          <meshStandardMaterial
            color="#1a1a1a"
          />
        </mesh>

        {[
          -0.55,
          -0.18,
          0.18,
          0.55,
        ].map((x) => (
          <mesh
            key={x}
            position={[
              x,
              0,
              -0.08,
            ]}
            rotation={[
              0,
              0,
              -0.45,
            ]}
          >
            <boxGeometry
              args={[
                0.07,
                0.65,
                0.04,
              ]}
            />

            <meshStandardMaterial
              color="#484848"
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* =========================================================
   DOOR
========================================================= */

function LabDoor() {
  return (
    <group
      position={[
        8.65,
        2.05,
        -4.9,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            0.3,
            4.1,
            3.1,
          ]}
        />

        <meshStandardMaterial
          color="#151515"
          metalness={0.38}
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          -0.18,
          0,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.06,
            3.55,
            2.65,
          ]}
        />

        <meshStandardMaterial
          color="#232323"
        />
      </mesh>

      <mesh
        position={[
          -0.29,
          0,
          0.15,
        ]}
      >
        <boxGeometry
          args={[
            0.04,
            0.55,
            0.08,
          ]}
        />

        <meshStandardMaterial
          color="#8f8f8f"
          metalness={0.7}
        />
      </mesh>

      <Text
        position={[
          -0.34,
          1.35,
          0,
        ]}
        fontSize={0.12}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        RESTRICTED ACCESS
      </Text>
    </group>
  );
}

/* =========================================================
   WORK DESK
========================================================= */

function WorkDesk() {
  return (
    <group
      position={[
        -1.2,
        -0.25,
        -3,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            5.4,
            0.38,
            1.9,
          ]}
        />

        <meshStandardMaterial
          color="#181818"
          roughness={0.8}
          metalness={0.12}
        />
      </mesh>

      {[
        [-2.25, -1, -0.62],
        [2.25, -1, -0.62],
        [-2.25, -1, 0.62],
        [2.25, -1, 0.62],
      ].map(
        ([x, y, z], index) => (
          <mesh
            key={index}
            position={[
              x,
              y,
              z,
            ]}
          >
            <boxGeometry
              args={[
                0.3,
                1.6,
                0.3,
              ]}
            />

            <meshStandardMaterial
              color="#0d0d0d"
            />
          </mesh>
        ),
      )}

      {/* workstation monitor */}

      <mesh
        position={[
          0,
          1.15,
          -0.2,
        ]}
      >
        <boxGeometry
          args={[
            2.2,
            1.35,
            0.3,
          ]}
        />

        <meshStandardMaterial
          color="#101010"
        />
      </mesh>

      <mesh
        position={[
          0,
          1.15,
          -0.38,
        ]}
      >
        <boxGeometry
          args={[
            1.85,
            1.03,
            0.05,
          ]}
        />

        <meshStandardMaterial
          color="#060606"
          emissive="#f2c300"
          emissiveIntensity={0.11}
        />
      </mesh>

      <Text
        position={[
          0,
          1.4,
          -0.42,
        ]}
        fontSize={0.13}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        TERMINAL // ACTIVE
      </Text>

      <Text
        position={[
          0,
          1.07,
          -0.42,
        ]}
        fontSize={0.075}
        color="#6f6f6f"
        anchorX="center"
        anchorY="middle"
      >
        SECURITY PROCESS RUNNING
      </Text>

      <mesh
        position={[
          0,
          0.23,
          0.15,
        ]}
      >
        <boxGeometry
          args={[
            1.45,
            0.07,
            0.48,
          ]}
        />

        <meshStandardMaterial
          color="#292929"
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   OFFICE CHAIR
========================================================= */

function OfficeChair() {
  return (
    <group
      position={[
        -0.1,
        -0.95,
        -1.35,
      ]}
    >
      <mesh
        position={[
          0,
          1,
          0,
        ]}
      >
        <boxGeometry
          args={[
            1.15,
            0.18,
            1,
          ]}
        />

        <meshStandardMaterial
          color="#1b1b1b"
        />
      </mesh>

      <mesh
        position={[
          0,
          1.55,
          0.38,
        ]}
      >
        <boxGeometry
          args={[
            1.05,
            1.2,
            0.16,
          ]}
        />

        <meshStandardMaterial
          color="#171717"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.35,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.08,
            0.08,
            1.25,
            14,
          ]}
        />

        <meshStandardMaterial
          color="#505050"
          metalness={0.6}
        />
      </mesh>

      <mesh
        position={[
          0,
          -0.35,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.55,
            0.55,
            0.08,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#161616"
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   STORAGE SHELF
========================================================= */

function StorageShelf() {
  return (
    <group
      position={[
        -6.2,
        0,
        -1.9,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            1.8,
            4,
            1.2,
          ]}
        />

        <meshStandardMaterial
          color="#121212"
          roughness={0.9}
        />
      </mesh>

      {[0.8, 0, -0.8].map(
        (y) => (
          <mesh
            key={y}
            position={[
              0,
              y,
              -0.63,
            ]}
          >
            <boxGeometry
              args={[
                1.62,
                0.07,
                0.08,
              ]}
            />

            <meshStandardMaterial
              color="#2c2c2c"
            />
          </mesh>
        ),
      )}

      <Text
        position={[
          0,
          1.45,
          -0.67,
        ]}
        fontSize={0.11}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        RESTRICTED STORAGE
      </Text>
    </group>
  );
}

/* =========================================================
   INVESTIGATION BOARD
========================================================= */

function InvestigationBoard() {
  return (
    <group
      position={[
        3.5,
        2.15,
        -7.75,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            4.8,
            3,
            0.16,
          ]}
        />

        <meshStandardMaterial
          color="#151515"
        />
      </mesh>

      <Edges
        color="#f2c300"
        threshold={20}
      />

      <Text
        position={[
          0,
          1.02,
          -0.11,
        ]}
        fontSize={0.23}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        CASE // BLACKBOX
      </Text>

      <Text
        position={[
          0,
          0.6,
          -0.11,
        ]}
        fontSize={0.105}
        color="#999999"
        anchorX="center"
        anchorY="middle"
      >
        RESTRICTED LABORATORY // 22:17
      </Text>

      {[
        [-1.45, -0.1],
        [0, -0.1],
        [1.45, -0.1],
        [-0.72, -0.86],
        [0.72, -0.86],
      ].map(
        ([x, y], index) => (
          <group
            key={index}
            position={[
              x,
              y,
              -0.11,
            ]}
          >
            <mesh>
              <boxGeometry
                args={[
                  0.82,
                  0.5,
                  0.025,
                ]}
              />

              <meshStandardMaterial
                color="#c0b99f"
              />
            </mesh>

            <mesh
              position={[
                0,
                0,
                -0.025,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.035,
                  0.035,
                  0.04,
                  16,
                ]}
              />

              <meshStandardMaterial
                color="#8a1d1d"
              />
            </mesh>
          </group>
        ),
      )}
    </group>
  );
}

/* =========================================================
   CCTV MONITOR
========================================================= */

function SecurityMonitor() {
  return (
    <group
      position={[
        6,
        2.2,
        -5.25,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            3,
            1.85,
            0.35,
          ]}
        />

        <meshStandardMaterial
          color="#111111"
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          -0.2,
        ]}
      >
        <boxGeometry
          args={[
            2.5,
            1.38,
            0.05,
          ]}
        />

        <meshStandardMaterial
          color="#050505"
          emissive="#f2c300"
          emissiveIntensity={0.08}
        />
      </mesh>

      <Text
        position={[
          0,
          0.38,
          -0.27,
        ]}
        fontSize={0.15}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        CCTV // DEGRADED
      </Text>

      <Text
        position={[
          0,
          0,
          -0.27,
        ]}
        fontSize={0.085}
        color="#777777"
        anchorX="center"
        anchorY="middle"
      >
        CAMERA 04
      </Text>
    </group>
  );
}

/* =========================================================
   WALL CLOCK
========================================================= */

function WallClock() {
  return (
    <group
      position={[
        5.25,
        3.5,
        -2.35,
      ]}
    >
      <mesh
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.72,
            0.72,
            0.18,
            40,
          ]}
        />

        <meshStandardMaterial
          color="#242424"
        />
      </mesh>

      <mesh
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
        position={[
          0,
          0,
          -0.11,
        ]}
      >
        <cylinderGeometry
          args={[
            0.54,
            0.54,
            0.025,
            40,
          ]}
        />

        <meshStandardMaterial
          color="#090909"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.07,
          -0.14,
        ]}
        rotation={[
          0,
          0,
          0.7,
        ]}
      >
        <boxGeometry
          args={[
            0.05,
            0.25,
            0.02,
          ]}
        />

        <meshStandardMaterial
          color="#c5c5c5"
        />
      </mesh>

      <mesh
        position={[
          0.08,
          -0.01,
          -0.15,
        ]}
        rotation={[
          0,
          0,
          -0.95,
        ]}
      >
        <boxGeometry
          args={[
            0.04,
            0.38,
            0.02,
          ]}
        />

        <meshStandardMaterial
          color="#dedede"
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   WARNING PANEL
========================================================= */

function WarningPanel() {
  return (
    <group
      position={[
        6.7,
        1.55,
        1.3,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            1.5,
            2.2,
            0.18,
          ]}
        />

        <meshStandardMaterial
          color="#121212"
        />
      </mesh>

      <Edges
        color="#501717"
        threshold={20}
      />

      <Text
        position={[
          0,
          0.55,
          -0.13,
        ]}
        fontSize={0.16}
        color="#b63333"
        anchorX="center"
        anchorY="middle"
      >
        RESTRICTED
      </Text>

      <Text
        position={[
          0,
          0.12,
          -0.13,
        ]}
        fontSize={0.085}
        color="#777777"
        anchorX="center"
        anchorY="middle"
      >
        EMERGENCY
      </Text>
    </group>
  );
}

/* =========================================================
   NON-EVIDENCE PROPS
========================================================= */

function ProjectPhotoFrame() {
  return (
    <group
      position={[
        -5.4,
        3.05,
        -7.72,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            1.9,
            1.25,
            0.09,
          ]}
        />

        <meshStandardMaterial
          color="#3a3125"
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          -0.06,
        ]}
      >
        <boxGeometry
          args={[
            1.62,
            0.97,
            0.025,
          ]}
        />

        <meshStandardMaterial
          color="#1a1d20"
        />
      </mesh>

      {[
        -0.45,
        0,
        0.45,
      ].map((x) => (
        <group
          key={x}
          position={[
            x,
            -0.02,
            -0.09,
          ]}
        >
          <mesh
            position={[
              0,
              0.18,
              0,
            ]}
          >
            <sphereGeometry
              args={[
                0.11,
                14,
                12,
              ]}
            />

            <meshStandardMaterial
              color="#555555"
            />
          </mesh>

          <mesh
            position={[
              0,
              -0.03,
              0,
            ]}
          >
            <boxGeometry
              args={[
                0.18,
                0.28,
                0.04,
              ]}
            />

            <meshStandardMaterial
              color="#474747"
            />
          </mesh>
        </group>
      ))}

      <Text
        position={[
          0,
          -0.82,
          -0.08,
        ]}
        fontSize={0.065}
        color="#777777"
        anchorX="center"
        anchorY="middle"
      >
        BLACKBOX PROJECT // ARCHIVE
      </Text>
    </group>
  );
}

function CoffeeMug() {
  return (
    <group
      position={[
        4.5,
        0.04,
        -2.15,
      ]}
    >
      <mesh>
        <cylinderGeometry
          args={[
            0.18,
            0.15,
            0.34,
            20,
          ]}
        />

        <meshStandardMaterial
          color="#4d4a40"
        />
      </mesh>

      <mesh
        position={[
          0.2,
          0,
          0,
        ]}
        rotation={[
          0,
          0,
          Math.PI / 2,
        ]}
      >
        <torusGeometry
          args={[
            0.09,
            0.035,
            10,
            20,
          ]}
        />

        <meshStandardMaterial
          color="#4d4a40"
        />
      </mesh>
    </group>
  );
}

function ClipboardProp() {
  return (
    <group
      position={[
        4.9,
        0.14,
        -0.5,
      ]}
      rotation={[
        0.04,
        0,
        -0.14,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            0.85,
            0.08,
            1.2,
          ]}
        />

        <meshStandardMaterial
          color="#4a3421"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.05,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.65,
            0.025,
            0.92,
          ]}
        />

        <meshStandardMaterial
          color="#d4ccb9"
        />
      </mesh>

      <Text
        position={[
          0,
          0.07,
          0.08,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        fontSize={0.055}
        color="#39352d"
        anchorX="center"
        anchorY="middle"
      >
        SHIFT CHECKLIST
      </Text>
    </group>
  );
}

function FloorCableBox() {
  return (
    <group
      position={[
        -4.1,
        -0.68,
        1.3,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            1,
            0.36,
            0.7,
          ]}
        />

        <meshStandardMaterial
          color="#202020"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.2,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.72,
            0.04,
            0.42,
          ]}
        />

        <meshStandardMaterial
          color="#292929"
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   EVIDENCE MODELS
========================================================= */

function TerminalEvidence() {
  return (
    <group>
      <mesh
        position={[
          0,
          0.55,
          0,
        ]}
      >
        <boxGeometry
          args={[
            1.25,
            0.85,
            0.14,
          ]}
        />

        <meshStandardMaterial
          color="#101010"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.56,
          -0.09,
        ]}
      >
        <boxGeometry
          args={[
            1.02,
            0.62,
            0.025,
          ]}
        />

        <meshStandardMaterial
          color="#071008"
          emissive="#b89c18"
          emissiveIntensity={0.08}
        />
      </mesh>

      <Text
        position={[
          0,
          0.67,
          -0.12,
        ]}
        fontSize={0.075}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        SECURE
      </Text>

      <mesh
        position={[
          0,
          -0.2,
          0.42,
        ]}
      >
        <boxGeometry
          args={[
            0.85,
            0.05,
            0.3,
          ]}
        />

        <meshStandardMaterial
          color="#292929"
        />
      </mesh>
    </group>
  );
}

function PaperEvidence({
  label,
}: {
  label: string;
}) {
  return (
    <group
      rotation={[
        0,
        0,
        -0.04,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            1.25,
            0.035,
            0.82,
          ]}
        />

        <meshStandardMaterial
          color="#d0c7a9"
        />
      </mesh>

      <Text
        position={[
          0,
          0.03,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        fontSize={0.07}
        color="#222222"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

function BadgeEvidence() {
  return (
    <group
      rotation={[
        0.15,
        0.1,
        -0.08,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            0.52,
            0.07,
            0.82,
          ]}
        />

        <meshStandardMaterial
          color="#343434"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.04,
          0.05,
        ]}
      >
        <boxGeometry
          args={[
            0.32,
            0.015,
            0.42,
          ]}
        />

        <meshStandardMaterial
          color="#1f2530"
        />
      </mesh>

      <Text
        position={[
          0,
          0.055,
          0,
        ]}
        fontSize={0.052}
        color="#bcbcbc"
        anchorX="center"
        anchorY="middle"
      >
        SECURITY
      </Text>
    </group>
  );
}

function PhoneEvidence() {
  return (
    <group
      rotation={[
        0.04,
        0.18,
        -0.12,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            0.5,
            0.08,
            0.96,
          ]}
        />

        <meshStandardMaterial
          color="#111111"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.05,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.4,
            0.025,
            0.76,
          ]}
        />

        <meshStandardMaterial
          color="#070907"
          emissive="#796814"
          emissiveIntensity={0.08}
        />
      </mesh>

      <Text
        position={[
          0,
          0.066,
          0.18,
        ]}
        fontSize={0.05}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        22:08
      </Text>
    </group>
  );
}

function AccessLogEvidence() {
  return (
    <group>
      <mesh>
        <boxGeometry
          args={[
            1.35,
            0.82,
            0.24,
          ]}
        />

        <meshStandardMaterial
          color="#151515"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.05,
          -0.14,
        ]}
      >
        <boxGeometry
          args={[
            1.03,
            0.55,
            0.025,
          ]}
        />

        <meshStandardMaterial
          color="#070907"
          emissive="#8b7412"
          emissiveIntensity={0.06}
        />
      </mesh>

      <Text
        position={[
          0,
          0.08,
          -0.17,
        ]}
        fontSize={0.055}
        color="#b6a330"
        anchorX="center"
        anchorY="middle"
      >
        ACCESS LOG
      </Text>
    </group>
  );
}

function CctvEvidence() {
  return (
    <group>
      <mesh>
        <boxGeometry
          args={[
            1.65,
            1,
            0.15,
          ]}
        />

        <meshStandardMaterial
          color="#111111"
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          -0.09,
        ]}
      >
        <boxGeometry
          args={[
            1.38,
            0.76,
            0.02,
          ]}
        />

        <meshStandardMaterial
          color="#101010"
          emissive="#746215"
          emissiveIntensity={0.05}
        />
      </mesh>

      <Text
        position={[
          0,
          0.34,
          -0.12,
        ]}
        fontSize={0.06}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        CCTV / 22:16:53
      </Text>
    </group>
  );
}

function CabinetEvidence() {
  return (
    <group>
      <mesh
        position={[
          0,
          0.9,
          0,
        ]}
      >
        <boxGeometry
          args={[
            1.25,
            1.8,
            0.78,
          ]}
        />

        <meshStandardMaterial
          color="#1d1d1d"
          roughness={0.82}
          metalness={0.28}
        />
      </mesh>

      <mesh
        position={[
          -0.29,
          0.9,
          -0.42,
        ]}
      >
        <boxGeometry
          args={[
            0.5,
            1.58,
            0.035,
          ]}
        />

        <meshStandardMaterial
          color="#252525"
        />
      </mesh>

      <mesh
        position={[
          0.29,
          0.9,
          -0.42,
        ]}
      >
        <boxGeometry
          args={[
            0.5,
            1.58,
            0.035,
          ]}
        />

        <meshStandardMaterial
          color="#252525"
        />
      </mesh>

      <mesh
        position={[
          -0.05,
          0.9,
          -0.47,
        ]}
      >
        <boxGeometry
          args={[
            0.035,
            0.3,
            0.04,
          ]}
        />

        <meshStandardMaterial
          color="#7b7b7b"
        />
      </mesh>

      <mesh
        position={[
          0.05,
          0.9,
          -0.47,
        ]}
      >
        <boxGeometry
          args={[
            0.035,
            0.3,
            0.04,
          ]}
        />

        <meshStandardMaterial
          color="#7b7b7b"
        />
      </mesh>
    </group>
  );
}

function ClockEvidence() {
  return (
    <group>
      <mesh>
        <cylinderGeometry
          args={[
            0.45,
            0.45,
            0.14,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#262626"
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          0.08,
        ]}
      >
        <cylinderGeometry
          args={[
            0.34,
            0.34,
            0.025,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#0a0a0a"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.06,
          0.1,
        ]}
        rotation={[
          0,
          0,
          0.4,
        ]}
      >
        <boxGeometry
          args={[
            0.035,
            0.19,
            0.02,
          ]}
        />

        <meshStandardMaterial
          color="#bdbdbd"
        />
      </mesh>
    </group>
  );
}

function SsdEvidence() {
  return (
    <group
      rotation={[
        0.05,
        0.15,
        -0.08,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            0.52,
            0.1,
            1.15,
          ]}
        />

        <meshStandardMaterial
          color="#141414"
          metalness={0.62}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.055,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.34,
            0.01,
            0.75,
          ]}
        />

        <meshStandardMaterial
          color="#242424"
        />
      </mesh>

      <Text
        position={[
          0,
          0.063,
          0.12,
        ]}
        fontSize={0.055}
        color="#a6a6a6"
        anchorX="center"
        anchorY="middle"
      >
        SECURE SSD
      </Text>
    </group>
  );
}

function CameraEvidence() {
  return (
    <group>
      <mesh>
        <boxGeometry
          args={[
            0.72,
            0.48,
            0.55,
          ]}
        />

        <meshStandardMaterial
          color="#171717"
          metalness={0.25}
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          -0.31,
        ]}
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.18,
            0.18,
            0.06,
            20,
          ]}
        />

        <meshStandardMaterial
          color="#090909"
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          -0.35,
        ]}
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.08,
            0.08,
            0.07,
            20,
          ]}
        />

        <meshStandardMaterial
          color="#121212"
          emissive="#b08f0c"
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  );
}

function KeyEvidence() {
  return (
    <group
      rotation={[
        0.1,
        0.1,
        0.3,
      ]}
    >
      <mesh
        position={[
          0.2,
          0.09,
          0,
        ]}
      >
        <torusGeometry
          args={[
            0.17,
            0.045,
            12,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#8c8c8c"
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      <mesh
        position={[
          -0.16,
          0.09,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.52,
            0.06,
            0.08,
          ]}
        />

        <meshStandardMaterial
          color="#8c8c8c"
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      <mesh
        position={[
          -0.41,
          0.09,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.08,
            0.06,
            0.18,
          ]}
        />

        <meshStandardMaterial
          color="#8c8c8c"
        />
      </mesh>
    </group>
  );
}

function BinEvidence() {
  return (
    <group>
      <mesh
        position={[
          0,
          0.4,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.58,
            0.46,
            0.82,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#272727"
        />
      </mesh>

      <mesh
        position={[
          0.12,
          0.85,
          0.03,
        ]}
        rotation={[
          0.12,
          0.3,
          -0.18,
        ]}
      >
        <boxGeometry
          args={[
            0.4,
            0.03,
            0.28,
          ]}
        />

        <meshStandardMaterial
          color="#c6bea8"
        />
      </mesh>
    </group>
  );
}

function MaintenancePanelEvidence() {
  return (
    <group>
      <mesh>
        <boxGeometry
          args={[
            1.2,
            1.25,
            0.15,
          ]}
        />

        <meshStandardMaterial
          color="#202020"
          metalness={0.35}
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          -0.1,
        ]}
      >
        <boxGeometry
          args={[
            0.88,
            0.9,
            0.04,
          ]}
        />

        <meshStandardMaterial
          color="#101010"
        />
      </mesh>

      {[
        [-0.43, 0.42],
        [0.43, 0.42],
        [-0.43, -0.42],
        [0.43, -0.42],
      ].map(
        ([x, y], index) => (
          <mesh
            key={index}
            position={[
              x,
              y,
              -0.14,
            ]}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                0.035,
                0.035,
                0.03,
                16,
              ]}
            />

            <meshStandardMaterial
              color="#7d7d7d"
            />
          </mesh>
        ),
      )}

      <mesh
        position={[
          0.1,
          -0.08,
          -0.17,
        ]}
        rotation={[
          0,
          0,
          -0.35,
        ]}
      >
        <torusGeometry
          args={[
            0.24,
            0.025,
            8,
            24,
            Math.PI,
          ]}
        />

        <meshStandardMaterial
          color="#5a1a1a"
        />
      </mesh>
    </group>
  );
}

function EnvelopeEvidence() {
  return (
    <group
      rotation={[
        0,
        -0.08,
        0.12,
      ]}
    >
      <mesh>
        <boxGeometry
          args={[
            1.1,
            0.05,
            0.74,
          ]}
        />

        <meshStandardMaterial
          color="#d0c6aa"
        />
      </mesh>

      <mesh
        position={[
          0,
          0.03,
          0.02,
        ]}
      >
        <boxGeometry
          args={[
            0.28,
            0.035,
            0.1,
          ]}
        />

        <meshStandardMaterial
          color="#811b1b"
        />
      </mesh>

      <Text
        position={[
          0,
          0.055,
          0.04,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        fontSize={0.065}
        color="#26221a"
        anchorX="center"
        anchorY="middle"
      >
        EVIDENCE
      </Text>
    </group>
  );
}

function WarningTagEvidence() {
  return (
    <group>
      <mesh>
        <boxGeometry
          args={[
            0.85,
            0.08,
            1.05,
          ]}
        />

        <meshStandardMaterial
          color="#6f1616"
        />
      </mesh>

      <Text
        position={[
          0,
          0.06,
          0.12,
        ]}
        fontSize={0.11}
        color="#f1e7c4"
        anchorX="center"
        anchorY="middle"
      >
        WARNING
      </Text>
    </group>
  );
}

/* =========================================================
   MODEL SELECTOR
========================================================= */

function EvidenceModel({
  clue,
}: {
  clue: Round1Clue;
}) {
  switch (clue.id) {
    case "E-01":
      return <TerminalEvidence />;

    case "E-02":
      return (
        <PaperEvidence
          label="INCIDENT REPORT"
        />
      );

    case "E-03":
      return <BadgeEvidence />;

    case "E-04":
      return <PhoneEvidence />;

    case "E-05":
      return <AccessLogEvidence />;

    case "E-06":
      return <CctvEvidence />;

    case "E-07":
      return <CabinetEvidence />;

    case "E-08":
      return (
        <PaperEvidence
          label="TRANSFER NOTE"
        />
      );

    case "E-09":
      return <ClockEvidence />;

    case "E-10":
      return <SsdEvidence />;

    case "E-11":
      return <CameraEvidence />;

    case "E-12":
      return <KeyEvidence />;

    case "E-13":
      return <BinEvidence />;

    case "E-14":
      return <MaintenancePanelEvidence />;

    case "E-15":
      return <EnvelopeEvidence />;

    case "E-16":
      return <WarningTagEvidence />;

    default:
      return null;
  }
}

/* =========================================================
   EVIDENCE ANCHORING
========================================================= */

function getEvidencePosition(
  clue: Round1Clue,
) {
  switch (clue.id) {
    case "E-06":
      return [
        clue.position[0],
        2.75,
        -7.55,
      ] as [number, number, number];

    case "E-09":
      return [
        clue.position[0],
        3.35,
        -7.55,
      ] as [number, number, number];

    case "E-11":
      return [
        clue.position[0],
        5.15,
        clue.position[2],
      ] as [number, number, number];

    case "E-12":
      return [
        clue.position[0],
        -0.8,
        clue.position[2],
      ] as [number, number, number];

    case "E-14":
      return [
        clue.position[0],
        Math.max(
          clue.position[1],
          1.55,
        ),
        -7.55,
      ] as [number, number, number];

    default:
      return [
        clue.position[0],
        Math.max(
          clue.position[1],
          0.08,
        ),
        clue.position[2],
      ] as [number, number, number];
  }
}

/* =========================================================
   EVIDENCE OBJECT
========================================================= */

function EvidenceObject({
  clue,
  disabled,
  targeted,
  onInspect,
  onTarget,
}: {
  clue: Round1Clue;
  disabled: boolean;
  targeted: boolean;
  onInspect: (
    clue: Round1Clue,
  ) => void;
  onTarget: (
    id: string | null,
  ) => void;
}) {
  const position =
    getEvidencePosition(clue);

  return (
    <group
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation();

        if (!disabled) {
          onTarget(clue.id);
        }
      }}
      onPointerOut={(event) => {
        event.stopPropagation();

        onTarget(null);
      }}
      onClick={(event) => {
        event.stopPropagation();

        if (!disabled) {
          onInspect(clue);
        }
      }}
    >
      <group
        scale={
          targeted ? 1.03 : 1
        }
      >
        <EvidenceModel
          clue={clue}
        />

        {targeted && (
          <Html
            center
            distanceFactor={7}
            position={[
              0,
              Math.max(
                clue.size[1],
                0.55,
              ),
              0,
            ]}
            style={{
              pointerEvents:
                "none",
              whiteSpace:
                "nowrap",
            }}
          >
            <div className="bg-black/90 border border-[#f2c300]/30 px-2.5 py-1.5 text-[8px] font-black tracking-[0.18em] text-[#f2c300] shadow-lg">
              INSPECT
            </div>
          </Html>
        )}

        {targeted && (
          <mesh
            scale={1.1}
          >
            <boxGeometry
              args={[
                Math.max(
                  clue.size[0],
                  0.65,
                ),
                Math.max(
                  clue.size[1],
                  0.65,
                ),
                Math.max(
                  clue.size[2],
                  0.65,
                ),
              ]}
            />

            <meshBasicMaterial
              transparent
              opacity={0}
            />

            <Edges
              color="#f2c300"
              threshold={16}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

/* =========================================================
   ROOM
========================================================= */

function CrimeSceneRoom({
  disabled,
  targetedClue,
  onInspect,
  onTarget,
}: {
  disabled: boolean;
  targetedClue: string | null;
  onInspect: (
    clue: Round1Clue,
  ) => void;
  onTarget: (
    id: string | null,
  ) => void;
}) {
  return (
    <>
      <color
        attach="background"
        args={["#070707"]}
      />

      <ambientLight intensity={0.72} />

      <directionalLight
        position={[
          0,
          8,
          3,
        ]}
        intensity={2.15}
        color="#fff7dc"
      />

      <pointLight
        position={[
          -5,
          4,
          -3,
        ]}
        intensity={1.35}
        distance={12}
        decay={1.5}
        color="#f2c300"
      />

      <pointLight
        position={[
          0,
          4,
          1,
        ]}
        intensity={1.35}
        distance={11}
        decay={1.5}
        color="#ffffff"
      />

      <pointLight
        position={[
          6,
          4,
          -2,
        ]}
        intensity={1.15}
        distance={11}
        decay={1.5}
        color="#fff7df"
      />

      <pointLight
        position={[
          0,
          3,
          -6,
        ]}
        intensity={0.95}
        distance={10}
        decay={1.6}
        color="#ede4c3"
      />

      <CeilingLight
        position={[
          -4.8,
          5.8,
          -3,
        ]}
        warm
      />

      <CeilingLight
        position={[
          0,
          5.8,
          -3,
        ]}
      />

      <CeilingLight
        position={[
          4.8,
          5.8,
          -3,
        ]}
        warm
      />

      {/* floor */}

      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        position={[
          0,
          -1,
          0,
        ]}
      >
        <planeGeometry
          args={[
            22,
            22,
          ]}
        />

        <meshStandardMaterial
          color="#111111"
          roughness={0.94}
          metalness={0.06}
        />
      </mesh>

      <gridHelper
        args={[
          20,
          20,
          "#2c2c2c",
          "#191919",
        ]}
        position={[
          0,
          -0.985,
          0,
        ]}
      />

      {/* walls */}

      <mesh
        position={[
          0,
          3,
          -8,
        ]}
      >
        <boxGeometry
          args={[
            20,
            8,
            0.3,
          ]}
        />

        <meshStandardMaterial
          color="#111111"
          roughness={0.92}
        />
      </mesh>

      <mesh
        position={[
          -10,
          3,
          0,
        ]}
        rotation={[
          0,
          Math.PI / 2,
          0,
        ]}
      >
        <boxGeometry
          args={[
            16,
            8,
            0.3,
          ]}
        />

        <meshStandardMaterial
          color="#101010"
          roughness={0.92}
        />
      </mesh>

      <mesh
        position={[
          10,
          3,
          0,
        ]}
        rotation={[
          0,
          Math.PI / 2,
          0,
        ]}
      >
        <boxGeometry
          args={[
            16,
            8,
            0.3,
          ]}
        />

        <meshStandardMaterial
          color="#101010"
          roughness={0.92}
        />
      </mesh>

      <mesh
        position={[
          0,
          7,
          0,
        ]}
      >
        <boxGeometry
          args={[
            20,
            0.25,
            16,
          ]}
        />

        <meshStandardMaterial
          color="#0a0a0a"
        />
      </mesh>

      <WallDetails />
      <LabDoor />
      <WorkDesk />
      <OfficeChair />
      <StorageShelf />
      <InvestigationBoard />
      <SecurityMonitor />
      <WallClock />
      <WarningPanel />

      {/* non-evidence props */}

      <ProjectPhotoFrame />
      <CoffeeMug />
      <ClipboardProp />
      <FloorCableBox />

      {/* evidence */}

      {ROUND1_CLUES.map(
        (clue) => (
          <EvidenceObject
            key={clue.id}
            clue={clue}
            disabled={disabled}
            targeted={
              targetedClue ===
              clue.id
            }
            onInspect={
              onInspect
            }
            onTarget={
              onTarget
            }
          />
        ),
      )}

      <Text
        position={[
          0,
          3.7,
          -7.7,
        ]}
        fontSize={0.19}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        PROJECT: REDACTED²
      </Text>

      <Text
        position={[
          0,
          3.39,
          -7.7,
        ]}
        fontSize={0.085}
        color="#888888"
        anchorX="center"
        anchorY="middle"
      >
        RESTRICTED INVESTIGATION ENVIRONMENT
      </Text>
    </>
  );
}

/* =========================================================
   EVIDENCE MODAL
========================================================= */

function EvidenceModal({
  clue,
  progress,
  forensicLoading,
  forensicCredits,
  hintCount,
  onClose,
  onStudy,
  onForensic,
  onHint,
}: {
  clue: Round1Clue;
  progress: EvidenceProgress;
  forensicLoading: boolean;
  forensicCredits: number;
  hintCount: number;
  onClose: () => void;
  onStudy: () => void;
  onForensic: () => void;
  onHint: () => void;
}) {
  const forensicReport =
    FORENSIC_REPORTS[clue.id];

  const nextHint =
    hintCount + 1;

  const hintCost =
    nextHint <= FREE_HINTS
      ? 0
      : HINT_COST;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 bg-[#080808] rounded-2xl shadow-2xl">
        {/* sticky header fixes close button issue */}

        <div className="sticky top-0 z-20 bg-[#080808]/96 backdrop-blur-md border-b border-white/10 px-6 py-5 flex items-start justify-between gap-5">
          <div>
            <p className="text-[9px] tracking-[0.32em] text-[#f2c300]">
              EVIDENCE RECORD //{" "}
              {clue.id}
            </p>

            <h2 className="mt-2 text-xl sm:text-2xl font-black">
              {clue.title}
            </h2>

            <p className="mt-2 text-[9px] tracking-[0.18em] text-white/25">
              {clue.category}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={forensicLoading}
            aria-label="Close evidence"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-white/45 hover:text-[#f2c300] hover:bg-white/5 text-2xl transition disabled:opacity-20"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* observation */}

          <section className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
            <p className="text-[9px] tracking-[0.25em] text-white/25">
              OBSERVATION
            </p>

            <p className="mt-3 text-sm leading-7 text-white/70">
              {clue.description}
            </p>
          </section>

          {/* study */}

          <section className="mt-4 border border-[#f2c300]/15 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[9px] tracking-[0.25em] text-[#f2c300]/70">
                STUDY REPORT
              </p>

              <span className="text-[8px] tracking-widest text-[#f2c300]">
                {progress.studied
                  ? "AVAILABLE"
                  : "NOT RECORDED"}
              </span>
            </div>

            {!progress.studied ? (
              <>
                <p className="mt-3 text-xs leading-6 text-white/40">
                  Study this evidence to add the investigator
                  report to your team's shared dossier.
                </p>

                <button
                  onClick={onStudy}
                  disabled={forensicLoading}
                  className="mt-4 w-full bg-[#f2c300] text-black py-3 rounded-xl text-[10px] font-black tracking-[0.14em] hover:bg-[#ffd83b] disabled:opacity-30 transition"
                >
                  STUDY EVIDENCE
                </button>
              </>
            ) : (
              <div className="mt-4 border border-white/10 rounded-xl p-4 bg-black">
                <p className="text-sm leading-7 text-white/75">
                  {STUDY_REPORTS[clue.id] ||
                    clue.discoveryText}
                </p>
              </div>
            )}
          </section>

          {/* forensic */}

          {progress.studied &&
            clue.forensicAction !==
              "NONE" && (
              <section className="mt-4 border border-white/10 rounded-xl p-5 bg-black">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[9px] tracking-[0.25em] text-white/30">
                    FORENSIC ANALYSIS
                  </p>

                  <span className="text-[8px] tracking-widest text-white/25">
                    {progress.forensicComplete
                      ? "RESULT READY"
                      : `${forensicCredits} CREDITS`}
                  </span>
                </div>

                {!progress.forensicComplete &&
                  !forensicLoading && (
                    <>
                      <p className="mt-3 text-xs leading-6 text-white/40">
                        Forensics reveals information that
                        normal inspection cannot establish.
                        One credit is consumed when analysis begins.
                      </p>

                      <button
                        onClick={onForensic}
                        disabled={
                          forensicCredits <=
                          0
                        }
                        className="mt-4 w-full border border-[#f2c300]/25 text-[#f2c300] py-3 text-[10px] font-black tracking-[0.14em] hover:bg-[#f2c300] hover:text-black disabled:opacity-20 transition"
                      >
                        RUN FORENSIC ANALYSIS
                      </button>
                    </>
                  )}

                {forensicLoading && (
                  <div className="mt-4 border border-[#f2c300]/20 rounded-xl p-5">
                    <p className="text-[9px] tracking-[0.25em] text-[#f2c300]">
                      FORENSIC PROCESSING
                    </p>

                    <p className="mt-2 text-xs text-white/40">
                      Securing evidence and reconstructing
                      hidden information...
                    </p>

                    <div className="mt-5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full w-full bg-[#f2c300] origin-left animate-[forensicRun_8s_linear]" />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[8px] tracking-widest text-white/25">
                        PROCESSING
                      </span>

                      <span className="text-[8px] tracking-widest text-[#f2c300]">
                        8 SEC
                      </span>
                    </div>
                  </div>
                )}

                {progress.forensicComplete && (
                  <div className="mt-4 border border-[#f2c300]/15 rounded-xl p-5">
                    <p className="text-[9px] tracking-[0.25em] text-[#f2c300]/70">
                      FORENSIC RESULT
                    </p>

                    <p className="mt-3 text-sm leading-7 text-white/75">
                      {forensicReport ||
                        "Forensic result recorded in the dossier."}
                    </p>

                    <p className="mt-4 text-[8px] tracking-[0.2em] text-white/20">
                      RESULT ADDED TO SHARED DOSSIER
                    </p>
                  </div>
                )}
              </section>
            )}

          {/* hint */}

          {progress.studied &&
            !forensicLoading && (
              <section className="mt-4 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[9px] tracking-[0.25em] text-white/30">
                    INVESTIGATION HINT
                  </p>

                  <span className="text-[8px] tracking-widest text-white/25">
                    HINT {nextHint}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-6 text-white/40">
                  Hints provide small directional help. They do
                  not reveal the complete answer.
                </p>

                <button
                  onClick={onHint}
                  className="mt-4 px-4 py-2 border border-[#f2c300]/20 text-[#f2c300] text-[10px] font-black tracking-[0.12em] hover:bg-[#f2c300] hover:text-black transition"
                >
                  USE HINT{" "}
                  {hintCost === 0
                    ? "(FREE)"
                    : `(-${HINT_COST})`}
                </button>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DOSSIER
========================================================= */

function DossierPanel({
  progress,
  events,
  team,
  onClose,
}: {
  progress: Record<
    string,
    EvidenceProgress
  >;

  events: ActivityEvent[];
  team: Team | null;

  onClose: () => void;
}) {
  const studied =
    ROUND1_CLUES.filter(
      (clue) =>
        progress[clue.id]?.studied,
    );

  return (
    <div className="fixed inset-0 z-[260] bg-black/80">
      <button
        onClick={onClose}
        className="absolute inset-0"
        aria-label="Close dossier"
      />

      <aside className="relative z-10 h-full w-full max-w-xl bg-[#080808] border-r border-white/10 overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#080808]/95 backdrop-blur border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
              INVESTIGATION DOSSIER
            </p>

            <h2 className="mt-2 text-xl font-black">
              {team?.team_name ||
                "INVESTIGATION TEAM"}
            </h2>

            <p className="mt-1 text-[9px] tracking-widest text-white/20">
              {team?.team_code ||
                "TEST01"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg text-white/40 hover:text-[#f2c300] hover:bg-white/5 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <section>
            <p className="text-[9px] tracking-[0.28em] text-white/25">
              STUDY REPORTS
            </p>

            <div className="mt-3 space-y-3">
              {studied.length === 0 ? (
                <div className="border border-white/10 rounded-xl p-5">
                  <p className="text-xs text-white/25">
                    No evidence has been studied yet.
                  </p>
                </div>
              ) : (
                studied.map((clue) => (
                  <div
                    key={clue.id}
                    className="border border-white/10 rounded-xl p-5 bg-white/[0.015]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] tracking-widest text-[#f2c300]">
                          {clue.id}
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {clue.title}
                        </p>
                      </div>

                      {progress[
                        clue.id
                      ]?.forensicComplete && (
                        <span className="text-[8px] tracking-widest text-[#f2c300]">
                          FORENSIC
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-white/65">
                      {STUDY_REPORTS[
                        clue.id
                      ] ||
                        clue.discoveryText}
                    </p>

                    {progress[
                      clue.id
                    ]?.forensicComplete &&
                      FORENSIC_REPORTS[
                        clue.id
                      ] && (
                        <div className="mt-4 border-t border-white/5 pt-4">
                          <p className="text-[8px] tracking-[0.2em] text-white/20">
                            FORENSIC RESULT
                          </p>

                          <p className="mt-2 text-xs leading-6 text-white/45">
                            {
                              FORENSIC_REPORTS[
                                clue.id
                              ]
                            }
                          </p>
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-8">
            <p className="text-[9px] tracking-[0.28em] text-white/25">
              TEAM ACTIVITY
            </p>

            <div className="mt-3 space-y-2">
              {events
                .slice(0, 20)
                .map(
                  (event) => (
                    <div
                      key={event.id}
                      className="border border-white/5 rounded-lg p-3"
                    >
                      <p className="text-xs text-white/55">
                        {event.text}
                      </p>

                      <p className="mt-1 text-[8px] text-white/20">
                        {event.at}
                      </p>
                    </div>
                  ),
                )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* =========================================================
   PERSONNEL
========================================================= */

function PersonnelPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const investigationNotes: Record<
    string,
    string
  > = {
    "P-01":
      "Verify project authority, transfer approvals and technical knowledge.",
    "P-02":
      "Compare security activity with actual evidence of physical presence.",
    "P-03":
      "Verify knowledge of emergency transfer infrastructure.",
    "P-04":
      "Check when system irregularities were detected.",
    "P-05":
      "Verify which information genuinely connects the contractor to the incident.",
    "P-06":
      "Identity remains unresolved. Correlate communications with the technical timeline.",
  };

  return (
    <div className="fixed inset-0 z-[260] bg-black/80">
      <button
        onClick={onClose}
        className="absolute inset-0"
        aria-label="Close personnel"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-[#080808] border-l border-white/10 overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#080808]/95 backdrop-blur border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
              PERSONNEL FILE
            </p>

            <h2 className="mt-2 text-xl font-black">
              PERSONS OF INTEREST
            </h2>

            <p className="mt-2 text-[10px] text-white/30">
              Reference information. Determine relevance from
              evidence.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg text-white/40 hover:text-[#f2c300] text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-3">
          {ROUND1_CHARACTERS.map(
            (person) => (
              <div
                key={person.id}
                className="border border-white/10 rounded-xl p-5 bg-white/[0.015]"
              >
                <p className="text-[9px] tracking-widest text-[#f2c300]">
                  {person.id}
                </p>

                <h3 className="mt-2 text-base font-black">
                  {person.name}
                </h3>

                <p className="mt-1 text-[8px] tracking-[0.2em] text-white/25">
                  {person.role}
                </p>

                <p className="mt-4 text-xs leading-6 text-white/50">
                  {person.description}
                </p>

                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className="text-[8px] tracking-[0.25em] text-white/20">
                    INVESTIGATIVE ANGLE
                  </p>

                  <p className="mt-2 text-xs leading-6 text-white/40">
                    {investigationNotes[
                      person.id
                    ] ||
                      "Compare this person against the evidence timeline."}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </aside>
    </div>
  );
}

/* =========================================================
   CHAT
========================================================= */

function ChatPanel({
  teamName,
  messages,
  value,
  onChange,
  onSend,
  onClose,
}: {
  teamName: string;
  messages: string[];
  value: string;
  onChange: (
    value: string,
  ) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-5 bottom-20 z-[95] w-[calc(100vw-2.5rem)] max-w-[390px] border border-white/10 rounded-2xl bg-[#090909]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
            TEAM CHANNEL
          </p>

          <p className="mt-1 text-sm font-bold">
            {teamName}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-white/30 hover:text-white text-xl"
        >
          ×
        </button>
      </div>

      <div className="h-60 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-white/20">
              Team channel ready.
            </p>
          </div>
        ) : (
          messages.map(
            (message, index) => (
              <div
                key={`${message}-${index}`}
                className="border border-white/5 rounded-lg px-3 py-2 bg-white/[0.02]"
              >
                <p className="text-xs text-white/65">
                  {message}
                </p>
              </div>
            )
          )
        )}
      </div>

      <div className="border-t border-white/10 p-3 flex gap-2">
        <input
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key ===
              "Enter"
            ) {
              onSend();
            }
          }}
          placeholder="Message your team..."
          className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#f2c300]/40"
        />

        <button
          onClick={onSend}
          className="px-4 bg-[#f2c300] text-black rounded-lg text-xs font-black hover:bg-[#ffd83b]"
        >
          SEND
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   FINAL MCQ PANEL
========================================================= */

function FinalMCQPanel({
  questions,
  answers,
  onAnswer,
  onSubmit,
  onOpenStudyReport,
  submitting,
  timeRemaining,
}: {
  questions: MCQ[];
  answers: Record<string, string>;
  onAnswer: (
    questionId: string,
    answer: string,
  ) => void;
  onSubmit: () => void;
  onOpenStudyReport: () => void;
  submitting: boolean;
  timeRemaining: number;
}) {
  const answeredCount =
    questions.filter(
      (question) =>
        Boolean(
          answers[question.id],
        ),
    ).length;

  return (
    <div className="fixed inset-0 z-[220] bg-black/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex justify-center p-5 sm:p-8">
        <div className="w-full max-w-3xl">
          <div className="border border-white/10 bg-[#090909] rounded-2xl overflow-hidden shadow-2xl">
            <div className="border-b border-white/10 px-6 py-6">
              <p className="text-[9px] tracking-[0.35em] text-[#f2c300]">
                ROUND 01 // FINAL DEDUCTION
              </p>

              <h2 className="mt-3 text-3xl font-black">
                EVIDENCE CHECK
              </h2>

              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm leading-7 text-white/45">
                  Five questions have been selected from the investigation
                  question pool. Use your recovered study report whenever
                  you need to verify an answer.
                </p>

                <button
                  type="button"
                  onClick={onOpenStudyReport}
                  className="shrink-0 border border-[#f2c300]/30 text-[#f2c300] px-4 py-3 text-[9px] font-black tracking-[0.13em] hover:bg-[#f2c300] hover:text-black transition"
                >
                  STUDY REPORT
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] tracking-[0.2em] text-white/25">
                    ANSWERED
                  </span>
                  <span className="ml-2 text-sm font-black text-[#f2c300]">
                    {answeredCount}/{questions.length}
                  </span>
                </div>

                <span className="text-[9px] tracking-[0.2em] text-white/25">
                  TIME {formatTime(timeRemaining)}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-[9px] tracking-[0.2em] text-white/25">
                  ANSWERED
                </span>

                <span className="text-sm font-black text-[#f2c300]">
                  {answeredCount}/{questions.length}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {questions.map(
                (question, index) => (
                  <section
                    key={question.id}
                    className="border border-white/10 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[9px] tracking-widest text-[#f2c300]">
                          QUESTION{" "}
                          {index + 1}
                        </p>

                        <h3 className="mt-2 text-base sm:text-lg font-bold leading-6">
                          {question.question}
                        </h3>
                      </div>

                      <span className="text-[8px] tracking-widest text-white/20 shrink-0">
                        {question.category}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {question.options.map(
                        (option) => {
                          const selected =
                            answers[
                              question.id
                            ] === option;

                          return (
                            <button
                              key={option}
                              onClick={() =>
                                onAnswer(
                                  question.id,
                                  option,
                                )
                              }
                              disabled={submitting}
                              className={`w-full text-left border rounded-lg px-4 py-3 text-xs transition ${
                                selected
                                  ? "border-[#f2c300]/40 bg-[#f2c300]/10 text-white"
                                  : "border-white/10 text-white/50 hover:text-white hover:border-white/20"
                              }`}
                            >
                              <span className="mr-3 text-white/20">
                                {String.fromCharCode(
                                  65 +
                                    question.options.indexOf(
                                      option,
                                    ),
                                )}
                              </span>

                              {option}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <p className="mt-4 text-[8px] tracking-[0.15em] text-white/15">
                      ANSWER IS RECOVERABLE FROM YOUR INVESTIGATION
                      REPORTS
                    </p>
                  </section>
                ),
              )}

              <div className="border border-[#f2c300]/10 bg-[#f2c300]/[0.03] rounded-xl p-5">
                <p className="text-xs leading-6 text-white/45">
                  No negative marking. Correct answers earn points.
                  Wrong or unanswered questions earn zero.
                </p>
              </div>

              <button
                onClick={onSubmit}
                disabled={submitting}
                className="w-full bg-[#f2c300] text-black py-4 rounded-xl font-black text-xs tracking-[0.16em] hover:bg-[#ffd83b] disabled:opacity-40 transition"
              >
                {submitting ? "RECORDING..." : "SUBMIT FINAL MCQ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Round1Page() {
  const router = useRouter();

  const [team, setTeam] =
    useState<Team | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [timeRemaining, setTimeRemaining] =
    useState(ROUND_DURATION);

  const [score, setScore] =
    useState(0);

  const [progress, setProgress] =
    useState<
      Record<
        string,
        EvidenceProgress
      >
    >(createEmptyProgress());

  const [selectedClue, setSelectedClue] =
    useState<Round1Clue | null>(
      null,
    );

  const [targetedClue, setTargetedClue] =
    useState<string | null>(
      null,
    );

  const [hintCount, setHintCount] =
    useState(0);

  const [hintModal, setHintModal] =
    useState<{
      title: string;
      text: string;
      cost: number;
    } | null>(null);

  const [forensicCredits, setForensicCredits] =
    useState(
      FORENSIC_CREDITS,
    );

  const [forensicLoadingId, setForensicLoadingId] =
    useState<string | null>(
      null,
    );

  const [events, setEvents] =
    useState<ActivityEvent[]>(
      [],
    );

  const [chatMessages, setChatMessages] =
    useState<string[]>(
      [],
    );

  const [chatValue, setChatValue] =
    useState("");

  const [dossierOpen, setDossierOpen] =
    useState(false);

  const [peopleOpen, setPeopleOpen] =
    useState(false);

  const [chatOpen, setChatOpen] =
    useState(false);

  const [sceneActive, setSceneActive] =
    useState(false);

  const [roundFinished, setRoundFinished] =
    useState(false);

  const [mcqStarted, setMcqStarted] =
    useState(false);

  const [mcqTimeRemaining, setMcqTimeRemaining] =
    useState(MCQ_DURATION_SECONDS);

  const [mcqSubmitting, setMcqSubmitting] =
    useState(false);

  const [individualContributions, setIndividualContributions] =
    useState<Record<string, MemberContribution>>({});

  const [currentUserEmail, setCurrentUserEmail] =
    useState("");

  const [currentUserName, setCurrentUserName] =
    useState("INVESTIGATOR");

  const [mcqDossierOpen, setMcqDossierOpen] =
    useState(false);

  const [finalQuestions, setFinalQuestions] =
    useState<MCQ[]>([]);

  const [finalAnswers, setFinalAnswers] =
    useState<Record<
      string,
      string
    >>({});

  const [
    finalSubmitted,
    setFinalSubmitted,
  ] = useState(false);

  const [
    earlyBonusAwarded,
    setEarlyBonusAwarded,
  ] = useState(false);

  const [
    noHintBonusAwarded,
    setNoHintBonusAwarded,
  ] = useState(false);

  const channelRef =
    useRef<ReturnType<
      typeof supabase.channel
    > | null>(null);

  const forensicTimerRef =
    useRef<number | null>(null);

  /* =======================================================
     TEAM LOAD
  ======================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadTeam() {
      try {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          router.replace(
            "/login",
          );
          return;
        }

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_my_team",
          );

        if (error) {
          console.error(
            "Round 1 team lookup:",
            error,
          );
        }

        /*
         * Current testing mode:
         * if the actual team isn't returned, use a local test team.
         */
        const testTeam: Team = {
          has_team: true,
          team_id:
            "TEST-ROUND1",
          team_code:
            "TEST01",
          team_name:
            "TEST INVESTIGATION TEAM",
          case_code:
            "BLACKBOX",
          current_round:
            1,
          status:
            "LOCKED",
          members: [
            {
              name:
                user.user_metadata
                  ?.full_name ||
                "TEST PLAYER",
              email:
                user.email ??
                null,
            },
          ],
        };

        if (!mounted) {
          return;
        }

        const resolvedTeam =
          data?.has_team
            ? (data as Team)
            : testTeam;

        setTeam(resolvedTeam);
        setCurrentUserEmail(user.email || "");
        setCurrentUserName(
          user.user_metadata?.full_name ||
          "INVESTIGATOR",
        );
        seedTeamMembers(resolvedTeam);
        ensureContributionMember(
          user.email || "",
          user.user_metadata?.full_name ||
            "INVESTIGATOR",
        );

        await loadPersistedContributions(
          resolvedTeam.team_id || "",
        );

        setEvents([
          {
            id: `${Date.now()}`,
            text:
              "Round 1 investigation initialized.",
            at: currentClock(),
          },
        ]);
      } catch (error) {
        console.error(
          "Round 1 load error:",
          error,
        );

        if (mounted) {
          setTeam({
            has_team: true,
            team_id:
              "TEST-ROUND1",
            team_code:
              "TEST01",
            team_name:
              "TEST INVESTIGATION TEAM",
            case_code:
              "BLACKBOX",
            current_round:
              1,
            status:
              "LOCKED",
            members: [],
          });

          setEvents([
            {
              id: `${Date.now()}`,
              text:
                "Round 1 opened in testing mode.",
              at: currentClock(),
            },
          ]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTeam();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* =======================================================
     CONTRIBUTION HELPERS
     Persisted in Supabase for real teams.
     TEST-ROUND1 intentionally remains local.
  ======================================================== */

  const localContribution = (
    email: string,
    name: string,
    kind: ContributionKind,
    units: number,
  ) => {
    if (!email || !units) return;

    setIndividualContributions((current) => {
      const previous =
        current[email] || {
          name: name || "INVESTIGATOR",
          email,
          units: 0,
          discoveries: 0,
          studies: 0,
          forensics: 0,
        };

      return {
        ...current,
        [email]: {
          ...previous,
          name: name || previous.name,
          units: previous.units + units,
          discoveries:
            previous.discoveries +
            (kind === "DISCOVER" ? 1 : 0),
          studies:
            previous.studies +
            (kind === "STUDY" ? 1 : 0),
          forensics:
            previous.forensics +
            (kind === "FORENSIC_COMPLETE" ? 1 : 0),
        },
      };
    });
  };

  const loadPersistedContributions = async (teamId: string) => {
    if (!isRealTeamId(teamId)) {
      return;
    }

    const { data, error } = await supabase.rpc(
      "round1_get_member_contributions",
      {
        p_team_id: teamId,
      },
    );

    if (error) {
      console.error(
        "Round 1 contribution load failed:",
        error,
      );
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    setIndividualContributions((current) => {
      const next = { ...current };

      rows.forEach((row) => {
        if (!row?.member_email) return;

        next[row.member_email] = {
          name: row.member_name || "INVESTIGATOR",
          email: row.member_email,
          units: Number(row.units || 0),
          discoveries: Number(row.discoveries || 0),
          studies: Number(row.studies || 0),
          forensics: Number(row.forensics || 0),
        };
      });

      return next;
    });
  };

  const persistContribution = async (
    email: string,
    name: string,
    kind: ContributionKind,
    units: number,
  ) => {
    if (
      !team?.team_id ||
      !isRealTeamId(team.team_id) ||
      !email ||
      !units
    ) {
      return;
    }

    const { data, error } = await supabase.rpc(
      "round1_record_member_contribution",
      {
        p_team_id: team.team_id,
        p_kind: kind,
        p_units: units,
        p_member_name: name || "INVESTIGATOR",
      },
    );

    if (error) {
      console.error(
        "Round 1 contribution save failed:",
        error,
      );
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row?.member_email) {
      return;
    }

    setIndividualContributions((current) => ({
      ...current,
      [row.member_email]: {
        name: row.member_name || name || "INVESTIGATOR",
        email: row.member_email,
        units: Number(row.units || 0),
        discoveries: Number(row.discoveries || 0),
        studies: Number(row.studies || 0),
        forensics: Number(row.forensics || 0),
      },
    }));
  };

  const recordContribution = (
    email: string,
    name: string,
    kind: ContributionKind,
    units: number,
  ) => {
    localContribution(
      email,
      name,
      kind,
      units,
    );

    void persistContribution(
      email,
      name,
      kind,
      units,
    );
  };

  const ensureContributionMember = (
    email: string,
    name: string,
  ) => {
    if (!email) return;

    setIndividualContributions((current) => {
      if (current[email]) return current;

      return {
        ...current,
        [email]: {
          name: name || "INVESTIGATOR",
          email,
          units: 0,
          discoveries: 0,
          studies: 0,
          forensics: 0,
        },
      };
    });
  };

  const seedTeamMembers = (loadedTeam: Team) => {
    (loadedTeam.members || []).forEach((member) => {
      if (member.email) {
        ensureContributionMember(
          member.email,
          member.name,
        );
      }
    });
  };

  /* =======================================================
     REALTIME
  ======================================================== */

  useEffect(() => {
    if (!team?.team_id) {
      return;
    }

    const channel =
      supabase.channel(
        `round1:${team.team_id}`,
        {
          config: {
            broadcast: {
              self: false,
            },
          },
        },
      );

    channel
      .on(
        "broadcast",
        {
          event:
            "round1_activity",
        },
        ({ payload }) => {
          if (!payload?.text) {
            return;
          }

          if (
            payload.actorEmail &&
            payload.contributionKind &&
            team?.team_id
          ) {
            void loadPersistedContributions(
              team.team_id,
            );
          }

          if (
            payload.clueId &&
            payload.action === "DISCOVER"
          ) {
            setProgress((current) => ({
              ...current,
              [payload.clueId]: {
                ...(current[payload.clueId] || {
                  discovered: false,
                  studied: false,
                  forensicComplete: false,
                }),
                discovered: true,
              },
            }));
          }

          if (
            payload.clueId &&
            payload.action === "STUDY"
          ) {
            setProgress((current) => ({
              ...current,
              [payload.clueId]: {
                ...(current[payload.clueId] || {
                  discovered: true,
                  studied: false,
                  forensicComplete: false,
                }),
                discovered: true,
                studied: true,
              },
            }));
          }

          if (
            payload.clueId &&
            payload.action === "FORENSIC_COMPLETE"
          ) {
            setProgress((current) => ({
              ...current,
              [payload.clueId]: {
                ...(current[payload.clueId] || {
                  discovered: true,
                  studied: true,
                  forensicComplete: false,
                }),
                discovered: true,
                studied: true,
                forensicComplete: true,
              },
            }));
          }

          setEvents(
            (current) => [
              {
                id:
                  `${Date.now()}-${Math.random()}`,
                text:
                  payload.text,
                at:
                  payload.at ||
                  currentClock(),
                remote:
                  true,
                actorEmail:
                  payload.actorEmail,
                actorName:
                  payload.actorName,
                contributionKind:
                  payload.contributionKind,
                contributionUnits:
                  Number(payload.contributionUnits || 0),
                clueId:
                  payload.clueId,
              },
              ...current,
            ],
          );
        },
      )
      .on(
        "broadcast",
        {
          event:
            "round1_chat",
        },
        ({ payload }) => {
          if (!payload?.message) {
            return;
          }

          setChatMessages(
            (current) => [
              ...current,
              payload.message,
            ],
          );
        },
      )
      .subscribe();

    channelRef.current =
      channel;

    return () => {
      channel.unsubscribe();

      channelRef.current =
        null;
    };
  }, [team?.team_id]);

  /* =======================================================
     ACTIVITY
  ======================================================== */

  const broadcastActivity =
    async (
      text: string,
      details?: {
        action?: "DISCOVER" | "STUDY" | "FORENSIC_COMPLETE";
        clueId?: string;
        contributionKind?: ContributionKind;
        contributionUnits?: number;
      },
    ) => {
      const event: ActivityEvent = {
        id:
          `${Date.now()}-${Math.random()}`,
        text,
        at: currentClock(),
        actorEmail: currentUserEmail,
        actorName: currentUserName,
        contributionKind:
          details?.contributionKind,
        contributionUnits:
          details?.contributionUnits || 0,
        clueId: details?.clueId,
      };

      setEvents((current) => [
        event,
        ...current,
      ]);

      if (
        details?.contributionKind &&
        details.contributionUnits
      ) {
        recordContribution(
          currentUserEmail,
          currentUserName,
          details.contributionKind,
          details.contributionUnits,
        );
      }

      await channelRef.current?.send({
        type: "broadcast",
        event: "round1_activity",
        payload: {
          ...details,
          text,
          at: event.at,
          actorEmail: currentUserEmail,
          actorName: currentUserName,
        },
      });
    };

  /* =======================================================
     TIMER / PHASE CONTROL
  ======================================================== */

  useEffect(() => {
    if (
      loading ||
      !sceneActive ||
      roundFinished ||
      mcqStarted
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setTimeRemaining(0);
          setMcqStarted(true);
          setMcqTimeRemaining(MCQ_DURATION_SECONDS);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    loading,
    sceneActive,
    roundFinished,
    mcqStarted,
  ]);

  /* =======================================================
     FORENSIC CLEANUP
  ======================================================== */

  useEffect(() => {
    return () => {
      if (
        forensicTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          forensicTimerRef.current,
        );
      }
    };
  }, []);

  /* =======================================================
     DERIVED
  ======================================================== */

  const discoveredCount =
    useMemo(
      () =>
        ROUND1_CLUES.filter(
          (clue) =>
            progress[
              clue.id
            ]?.discovered,
        ).length,
      [progress],
    );

  const studiedCount =
    useMemo(
      () =>
        ROUND1_CLUES.filter(
          (clue) =>
            progress[
              clue.id
            ]?.studied,
        ).length,
      [progress],
    );

  const forensicCount =
    useMemo(
      () =>
        ROUND1_CLUES.filter(
          (clue) =>
            progress[
              clue.id
            ]?.forensicComplete,
        ).length,
      [progress],
    );

  const coreStudiedCount =
    useMemo(
      () =>
        CORE_EVIDENCE.filter(
          (id) =>
            progress[
              id
            ]?.studied,
        ).length,
      [progress],
    );

  const elapsedSeconds =
    ROUND_DURATION -
    timeRemaining;

  const displayTimeRemaining =
    mcqStarted
      ? mcqTimeRemaining
      : timeRemaining;

  const mcqEarlyAvailable =
    sceneActive &&
    !mcqStarted &&
    elapsedSeconds >= MCQ_EARLY_UNLOCK_SECONDS &&
    elapsedSeconds < INVESTIGATION_DEADLINE_SECONDS;

  const investigationClosed =
    elapsedSeconds >= INVESTIGATION_DEADLINE_SECONDS ||
    mcqStarted ||
    roundFinished;

  const timerCritical =
    displayTimeRemaining <=
    5 * 60;

  /* =======================================================
     SCORE
  ======================================================== */

  const addScore = (
    amount: number,
  ) => {
    setScore(
      (current) =>
        Math.min(
          80,
          Math.max(
            0,
            current + amount,
          ),
        ),
    );
  };

  const deductScore = (
    amount: number,
  ) => {
    setScore(
      (current) =>
        Math.min(
          80,
          Math.max(
            0,
            current - amount,
          ),
        ),
    );
  };

  /* =======================================================
     DISCOVER
  ======================================================== */

  const discoverClue =
    async (
      clue: Round1Clue,
    ) => {
      if (
        investigationClosed ||
        progress[
          clue.id
        ]?.discovered
      ) {
        return;
      }

      setProgress(
        (current) => ({
          ...current,
          [clue.id]: {
            ...(current[
              clue.id
            ] || {
              discovered:
                false,
              studied:
                false,
              forensicComplete:
                false,
            }),
            discovered:
              true,
          },
        }),
      );

      await broadcastActivity(
        `${clue.id} discovered by ${currentUserName}.`,
        {
          action: "DISCOVER",
          clueId: clue.id,
          contributionKind: "DISCOVER",
          contributionUnits: 1,
        },
      );
    };

  /* =======================================================
     STUDY
  ======================================================== */

  const studyClue =
    async (
      clue: Round1Clue,
    ) => {
      if (
        investigationClosed ||
        progress[
          clue.id
        ]?.studied
      ) {
        return;
      }

      setProgress(
        (current) => ({
          ...current,
          [clue.id]: {
            ...(current[
              clue.id
            ] || {
              discovered:
                true,
              studied:
                false,
              forensicComplete:
                false,
            }),
            discovered:
              true,
            studied:
              true,
          },
        }),
      );

      const points =
        EVIDENCE_SCORE[
          clue.id
        ] || 0;

      if (points > 0) {
        addScore(points);
      }

      await broadcastActivity(
        points > 0
          ? `${clue.id} studied by ${currentUserName}. Investigation value recorded.`
          : `${clue.id} studied by ${currentUserName}.`,
        {
          action: "STUDY",
          clueId: clue.id,
          contributionKind: "STUDY",
          contributionUnits: 2,
        },
      );
    };

  /* =======================================================
     FORENSIC
  ======================================================== */

  const runForensic =
    async (
      clue: Round1Clue,
    ) => {
      if (
        investigationClosed ||
        forensicCredits <=
          0 ||
        forensicLoadingId ||
        clue.forensicAction ===
          "NONE" ||
        !progress[
          clue.id
        ]?.studied ||
        progress[
          clue.id
        ]?.forensicComplete
      ) {
        return;
      }

      setForensicCredits(
        (current) =>
          current - 1,
      );

      setForensicLoadingId(
        clue.id,
      );

      await broadcastActivity(
        `Forensic analysis started on ${clue.id}.`,
      );

      forensicTimerRef.current =
        window.setTimeout(
          async () => {
            setProgress(
              (current) => ({
                ...current,
                [clue.id]: {
                  ...current[
                    clue.id
                  ],
                  forensicComplete:
                    true,
                },
              }),
            );

            setForensicLoadingId(
              null,
            );

            forensicTimerRef.current =
              null;

            await broadcastActivity(
              `Forensic result recovered for ${clue.id} by ${currentUserName}.`,
              {
                action: "FORENSIC_COMPLETE",
                clueId: clue.id,
                contributionKind: "FORENSIC_COMPLETE",
                contributionUnits: 2,
              },
            );
          },
          FORENSIC_PROCESSING_SECONDS *
            1000,
        );
    };

  /* =======================================================
     HINT
  ======================================================== */

  const useHint =
    async (
      clue: Round1Clue,
    ) => {
      if (investigationClosed) {
        return;
      }

      const nextHint =
        hintCount + 1;

      const cost =
        nextHint <=
        FREE_HINTS
          ? 0
          : HINT_COST;

      if (cost > 0) {
        deductScore(cost);
      }

      setHintCount(
        nextHint,
      );

      const hintList =
        HINTS[
          clue.id
        ] || [
          "Review the strongest evidence already collected.",
          "Compare this item with another independently recorded clue.",
        ];

      const text =
        nextHint === 1
          ? hintList[0]
          : nextHint === 2
            ? hintList[1]
            : "Compare your strongest time-stamped evidence before making a conclusion.";

      setHintModal({
        title:
          cost === 0
            ? `HINT ${nextHint}`
            : `HINT ${nextHint} // -${cost}`,
        text,
        cost,
      });

      await broadcastActivity(
        `Team used Hint ${nextHint}${
          cost
            ? ` (-${cost} points)`
            : " (FREE)"
        }.`,
      );
    };

  /* =======================================================
     EARLY BONUS
     4 / 5 CORE ITEMS BY 20 MINUTES
  ======================================================== */

  useEffect(() => {
    if (
      earlyBonusAwarded ||
      !sceneActive ||
      elapsedSeconds > EARLY_CUTOFF_SECONDS ||
      coreStudiedCount < 4
    ) {
      return;
    }

    setEarlyBonusAwarded(true);

    addScore(EARLY_BONUS_POINTS);

    void broadcastActivity(
      "EARLY INVESTIGATION BONUS +10 // 4 OF 5 CORE EVIDENCE STUDIED WITHIN 20 MINUTES.",
    );
  }, [
    elapsedSeconds,
    coreStudiedCount,
    earlyBonusAwarded,
    sceneActive,
  ]);

  /* =======================================================
     TEAM EFFICIENCY + DISCIPLINE
  ======================================================== */

  const teamMembers =
    (team?.members || []).filter(
      (member): member is { name: string; email: string } =>
        Boolean(member.email),
    );

  const normalizedMembers =
    teamMembers.length > 0
      ? teamMembers
      : currentUserEmail
        ? [
            {
              name: currentUserName,
              email: currentUserEmail,
            },
          ]
        : [];

  const teamEfficiencyScore = useMemo(() => {
    const memberCount = Math.max(
      1,
      normalizedMembers.length,
    );

    const contributionValues =
      normalizedMembers.map(
        (member) =>
          individualContributions[
            member.email
          ]?.units || 0,
      );

    const totalUnits =
      contributionValues.reduce(
        (sum, units) => sum + units,
        0,
      );

    const activeMembers =
      contributionValues.filter(
        (units) => units > 0,
      ).length;

    const averageUnits =
      totalUnits / memberCount;

    const volumeFactor =
      Math.min(1, averageUnits / 10);

    const coverageFactor =
      0.5 +
      0.5 *
        (activeMembers / memberCount);

    return Math.min(
      MAX_TEAM_EFFICIENCY_SCORE,
      Math.round(
        MAX_TEAM_EFFICIENCY_SCORE *
          volumeFactor *
          coverageFactor,
      ),
    );
  }, [
    normalizedMembers,
    individualContributions,
  ]);

  const forensicStrategyBonus =
    forensicCount >= 1 &&
    forensicCount <= 4
      ? 5
      : 0;

  const disciplineScore = Math.min(
    MAX_DISCIPLINE_SCORE,
    (hintCount === 0 ? 5 : 0) +
      forensicStrategyBonus,
  );

  const teamSeed = useMemo(() => {
    return (
      team?.team_code
        ?.split("")
        .reduce(
          (sum, char, index) =>
            sum +
            char.charCodeAt(0) *
              (index + 1),
          0,
        ) || 1
    );
  }, [team?.team_code]);

  const deterministicShuffle = <T,>(
    input: T[],
    seedStart: number,
  ) => {
    const output = [...input];
    let seed = seedStart || 1;

    for (
      let i = output.length - 1;
      i > 0;
      i -= 1
    ) {
      seed =
        (seed * 1664525 +
          1013904223) >>> 0;

      const j = seed % (i + 1);

      [output[i], output[j]] = [
        output[j],
        output[i],
      ];
    }

    return output;
  };

  /* =======================================================
     PICK FIVE FAIR QUESTIONS
  ======================================================== */

  useEffect(() => {
    if (
      !mcqStarted ||
      finalQuestions.length > 0
    ) {
      return;
    }

    const categories: QuestionCategory[] =
      [
        "TIME",
        "PEOPLE",
        "LOCATION",
        "DIGITAL",
        "EVENT",
      ];

    const selection =
      categories.map(
        (category, index) => {
          const candidates =
            QUESTION_POOL.filter(
              (question) =>
                question.category ===
                category,
            );

          const selectedIndex =
            (teamSeed + index * 17) %
            candidates.length;

          const selected =
            candidates[selectedIndex];

          return {
            ...selected,
            options:
              deterministicShuffle(
                selected.options,
                teamSeed + index * 97,
              ),
          };
        },
      );

    const scrambledQuestions =
      deterministicShuffle(
        selection,
        teamSeed + 701,
      );

    setFinalQuestions(
      scrambledQuestions,
    );
  }, [
    mcqStarted,
    finalQuestions.length,
    teamSeed,
  ]);

  /* =======================================================
     FINAL MCQ ANSWER
  ======================================================== */

  const setFinalAnswer =
    (
      questionId: string,
      answer: string,
    ) => {
      setFinalAnswers(
        (current) => ({
          ...current,
          [questionId]:
            answer,
        }),
      );
    };

  /* =======================================================
     FINAL MCQ SUBMIT
     4 points each = 20 max.
  ======================================================== */

  const submitFinalDeduction =
    async () => {
      if (
        finalSubmitted ||
        mcqSubmitting ||
        finalQuestions.length !== 5
      ) {
        return;
      }

      setMcqSubmitting(true);

      let correct = 0;

      finalQuestions.forEach(
        (question) => {
          if (
            finalAnswers[question.id] ===
            question.answer
          ) {
            correct += 1;
          }
        },
      );

      const evidenceScore =
        ROUND1_CLUES.reduce(
          (total, clue) =>
            total +
            (progress[clue.id]?.studied
              ? EVIDENCE_SCORE[clue.id] || 0
              : 0),
          0,
        );

      const cappedEvidence =
        Math.min(
          MAX_EVIDENCE_SCORE,
          evidenceScore,
        );

      const speedScore =
        earlyBonusAwarded
          ? MAX_SPEED_SCORE
          : 0;

      const mcqScore =
        Math.min(
          MAX_MCQ_SCORE,
          correct * 4,
        );

      const hintPenalty =
        Math.max(
          0,
          hintCount - FREE_HINTS,
        ) * HINT_COST;

      const finalScore =
        Math.max(
          0,
          Math.min(
            100,
            cappedEvidence +
              teamEfficiencyScore +
              speedScore +
              mcqScore +
              disciplineScore -
              hintPenalty,
          ),
        );

      setScore(finalScore);
      setFinalSubmitted(true);
      setRoundFinished(true);

      await broadcastActivity(
        `Final MCQ submitted. ${correct}/5 correct. Round 1 score: ${finalScore}/100.`,
      );

      setMcqSubmitting(false);
    };

  useEffect(() => {
    if (mcqStarted) {
      setSelectedClue(null);
    }
  }, [mcqStarted]);

  useEffect(() => {
    if (
      !mcqStarted ||
      finalSubmitted ||
      roundFinished
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setMcqTimeRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setMcqTimeRemaining(0);
          setRoundFinished(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    mcqStarted,
    finalSubmitted,
    roundFinished,
  ]);

  useEffect(() => {
    if (
      !mcqStarted ||
      !roundFinished ||
      finalSubmitted ||
      finalQuestions.length !== 5
    ) {
      return;
    }

    void submitFinalDeduction();
  }, [
    mcqStarted,
    roundFinished,
    finalSubmitted,
    finalQuestions.length,
  ]);

  /* =======================================================
     START MCQ EARLY
  ======================================================== */

  const startMCQEarly = async () => {
    if (!mcqEarlyAvailable) {
      return;
    }

    setMcqStarted(true);
    setMcqTimeRemaining(MCQ_DURATION_SECONDS);
    setSelectedClue(null);

    await broadcastActivity(
      "Team finished investigation early and opened the final MCQ.",
    );
  };

  /* =======================================================
     CHAT
  ======================================================== */

  const sendChat =
    async () => {
      const text =
        chatValue.trim();

      if (!text) {
        return;
      }

      const message =
        `YOU: ${text}`;

      setChatMessages(
        (current) => [
          ...current,
          message,
        ],
      );

      setChatValue("");

      await channelRef.current?.send(
        {
          type: "broadcast",
          event:
            "round1_chat",
          payload: {
            message,
          },
        },
      );

      await broadcastActivity(
        "Team chat message sent.",
      );
    };

  /* =======================================================
     LOADING
  ======================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[9px] tracking-[0.35em] text-[#f2c300]">
            PROJECT: REDACTED²
          </p>

          <p className="mt-4 text-sm text-white/35">
            INITIALIZING CRIME SCENE...
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================== */

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden text-white">
      {/* TOP HUD */}

      <div className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-black/75 backdrop-blur-md">
        <div className="px-5 sm:px-7 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[8px] tracking-[0.35em] text-white/25">
              PROJECT: REDACTED²
            </p>

            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-sm sm:text-base font-black tracking-wide">
                ROUND 01 // THE CRIME SCENE
              </h1>

              <span className="hidden sm:block w-px h-4 bg-white/10" />

              <span className="hidden sm:block text-[9px] tracking-[0.2em] text-[#f2c300]">
                {team?.team_name ||
                  "TEST INVESTIGATION TEAM"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-7">
            <div className="hidden sm:block text-right">
              <p className="text-[8px] tracking-[0.25em] text-white/25">
                SCORE
              </p>

              <p className="text-xl font-black text-[#f2c300] tabular-nums">
                {score}
              </p>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-[8px] tracking-[0.25em] text-white/25">
                FORENSICS
              </p>

              <p className="text-xl font-black tabular-nums">
                {forensicCredits}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[8px] tracking-[0.25em] text-white/25">
                {mcqStarted ? "MCQ TIME" : "TIME REMAINING"}
              </p>

              <p
                className={`text-xl sm:text-2xl font-black tabular-nums ${
                  timerCritical
                    ? "text-red-400"
                    : "text-[#f2c300]"
                }`}
              >
                {formatTime(
                  displayTimeRemaining,
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LEFT HUD */}

      <div className="fixed left-5 sm:left-7 top-24 z-30 pointer-events-none">
        <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
          RESTRICTED LABORATORY
        </p>

        <p className="mt-2 text-sm font-semibold">
          {mcqStarted
            ? "Evidence check in progress."
            : "Examine the scene."}
        </p>

        <p className="mt-1 max-w-xs text-xs leading-5 text-white/30">
          {mcqStarted
            ? "Use STUDY REPORT to verify recovered facts before submitting."
            : "Find evidence. Study what matters. Build the incident timeline."}
        </p>
      </div>

      {/* RIGHT HUD */}

      <div className="fixed top-24 right-5 sm:right-7 z-30">
        <div className="border border-white/10 bg-black/65 backdrop-blur rounded-xl px-4 py-3 min-w-[165px]">
          <div className="flex items-center justify-between">
            <p className="text-[8px] tracking-[0.25em] text-white/25">
              DISCOVERED
            </p>

            <p className="text-xs font-black">
              {discoveredCount}/
              {ROUND1_CLUES.length}
            </p>
          </div>

          <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/30 transition-all"
              style={{
                width: `${
                  (discoveredCount /
                    ROUND1_CLUES.length) *
                  100
                }%`,
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[8px] tracking-[0.25em] text-white/25">
              STUDIED
            </p>

            <p className="text-xs font-black text-[#f2c300]">
              {studiedCount}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[8px] tracking-[0.25em] text-white/25">
              CORE
            </p>

            <p className="text-xs font-black">
              {coreStudiedCount}/5
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[8px] tracking-[0.25em] text-white/25">
              MCQ
            </p>

            <p className="text-xs font-black">
              {mcqStarted || roundFinished
                ? "READY"
                : mcqEarlyAvailable
                  ? "OPEN"
                  : "LOCKED"}
            </p>
          </div>
        </div>
      </div>

      {/* CROSSHAIR */}

      <div className="fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-5 h-5">
          <span className="absolute left-1/2 top-0 w-px h-2 -translate-x-1/2 bg-white/40" />
          <span className="absolute left-1/2 bottom-0 w-px h-2 -translate-x-1/2 bg-white/40" />
          <span className="absolute left-0 top-1/2 w-2 h-px -translate-y-1/2 bg-white/40" />
          <span className="absolute right-0 top-1/2 w-2 h-px -translate-y-1/2 bg-white/40" />
          <span className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f2c300]" />
        </div>
      </div>

      {/* CONTROLS */}

      <div className="fixed left-5 sm:left-7 bottom-24 z-30 pointer-events-none">
        <p className="text-[9px] tracking-[0.2em] text-white/35">
          W A S D
        </p>

        <p className="mt-1 text-[8px] tracking-widest text-white/20">
          MOVE
        </p>

        <p className="mt-3 text-[9px] tracking-[0.2em] text-white/35">
          DRAG MOUSE
        </p>

        <p className="mt-1 text-[8px] tracking-widest text-white/20">
          LOOK
        </p>

        {targetedClue && (
          <p className="mt-4 text-[8px] tracking-[0.16em] text-[#f2c300]/70">
            OBJECT IN RANGE
          </p>
        )}
      </div>

      {/* 3D SCENE */}

      <Canvas
        camera={{
          position: [
            0,
            1.55,
            5.25,
          ],
          fov: 68,
          near: 0.1,
          far: 100,
        }}
        dpr={[
          1,
          1.5,
        ]}
        gl={{
          antialias: true,
          powerPreference:
            "high-performance",
        }}
        onCreated={({
          gl,
        }) => {
          gl.toneMappingExposure =
            1.15;
        }}
      >
        <PlayerCamera
          active={
            sceneActive &&
            !roundFinished &&
            !mcqStarted &&
            !forensicLoadingId
          }
        />

        <CrimeSceneRoom
          disabled={
            roundFinished ||
            mcqStarted ||
            Boolean(
              forensicLoadingId,
            )
          }
          targetedClue={
            targetedClue
          }
          onInspect={(
            clue,
          ) => {
            if (
              !progress[
                clue.id
              ]?.discovered
            ) {
              discoverClue(
                clue,
              );
            }

            setSelectedClue(
              clue,
            );
          }}
          onTarget={
            setTargetedClue
          }
        />
      </Canvas>

      {/* BOTTOM BAR */}

      <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-md">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] tracking-[0.3em] text-white/25">
              TEAM INTEL
            </p>

            <p className="mt-1 text-xs text-white/50 truncate max-w-[240px] sm:max-w-[520px]">
              {events[0]
                ?.text ||
                "Investigation ready."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mcqEarlyAvailable && (
              <button
                onClick={() =>
                  void startMCQEarly()
                }
                className="px-3 py-2 bg-[#f2c300] text-black text-[9px] font-black tracking-[0.12em] rounded-md hover:bg-[#ffd83b] transition"
              >
                FINISH STUDY & START MCQ
              </button>
            )}

            <button
              onClick={() =>
                setDossierOpen(
                  true,
                )
              }
              className={`px-3 py-2 border text-[9px] font-bold tracking-[0.12em] transition ${
                mcqStarted
                  ? "border-[#f2c300]/30 text-[#f2c300] hover:bg-[#f2c300] hover:text-black"
                  : "border-white/10 text-white/45 hover:text-white"
              }`}
            >
              STUDY REPORT
            </button>

            <button
              onClick={() =>
                setPeopleOpen(
                  true,
                )
              }
              className="hidden sm:block px-3 py-2 border border-white/10 text-[9px] font-bold tracking-[0.12em] text-white/45 hover:text-white transition"
            >
              PERSONNEL
            </button>

            <button
              onClick={() =>
                setChatOpen(
                  (open) =>
                    !open,
                )
              }
              className="px-3 py-2 border border-[#f2c300]/25 text-[9px] font-bold tracking-[0.12em] text-[#f2c300] hover:bg-[#f2c300] hover:text-black transition"
            >
              TEAM CHAT
            </button>
          </div>
        </div>
      </div>

      {/* EVIDENCE MODAL */}

      {selectedClue && (
        <EvidenceModal
          clue={
            selectedClue
          }
          progress={
            progress[
              selectedClue.id
            ] || {
              discovered:
                false,
              studied:
                false,
              forensicComplete:
                false,
            }
          }
          forensicLoading={
            forensicLoadingId ===
            selectedClue.id
          }
          forensicCredits={
            forensicCredits
          }
          hintCount={
            hintCount
          }
          onClose={() =>
            setSelectedClue(
              null,
            )
          }
          onStudy={() =>
            studyClue(
              selectedClue,
            )
          }
          onForensic={() =>
            runForensic(
              selectedClue,
            )
          }
          onHint={() =>
            useHint(
              selectedClue,
            )
          }
        />
      )}

      {/* HINT */}

      {hintModal && (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-lg border border-[#f2c300]/20 rounded-2xl bg-[#090909] p-7 shadow-2xl">
            <p className="text-[9px] tracking-[0.32em] text-[#f2c300]">
              INVESTIGATION SIGNAL
            </p>

            <h2 className="mt-3 text-xl font-black">
              {hintModal.title}
            </h2>

            <div className="mt-5 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
              <p className="text-sm leading-7 text-white/75">
                {hintModal.text}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-5">
              <p className="text-[9px] tracking-[0.15em] text-white/25">
                {hintModal.cost ===
                0
                  ? "NO SCORE PENALTY"
                  : `${hintModal.cost} POINTS DEDUCTED`}
              </p>

              <button
                onClick={() =>
                  setHintModal(
                    null,
                  )
                }
                className="bg-[#f2c300] text-black px-5 py-3 rounded-lg text-[10px] font-black tracking-[0.14em] hover:bg-[#ffd83b]"
              >
                UNDERSTOOD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOSSIER */}

      {dossierOpen && (
        <DossierPanel
          progress={
            progress
          }
          events={events}
          team={team}
          onClose={() =>
            setDossierOpen(
              false,
            )
          }
        />
      )}

      {/* PERSONNEL */}

      {peopleOpen && (
        <PersonnelPanel
          onClose={() =>
            setPeopleOpen(
              false,
            )
          }
        />
      )}

      {/* CHAT */}

      {chatOpen && (
        <ChatPanel
          teamName={
            team?.team_name ||
            "TEST INVESTIGATION TEAM"
          }
          messages={
            chatMessages
          }
          value={
            chatValue
          }
          onChange={
            setChatValue
          }
          onSend={
            sendChat
          }
          onClose={() =>
            setChatOpen(
              false,
            )
          }
        />
      )}

      {/* ENTRY */}

      {!sceneActive &&
        !roundFinished && (
          <div className="fixed inset-0 z-[170] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-xl border border-white/10 bg-[#080808] rounded-2xl p-8 shadow-2xl">
              <p className="text-[9px] tracking-[0.35em] text-[#f2c300]">
                PROJECT: REDACTED² // ROUND 01
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                THE CRIME SCENE
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/45">
                A restricted laboratory has been placed under
                investigation following the disappearance of the
                BLACKBOX research module.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    TIME
                  </p>

                  <p className="mt-2 text-lg font-black text-[#f2c300]">
                    30:00
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    FORENSICS
                  </p>

                  <p className="mt-2 text-lg font-black">
                    5
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    HINTS
                  </p>

                  <p className="mt-2 text-lg font-black">
                    2 FREE
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    FINAL
                  </p>

                  <p className="mt-2 text-lg font-black">
                    5 MCQs
                  </p>
                </div>
              </div>

              <div className="mt-6 border border-white/10 rounded-xl p-5">
                <p className="text-[9px] tracking-[0.25em] text-white/25">
                  FIELD RULES
                </p>

                <div className="mt-3 space-y-2 text-xs leading-6 text-white/45">
                  <p>
                    Study evidence strategically. Not every object
                    has investigative value.
                  </p>

                  <p>
                    Five forensic credits are shared by the team.
                    Each analysis takes 8 seconds.
                  </p>

                  <p>
                    The first two hints are free. Later hints cost
                    5 points.
                  </p>

                  <p>
                    From 25:00 onward, your team may voluntarily finish
                    the investigation and begin the MCQ. At 30:00, the
                    investigation closes automatically.
                  </p>

                  <p>
                    The MCQ has its own 05:00 timer. The STUDY REPORT
                    remains available while answering, and the MCQ is
                    automatically submitted when its timer expires.
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setSceneActive(
                    true,
                  )
                }
                className="mt-7 w-full bg-[#f2c300] text-black py-4 rounded-xl font-black text-xs tracking-[0.16em] hover:bg-[#ffd83b] transition"
              >
                ENTER INVESTIGATION
              </button>
            </div>
          </div>
        )}

      {/* FINAL MCQ */}

      {mcqStarted &&
        !finalSubmitted &&
        finalQuestions.length ===
          5 && (
          <FinalMCQPanel
            questions={
              finalQuestions
            }
            answers={
              finalAnswers
            }
            onAnswer={
              setFinalAnswer
            }
            onSubmit={() =>
              void submitFinalDeduction()
            }
            onOpenStudyReport={() =>
              setMcqDossierOpen(true)
            }
            submitting={
              mcqSubmitting
            }
            timeRemaining={
              mcqTimeRemaining
            }
          />
        )}

      {mcqStarted &&
        !finalSubmitted &&
        mcqDossierOpen && (
          <DossierPanel
            progress={progress}
            events={events}
            team={team}
            onClose={() =>
              setMcqDossierOpen(false)
            }
          />
        )}

      {/* FINAL RESULT */}

      {roundFinished &&
        finalSubmitted && (
          <div className="fixed inset-0 z-[230] bg-black/95 flex items-center justify-center p-6">
            <div className="w-full max-w-xl border border-white/10 rounded-2xl bg-[#090909] p-8 shadow-2xl">
              <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
                ROUND 01 // INVESTIGATION COMPLETE
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                CASE RECORD CLOSED
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/40">
                Your investigation record and final deduction
                have been submitted.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-7">
                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    SCORE
                  </p>

                  <p className="mt-2 text-2xl font-black text-[#f2c300]">
                    {score}
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    STUDIED
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {studiedCount}
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    FORENSIC
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {forensicCount}
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-[8px] tracking-widest text-white/25">
                    HINTS
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {hintCount}
                  </p>
                </div>
              </div>

              <div className="mt-6 border border-white/10 rounded-xl p-5">
                <p className="text-[9px] tracking-[0.25em] text-white/25">
                  SCORE BREAKDOWN
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[8px] tracking-widest text-white/20">EVIDENCE</p>
                    <p className="mt-1 text-sm font-black">
                      {Math.min(
                        MAX_EVIDENCE_SCORE,
                        ROUND1_CLUES.reduce(
                          (total, clue) =>
                            total +
                            (progress[clue.id]?.studied
                              ? EVIDENCE_SCORE[clue.id] || 0
                              : 0),
                          0,
                        ),
                      )}/45
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] tracking-widest text-white/20">TEAM EFFICIENCY</p>
                    <p className="mt-1 text-sm font-black">{teamEfficiencyScore}/15</p>
                  </div>

                  <div>
                    <p className="text-[8px] tracking-widest text-white/20">MCQ</p>
                    <p className="mt-1 text-sm font-black">
                      {finalQuestions.filter(
                        (question) =>
                          finalAnswers[question.id] === question.answer,
                      ).length * 4}/20
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] tracking-widest text-white/20">SPEED</p>
                    <p className="mt-1 text-sm font-black">{earlyBonusAwarded ? 10 : 0}/10</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[8px] tracking-widest text-white/20">DISCIPLINE</p>
                    <p className="mt-1 text-sm font-black">{Math.max(0, disciplineScore - Math.max(0, hintCount - FREE_HINTS) * HINT_COST)}/10</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border border-white/10 rounded-xl p-5">
                <p className="text-[9px] tracking-[0.25em] text-white/25">
                  FINAL RECORD
                </p>

                <div className="mt-3 space-y-1">
                  <p className="text-xs text-white/45">
                    Evidence studied:{" "}
                    {studiedCount}/
                    {ROUND1_CLUES.length}
                  </p>

                  <p className="text-xs text-white/45">
                    Core evidence:{" "}
                    {coreStudiedCount}/5
                  </p>

                  <p className="text-xs text-white/45">
                    Forensic analyses:{" "}
                    {forensicCount}
                  </p>

                  <p className="text-xs text-white/45">
                    Final questions:{" "}
                    5
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  router.replace(
                    "/lobby",
                  )
                }
                className="mt-7 w-full bg-[#f2c300] text-black py-4 rounded-xl font-black text-xs tracking-[0.15em] hover:bg-[#ffd83b] transition"
              >
                RETURN TO LOBBY
              </button>
            </div>
          </div>
        )}

      <style jsx global>{`
        @keyframes forensicRun {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </main>
  );
}