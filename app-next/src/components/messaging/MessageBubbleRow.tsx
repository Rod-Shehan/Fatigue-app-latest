"use client";

import { cn } from "@/lib/utils";

/**
 * Chat row: driver vs manager styled like a threaded chat (not FB clone).
 * Driver = cyan (ties to operational / on-road context); manager = violet (matches manager badge).
 */
export function MessageBubbleRow({
  body,
  createdAt,
  senderLabel,
  fromManager,
  viewerIsManager,
}: {
  body: string;
  createdAt: string;
  senderLabel: string;
  /** True when sender.user.role === "manager" */
  fromManager: boolean;
  /** True on manager messages page */
  viewerIsManager: boolean;
}) {
  const isOnRight = viewerIsManager ? fromManager : !fromManager;

  return (
    <div className={cn("flex w-full", isOnRight ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(85%,28rem)] px-3.5 py-2.5 shadow-sm",
          isOnRight ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md",
          fromManager
            ? "bg-violet-600 text-white dark:bg-violet-700 dark:text-violet-50"
            : "bg-cyan-700 text-cyan-50 dark:bg-cyan-800 dark:text-cyan-100"
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              fromManager ? "text-violet-200 dark:text-violet-200" : "text-cyan-200 dark:text-cyan-200"
            )}
          >
            {fromManager ? "Manager" : "Driver"}
          </span>
          <span
            className={cn(
              "text-[10px] shrink-0 tabular-nums",
              fromManager ? "text-violet-200/90" : "text-cyan-200/90"
            )}
          >
            {createdAt}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap mt-1.5 leading-relaxed opacity-95">{body}</p>
        <p
          className={cn(
            "text-[10px] mt-1.5 opacity-75 truncate",
            fromManager ? "text-violet-200/80" : "text-cyan-200/80"
          )}
        >
          {senderLabel}
        </p>
      </div>
    </div>
  );
}
