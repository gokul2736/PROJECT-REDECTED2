"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();

      if (!cleanEmail || !password) {
        setMessage("Please enter your email and password.");
        setLoading(false);
        return;
      }

      // STEP 1: Login with Supabase Auth
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error("Admin login error:", error);
        setMessage(error.message);
        setLoading(false);
        return;
      }

      // STEP 2: Confirm session
      if (!data.user || !data.session) {
        setMessage(
          "Login failed. No active session was created."
        );
        setLoading(false);
        return;
      }

      console.log("ADMIN AUTH SUCCESS");
      console.log("User ID:", data.user.id);
      console.log("Email:", data.user.email);

      // STEP 3: Check admins table
      const { data: admin, error: adminError } =
        await supabase
          .from("admins")
          .select("id, email, role")
          .eq("id", data.user.id)
          .maybeSingle();

      if (adminError) {
        console.error("Admin verification error:", adminError);

        await supabase.auth.signOut();

        setMessage(
          "Unable to verify admin access: " +
            adminError.message
        );

        setLoading(false);
        return;
      }

      // STEP 4: User is authenticated but not an admin
      if (!admin) {
        await supabase.auth.signOut();

        setMessage(
          "Access denied. This account is not registered as an administrator."
        );

        setLoading(false);
        return;
      }

      console.log("ADMIN VERIFIED:", admin);

      // STEP 5: Go to admin dashboard
      router.replace("/admin/dashboard");
    } catch (error) {
      console.error("Unexpected admin login error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during login."
      );

      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl border border-white/10 rounded-2xl p-8 sm:p-10 bg-[#0b0b0b]">
        <p className="text-yellow-400 text-xs uppercase tracking-[0.3em]">
          PROJECT: REDACTED²
        </p>

        <h1 className="text-3xl font-semibold mt-3">
          Admin Access
        </h1>

        <p className="mt-2 text-white/40">
          Administrator Control Center
        </p>

        <form
          onSubmit={handleLogin}
          className="mt-10"
        >
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="Enter administrator email"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-yellow-400/60"
          />

          <label
            htmlFor="password"
            className="block text-sm font-medium mb-2 mt-6"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter password"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-yellow-400/60"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-7 rounded-xl bg-yellow-400 text-black py-3 font-bold hover:bg-yellow-300 transition disabled:opacity-40"
          >
            {loading ? "Verifying..." : "Enter Control Center"}
          </button>
        </form>

        {message && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
