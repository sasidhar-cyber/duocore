import React from 'react';

export function SkeletonCard({ type = 'square', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex flex-col rounded-2xl bg-slate-900/50 border border-slate-800/80 p-3 space-y-3"
        >
          <div
            className={`w-full bg-slate-800/80 rounded-xl ${
              type === 'circle'
                ? 'aspect-square rounded-full'
                : 'aspect-square rounded-xl'
            }`}
          />
          <div className="space-y-2">
            <div className="h-3.5 bg-slate-800 rounded w-3/4" />
            <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 bg-slate-800 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-3 bg-slate-800 rounded w-2/5" />
              <div className="h-2.5 bg-slate-800/60 rounded w-1/4" />
            </div>
          </div>
          <div className="h-3 bg-slate-800 rounded w-8" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCarousel({ count = 5, circle = false }) {
  return (
    <div className="flex gap-3 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse shrink-0 w-36 sm:w-40 p-3 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3"
        >
          <div
            className={`w-full aspect-square bg-slate-800 ${
              circle ? 'rounded-full' : 'rounded-xl'
            }`}
          />
          <div className="space-y-1.5">
            <div className="h-3 bg-slate-800 rounded w-3/4" />
            <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
