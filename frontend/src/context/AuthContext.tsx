import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isOnboarded: boolean | null;
  setIsOnboarded: (v: boolean | null) => void;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isOnboarded, setIsOnboardedState] = useState<boolean | null>(() => {
    const cached = localStorage.getItem("cursus_isOnboarded");
    if (!cached || cached === "undefined") return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  });

  const setIsOnboarded = (val: boolean | null) => {
    setIsOnboardedState(val);
    if (val !== null) {
      localStorage.setItem("cursus_isOnboarded", JSON.stringify(val));
    } else {
      localStorage.removeItem("cursus_isOnboarded");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/v1/profile/onboarded", {
            headers: { "Authorization": `Bearer ${data.session.access_token}` }
          });
          const d = await res.json();
          setIsOnboarded(d.is_onboarded);
        } catch (e) {
          setIsOnboarded(false);
        }
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/profile/onboarded", {
              headers: { "Authorization": `Bearer ${newSession.access_token}` }
            });
            const d = await res.json();
            setIsOnboarded(d.is_onboarded);
          } catch (e) {
            setIsOnboarded(false);
          }
        } else {
          setIsOnboarded(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isOnboarded,
        setIsOnboarded,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
