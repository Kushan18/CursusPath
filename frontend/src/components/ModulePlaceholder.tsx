import type { ReactNode } from "react";
import TrustRing from "./TrustRing";

interface ModulePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  phaseNote: string;
  ringVariant?: "teal" | "agent";
  ringSublabel: string;
  children?: ReactNode;
}

export default function ModulePlaceholder({
  eyebrow,
  title,
  description,
  phaseNote,
  ringVariant = "teal",
  ringSublabel,
  children,
}: ModulePlaceholderProps) {
  return (
    <div className="text-slate-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
          {title}
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl">{description}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex items-center gap-6">
        <TrustRing score={0} variant={ringVariant} sublabel={ringSublabel} />
        <div>
          <p className="text-sm text-slate-200 font-medium mb-1">
            Not wired up yet
          </p>
          <p className="text-sm text-slate-500">{phaseNote}</p>
        </div>
      </div>

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
