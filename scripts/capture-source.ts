/**
 * Capture one public https page into public/sources/<id>/.
 *
 *   npx tsx scripts/capture-source.ts https://example.com example-com
 */
import fs from "node:fs";
import path from "node:path";
import { capturePublicPage } from "../server/capture";

const url = process.argv[2];
const id = (process.argv[3] || "capture").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40);
if (!url) throw new Error("Pass an https URL.");
const png = path.resolve("public", "sources", id, "capture.png");
const shot = await capturePublicPage(url, png);
const provenance = { url, fetchedAt: new Date().toISOString(), tool: path.basename(shot.browser), bytes: shot.bytes, policy: "public-https" };
fs.writeFileSync(path.join(path.dirname(png), "provenance.json"), JSON.stringify(provenance, null, 2));
console.log(JSON.stringify({ id, localPath: `sources/${id}/capture.png`, ...shot, provenance }));
