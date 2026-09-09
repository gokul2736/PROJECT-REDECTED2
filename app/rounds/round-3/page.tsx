"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import {
  Html,
  PointerLockControls,
  Sky,
  Text,
} from "@react-three/drei";

type Question = {
  id: number;
  question: string;
  answer: string;
  clue: string;
};

type IntelEvent = {
  id: number;
  text: string;
  time: string;
};

const ROUND_DURATION = 40 * 60;
const MAX_QUESTIONS = 6;

const questions: Question[] = [
  {
    id: 1,
    question: "What happened during the 47-second blackout?",
    answer:
      "The security cameras and laboratory network temporarily lost synchronization. However, the laboratory terminal remained active.",
    clue:
      "The blackout affected the security layer, not necessarily the laboratory system.",
  },
  {
    id: 2,
    question:
      "Was the prototype removed through the main laboratory door?",
    answer:
      "The available evidence does not confirm that the prototype passed through the main laboratory entrance.",
    clue:
      "The obvious assumption about physical removal may be incorrect.",
  },
  {
    id: 3,
    question:
      "Was Rhea actually using her access card at 20:38?",
    answer:
      "The credential associated with Rhea was used. The records do not establish that Rhea herself used it.",
    clue:
      "A credential and its owner are not necessarily in the same location.",
  },
  {
    id: 4,
    question:
      "Who had knowledge of the emergency transfer protocol?",
    answer:
      "Only personnel involved in the system architecture and project documentation were aware of the complete protocol.",
    clue:
      "Technical knowledge is more important than physical access.",
  },
  {
    id: 5,
    question:
      "Was the evidence against Daniel authentic?",
    answer:
      "Some information connected to Daniel is consistent with the records. Other information appears to have been introduced later.",
    clue:
      "Not every piece of evidence pointing toward Daniel should be trusted.",
  },
  {
    id: 6,
    question:
      "Was the camera failure accidental?",
    answer:
      "The timing of the camera failure closely corresponds with activity originating from the laboratory network.",
    clue:
      "The camera failure may have been deliberately caused.",
  },
  {
    id: 7,
    question:
      "Did more than one person know what was happening?",
    answer:
      "Evidence indicates that information was shared between at least two individuals, but their understanding of the operation was not identical.",
    clue:
      "An accomplice may not have known the complete plan.",
  },
  {
    id: 8,
    question:
      "Which evidence should investigators distrust first?",
    answer:
      "Evidence whose timestamp conflicts with independently synchronized system records should be treated with caution.",
    clue:
      "Build the timeline before deciding who is guilty.",
  },
];

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const secs = Math.max(0, seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

function getCurrentClock() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   WITNESS TERMINAL
========================================================= */

function WitnessTerminal({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <group position={[0, 1.45, -4]}>
      <mesh>
        <boxGeometry args={[3.7, 2.5, 0.4]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      <mesh position={[0, 0.25, -0.23]}>
        <boxGeometry args={[3.15, 1.65, 0.08]} />
        <meshStandardMaterial
          color="#080a08"
          emissive="#f2c300"
          emissiveIntensity={0.08}
        />
      </mesh>

      <Text
        position={[0, 0.72, -0.29]}
        fontSize={0.2}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        ECHO // VIRTUAL WITNESS
      </Text>

      <Text
        position={[0, 0.28, -0.29]}
        fontSize={0.15}
        color="#d9d9d9"
        anchorX="center"
        anchorY="middle"
      >
        SUBJECT: ECHO
      </Text>

      <Text
        position={[0, -0.15, -0.29]}
        fontSize={0.11}
        color="#888888"
        anchorX="center"
        anchorY="middle"
      >
        RESTRICTED INTERROGATION CHANNEL
      </Text>

      <mesh
        position={[0, -0.78, -0.34]}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <boxGeometry args={[1.9, 0.38, 0.12]} />
        <meshStandardMaterial
          color="#f2c300"
          emissive="#f2c300"
          emissiveIntensity={0.06}
        />

        <Html center>
          <button
            onClick={onOpen}
            className="px-4 py-2 bg-[#f2c300] text-black text-[11px] font-black tracking-[0.14em] whitespace-nowrap hover:bg-[#ffd83b] transition"
          >
            BEGIN INTERROGATION
          </button>
        </Html>
      </mesh>
    </group>
  );
}

/* =========================================================
   3D ROOM
========================================================= */

function InterrogationRoom({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />

      <pointLight
        position={[0, 5, -2]}
        intensity={1.3}
        color="#f2c300"
      />

      <pointLight
        position={[-6, 3, -5]}
        intensity={0.55}
        color="#ffffff"
      />

      <Sky
        sunPosition={[100, 20, 100]}
        turbidity={8}
        rayleigh={0.25}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1, 0]}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0b0b0b" />
      </mesh>

      <mesh position={[0, 3, -8]}>
        <boxGeometry args={[20, 8, 0.3]} />
        <meshStandardMaterial color="#080808" />
      </mesh>

      <mesh
        position={[-10, 3, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[16, 8, 0.3]} />
        <meshStandardMaterial color="#080808" />
      </mesh>

      <mesh
        position={[10, 3, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[16, 8, 0.3]} />
        <meshStandardMaterial color="#080808" />
      </mesh>

      <mesh position={[0, -0.2, -2]}>
        <boxGeometry args={[6, 0.4, 2.5]} />
        <meshStandardMaterial color="#191919" />
      </mesh>

      <mesh position={[-2.5, -1, -1]}>
        <boxGeometry args={[0.3, 1.6, 0.3]} />
        <meshStandardMaterial color="#101010" />
      </mesh>

      <mesh position={[2.5, -1, -1]}>
        <boxGeometry args={[0.3, 1.6, 0.3]} />
        <meshStandardMaterial color="#101010" />
      </mesh>

      <WitnessTerminal onOpen={onOpen} />

      <mesh
        position={[-2, 0.15, -1.8]}
        rotation={[0, 0.2, 0]}
      >
        <boxGeometry args={[1.4, 0.05, 1]} />
        <meshStandardMaterial color="#cfc8ad" />
      </mesh>

      <Text
        position={[-2, 0.19, -1.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.12}
        color="#111111"
        anchorX="center"
        anchorY="middle"
      >
        CASE FILE
      </Text>

      <mesh
        position={[2, 0.15, -1.8]}
        rotation={[0, -0.15, 0]}
      >
        <boxGeometry args={[1.4, 0.05, 1]} />
        <meshStandardMaterial color="#777777" />
      </mesh>

      <Text
        position={[2, 0.19, -1.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.11}
        color="#111111"
        anchorX="center"
        anchorY="middle"
      >
        EVIDENCE
      </Text>

      <mesh
        position={[-6, 2.5, -7.8]}
      >
        <boxGeometry args={[5, 2.5, 0.1]} />
        <meshStandardMaterial
          color="#070707"
          emissive="#f2c300"
          emissiveIntensity={0.06}
        />
      </mesh>

      <Text
        position={[-6, 2.9, -7.9]}
        fontSize={0.28}
        color="#f2c300"
        anchorX="center"
        anchorY="middle"
      >
        ECHO // ONLINE
      </Text>

      <Text
        position={[-6, 2.4, -7.9]}
        fontSize={0.13}
        color="#999999"
        anchorX="center"
        anchorY="middle"
      >
        INFORMATION CLASSIFICATION: RESTRICTED
      </Text>

      <Text
        position={[-6, 2.0, -7.9]}
        fontSize={0.11}
        color="#555555"
        anchorX="center"
        anchorY="middle"
      >
        VERIFY BEFORE TRUSTING
      </Text>

      <PointerLockControls />
    </>
  );
}

/* =========================================================
   INTERROGATION PANEL
========================================================= */

function InterrogationPanel({
  onClose,
  questionsLeft,
  askedQuestions,
  onAsk,
}: {
  onClose: () => void;
  questionsLeft: number;
  askedQuestions: number[];
  onAsk: (question: Question) => void;
}) {
  const [selectedQuestion, setSelectedQuestion] =
    useState<Question | null>(null);

  const handleAsk = (question: Question) => {
    if (questionsLeft <= 0) return;
    if (askedQuestions.includes(question.id)) return;

    onAsk(question);
    setSelectedQuestion(question);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 text-white overflow-y-auto">
      <div className="min-h-full px-5 py-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="border-b border-white/10 pb-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <p className="text-[9px] tracking-[0.35em] text-[#f2c300]">
                  PROJECT: REDACTED² // CLASSIFIED CHANNEL
                </p>

                <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-[-0.04em]">
                  THE INTERROGATION
                </h1>

                <p className="mt-2 text-sm text-white/40">
                  Ask carefully. Every question consumes an
                  interrogation attempt.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[9px] tracking-[0.25em] text-white/30">
                    QUESTIONS REMAINING
                  </p>

                  <p
                    className={`mt-1 text-2xl font-black ${
                      questionsLeft <= 2
                        ? "text-red-400"
                        : "text-[#f2c300]"
                    }`}
                  >
                    {questionsLeft}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="border border-white/10 px-4 py-2 text-xs font-bold text-white/50 hover:text-white hover:border-white/20 transition"
                >
                  EXIT
                </button>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mt-6">
            <section className="border border-white/10 bg-[#090909] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.3em] text-white/30">
                    INTERROGATION CHANNEL
                  </p>

                  <h2 className="mt-2 text-lg font-bold">
                    Available Questions
                  </h2>
                </div>

                <span className="text-xs text-white/25">
                  {askedQuestions.length}/{MAX_QUESTIONS} used
                </span>
              </div>

              <div className="space-y-2 mt-5">
                {questions.map((question) => {
                  const alreadyAsked =
                    askedQuestions.includes(question.id);

                  const disabled =
                    alreadyAsked || questionsLeft <= 0;

                  return (
                    <button
                      key={question.id}
                      disabled={disabled}
                      onClick={() => handleAsk(question)}
                      className={`w-full text-left border rounded-xl px-4 py-4 transition ${
                        disabled
                          ? "border-white/5 bg-white/[0.015] text-white/25 cursor-not-allowed"
                          : "border-white/10 bg-white/[0.025] text-white/80 hover:border-[#f2c300]/30 hover:bg-[#f2c300]/[0.04]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`text-xs font-black mt-0.5 ${
                            alreadyAsked
                              ? "text-white/20"
                              : "text-[#f2c300]"
                          }`}
                        >
                          {String(question.id).padStart(2, "0")}
                        </span>

                        <span className="text-sm leading-6 flex-1">
                          {question.question}
                        </span>

                        {alreadyAsked && (
                          <span className="text-[9px] tracking-widest text-white/20 mt-1">
                            ASKED
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="border border-white/10 bg-[#090909] rounded-2xl p-5 min-h-[520px]">
              <p className="text-[9px] tracking-[0.3em] text-white/30">
                WITNESS RESPONSE
              </p>

              {!selectedQuestion ? (
                <div className="h-[420px] flex items-center justify-center text-center">
                  <div>
                    <div className="w-16 h-16 mx-auto rounded-full border border-[#f2c300]/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#f2c300]" />
                    </div>

                    <p className="mt-6 text-sm text-white/30">
                      Awaiting question selection.
                    </p>

                    <p className="mt-2 text-xs text-white/15">
                      Choose carefully. You cannot repeat a
                      question.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <div className="border border-white/10 rounded-xl p-5 bg-black">
                    <p className="text-[9px] tracking-[0.25em] text-white/30">
                      QUESTION
                    </p>

                    <p className="mt-3 text-sm leading-7 text-white/85">
                      {selectedQuestion.question}
                    </p>
                  </div>

                  <div className="mt-4 border border-[#f2c300]/20 rounded-xl p-5 bg-[#f2c300]/[0.025]">
                    <p className="text-[9px] tracking-[0.25em] text-[#f2c300]/70">
                      ECHO RESPONSE
                    </p>

                    <p className="mt-3 text-sm leading-7 text-white/80">
                      {selectedQuestion.answer}
                    </p>
                  </div>

                  <div className="mt-4 border border-white/10 rounded-xl p-5">
                    <p className="text-[9px] tracking-[0.25em] text-white/30">
                      INVESTIGATION SIGNAL
                    </p>

                    <p className="mt-3 text-sm leading-7 text-white/55">
                      {selectedQuestion.clue}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[10px] text-white/25 tracking-wider">
              ECHO DOES NOT CONFIRM UNSUPPORTED ASSUMPTIONS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Round3Page() {
  const router = useRouter();

  const [roundTime, setRoundTime] =
    useState(ROUND_DURATION);

  const [interrogationOpen, setInterrogationOpen] =
    useState(false);

  const [dossierOpen, setDossierOpen] =
    useState(false);

  const [chatOpen, setChatOpen] = useState(false);

  const [chatMessage, setChatMessage] =
    useState("");

  const [chatMessages, setChatMessages] =
    useState<string[]>([]);

  const [askedQuestions, setAskedQuestions] =
    useState<number[]>([]);

  const [intelEvents, setIntelEvents] =
    useState<IntelEvent[]>([
      {
        id: 1,
        text: "Round 3 test environment initialized.",
        time: getCurrentClock(),
      },
    ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRoundTime((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timerCritical = roundTime <= 5 * 60;

  const progressPercent = useMemo(() => {
    return Math.round(
      (askedQuestions.length / MAX_QUESTIONS) * 100
    );
  }, [askedQuestions.length]);

  const askQuestion = (question: Question) => {
    if (askedQuestions.includes(question.id)) {
      return;
    }

    if (askedQuestions.length >= MAX_QUESTIONS) {
      return;
    }

    setAskedQuestions((current) => [
      ...current,
      question.id,
    ]);

    setIntelEvents((current) => [
      {
        id: Date.now(),
        text: `Witness question ${String(question.id).padStart(
          2,
          "0"
        )} was asked.`,
        time: getCurrentClock(),
      },
      ...current,
    ]);
  };

  const sendChatMessage = () => {
    const trimmed = chatMessage.trim();

    if (!trimmed) return;

    setChatMessages((current) => [
      ...current,
      `You: ${trimmed}`,
    ]);

    setIntelEvents((current) => [
      {
        id: Date.now(),
        text: "A team chat message was sent.",
        time: getCurrentClock(),
      },
      ...current,
    ]);

    setChatMessage("");
  };

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden text-white">
      {/* TOP HUD */}
      <div className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-md">
        <div className="px-5 sm:px-7 py-4 flex items-center justify-between gap-5">
          <div>
            <p className="text-[8px] tracking-[0.35em] text-white/30">
              PROJECT: REDACTED²
            </p>

            <h1 className="text-sm sm:text-base font-black tracking-wide mt-1">
              ROUND 03 // THE INTERROGATION
            </h1>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => setDossierOpen(true)}
              className="hidden sm:block text-[9px] tracking-[0.2em] text-white/45 hover:text-white transition"
            >
              DOSSIER
            </button>

            <div className="text-right">
              <p className="text-[8px] tracking-[0.25em] text-white/30">
                TIME REMAINING
              </p>

              <p
                className={`mt-0.5 text-lg sm:text-xl font-black tabular-nums ${
                  timerCritical
                    ? "text-red-400"
                    : "text-[#f2c300]"
                }`}
              >
                {formatTime(roundTime)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LEFT HUD */}
      <div className="fixed left-5 sm:left-7 top-24 z-20 pointer-events-none">
        <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
          ROUND 03 TEST MODE
        </p>

        <p className="mt-2 text-sm font-semibold">
          Locate the witness terminal.
        </p>

        <p className="mt-1 text-xs text-white/30">
          Direct access enabled for testing.
        </p>
      </div>

      {/* RIGHT HUD */}
      <div className="fixed top-24 right-5 sm:right-7 z-20 pointer-events-none">
        <div className="border border-white/10 bg-black/60 backdrop-blur rounded-xl px-4 py-3">
          <p className="text-[8px] tracking-[0.25em] text-white/30">
            QUESTIONS USED
          </p>

          <p className="mt-1 text-sm font-bold">
            {askedQuestions.length}/{MAX_QUESTIONS}
          </p>

          <div className="mt-2 w-28 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#f2c300]"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="fixed bottom-24 left-5 sm:left-7 z-20 pointer-events-none">
        <p className="text-[9px] tracking-[0.22em] text-white/30">
          W A S D
        </p>

        <p className="mt-1 text-[9px] tracking-[0.22em] text-white/20">
          MOVE
        </p>

        <p className="mt-2 text-[9px] tracking-[0.22em] text-white/30">
          MOUSE
        </p>

        <p className="mt-1 text-[9px] tracking-[0.22em] text-white/20">
          LOOK
        </p>
      </div>

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/80 backdrop-blur-md">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] tracking-[0.28em] text-white/30">
              TEAM INTEL
            </p>

            <p className="mt-1 text-xs text-white/60 truncate max-w-[220px] sm:max-w-[420px]">
              {intelEvents[0]?.text ||
                "No recent activity."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDossierOpen(true)}
              className="px-3 py-2 border border-white/10 text-[9px] font-bold tracking-[0.12em] text-white/45 hover:text-white transition"
            >
              DOSSIER
            </button>

            <button
              onClick={() =>
                setChatOpen((current) => !current)
              }
              className="px-3 py-2 border border-[#f2c300]/20 text-[9px] font-bold tracking-[0.12em] text-[#f2c300] hover:bg-[#f2c300] hover:text-black transition"
            >
              TEAM CHAT
            </button>
          </div>
        </div>
      </div>

      {/* 3D ROOM */}
      <Canvas
        camera={{
          position: [0, 1.5, 5],
          fov: 70,
        }}
        dpr={[1, 1.5]}
      >
        <InterrogationRoom
          onOpen={() => setInterrogationOpen(true)}
        />
      </Canvas>

      {/* DOSSIER */}
      {dossierOpen && (
        <div className="fixed inset-0 z-[90] bg-black/75">
          <button
            onClick={() => setDossierOpen(false)}
            className="absolute inset-0"
            aria-label="Close dossier"
          />

          <aside className="absolute top-0 left-0 h-full w-full max-w-lg bg-[#080808] border-r border-white/10 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur border-b border-white/10 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
                  INVESTIGATION DOSSIER
                </p>

                <h2 className="mt-2 text-xl font-black">
                  TEAM INTELLIGENCE
                </h2>
              </div>

              <button
                onClick={() => setDossierOpen(false)}
                className="text-white/35 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="border border-white/10 rounded-xl p-5">
                <p className="text-[9px] tracking-[0.25em] text-white/30">
                  STATUS
                </p>

                <p className="mt-2 text-lg font-bold text-[#f2c300]">
                  ROUND 3 TEST MODE
                </p>
              </div>

              <div className="mt-4 border border-white/10 rounded-xl p-5">
                <p className="text-[9px] tracking-[0.25em] text-white/30">
                  PREVIOUS-ROUND INTELLIGENCE
                </p>

                <p className="mt-3 text-sm leading-6 text-white/45">
                  This section will later display the team's
                  discoveries from Rounds 1 and 2.
                </p>
              </div>

              <div className="mt-4">
                <p className="text-[9px] tracking-[0.25em] text-white/30">
                  CURRENT ACTIVITY
                </p>

                <div className="mt-3 space-y-2">
                  {intelEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-white/5 rounded-lg px-4 py-3 bg-white/[0.02]"
                    >
                      <p className="text-xs text-white/65">
                        {event.text}
                      </p>

                      <p className="mt-1 text-[9px] text-white/20">
                        {event.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* TEAM CHAT */}
      {chatOpen && (
        <div className="fixed right-4 bottom-20 sm:right-6 sm:bottom-20 z-[80] w-[calc(100vw-2rem)] sm:w-[380px] border border-white/10 rounded-2xl bg-[#090909]/95 backdrop-blur-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
                TEAM CHANNEL
              </p>

              <p className="mt-1 text-sm font-bold">
                TEST TEAM
              </p>
            </div>

            <button
              onClick={() => setChatOpen(false)}
              className="text-white/30 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="h-60 overflow-y-auto p-4 space-y-2">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-xs text-white/25">
                  Team chat is ready.
                </p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={`${message}-${index}`}
                  className="border border-white/5 rounded-lg px-3 py-2 bg-white/[0.02]"
                >
                  <p className="text-xs text-white/70">
                    {message}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/10 p-3 flex gap-2">
            <input
              value={chatMessage}
              onChange={(event) =>
                setChatMessage(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendChatMessage();
                }
              }}
              placeholder="Message your team..."
              className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#f2c300]/40"
            />

            <button
              onClick={sendChatMessage}
              className="px-4 rounded-lg bg-[#f2c300] text-black text-xs font-black"
            >
              SEND
            </button>
          </div>
        </div>
      )}

      {/* INTERROGATION */}
      {interrogationOpen && (
        <InterrogationPanel
          onClose={() => setInterrogationOpen(false)}
          questionsLeft={
            MAX_QUESTIONS - askedQuestions.length
          }
          askedQuestions={askedQuestions}
          onAsk={askQuestion}
        />
      )}

      {/* TIMER END */}
      {roundTime === 0 && (
        <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-6">
          <div className="w-full max-w-lg border border-white/10 rounded-2xl bg-[#090909] p-8 text-center">
            <p className="text-[9px] tracking-[0.3em] text-[#f2c300]">
              ROUND 3
            </p>

            <h2 className="mt-3 text-3xl font-black">
              TIME EXPIRED
            </h2>

            <button
              onClick={() => router.replace("/lobby")}
              className="mt-7 w-full bg-[#f2c300] text-black py-3 rounded-xl font-black text-xs tracking-[0.14em]"
            >
              RETURN TO LOBBY
            </button>
          </div>
        </div>
      )}
    </main>
  );
}