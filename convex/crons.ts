import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up stuck imports every hour
// Deletes imports that have been stuck in "mapping" status for over 1 hour
crons.interval(
  "cleanup-stuck-imports",
  { hours: 1 },
  internal.imports.cleanupStuckImports
);

export default crons;
