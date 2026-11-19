var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.entry.ts
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// src/lib/firebase-admin.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "atomic-pager-s3rp2",
  appId: "1:851841926296:web:afde7e3dd1805b395dbced",
  apiKey: "AIzaSyDoKh8smpcwdWz1i5AmAY855KMALvPpH08",
  authDomain: "atomic-pager-s3rp2.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-urbanairqualitya-af8d71f8-9f20-4dc7-b0e3-9af9f869dc76",
  storageBucket: "atomic-pager-s3rp2.firebasestorage.app",
  messagingSenderId: "851841926296",
  measurementId: "",
  oAuthClientId: "851841926296-rubmng8q9beq7orgh3mfi94e6akmvfvd.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/lib/firebase-admin.ts
if (!getApps().length) {
  if (process.env.VERCEL === "1" && !process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must be configured for Firebase Admin on Vercel.");
  }
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON.");
    }
    if (typeof serviceAccount.project_id === "string" && serviceAccount.project_id !== firebase_applet_config_default.projectId) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT belongs to a different Firebase project.");
    }
    initializeApp({
      credential: cert(serviceAccount),
      projectId: firebase_applet_config_default.projectId
    });
  } else {
    initializeApp({ projectId: firebase_applet_config_default.projectId });
  }
}
var adminAuth = getAuth();

// src/middleware/auth.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing bearer token" });
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Missing bearer token" });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "unknown";
    console.warn("Firebase ID token verification failed:", code);
    if (code === "app/network-error" || code === "auth/internal-error") {
      res.status(503).json({ error: "Authentication verification is temporarily unavailable." });
      return;
    }
    res.status(401).json({ error: "Unauthorized: Invalid or expired session token" });
  }
};

// src/db/repository.ts
import { and, desc, eq } from "drizzle-orm";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  customRoutines: () => customRoutines,
  customRoutinesRelations: () => customRoutinesRelations,
  householdProfiles: () => householdProfiles,
  householdProfilesRelations: () => householdProfilesRelations,
  searchQueries: () => searchQueries,
  searchQueriesRelations: () => searchQueriesRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var householdProfiles = pgTable("household_profiles", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid, { onDelete: "cascade" }).notNull(),
  profileName: text("profile_name").notNull(),
  demographics: text("demographics").notNull(),
  sensitivityLevel: text("sensitivity_level").notNull(),
  safeIndoorPm25Target: integer("safe_indoor_pm25_target").default(25).notNull(),
  notes: text("notes").default("").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid, { onDelete: "cascade" }).notNull(),
  cityId: text("city_id").notNull(),
  cityName: text("city_name").notNull(),
  aqi: integer("aqi").notNull(),
  pm25: integer("pm25").notNull(),
  windKmh: integer("wind_kmh").notNull(),
  queryText: text("query_text").notNull(),
  aiSummary: text("ai_summary").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var customRoutines = pgTable("custom_routines", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  pm25ReductionUg: integer("pm25_reduction_ug").default(15).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var usersRelations = relations(users, ({ many }) => ({
  householdProfiles: many(householdProfiles),
  searchQueries: many(searchQueries),
  customRoutines: many(customRoutines)
}));
var householdProfilesRelations = relations(householdProfiles, ({ one }) => ({
  user: one(users, {
    fields: [householdProfiles.userUid],
    references: [users.uid]
  })
}));
var searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  user: one(users, {
    fields: [searchQueries.userUid],
    references: [users.uid]
  })
}));
var customRoutinesRelations = relations(customRoutines, ({ one }) => ({
  user: one(users, {
    fields: [customRoutines.userUid],
    references: [users.uid]
  })
}));

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: process.env.VERCEL === "1" ? 1 : 10,
      connectionTimeoutMillis: 15e3,
      ...process.env.SQL_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/repository.ts
