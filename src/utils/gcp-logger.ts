import { matchesLevel } from "astro/logger";
import type { AstroLoggerDestination, AstroLoggerMessage } from "astro";

export default function gcpLogger() {
  const isProd = process.env.NODE_ENV === "production";
  const level = isProd ? "warn" : "debug";

  return {
    write(message: AstroLoggerMessage) {
      if (!matchesLevel(message.level, level)) return;

      // Exclude 404 messages in production
      if (isProd && message.message.includes("404")) {
        return;
      }

      // Map Astro's levels to GCP Severity levels
      const severityMap: Record<string, string> = {
        debug: "DEBUG",
        info: "INFO",
        warn: "WARNING",
        error: "ERROR",
      };

      const gcpLogEntry: Record<string, unknown> = {
        severity: severityMap[message.level] || "INFO",
        message: message.message,
        time: new Date().toISOString(),
        serviceContext: {
          service: process.env.K_SERVICE || "rowan-fyi",
        },
      };

      // Extract stack trace if the error message formats like one
      if (message.level === "error" && message.message.includes("\n    at ")) {
        gcpLogEntry.stack_trace = message.message;
      }

      // Write single-line JSON directly to stdout/stderr
      if (message.level === "error") {
        process.stderr.write(JSON.stringify(gcpLogEntry) + "\n");
      } else {
        process.stdout.write(JSON.stringify(gcpLogEntry) + "\n");
      }
    },
  } satisfies AstroLoggerDestination;
}
