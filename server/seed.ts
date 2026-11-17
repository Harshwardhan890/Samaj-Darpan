import "dotenv/config";
import { reseed, getDb, writeNow } from "./db";

/**
 * Force-reseed the JSON store with the seeded demonstration and sourced
 * records. Destructive: existing accounts, complaints and audit entries in
 * server/data/db.json are replaced.
 */
reseed(true);
writeNow();
const database = getDb();
console.log(
  `[seed] wrote ${database.projects.length} projects, ${database.representatives.length} representatives, ${database.users.length} accounts`,
);
console.log(
  `[seed] sourced: ${database.projects.filter((p) => p.dataClass !== "demonstration").length}, demonstration: ${database.projects.filter((p) => p.dataClass === "demonstration").length}`,
);
