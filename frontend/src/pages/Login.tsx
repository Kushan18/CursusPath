import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const { signInWithPassword, signUpWithPassword, signInWithGoogle } =
    useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === "signin") {
      const { error } = await signInWithPassword(email, password);
      setSubmitting(false);
      if (error) {
        setError(error);
        return;
      }
      navigate("/offer-verification");
    } else {
      const { error } = await signUpWithPassword(email, password, fullName);
      setSubmitting(false);
      if (error) {
        setError(error);
        return;
      }
      setSignupDone(true);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 font-body">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <ShieldCheck className="text-teal" size={26} strokeWidth={2.2} />
          <span className="font-display font-semibold text-xl tracking-tight text-text">
            CursusPath
          </span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          {signupDone ? (
            <div className="text-center">
              <p className="text-text font-medium mb-2">Check your inbox</p>
              <p className="text-sm text-muted">
                We sent a confirmation link to {email}. Confirm your email,
                then sign in below.
              </p>
              <button
                onClick={() => {
                  setSignupDone(false);
                  setMode("signin");
                }}
                className="mt-6 text-sm text-teal hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="flex mb-6 border border-border rounded-lg p-1">
                <button
                  className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                    mode === "signin"
                      ? "bg-teal-dim text-teal"
                      : "text-muted"
                  }`}
                  onClick={() => setMode("signin")}
                  type="button"
                >
                  Sign in
                </button>
                <button
                  className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                    mode === "signup"
                      ? "bg-teal-dim text-teal"
                      : "text-muted"
                  }`}
                  onClick={() => setMode("signup")}
                  type="button"
                >
                  Create account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs text-muted mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-teal outline-none"
                      placeholder="Ada Lovelace"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-muted mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-teal outline-none"
                    placeholder="you@college.edu"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-teal outline-none"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-sm text-danger">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-teal text-bg font-medium text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting
                    ? "Please wait…"
                    : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted">or</span>
                <div className="h-px bg-border flex-1" />
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full border border-border rounded-lg py-2.5 text-sm text-text hover:bg-surface-raised transition-colors"
              >
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
