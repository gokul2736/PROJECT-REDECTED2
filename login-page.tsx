"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const SAVEETHA_DEPARTMENTS = [
  "Agri",
  "AI&DS",
  "AI&ML",
  "BME",
  "Chemical Eng",
  "Civil",
  "CSE",
  "Cyber Security",
  "CORE",
  "ECE",
  "EEE",
  "IT",
  "IOT",
  "MBA",
  "Mech",
  "MedElec",
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
  3: "Select your institutional category.",
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
  // Kept as whatsappNumber so the existing database
  // column does not need to change.
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
      if (!fullName.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }

      if (!email.trim()) {
        setErrorMessage("Please enter your email address.");
        return;
      }

      if (!email.includes("@")) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }

      if (!password) {
        setErrorMessage("Please create a password.");
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

      if (!/^\d+$/.test(whatsappNumber)) {
        setErrorMessage(
          "Contact number must contain numbers only."
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

    setStep((current) =>
      Math.min(current + 1, 4)
    );
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

    if (!yearOfStudy) {
      setErrorMessage(
        "Please select your year of study."
      );
      return;
    }

    if (!department.trim()) {
      setErrorMessage(
        "Please select or enter your department."
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

    if (isSaveethaStudent === null) {
      setErrorMessage(
        "Please select your institution type."
      );
      return;
    }

    setLoading(true);

    /*
      SUPABASE CONNECTION WILL BE PLUGGED
      INTO THIS HANDLER AFTER THE UI IS FINAL.

      Existing database structure remains untouched.

      Existing field mapping:

      full_name
      email
      whatsapp_number
      is_saveetha_student
      college_name
      year_of_study
      department
    */

    setTimeout(() => {
      setLoading(false);
      setRegistrationComplete(true);
    }, 1000);
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
   * ------------------------------------------------------------
   * SUCCESS SCREEN
   * ------------------------------------------------------------
   */

  if (registrationComplete) {
    return (
      <main className="min-h-screen bg-[#07090d] text-white flex items-center justify-center px-6 relative overflow-hidden">

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute left-0 top-[28%] w-[22%] h-px bg-yellow-400/15" />

          <div className="absolute right-0 bottom-[28%] w-[22%] h-px bg-yellow-400/15" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.025),transparent_35%)]" />

        </div>

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
            duration: 0.55,
            ease: "easeOut",
          }}
          className="relative z-10 w-full max-w-xl text-center"
        >

          <motion.div
            initial={{
              scale: 0.75,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.1,
              duration: 0.45,
            }}
            className="mx-auto w-20 h-20 rounded-full border border-cyan-400/60 bg-cyan-400/[0.035] flex items-center justify-center shadow-[0_0_35px_rgba(34,211,238,0.08)]"
          >

            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M20 6L9 17l-5-5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cyan-300"
              />
            </svg>

          </motion.div>


          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.25,
              duration: 0.35,
            }}
            className="mt-8 text-[10px] uppercase tracking-[0.3em] text-yellow-400"
          >
            Registration confirmed
          </motion.div>


          <motion.h1
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.3,
              duration: 0.4,
            }}
            className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight"
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
            className="mt-5 text-lg text-gray-400"
          >
            Your investigator profile has been successfully created.
          </motion.p>


          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.55,
              duration: 0.4,
            }}
            className="mt-4 text-sm text-gray-500"
          >
            Check your email if confirmation is required before logging in.
          </motion.p>


          <motion.button
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.7,
              duration: 0.4,
            }}
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.98,
            }}
            onClick={goToLogin}
            className="mt-10 px-8 py-4 rounded-lg bg-yellow-400 text-black font-bold tracking-wide hover:bg-yellow-300 transition-colors shadow-[0_10px_30px_rgba(250,204,21,0.08)]"
          >
            PROCEED TO LOGIN →
          </motion.button>

        </motion.div>

      </main>
    );
  }


  /*
   * ------------------------------------------------------------
   * REGISTRATION PAGE
   * ------------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#07090d] text-white relative overflow-hidden">

      {/* Background */}

      <div className="fixed inset-0 pointer-events-none">

        <div className="absolute top-[-250px] left-[8%] w-[500px] h-[500px] rounded-full bg-cyan-400/[0.018] blur-[150px]" />

        <div className="absolute bottom-[-250px] right-[8%] w-[500px] h-[500px] rounded-full bg-yellow-400/[0.018] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.014]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "90px 90px",
          }}
        />

      </div>


      {/* HEADER */}

      <header className="relative z-10 border-b border-white/10">

        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center">

          <div className="flex items-center gap-4">

            <div className="hidden sm:block w-8 h-px bg-white/20" />

            <h1 className="text-base sm:text-lg font-extrabold tracking-[0.22em]">

              PROJECT: REDACTED

              <sup className="ml-1 text-[10px] tracking-normal text-gray-400">
                2
              </sup>

            </h1>

          </div>

        </div>

      </header>


      {/* MAIN */}

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        <div className="grid lg:grid-cols-2 gap-8">


          {/* ==================================================
              LEFT — LIVE DOSSIER
          ================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              x: -15,
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
                  scale: 0.94,
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

            <motion.div
              layout
              className="relative overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-white/[0.07] to-transparent p-7"
            >

              <div className="absolute top-0 left-0 w-16 h-px bg-yellow-400/60" />

              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/[0.02] rounded-full blur-3xl" />


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
                  transition={{
                    duration: 0.2,
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

                  <AnimatePresence mode="wait">

                    <motion.p
                      key={clearance}
                      initial={{
                        opacity: 0,
                        y: 4,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="mt-2 font-semibold"
                    >
                      {clearance}
                    </motion.p>

                  </AnimatePresence>

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

                  <AnimatePresence mode="wait">

                    <motion.p
                      key={institution}
                      initial={{
                        opacity: 0,
                        y: 4,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                      }}
                      className="mt-2 font-semibold break-words"
                    >
                      {institution}
                    </motion.p>

                  </AnimatePresence>

                </div>


                <div>

                  <p className="text-xs text-gray-500">
                    DIVISION
                  </p>

                  <p
                    className={`mt-2 transition-opacity ${
                      department
                        ? "opacity-100"
                        : "opacity-50"
                    }`}
                  >
                    {department || "PENDING"}
                  </p>

                </div>


                <div>

                  <p className="text-xs text-gray-500">
                    YEAR
                  </p>

                  <p
                    className={`mt-2 transition-opacity ${
                      yearOfStudy
                        ? "opacity-100"
                        : "opacity-50"
                    }`}
                  >
                    {yearOfStudy || "PENDING"}
                  </p>

                </div>

              </div>


              <div className="border-t border-white/10 mt-8 pt-5">

                <p className="text-xs text-gray-500">
                  CONTACT CHANNEL
                </p>

                <p className="mt-2 text-sm break-all text-gray-300">
                  {email || "NOT CONNECTED"}
                </p>

              </div>

            </motion.div>

          </motion.section>


          {/* ==================================================
              RIGHT — REGISTRATION
          ================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              x: 15,
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
            className="border border-white/10 rounded-2xl bg-[#0b0e14]/95 p-6 lg:p-10"
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
                    y: -6,
                  }}
                  transition={{
                    duration: 0.22,
                  }}
                >

                  <h2 className="text-3xl font-bold mt-3">

                    {stepTitles[
                      step as keyof typeof stepTitles
                    ]}

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
                  className="mb-6 border-l-2 border-yellow-400/70 bg-yellow-400/[0.035] px-4 py-3 text-sm text-yellow-100"
                >

                  {errorMessage}

                </motion.div>

              )}

            </AnimatePresence>


            {/* STEP CONTENT */}

            <AnimatePresence mode="wait">

              {/* STEP 1 */}

              {step === 1 && (

                <motion.div
                  key="identity"
                  initial={{
                    opacity: 0,
                    x: 10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -10,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  className="space-y-6"
                >

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
                      placeholder="Enter your full name"
                      autoComplete="name"
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
                      placeholder="you@example.com"
                      autoComplete="email"
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
                      placeholder="Create a secure password"
                      autoComplete="new-password"
                      className={inputClass}
                    />

                  </div>

                </motion.div>

              )}


              {/* STEP 2 */}

              {step === 2 && (

                <motion.div
                  key="contact"
                  initial={{
                    opacity: 0,
                    x: 10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -10,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                >

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
                    Used for important investigation and event updates.
                  </p>

                </motion.div>

              )}


              {/* STEP 3 */}

              {step === 3 && (

                <motion.div
                  key="institution"
                  initial={{
                    opacity: 0,
                    x: 10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -10,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  className="grid md:grid-cols-2 gap-5"
                >

                  <motion.button
                    type="button"
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.985,
                    }}
                    onClick={() =>
                      setIsSaveethaStudent(true)
                    }
                    className={`text-left border rounded-xl p-6 transition-all duration-200 ${
                      isSaveethaStudent === true
                        ? "border-yellow-400/60 bg-yellow-400/[0.04] shadow-[0_10px_35px_rgba(250,204,21,0.04)]"
                        : "border-white/10 hover:border-white/25 hover:bg-white/[0.02]"
                    }`}
                  >

                    <p
                      className={`text-xs tracking-[0.2em] ${
                        isSaveethaStudent === true
                          ? "text-yellow-400"
                          : "text-gray-500"
                      }`}
                    >
                      INTERNAL ACCESS
                    </p>

                    <h3 className="text-xl font-bold mt-3">
                      SAVEETHA
                    </h3>

                    <p className="text-sm mt-2 text-gray-500">
                      Saveetha Engineering College student
                    </p>

                  </motion.button>


                  <motion.button
                    type="button"
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.985,
                    }}
                    onClick={() =>
                      setIsSaveethaStudent(false)
                    }
                    className={`text-left border rounded-xl p-6 transition-all duration-200 ${
                      isSaveethaStudent === false
                        ? "border-yellow-400/60 bg-yellow-400/[0.04] shadow-[0_10px_35px_rgba(250,204,21,0.04)]"
                        : "border-white/10 hover:border-white/25 hover:bg-white/[0.02]"
                    }`}
                  >

                    <p
                      className={`text-xs tracking-[0.2em] ${
                        isSaveethaStudent === false
                          ? "text-yellow-400"
                          : "text-gray-500"
                      }`}
                    >
                      EXTERNAL ACCESS
                    </p>

                    <h3 className="text-xl font-bold mt-3">
                      OTHER COLLEGE
                    </h3>

                    <p className="text-sm mt-2 text-gray-500">
                      Register from another institution
                    </p>

                  </motion.button>

                </motion.div>

              )}


              {/* STEP 4 */}

              {step === 4 && (

                <motion.form
                  key="academic"
                  onSubmit={handleRegister}
                  initial={{
                    opacity: 0,
                    x: 10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -10,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  className="space-y-6"
                >

                  {!isSaveethaStudent && (

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

                      {isSaveethaStudent
                        ? "DEPARTMENT"
                        : "DEPARTMENT / COURSE"}

                    </label>


                    {isSaveethaStudent ? (

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
                          (item) => (

                            <option
                              key={item}
                              value={item}
                              className="bg-[#0b0e14] text-white"
                            >
                              {item}
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


                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{
                      y: loading ? 0 : -2,
                    }}
                    whileTap={{
                      scale: loading ? 1 : 0.99,
                    }}
                    className="w-full mt-4 bg-yellow-400 text-black rounded-lg py-4 font-bold tracking-wide hover:bg-yellow-300 transition-colors shadow-[0_10px_30px_rgba(250,204,21,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >

                    {loading
                      ? "PROCESSING..."
                      : "COMPLETE REGISTRATION →"}

                  </motion.button>

                </motion.form>

              )}

            </AnimatePresence>


            {/* NAVIGATION */}

            {step < 4 && (

              <div className="flex gap-4 mt-10">

                {step > 1 && (

                  <motion.button
                    type="button"
                    onClick={previousStep}
                    whileHover={{
                      x: -2,
                    }}
                    className="border border-white/10 px-5 py-4 rounded-lg text-gray-300 hover:border-white/30 transition"
                  >
                    ← BACK
                  </motion.button>

                )}


                <motion.button
                  type="button"
                  onClick={nextStep}
                  whileHover={{
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.99,
                  }}
                  className="flex-1 bg-yellow-400 text-black py-4 rounded-lg font-bold tracking-wide hover:bg-yellow-300 transition-colors shadow-[0_10px_30px_rgba(250,204,21,0.06)]"
                >
                  CONTINUE →
                </motion.button>

              </div>

            )}


            {step === 4 && (

              <button
                type="button"
                onClick={previousStep}
                disabled={loading}
                className="mt-5 text-sm text-gray-500 hover:text-yellow-300 transition-colors disabled:opacity-50"
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
