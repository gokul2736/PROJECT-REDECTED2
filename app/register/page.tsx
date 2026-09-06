"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const SAVEETHA_DEPARTMENTS = [
  "AGRI",
  "AI&DS",
  "AI&ML",
  "BME",
  "CHEMICAL ENGG",
  "CIVIL",
  "CSE-CORE",
  "CSE-CYBER",
  "CSE-IOT",
  "ECE",
  "EEE",
  "IT",
  "MBA",
  "MECH",
];

const YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

const stepTitles = {
  1: "Create Your Identity",
  2: "Establish Contact",
  3: "Verify Institution",
  4: "Academic Intelligence",
};

const stepDescriptions = {
  1: "Enter the credentials for your investigator profile.",
  2: "Provide a secure communication channel.",
  3: "Select your institutional clearance category.",
  4: "Complete your academic profile.",
};

const inputClass =
  "mt-2 w-full bg-transparent border border-white/15 rounded-lg px-4 py-4 outline-none text-white placeholder:text-gray-600 transition-all duration-200 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/10";

const selectClass =
  "mt-2 w-full bg-[#0b0e14] text-white border border-white/15 rounded-lg px-4 py-4 outline-none transition-all duration-200 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/10 [color-scheme:dark]";

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Contact
  // Keep this naming internally for database compatibility.
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Institution
  const [isSaveethaStudent, setIsSaveethaStudent] =
    useState<boolean | null>(null);

  const [collegeName, setCollegeName] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [department, setDepartment] = useState("");

  const nextStep = () => {
    setErrorMessage("");

    if (step === 1) {
      if (
        !fullName.trim() ||
        !email.trim() ||
        !password
      ) {
        setErrorMessage(
          "Please complete all identity fields."
        );
        return;
      }

      if (!email.includes("@")) {
        setErrorMessage(
          "Please enter a valid email address."
        );
        return;
      }

      if (password.length < 6) {
        setErrorMessage(
          "Password must contain at least 6 characters."
        );
        return;
      }
    }

    if (step === 2) {
      if (!whatsappNumber.trim()) {
        setErrorMessage(
          "Please enter your contact number."
        );
        return;
      }
    }

    if (step === 3) {
      if (isSaveethaStudent === null) {
        setErrorMessage(
          "Please select your institution type."
        );
        return;
      }
    }

    setStep((current) => Math.min(current + 1, 4));
  };

  const previousStep = () => {
    setErrorMessage("");

    setStep((current) =>
      Math.max(current - 1, 1)
    );
  };

  const handleRegister = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setErrorMessage("");

    if (isSaveethaStudent === null) {
      setErrorMessage(
        "Please select your institution type."
      );
      return;
    }

    if (!yearOfStudy) {
      setErrorMessage(
        "Please select your year of study."
      );
      return;
    }

    if (!department.trim()) {
      setErrorMessage(
        "Please enter or select your department."
      );
      return;
    }

    if (
      isSaveethaStudent === false &&
      !collegeName.trim()
    ) {
      setErrorMessage(
        "Please enter your college name."
      );
      return;
    }

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage(
        "Your identity information is incomplete."
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Password must contain at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const institutionName =
        isSaveethaStudent === true
          ? "Saveetha Engineering College"
          : collegeName.trim();

      /*
       * The Supabase Auth account is created here.
       *
       * The same metadata is passed to the existing
       * public.handle_new_user() trigger.
       *
       * That trigger automatically creates the
       * corresponding public.users row.
       */
      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),

              whatsapp_number:
                whatsappNumber.trim(),

              is_saveetha_student:
                isSaveethaStudent,

              college_name:
                institutionName,

              year_of_study:
                yearOfStudy,

              department:
                department.trim(),

              academic_group: null,
            },
          },
        });

      if (error) {
        console.error(
          "Supabase registration error:",
          error
        );

        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage(
          "Registration failed. Please try again."
        );
        setLoading(false);
        return;
      }

      /*
       * At this point:
       *
       * auth.users      -> created
       * public.users    -> created by trigger
       *
       * If email confirmation is enabled,
       * data.session will be null. That is expected.
       */
      setLoading(false);
      setRegistrationComplete(true);
    } catch (error) {
      console.error(
        "Unexpected registration error:",
        error
      );

      setErrorMessage(
        "An unexpected error occurred. Please try again."
      );

      setLoading(false);
    }
  };

  const displayName =
    fullName.trim() || "UNIDENTIFIED";

  const institution =
    isSaveethaStudent === true
      ? "SAVEETHA ENGINEERING COLLEGE"
      : isSaveethaStudent === false
      ? collegeName || "EXTERNAL INSTITUTION"
      : "PENDING";

  const clearance =
    isSaveethaStudent === true
      ? "INTERNAL"
      : isSaveethaStudent === false
      ? "EXTERNAL"
      : "PENDING";

  const goToLogin = () => {
    router.push("/login");
  };

  /*
   * SUCCESS SCREEN
   */
  if (registrationComplete) {
    return (
      <main className="min-h-screen bg-[#07090d] text-white flex items-center justify-center px-6">

        <motion.div
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          className="max-w-xl w-full text-center"
        >

          {/* SUCCESS ICON */}

          <motion.div
            initial={{
              scale: 0.7,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.15,
              duration: 0.45,
            }}
            className="mx-auto w-20 h-20 rounded-full border border-sky-400/80 flex items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.12)]"
          >

            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-sky-300"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>

          </motion.div>

          <motion.h1
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.3,
              duration: 0.4,
            }}
            className="text-4xl font-bold mt-10"
          >
            Clearance recorded
          </motion.h1>

          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.45,
              duration: 0.4,
            }}
            className="text-gray-400 text-lg mt-5"
          >
            Your investigator profile has been
            successfully created.
          </motion.p>

          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.6,
              duration: 0.4,
            }}
            className="mt-8 text-sm text-gray-500"
          >
            Check your email if confirmation is
            required before logging in.
          </motion.p>

          <motion.div
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.8,
              duration: 0.4,
            }}
            className="mt-12"
          >

            <button
              type="button"
              onClick={goToLogin}
              className="inline-flex items-center justify-center px-7 py-3 border border-white/15 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:border-white/40 transition"
            >
              Continue to login →
            </button>

          </motion.div>

        </motion.div>

      </main>
    );
  }

  /*
   * MAIN REGISTRATION PAGE
   */

  return (
    <main className="min-h-screen bg-[#07090d] text-white">

      {/* TOP BAR */}

      <header className="border-b border-white/10">

        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>

            <p className="text-xs tracking-[0.35em] text-gray-500">
              INVESTIGATION NETWORK
            </p>

            <h1 className="text-xl font-bold tracking-wide mt-1">
              PROJECT: REDACTED
              <sup className="text-xs ml-0.5">
                2
              </sup>
            </h1>

          </div>

        </div>

      </header>

      {/* MAIN CONTENT */}

      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="grid lg:grid-cols-2 gap-8">

          {/* =====================================
              LEFT — LIVE DOSSIER
          ====================================== */}

          <motion.section
            initial={{
              opacity: 0,
              x: -18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
            className="border border-white/10 rounded-2xl bg-white/[0.02] p-6 lg:p-10"
          >

            <div className="flex items-center justify-between mb-10">

              <div>

                <p className="text-xs tracking-[0.3em] text-gray-500">
                  LIVE DOSSIER
                </p>

                <h2 className="text-2xl font-bold mt-2">
                  INVESTIGATOR PROFILE
                </h2>

              </div>

              <motion.span
                key={step}
                initial={{
                  opacity: 0,
                  scale: 0.9,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="text-xs border border-white/10 px-3 py-1 rounded-full text-gray-400"
              >
                STEP {step}/4
              </motion.span>

            </div>

            {/* ID CARD */}

            <div className="relative overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-white/[0.07] to-transparent p-7">

              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/[0.025] rounded-full blur-3xl" />

              <p className="text-xs text-gray-500 tracking-[0.25em]">
                AGENT DESIGNATION
              </p>

              <AnimatePresence mode="wait">

                <motion.h3
                  key={displayName}
                  initial={{
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="text-3xl font-bold mt-3 break-words"
                >
                  {displayName.toUpperCase()}
                </motion.h3>

              </AnimatePresence>

              <div className="grid grid-cols-2 gap-6 mt-10">

                <div>

                  <p className="text-xs text-gray-500">
                    CLEARANCE
                  </p>

                  <p className="mt-2 font-semibold">
                    {clearance}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-gray-500">
                    STATUS
                  </p>

                  <p className="mt-2 text-yellow-400 font-semibold">
                    PENDING
                  </p>

                </div>

                <div className="col-span-2">

                  <p className="text-xs text-gray-500">
                    INSTITUTION
                  </p>

                  <p className="mt-2 font-semibold break-words">
                    {institution}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-gray-500">
                    DIVISION
                  </p>

                  <p className="mt-2">
                    {department || "PENDING"}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-gray-500">
                    YEAR
                  </p>

                  <p className="mt-2">
                    {yearOfStudy || "PENDING"}
                  </p>

                </div>

              </div>

              <div className="border-t border-white/10 mt-8 pt-5">

                <p className="text-xs text-gray-500">
                  CONTACT CHANNEL
                </p>

                <p className="mt-2 text-sm break-all">
                  {email || "NOT CONNECTED"}
                </p>

              </div>

            </div>

          </motion.section>

          {/* =====================================
              RIGHT — REGISTRATION
          ====================================== */}

          <motion.section
            initial={{
              opacity: 0,
              x: 18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
              delay: 0.05,
            }}
            className="border border-white/10 rounded-2xl bg-[#0b0e14]/90 backdrop-blur-sm p-6 lg:p-10"
          >

            {/* STEP HEADER */}

            <div className="mb-10">

              <p className="text-xs tracking-[0.3em] text-gray-500">
                REGISTRATION PROTOCOL
              </p>

              <AnimatePresence mode="wait">

                <motion.div
                  key={step}
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -5,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                >

                  <h2 className="text-3xl font-bold mt-3">
                    {
                      stepTitles[
                        step as keyof typeof stepTitles
                      ]
                    }
                  </h2>

                  <p className="text-gray-400 mt-3">
                    {
                      stepDescriptions[
                        step as keyof typeof stepDescriptions
                      ]
                    }
                  </p>

                </motion.div>

              </AnimatePresence>

            </div>

            {/* ERROR */}

            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -5,
                  }}
                  className="mb-6 border border-red-500/30 bg-red-500/5 rounded-lg px-4 py-3 text-sm text-red-300"
                >
                  {errorMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CURRENT STEP */}

            <AnimatePresence mode="wait">

              <motion.div
                key={step}
                initial={{
                  opacity: 0,
                  x: 12,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: -12,
                }}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                }}
              >

                {/* =====================
                    STEP 1
                ====================== */}

                {step === 1 && (

                  <div className="space-y-6">

                    <div>

                      <label className="text-sm text-gray-300">
                        FULL NAME
                      </label>

                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) =>
                          setFullName(e.target.value)
                        }
                        autoComplete="name"
                        placeholder="Enter your full name"
                        className={inputClass}
                      />

                    </div>

                    <div>

                      <label className="text-sm text-gray-300">
                        EMAIL ADDRESS
                      </label>

                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={inputClass}
                      />

                    </div>

                    <div>

                      <label className="text-sm text-gray-300">
                        PASSWORD
                      </label>

                      <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        autoComplete="new-password"
                        placeholder="Minimum 6 characters"
                        className={inputClass}
                      />

                    </div>

                  </div>

                )}

                {/* =====================
                    STEP 2
                ====================== */}

                {step === 2 && (

                  <div>

                    <label className="text-sm text-gray-300">
                      CONTACT NUMBER
                    </label>

                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => {
                        const numbersOnly =
                          e.target.value.replace(
                            /\D/g,
                            ""
                          );

                        setWhatsappNumber(
                          numbersOnly
                        );
                      }}
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter your contact number"
                      className={inputClass}
                    />

                    <p className="text-xs text-gray-500 mt-3">
                      Used for important investigation
                      and event updates.
                    </p>

                  </div>

                )}

                {/* =====================
                    STEP 3
                ====================== */}

                {step === 3 && (

                  <div className="grid md:grid-cols-2 gap-5">

                    <button
                      type="button"
                      onClick={() => {
                        setIsSaveethaStudent(true);
                        setErrorMessage("");
                      }}
                      className={`group text-left border rounded-xl p-6 transition duration-200 ${
                        isSaveethaStudent === true
                          ? "border-white bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                          : "border-white/15 hover:border-yellow-400/50 hover:bg-white/[0.025]"
                      }`}
                    >

                      <p className="text-xs tracking-[0.2em] opacity-60">
                        INTERNAL ACCESS
                      </p>

                      <h3 className="text-xl font-bold mt-3">
                        SAVEETHA
                      </h3>

                      <p className="text-sm mt-2 opacity-70">
                        Saveetha Engineering College
                        student
                      </p>

                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSaveethaStudent(false);
                        setErrorMessage("");
                      }}
                      className={`group text-left border rounded-xl p-6 transition duration-200 ${
                        isSaveethaStudent === false
                          ? "border-white bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                          : "border-white/15 hover:border-yellow-400/50 hover:bg-white/[0.025]"
                      }`}
                    >

                      <p className="text-xs tracking-[0.2em] opacity-60">
                        EXTERNAL ACCESS
                      </p>

                      <h3 className="text-xl font-bold mt-3">
                        OTHER COLLEGE
                      </h3>

                      <p className="text-sm mt-2 opacity-70">
                        Register from another
                        institution
                      </p>

                    </button>

                  </div>

                )}

                {/* =====================
                    STEP 4
                ====================== */}

                {step === 4 && (

                  <form
                    onSubmit={handleRegister}
                    className="space-y-6"
                  >

                    {isSaveethaStudent === false && (

                      <div>

                        <label className="text-sm text-gray-300">
                          COLLEGE NAME
                        </label>

                        <input
                          type="text"
                          value={collegeName}
                          onChange={(e) =>
                            setCollegeName(
                              e.target.value
                            )
                          }
                          placeholder="Enter your college name"
                          className={inputClass}
                        />

                      </div>

                    )}

                    <div>

                      <label className="text-sm text-gray-300">
                        YEAR OF STUDY
                      </label>

                      <select
                        value={yearOfStudy}
                        onChange={(e) =>
                          setYearOfStudy(
                            e.target.value
                          )
                        }
                        className={selectClass}
                      >

                        <option
                          value=""
                          className="bg-[#0b0e14] text-white"
                        >
                          Select year
                        </option>

                        {YEARS.map((year) => (
                          <option
                            key={year}
                            value={year}
                            className="bg-[#0b0e14] text-white"
                          >
                            {year}
                          </option>
                        ))}

                      </select>

                    </div>

                    <div>

                      <label className="text-sm text-gray-300">
                        DEPARTMENT / COURSE
                      </label>

                      {isSaveethaStudent === true ? (

                        <select
                          value={department}
                          onChange={(e) =>
                            setDepartment(
                              e.target.value
                            )
                          }
                          className={selectClass}
                        >

                          <option
                            value=""
                            className="bg-[#0b0e14] text-white"
                          >
                            Select department
                          </option>

                          {SAVEETHA_DEPARTMENTS.map(
                            (dept) => (
                              <option
                                key={dept}
                                value={dept}
                                className="bg-[#0b0e14] text-white"
                              >
                                {dept}
                              </option>
                            )
                          )}

                        </select>

                      ) : (

                        <input
                          type="text"
                          value={department}
                          onChange={(e) =>
                            setDepartment(
                              e.target.value
                            )
                          }
                          placeholder="Enter your department or course"
                          className={inputClass}
                        />

                      )}

                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-yellow-400 text-black py-4 rounded-lg font-bold tracking-wide hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {loading
                        ? "RECORDING..."
                        : "SUBMIT FOR CLEARANCE →"}
                    </button>

                  </form>

                )}

              </motion.div>

            </AnimatePresence>

            {/* NAVIGATION */}

            {step < 4 && (

              <div className="flex gap-4 mt-10">

                {step > 1 && (

                  <button
                    type="button"
                    onClick={previousStep}
                    className="flex-1 border border-white/15 text-gray-300 py-4 rounded-lg hover:border-white/30 hover:text-white transition"
                  >
                    ← BACK
                  </button>

                )}

                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-yellow-400 text-black py-4 rounded-lg font-bold hover:bg-yellow-300 transition"
                >
                  CONTINUE →
                </button>

              </div>

            )}

            {step === 4 && (

              <button
                type="button"
                onClick={previousStep}
                className="mt-5 text-sm text-gray-400 hover:text-white transition"
              >
                ← BACK TO INSTITUTION
              </button>

            )}

          </motion.section>

        </div>

      </div>

    </main>
  );
}