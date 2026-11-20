// Loading states that hold the page's shape, so nothing jumps when the
// data arrives. Prefer these over bare "Loading…" text.

import type { CSSProperties } from "react";

/** A small inline spinner for buttons that are working. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-[1em] h-[1em] rounded-full border-[3px] border-current border-r-transparent animate-spin motion-reduce:animate-none ${className}`}
      role="status"
      aria-label="Working"
    />
  );
}

export function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

/** Profile picker: three kid cards. */
export function KidCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="panel overflow-hidden pb-6 flex flex-col items-center gap-3 border-2 border-teal-100">
          <Bone className="w-full h-20 !rounded-none" />
          <Bone className="w-28 h-28 !rounded-full -mt-16 border-4 border-white" />
          <Bone className="h-8 w-32" />
          <Bone className="h-6 w-40" />
        </div>
      ))}
    </div>
  );
}

/** Kid dashboard: hero card, week card, start button, pack grid. */
export function KidHomeSkeleton() {
  return (
    <div className="safe-page min-h-[100dvh] max-w-5xl mx-auto" aria-busy="true">
      <div className="flex items-center justify-between mb-5">
        <Bone className="h-12 w-36" />
        <div className="flex gap-2">
          <Bone className="h-12 w-36" />
          <Bone className="h-12 w-36" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Bone className="h-[325px] !rounded-[2rem]" />
        <Bone className="h-[246px] lg:h-[325px] !rounded-3xl" />
      </div>
      <Bone className="h-[88px] mt-6 !rounded-3xl" />
      <Bone className="h-6 w-80 mx-auto mt-2" />
      <Bone className="h-8 w-56 mt-8 mb-3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-[101px] !rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

/** A workout question: header, pack label, prompt card, four answers. */
export function QuestionSkeleton() {
  return (
    <div className="animate-rise" aria-busy="true">
      <Bone className="h-[148px] !rounded-3xl" />
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-[84px]" />
        ))}
      </div>
    </div>
  );
}

/** Generic page: title plus a stack of cards. */
export function ListSkeleton({ rows = 3, rowHeight = 96 }: { rows?: number; rowHeight?: number }) {
  return (
    <div className="grid gap-4" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className="!rounded-3xl" style={{ height: rowHeight }} />
      ))}
    </div>
  );
}
