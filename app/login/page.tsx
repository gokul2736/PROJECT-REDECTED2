"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage(
        "Please enter your email and password."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        setErrorMessage("Invalid email or password.");
        setLoading(false);
        return;
      }

      router.push("/lobby");
    } catch (error) {
      console.error("Login error:", error);

      setErrorMessage(
        "Unable to complete login. Please try again."
      );

      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07090d] text-white flex flex-col">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto w-full px-6 py-5">
          <p className="text-xs tracking-[0.35em] text-gray-500">
            INVESTIGATION NETWORK
          </p>

          <h1 className="text-xl font-bold tracking-wide mt-1">
            PROJECT: REDACTED
            <sup className="text-xs ml-0.5">2</sup>
          </h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <p className="text-xs tracking-[0.3em] text-gray-500">
              SECURE ACCESS
            </p>

            <h2 className="text-4xl font-bold mt-3">
              Investigator Login
            </h2>

            <p className="text-gray-400 mt-3">
              Authenticate your clearance to continue.
            </p>
          </div>

          <div className="border border-white/10 rounded-2xl bg-[#0b0e14]/90 backdrop-blur-sm p-7 sm:p-9">
            <form
              onSubmit={handleLogin}
              className="space-y-6"
            >
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
                  className="mt-2 w-full bg-transparent border border-white/15 rounded-lg px-4 py-4 outline-none text-white placeholder:text-gray-600 transition-all duration-200 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/10"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300">
                  PASSWORD
                </label>

                <div className="relative mt-2">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full bg-transparent border border-white/15 rounded-lg px-4 py-4 pr-16 outline-none text-white placeholder:text-gray-600 transition-all duration-200 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white transition"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

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
                    className="border border-red-500/30 bg-red-500/5 rounded-lg px-4 py-3 text-sm text-red-300"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 text-black py-4 rounded-lg font-bold tracking-wide hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading
                  ? "AUTHENTICATING..."
                  : "AUTHENTICATE →"}
              </button>
            </form>

            <div className="border-t border-white/10 mt-8 pt-7 text-center">
              <p className="text-sm text-gray-500">
                No investigator profile yet?
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/register")
                }
                className="mt-3 text-sm text-gray-300 hover:text-yellow-400 transition"
              >
                Create your profile →
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-600 mt-6">
            AUTHORIZED PERSONNEL ONLY
          </p>
        </motion.div>
      </div>
    </main>
  );
}