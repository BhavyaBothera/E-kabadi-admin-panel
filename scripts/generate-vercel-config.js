const fs = require("fs");
const path = require("path");

const required = ["DATA_MODE", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error("Missing Vercel environment variables: " + missing.join(", "));
}

if (process.env.DATA_MODE !== "supabase") {
  throw new Error('DATA_MODE must be "supabase" for the live admin deployment.');
}

const config = "window.__EKABADI_SET_CONFIG__(" + JSON.stringify({
  DATA_MODE: process.env.DATA_MODE,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
}) + ");\n";

const output = path.join(process.cwd(), "frontend", "config", "config.local.js");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, config, "utf8");
console.log("Generated frontend/config/config.local.js");