async function getOrCreateUser(uid, email, displayName) {
  try {
    const result = await db.insert(users).values({
      uid,
      email,
      displayName: displayName ?? null
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        displayName: displayName ?? null
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database error in getOrCreateUser:", error);
    throw new Error("Unable to synchronize user account.", { cause: error });
  }
}
async function getUserWorkspace(uid) {
  try {
    const [profiles, queries, routines] = await Promise.all([
      db.select().from(householdProfiles).where(eq(householdProfiles.userUid, uid)).orderBy(desc(householdProfiles.updatedAt)),
      db.select().from(searchQueries).where(eq(searchQueries.userUid, uid)).orderBy(desc(searchQueries.createdAt)).limit(15),
      db.select().from(customRoutines).where(eq(customRoutines.userUid, uid)).orderBy(desc(customRoutines.createdAt))
    ]);
    return { profiles, queries, routines };
  } catch (error) {
    console.error("Database error in getUserWorkspace:", error);
    throw new Error("Unable to load saved household workspace.", { cause: error });
  }
}
async function createHouseholdProfile(input) {
  try {
    return await db.transaction(async (tx) => {
      await tx.update(householdProfiles).set({ isActive: false }).where(eq(householdProfiles.userUid, input.userUid));
      const inserted = await tx.insert(householdProfiles).values({
        userUid: input.userUid,
        profileName: input.profileName.slice(0, 100),
        demographics: input.demographics.slice(0, 220),
        sensitivityLevel: input.sensitivityLevel.slice(0, 60),
        safeIndoorPm25Target: Math.max(5, Math.min(100, Math.round(input.safeIndoorPm25Target))),
        notes: (input.notes ?? "").slice(0, 320),
        isActive: true
      }).returning();
      return inserted[0];
    });
  } catch (error) {
    console.error("Database error in createHouseholdProfile:", error);
    throw new Error("Unable to save household profile.", { cause: error });
  }
}
async function activateHouseholdProfile(userUid, profileId) {
  try {
    return await db.transaction(async (tx) => {
      const [target] = await tx.select({ id: householdProfiles.id }).from(householdProfiles).where(and(eq(householdProfiles.id, profileId), eq(householdProfiles.userUid, userUid))).limit(1);
      if (!target) return null;
      await tx.update(householdProfiles).set({ isActive: false }).where(eq(householdProfiles.userUid, userUid));
      const updated = await tx.update(householdProfiles).set({ isActive: true, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(householdProfiles.id, profileId), eq(householdProfiles.userUid, userUid))).returning();
      return updated[0] ?? null;
    });
  } catch (error) {
    console.error("Database error in activateHouseholdProfile:", error);
    throw new Error("Unable to activate household profile.", { cause: error });
  }
}
async function deleteHouseholdProfile(userUid, profileId) {
  try {
    const deleted = await db.delete(householdProfiles).where(and(eq(householdProfiles.id, profileId), eq(householdProfiles.userUid, userUid))).returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error("Database error in deleteHouseholdProfile:", error);
    throw new Error("Unable to delete household profile.", { cause: error });
  }
}
async function recordSearchQuery(input) {
  try {
    const inserted = await db.insert(searchQueries).values({
      userUid: input.userUid,
      cityId: input.cityId.slice(0, 64),
      cityName: input.cityName.slice(0, 100),
      aqi: Math.round(input.aqi),
      pm25: Math.round(input.pm25),
      windKmh: Math.round(input.windKmh),
      queryText: input.queryText.slice(0, 500),
      aiSummary: (input.aiSummary ?? "").slice(0, 1200)
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error("Database error in recordSearchQuery:", error);
    throw new Error("Unable to record search query.", { cause: error });
  }
}
async function addCustomRoutine(input) {
  try {
    const inserted = await db.insert(customRoutines).values({
      userUid: input.userUid,
      title: input.title.slice(0, 120),
      category: input.category.slice(0, 40),
      pm25ReductionUg: Math.max(2, Math.min(80, Math.round(input.pm25ReductionUg))),
      enabled: true
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error("Database error in addCustomRoutine:", error);
    throw new Error("Unable to save custom low-emission routine.", { cause: error });
  }
}
async function toggleCustomRoutine(userUid, routineId, enabled) {
  try {
    const updated = await db.update(customRoutines).set({ enabled }).where(and(eq(customRoutines.id, routineId), eq(customRoutines.userUid, userUid))).returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error("Database error in toggleCustomRoutine:", error);
    throw new Error("Unable to update custom routine.", { cause: error });
  }
}
async function deleteCustomRoutine(userUid, routineId) {
  try {
    const deleted = await db.delete(customRoutines).where(and(eq(customRoutines.id, routineId), eq(customRoutines.userUid, userUid))).returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error("Database error in deleteCustomRoutine:", error);
    throw new Error("Unable to delete custom routine.", { cause: error });
  }
}

// src/services/safetyRules.ts
function classifyUsAqi(aqi) {
  if (aqi === null || !Number.isFinite(aqi) || aqi < 0) {
    return {
      band: "Data unavailable",
      severity: "moderate",
      outdoorGuidance: "Live US AQI estimate unavailable. Check local guidance before strenuous outdoor activity.",
      sensitiveGuidance: "Keep rescue inhalers accessible and monitor breathing symptoms indoors.",
      maskProtocol: "Keep fitted N95/KF94 respirators ready if smoke or haze is visible."
    };
  }
  if (aqi >= 301) {
    return {
      band: "Hazardous (US AQI 301+)",
      severity: "severe",
      outdoorGuidance: "Avoid all non-essential outdoor exertion; move children\u2019s play and exercise strictly indoors.",
      sensitiveGuidance: "High risk of acute airway inflammation for children, older adults, asthma, and chronic bronchitis. Maintain sealed indoor clean-air rooms.",
      maskProtocol: "Fitted valveless N95 / FFP2 (or child-sized KF94) required for any outdoor errand."
    };
  }
  if (aqi >= 201) {
    return {
      band: "Very Unhealthy (US AQI 201\u2013300)",
      severity: "very-poor",
      outdoorGuidance: "Avoid prolonged or heavy outdoor exertion; keep outdoor breaks brief and low-intensity.",
      sensitiveGuidance: "Sensitive households (pediatric, elderly, asthma/COPD) should stay indoors with continuous filtration.",
      maskProtocol: "Well-sealed N95 / KN95 recommended during street transit or walks."
    };
  }
  if (aqi >= 151) {
    return {
      band: "Unhealthy (US AQI 151\u2013200)",
      severity: "poor",
      outdoorGuidance: "Reduce prolonged outdoor exertion; relocate high-intensity sports indoors.",
      sensitiveGuidance: "Children, older adults, and respiratory-sensitive individuals should suspend outdoor play.",
      maskProtocol: "Fitted KF94 / N95 advised near heavy traffic corridors."
    };
  }
  if (aqi >= 101) {
    return {
      band: "Unhealthy for Sensitive Groups (US AQI 101\u2013150)",
      severity: "sensitive",
      outdoorGuidance: "General healthy adults may stay active with lighter intensity; avoid roadside exertion.",
      sensitiveGuidance: "Limit prolonged outdoor play for young children and elderly family members with bronchitis or asthma.",
      maskProtocol: "Keep KF94/N95 masks handy for rush-hour commuting."
    };
  }
  if (aqi >= 51) {
    return {
      band: "Moderate (US AQI 51\u2013100)",
      severity: "moderate",
      outdoorGuidance: "Outdoor activity generally acceptable for most people; monitor very sensitive individuals.",
      sensitiveGuidance: "Unusually sensitive respiratory patients should watch for cough or shortness of breath.",
      maskProtocol: "Optional; helpful along high-diesel traffic arterial roads."
    };
  }
  return {
    band: "Good (US AQI 0\u201350)",
    severity: "good",
    outdoorGuidance: "Outdoor activity is generally favorable based on current model estimates.",
    sensitiveGuidance: "Standard precautions apply; monitor personal symptoms if triggers are present.",
    maskProtocol: "No particulate respirator typically required outdoors."
  };
}
function classifyEuropeanAqi(eaqi) {
  if (eaqi === null || !Number.isFinite(eaqi) || eaqi < 0) return "Data unavailable";
  if (eaqi > 100) return "Extremely Poor (EAQI > 100)";
  if (eaqi > 80) return "Very Poor (EAQI 81\u2013100)";
  if (eaqi > 60) return "Poor (EAQI 61\u201380)";
  if (eaqi > 40) return "Moderate (EAQI 41\u201360)";
  if (eaqi > 20) return "Fair (EAQI 21\u201340)";
  return "Good (EAQI 0\u201320)";
}
function buildDeterministicSafetyBrief(params) {
  const us = classifyUsAqi(params.usAqi);
  const euBand = classifyEuropeanAqi(params.europeanAqi);
  let ventilationRule = "Ventilation window could not be determined from available hourly air-quality forecasts; keep windows sealed if outdoor haze is present.";
  if (params.saferWindowLabel) {
    if (params.usAqi !== null && params.usAqi >= 201) {
      ventilationRule = `High ambient burden: avoid prolonged open windows. Restrict brief cross-ventilation (10\u201315 min max for CO2 purge) to the relatively lower-forecast window (${params.saferWindowLabel}), then re-seal rooms and run filtration toward \u2264 ${params.safeIndoorPm25Target} \xB5g/m\xB3. Lower forecast hours are NOT pollution-free.`;
    } else if (params.usAqi !== null && params.usAqi >= 101) {
      ventilationRule = `Moderate-to-unhealthy ambient levels: favor short 15\u201320 min cross-ventilation during ${params.saferWindowLabel} when modeled particulates dip, while keeping active indoor filtration ready.`;
    } else {
      ventilationRule = `Cross-ventilation is generally favorable during ${params.saferWindowLabel}, though conditions still reflect model estimates rather than hyperlocal street sensors.`;
    }
  }
  if (params.windKmh !== null && params.windKmh <= 6) {
    ventilationRule += " Low surface wind (\u2264 6 km/h) slows pollutant dispersion regardless of temperature.";
  }
  if (params.precipitationMm !== null && params.precipitationMm > 0.2) {
    ventilationRule += " Light precipitation may settle coarse road dust slightly, but weather alone never guarantees safe AQI.";
  }
  return {
    usAqiBand: us.band,
    europeanAqiBand: euBand,
    severity: us.severity,
    outdoorActivityRule: us.outdoorGuidance,
    sensitiveGroupRule: us.sensitiveGuidance,
    ventilationRule,
    maskGuidance: us.maskProtocol,
    saferWindowLabel: params.saferWindowLabel
  };
}

// server.entry.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = Number(process.env.PORT) || 3e3;
var isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");
var NOMINATIM_CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var NOMINATIM_MIN_INTERVAL_MS = 1100;
var nominatimCache = /* @__PURE__ */ new Map();
var nextNominatimRequestAt = 0;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function fmtVal(val, unit) {
  return val !== null && val !== void 0 && Number.isFinite(val) ? `${val} ${unit}` : "Data unavailable";
}
function buildSystemInstruction(ctx) {
  const routinesText = ctx.activeRoutines.length > 0 ? ctx.activeRoutines.join(", ") : "None enabled yet";
  const safeTarget = ctx.safeIndoorPm25Target ?? 25;
  const deterministic = buildDeterministicSafetyBrief({
    usAqi: ctx.usAqi,
    europeanAqi: ctx.europeanAqi,
    windKmh: ctx.windKmh,
    precipitationMm: ctx.precipitationMm,
    saferWindowLabel: ctx.saferWindowLabel,
    safeIndoorPm25Target: safeTarget
  });
  return [
    "You are AEROVA, the Urban Air Quality Assistant advisor. Help families and communities navigate urban air pollution and weather conditions with grounded, non-alarmist, evidence-based guidance.",
    "",
    "[VERIFIED OPEN-METEO CONTEXT]",
    `- Location: ${ctx.cityName}${ctx.admin1 ? `, ${ctx.admin1}` : ""}, ${ctx.country} (Coordinates: ${ctx.lat.toFixed(3)}, ${ctx.lon.toFixed(3)}; Timezone: ${ctx.timezone || "auto"})`,
    `- Data Source Disclosure: Open-Meteo atmospheric model estimates (CAMS regional assimilation) & Open-Meteo Forecast API \u2014 NOT ground-station hardware sensors.`,
    `- Weather Timestamp: ${ctx.weatherTimestamp || "Unavailable"} | Air Quality Timestamp: ${ctx.airQualityTimestamp || "Unavailable"}`,
    `- Air Quality Estimates: US EPA AQI = ${ctx.usAqi ?? "Data unavailable"} (${deterministic.usAqiBand}) | European AQI (EAQI) = ${ctx.europeanAqi ?? "Data unavailable"} (${deterministic.europeanAqiBand})`,
    `- Pollutants (\xB5g/m\xB3): PM2.5 = ${fmtVal(ctx.pm25, "\xB5g/m\xB3")}, PM10 = ${fmtVal(ctx.pm10, "\xB5g/m\xB3")}, NO2 = ${fmtVal(ctx.no2, "\xB5g/m\xB3")}, O3 = ${fmtVal(ctx.o3, "\xB5g/m\xB3")}, SO2 = ${fmtVal(ctx.so2, "\xB5g/m\xB3")}, CO = ${fmtVal(ctx.co, "\xB5g/m\xB3")}`,
    `- Current Weather: ${ctx.weatherCondition}, Temp ${fmtVal(ctx.tempC, "\xB0C")} (Feels like ${fmtVal(ctx.apparentTempC, "\xB0C")}), Humidity ${fmtVal(ctx.humidityPct, "%")}, Wind ${fmtVal(ctx.windKmh, "km/h")} ${ctx.windDir}, Precipitation ${fmtVal(ctx.precipitationMm, "mm")}, Cloud Cover ${fmtVal(ctx.cloudCoverPct, "%")}`,
    ...ctx.forecastSummary ? [`- Short-Term Forecast Trajectory: ${ctx.forecastSummary}`] : [],
    "",
    "[DETERMINISTIC PUBLIC-HEALTH SAFETY RULES \u2014 MUST NOT OVERRIDE]",
    `- Outdoor Activity Rule: ${deterministic.outdoorActivityRule}`,
    `- Sensitive Group Rule: ${deterministic.sensitiveGroupRule}`,
    `- Ventilation Rule: ${deterministic.ventilationRule}`,
    `- Mask Guidance: ${deterministic.maskGuidance}`,
    `- Household Profile: ${ctx.householdLabel} (Sensitivity Tier: ${ctx.sensitivityLevel ?? "standard"}; Target Indoor PM2.5 \u2264 ${safeTarget} \xB5g/m\xB3)`,
    `- Household Clinical Context: ${ctx.householdSummary}`,
    `- Active Indoor Mitigation Routines: ${routinesText} (Modeled Indoor PM2.5 Estimate: ${ctx.estimatedIndoorPm25 !== null ? `${ctx.estimatedIndoorPm25} \xB5g/m\xB3` : "Data unavailable"}, ${ctx.totalReductionPct}% modeled cut)`,
    "",
    "STRICT ADVISORY SAFETY & TRANSPARENCY MANDATES:",
    "1. NEVER invent health thresholds or contradict the Deterministic Public-Health Safety Rules above.",
    "2. NEVER confuse US EPA AQI (0\u2013500) with European AQI (EAQI) or India CPCB AQI; always cite the standard name when quoting an index.",
    '3. NEVER present Open-Meteo model estimates as physical ground-station measurements, and NEVER fabricate values marked "Data unavailable".',
    '4. NEVER claim weather conditions (wind, rain, temperature) alone determine AQI, and NEVER promise any time window is "pollution-free" \u2014 frame lower forecast periods only as relatively lower-concentration windows.',
    "5. Include the Weather & Air Quality timestamps briefly when summarizing current conditions.",
    "6. Balance accessible low-cost home safeguards (wet mopping, sealing door gaps, Corsi-Rosenthal MERV-13 box fan, covered induction cooking) with HEPA/respirator guidance, and advise consulting a clinician promptly for respiratory symptoms without diagnosing.",
    "",
    "[OUTPUT FORMAT]",
    "Provide a concise, empathetic Markdown advisory (~200\u2013320 words) with:",
    "- **Current Air & Weather Summary (Model Estimates + Timestamps)**",
    "- **Deterministic Safety & Activity Guidance for Your Household**",
    "- **Practical Ventilation, Filtration & Commute Actions**"
  ].join("\n");
}
function isTransientGeminiError(error) {
  const raw = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return raw.includes("503") || raw.includes("unavailable") || raw.includes("high demand");
}
function mapGeminiError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("api_key_invalid") || lower.includes("permission_denied") || lower.includes("403")) {
    return {
      status: 403,
      message: "Gemini API key is missing or unauthorized. Check GEMINI_API_KEY in Settings > Secrets."
    };
  }
  if (lower.includes("resource_exhausted") || lower.includes("429")) {
    return {
      status: 429,
      message: "Rate limit or quota reached for the Gemini API key. Please retry shortly."
    };
  }
  if (lower.includes("503") || lower.includes("unavailable") || lower.includes("high demand")) {
    return {
      status: 503,
      message: "The advisory model is experiencing temporary high demand. Please retry in a few seconds."
    };
  }
  if (lower.includes("not_found") || lower.includes("404")) {
    return {
      status: 404,
      message: "Requested Gemini model could not be found. Verify model configuration."
    };
  }
  return {
    status: 500,
    message: "Unable to generate air quality advisory right now. Please retry shortly."
  };
}
var app = express();
async function configureApp(app2) {
  app2.disable("x-powered-by");
  app2.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
    const configuredOrigin = process.env.CORS_ORIGIN?.replace(/\/$/, "");
    if (configuredOrigin && _req.headers.origin === configuredOrigin) {
      res.setHeader("Access-Control-Allow-Origin", configuredOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    }
    if (_req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app2.use(express.json({ limit: "1mb" }));
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app2.get("/api/reverse-geocode", async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: "Valid lat and lon are required." });
      return;
    }
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = nominatimCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.data);
      return;
    }
    const now = Date.now();
    const waitMs = Math.max(0, nextNominatimRequestAt - now);
    if (waitMs > 2500) {
      res.status(429).json({ error: "Locality lookup is busy; coordinate telemetry is still available." });
      return;
    }
    nextNominatimRequestAt = Math.max(now, nextNominatimRequestAt) + NOMINATIM_MIN_INTERVAL_MS;
    const controller = new AbortController();
    let timer;
    try {
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      timer = setTimeout(() => controller.abort(), 3500);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}&zoom=13&addressdetails=1`;
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "UrbanAirQualityAssistant/1.0 (non-commercial environmental health app)",
          "Accept-Language": "en"
        }
      });
      if (!resp.ok) {
        res.status(503).json({ error: "Locality lookup is temporarily unavailable." });
        return;
      }
      const data = await resp.json();
      const addr = data.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const area = addr.neighbourhood || addr.suburb || addr.city_district || "";
      const result = {
        city,
        area,
        admin1: addr.state || "",
        country: addr.country || ""
      };
      nominatimCache.set(cacheKey, {
        expiresAt: Date.now() + NOMINATIM_CACHE_TTL_MS,
        data: result
      });
      if (nominatimCache.size > 1e3) {
        const oldestKey = nominatimCache.keys().next().value;
        if (oldestKey) nominatimCache.delete(oldestKey);
      }
      res.json(result);
    } catch (error) {
      res.status(503).json({
        error: error instanceof Error && error.name === "AbortError" ? "Locality lookup timed out." : "Locality lookup failed."
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
  app2.get("/api/basin-grid", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: "Valid lat and lon query parameters are required." });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);
    try {
      const sectors = [
        { id: "sector-center", label: "Center Coordinates", bearing: "CORE", dLat: 0, dLon: 0 },
        { id: "sector-nw", label: "Northwest Corridor (~5 km)", bearing: "NW", dLat: 0.036, dLon: -0.036 },
        { id: "sector-ne", label: "Northeast Corridor (~5 km)", bearing: "NE", dLat: 0.036, dLon: 0.036 },
        { id: "sector-se", label: "Southeast Sector (~5 km)", bearing: "SE", dLat: -0.036, dLon: 0.036 },
        { id: "sector-sw", label: "Southwest Sector (~5 km)", bearing: "SW", dLat: -0.036, dLon: -0.036 }
      ];
      const gridCoordinates = sectors.map((sector) => {
        const gridLat = Number((lat + sector.dLat).toFixed(4));
        const rawLon = lon + sector.dLon;
        const gridLon = Number((((rawLon + 180) % 360 + 360) % 360 - 180).toFixed(4));
        return { lat: gridLat, lon: gridLon };
      });
      if (gridCoordinates.some((point) => point.lat < -90 || point.lat > 90)) {
        res.status(400).json({
          error: "The five-sector grid would extend beyond the valid latitude range."
        });
        return;
      }
      const latitudes = gridCoordinates.map((point) => point.lat.toFixed(4)).join(",");
      const longitudes = gridCoordinates.map((point) => point.lon.toFixed(4)).join(",");
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitudes}&longitude=${longitudes}&current=us_aqi,european_aqi,pm2_5,nitrogen_dioxide&timezone=auto`;
      const resp = await fetch(url, { signal: controller.signal });
      if (resp.status === 429) {
        console.warn(`[basin-grid] Open-Meteo rate limited the request (${resp.status}).`);
        res.status(429).json({ error: "Open-Meteo air-quality rate limit reached. Retry shortly." });
        return;
      }
      if (!resp.ok) {
        console.warn(`[basin-grid] Open-Meteo returned HTTP ${resp.status}.`);
        res.status(502).json({ error: `Open-Meteo spatial grid returned HTTP ${resp.status}.` });
        return;
      }
      let raw;
      try {
        raw = await resp.json();
      } catch {
        console.error("[basin-grid] Open-Meteo returned malformed JSON.");
        res.status(502).json({ error: "Open-Meteo returned malformed spatial-grid data." });
        return;
      }
      const rows = Array.isArray(raw) ? raw : [raw];
      if (rows.length !== sectors.length || rows.some(
        (row) => !row || typeof row !== "object" || !("current" in row) || !row.current || typeof row.current !== "object"
      )) {
        console.error(`[basin-grid] Invalid Open-Meteo payload: expected ${sectors.length} coordinate rows.`);
        res.status(502).json({ error: "Open-Meteo returned an incomplete spatial-grid response." });
        return;
      }
      const typedRows = rows;
      const nodes = sectors.map((sec, i) => {
        const cur = typedRows[i].current;
        const toNullNum = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
        return {
          id: sec.id,
          label: sec.label,
          bearing: sec.bearing,
          lat: gridCoordinates[i].lat,
          lon: gridCoordinates[i].lon,
          usAqi: toNullNum(cur?.us_aqi),
          europeanAqi: toNullNum(cur?.european_aqi),
          pm25: toNullNum(cur?.pm2_5),
          no2: toNullNum(cur?.nitrogen_dioxide),
          apiTime: cur?.time ?? null
        };
      });
      res.json({
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isModelEstimate: true,
        source: "Open-Meteo Air Quality Model Grid",
        nodes
      });
    } catch (error) {
      console.error(
        `[basin-grid] Upstream request failed (${error instanceof Error ? error.name : "unknown error"}).`
      );
      res.status(503).json({
        error: error instanceof Error && error.name === "AbortError" ? "Spatial Open-Meteo grid request timed out." : "Unable to reach Open-Meteo spatial grid."
      });
    } finally {
      clearTimeout(timeout);
    }
  });
  app2.get("/api/user/workspace", requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid;
      const email = req.user.email || `${uid}@firebase.user`;
      const name = typeof req.user.name === "string" ? req.user.name : null;
      await getOrCreateUser(uid, email, name);
      const workspace = await getUserWorkspace(uid);
      res.json(workspace);
    } catch (error) {
      console.error("Failed to load user workspace:", error);
      res.status(500).json({ error: "Failed to load household workspace." });
    }
  });
  app2.get("/api/user/profiles", requireAuth, async (req, res) => {
    try {
      const workspace = await getUserWorkspace(req.user.uid);
      res.json({ profiles: workspace.profiles });
    } catch (error) {
      console.error("Failed to load household profiles:", error);
      res.status(500).json({ error: "Failed to load household profiles." });
    }
  });
  app2.post("/api/user/profiles", requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid;
      const email = req.user.email || `${uid}@firebase.user`;
      await getOrCreateUser(uid, email, typeof req.user.name === "string" ? req.user.name : null);
      const { profileName, demographics, sensitivityLevel, safeIndoorPm25Target, notes } = req.body;
      if (!profileName?.trim() || !demographics?.trim()) {
        res.status(400).json({ error: "Profile name and demographics are required." });
        return;
      }
      const created = await createHouseholdProfile({
        userUid: uid,
        profileName: profileName.trim(),
        demographics: demographics.trim(),
        sensitivityLevel: sensitivityLevel?.trim() || "pediatric-elderly",
        safeIndoorPm25Target: Number(safeIndoorPm25Target) || 25,
        notes: notes?.trim() || ""
      });
      res.status(201).json(created);
    } catch (error) {
      console.error("Failed to create household profile:", error);
      res.status(500).json({ error: "Failed to save household profile." });
    }
  });
  app2.patch("/api/user/profiles/:id/activate", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid profile ID." });
      return;
    }
    try {
      const updated = await activateHouseholdProfile(req.user.uid, id);
      if (!updated) {
        res.status(404).json({ error: "Household profile not found." });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to activate profile." });
    }
  });
  app2.delete("/api/user/profiles/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid profile ID." });
      return;
    }
    try {
      const deleted = await deleteHouseholdProfile(req.user.uid, id);
      if (!deleted) {
        res.status(404).json({ error: "Household profile not found." });
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete profile." });
    }
  });
  app2.post("/api/user/queries", requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid;
      const email = req.user.email || `${uid}@firebase.user`;
      await getOrCreateUser(uid, email, typeof req.user.name === "string" ? req.user.name : null);
      const { cityId, cityName, aqi, pm25, windKmh, queryText, aiSummary } = req.body;
      if (!cityId || !cityName || !queryText?.trim()) {
        res.status(400).json({ error: "cityId, cityName, and queryText are required." });
        return;
      }
      const saved = await recordSearchQuery({
        userUid: uid,
        cityId,
        cityName,
        aqi: Number(aqi) || 0,
        pm25: Number(pm25) || 0,
        windKmh: Number(windKmh) || 0,
        queryText: queryText.trim(),
        aiSummary: aiSummary?.trim() || ""
      });
      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({ error: "Failed to save query history." });
    }
  });
  app2.post("/api/user/routines", requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid;
      const email = req.user.email || `${uid}@firebase.user`;
      await getOrCreateUser(uid, email, typeof req.user.name === "string" ? req.user.name : null);
      const { title, category, pm25ReductionUg } = req.body;
      if (!title?.trim()) {
        res.status(400).json({ error: "Routine title is required." });
        return;
      }
      const saved = await addCustomRoutine({
        userUid: uid,
        title: title.trim(),
        category: category?.trim() || "Filtration",
        pm25ReductionUg: Number(pm25ReductionUg) || 15
      });
      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({ error: "Failed to add custom routine." });
    }
  });
  app2.patch("/api/user/routines/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const { enabled } = req.body;
    if (!Number.isInteger(id) || id <= 0 || typeof enabled !== "boolean") {
      res.status(400).json({ error: "Valid routine ID and boolean enabled flag are required." });
      return;
    }
    try {
      const updated = await toggleCustomRoutine(req.user.uid, id, enabled);
      if (!updated) {
        res.status(404).json({ error: "Custom routine not found." });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle custom routine." });
    }
  });
  app2.delete("/api/user/routines/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid routine ID." });
      return;
    }
    try {
      await deleteCustomRoutine(req.user.uid, id);
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom routine." });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(403).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets."
      });
      return;
    }
    const { message, history, context } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "A non-empty message is required." });
      return;
    }
    if (!context || typeof context.cityName !== "string") {
      res.status(400).json({ error: "Environmental and household context is required." });
      return;
    }
    const contents = [
      ...(Array.isArray(history) ? history : []).filter((m) => (m.role === "user" || m.role === "model") && typeof m.text === "string" && m.text.trim()).slice(-10).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }]
      })),
      {
        role: "user",
        parts: [{ text: `[USER QUERY]
"${message.trim()}"` }]
      }
    ];
    try {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(": connected\n\n");
      const delaysMs = [600, 1400];
      let stream = null;
      let lastError = null;
      for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
        try {
          stream = await ai.models.generateContentStream({
            model: "gemini-4-hydrogen",
            contents,
            config: {
              systemInstruction: buildSystemInstruction(context),
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
            }
          });
          break;
        } catch (err) {
          lastError = err;
          if (attempt < delaysMs.length && isTransientGeminiError(err)) {
            await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
            continue;
          }
          throw err;
        }
      }
      if (!stream) {
        throw lastError ?? new Error("Unable to initialize advisory stream.");
      }
      for await (const chunk of stream) {
        const text2 = chunk.text;
        if (text2) {
          res.write(`data: ${JSON.stringify({ text: text2 })}

`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}

`);
      res.end();
    } catch (error) {
      const mapped = mapGeminiError(error);
      if (!res.headersSent) {
        res.status(mapped.status).json({ error: mapped.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: mapped.message })}

`);
        res.end();
      }
    }
  });
  if (!isProduction && process.env.VERCEL !== "1") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else if (process.env.VERCEL !== "1") {
    app2.use(express.static(path.resolve(__dirname, "public")));
  }
  app2.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found." });
  });
  app2.use((error, req, res, _next) => {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
    console.error("Request failed:", error instanceof Error ? error.message : "Unknown request error");
    if (req.path.startsWith("/api/")) {
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: status === 400 ? "Invalid request body." : "Internal server error."
      });
      return;
    }
    res.status(500).send("Internal server error.");
  });
  app2.get("*", (_req, res) => {
    const indexPath = path.resolve(__dirname, "public/index.html");
    res.sendFile(indexPath);
  });
}
await configureApp(app);
var server_entry_default = app;
if (process.env.VERCEL !== "1") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Urban Air Quality Assistant server listening on http://localhost:${PORT}`);
  });
}
export {
  server_entry_default as default
};
