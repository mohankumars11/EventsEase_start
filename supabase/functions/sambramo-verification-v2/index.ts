import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const AADHAAR_MODE = (Deno.env.get("AADHAAR_VERIFY_MODE") || "none").toLowerCase();
const AADHAAR_URL = Deno.env.get("AADHAAR_PROVIDER_URL") || "";
const AADHAAR_KEY = Deno.env.get("AADHAAR_PROVIDER_KEY") || "";
const AADHAAR_NAME = Deno.env.get("AADHAAR_PROVIDER_NAME") || "aadhaar-provider";
const AADHAAR_CALLBACK_SECRET = Deno.env.get("AADHAAR_CALLBACK_SECRET") || "";
const CHALLENGE_SECRET = Deno.env.get("AADHAAR_CHALLENGE_SECRET") || SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const DL_URL = Deno.env.get("DL_VERIFY_PROVIDER_URL") || "";
const DL_KEY = Deno.env.get("DL_VERIFY_PROVIDER_KEY") || "";
const DL_NAME = Deno.env.get("DL_VERIFY_PROVIDER_NAME") || "rto-provider";
const FSSAI_URL = Deno.env.get("FSSAI_VERIFY_PROVIDER_URL") || "";
const FSSAI_KEY = Deno.env.get("FSSAI_VERIFY_PROVIDER_KEY") || "";
const FSSAI_NAME = Deno.env.get("FSSAI_VERIFY_PROVIDER_NAME") || "fssai-provider";
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const AI_MODEL = Deno.env.get("AI_MODEL") || "qwen/qwen3.8-27b:free";
const BUCKET = "partner-documents";

const DRIVE_TRADES = new Set([
  "Transportation",
  "Valet Parking",
  "Mini Truck / Pickup",
  "Medium / Large Goods Vehicle",
  "Passenger Transport",
]);
const FOOD_TRADES = new Set(["Bar & Beverages", "Cake & Desserts", "Catering & Food"]);
const SAFETY_TRADES = new Set(["Event Lighting", "Power & Cooling", "Safety & Facilities", "Security Services"]);
const PREMISES_TRADES = new Set(["Venue"]);

const LABELS: Record<string, string> = {
  "VER-ID-IDENTITY": "Identity document",
  "VER-TRADE-FSSAI": "FSSAI licence",
  "VER-TRADE-DL": "Driving licence",
  "VER-TRADE-RC": "Vehicle registration (RC)",
  "VER-TRADE-INSURANCE": "Vehicle insurance",
  "VER-TRADE-PUC": "Pollution certificate (PUC)",
  "VER-TRADE-PERMIT": "Commercial permit / fitness",
  "VER-TRADE-PSARA": "PSARA licence",
  "VER-TRADE-ELECTRICAL": "Electrical contractor licence",
  "VER-TRADE-LIABILITY": "Public liability insurance",
  "VER-TRADE-PROPERTY": "Venue ownership / authorisation",
  "VER-TRADE-OCCUPANCY": "Occupancy certificate",
  "VER-TRADE-FIRE": "Fire safety NOC",
};

const HINTS: Record<string, string> = {
  "VER-ID-IDENTITY": "Aadhaar is the recommended identity route. A driving licence is offered here only when you list a driving service.",
  "VER-TRADE-FSSAI": "Shown only because you selected a food-service trade.",
  "VER-TRADE-DL": "Front + back. The RTO/provider check runs immediately when configured.",
  "VER-TRADE-RC": "RC for the vehicle you will use.",
  "VER-TRADE-INSURANCE": "Current insurance for the same vehicle.",
  "VER-TRADE-PUC": "Current PUC for the same vehicle.",
  "VER-TRADE-PERMIT": "Commercial permit/fitness where applicable.",
  "VER-TRADE-PSARA": "Shown only for Security Services.",
  "VER-TRADE-ELECTRICAL": "Shown only for Event Lighting / Power & Cooling.",
  "VER-TRADE-LIABILITY": "Shown only for public-safety trades.",
  "VER-TRADE-PROPERTY": "Shown only for Venue.",
  "VER-TRADE-OCCUPANCY": "Shown only for Venue.",
  "VER-TRADE-FIRE": "Shown only for Venue.",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,apikey,content-type",
      "access-control-allow-methods": "POST,OPTIONS",
    },
  });

function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : null;
}

async function authVendor(req: Request) {
  const token = bearer(req);
  if (!token) return null;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  const { data: vendor, error: vendorError } = await db
    .from("vendors")
    .select("id,identity_document")
    .eq("profile_id", data.user.id)
    .maybeSingle();
  if (vendorError || !vendor) return null;
  return { db, user: data.user, vendor };
}

function serviceDb() {
  return SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;
}

async function tradesFor(db: ReturnType<typeof createClient>, vendorId: string) {
  const listings = await db.from("partner_listings").select("trade").eq("vendor_id", vendorId);
  if (!listings.error && listings.data?.length) {
    return [...new Set((listings.data || []).map((x: any) => x.trade).filter(Boolean))];
  }
  const services = await db.from("vendor_services").select("category").eq("vendor_id", vendorId).eq("is_active", true);
  return [...new Set((services.data || []).map((x: any) => x.category).filter(Boolean))];
}

function relevantRequirements(trades: string[], identityChoice: string | null) {
  const out = new Set<string>(["VER-ID-IDENTITY"]);
  if (trades.some(t => FOOD_TRADES.has(t))) out.add("VER-TRADE-FSSAI");
  if (trades.some(t => DRIVE_TRADES.has(t))) {
    out.add("VER-TRADE-RC");
    out.add("VER-TRADE-INSURANCE");
    out.add("VER-TRADE-PUC");
    out.add("VER-TRADE-PERMIT");
    if (identityChoice !== "dl") out.add("VER-TRADE-DL");
  }
  if (trades.some(t => SAFETY_TRADES.has(t))) {
    out.add("VER-TRADE-ELECTRICAL");
    out.add("VER-TRADE-LIABILITY");
  }
  if (trades.includes("Security Services")) out.add("VER-TRADE-PSARA");
  if (trades.some(t => PREMISES_TRADES.has(t))) {
    out.add("VER-TRADE-PROPERTY");
    out.add("VER-TRADE-OCCUPANCY");
    out.add("VER-TRADE-FIRE");
  }
  return [...out];
}

function identityOptions(trades: string[]) {
  const options = [{ kind: "aadhaar", label: "Aadhaar", recommended: true }];
  if (trades.some(t => DRIVE_TRADES.has(t))) {
    options.push({ kind: "dl", label: "Driving licence", recommended: false });
  }
  return options;
}

function allowedIdentity(identityChoice: string | null, trades: string[]) {
  return identityOptions(trades).some(x => x.kind === (identityChoice || "aadhaar"));
}

const RULES: Record<string, any> = {
  "VER-ID-IDENTITY": { front: true },
  "VER-TRADE-FSSAI": { number: true, expiry: true },
  "VER-TRADE-DL": { number: true, holder: true, expiry: true, back: true },
  "VER-TRADE-RC": { number: true, holder: true, back: true },
  "VER-TRADE-INSURANCE": { expiry: true, authority: true },
  "VER-TRADE-PUC": { expiry: true },
  "VER-TRADE-PERMIT": { expiry: true, authority: true },
  "VER-TRADE-PSARA": { expiry: true, authority: true },
  "VER-TRADE-ELECTRICAL": { expiry: true, authority: true },
  "VER-TRADE-LIABILITY": { expiry: true, authority: true },
  "VER-TRADE-PROPERTY": { authority: true },
  "VER-TRADE-OCCUPANCY": { authority: true },
  "VER-TRADE-FIRE": { expiry: true, authority: true },
};

function clean(value: unknown) {
  return String(value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function aadhaarVerhoeff(value: string) {
  const d = clean(value).replace(/[^0-9]/g, "");
  if (d.length !== 12) return false;
  const D = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
  ];
  const P = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
  ];
  let c = 0;
  const digits = d.split("").reverse();
  for (let i = 0; i < digits.length; i++) c = D[c][P[i % 8][Number(digits[i])]];
  return c === 0;
}

function checkDocument(requirementId: string, doc: any, number: string, identityChoice: string | null, trades: string[]) {
  const rule = RULES[requirementId] || {};
  if (!doc?.storage_path) return { ok: false, says: "Add the document photo first." };
  if (rule.back && !doc?.back_path) return { ok: false, says: "Capture both sides of this document." };

  const n = clean(number);
  if (rule.number && !n) return { ok: false, says: "Enter the document number." };
  if (rule.holder && !String(doc?.holder_name || "").trim()) return { ok: false, says: "Enter the name exactly as printed." };
  if (rule.authority && !String(doc?.issuing_authority || "").trim()) return { ok: false, says: "Enter who issued this document." };
  if (rule.expiry) {
    if (!doc?.expires_on) return { ok: false, says: "Add the document validity date." };
    if (new Date(doc.expires_on + "T23:59:59Z").getTime() < Date.now()) return { ok: false, says: "This document has expired. Upload a current one." };
  }

  if (requirementId === "VER-ID-IDENTITY") {
    const chosen = identityChoice || "aadhaar";
    if (!allowedIdentity(chosen, trades)) return { ok: false, says: "This identity option is not available for your selected service." };
    if (doc.kind !== chosen) return { ok: false, says: "This document does not match the identity option you selected." };
    if (chosen === "aadhaar") return { ok: true, says: "Aadhaar number and identity capture checks passed." };
    if (chosen === "dl") {
      if (!driveIdentity(trades)) return { ok: false, says: "Driving licence identity is available only for driving services." };
      if (n.length < 6 || n.length > 20) return { ok: false, says: "Enter the driving licence number as printed." };
      if (!doc.back_path) return { ok: false, says: "Capture both sides of the driving licence." };
    }
  }

  if (requirementId === "VER-TRADE-DL" && (n.length < 6 || n.length > 20)) return { ok: false, says: "Enter the driving licence number as printed." };
  if (requirementId === "VER-TRADE-FSSAI" && n && !/^\d{14}$/.test(n)) return { ok: false, says: "Enter the 14-digit FSSAI number." };
  return { ok: true, says: "Instant Sambramo document checks passed." };
}

function driveIdentity(trades: string[]) {
  return trades.some(t => DRIVE_TRADES.has(t));
}

function b64url(bytes: Uint8Array) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromB64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(CHALLENGE_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return key;
}

async function signChallenge(payload: Record<string, unknown>) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmac(body);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return body + "." + b64url(sig);
}

async function readChallenge(value: string) {
  try {
    const [body, sig] = String(value || "").split(".");
    if (!body || !sig) return null;
    const key = await hmac(body);
    const good = await crypto.subtle.verify("HMAC", key, bytesFromB64url(sig), new TextEncoder().encode(body));
    if (!good) return null;
    const parsed = JSON.parse(new TextDecoder().decode(bytesFromB64url(body)));
    return parsed?.exp > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function normaliseProviderStatus(value: unknown) {
  const v = String(value || "").toLowerCase();
  if (["verified","success","successful","approved","ok","authenticated","valid","active"].includes(v)) return "verified";
  if (["pending","processing","in_progress","queued"].includes(v)) return "pending";
  if (["mismatch","name_mismatch"].includes(v)) return "mismatch";
  if (["not_found","invalid","failed","failure","rejected","expired"].includes(v)) return "not_found";
  return "unavailable";
}

async function audit(vendorId: string, provider: string, direction: string, reference: string | null, payload: any) {
  const db = serviceDb();
  if (!db) return;
  try {
    await db.from("verification_events").insert({ vendor_id: vendorId, provider, direction, reference, payload });
  } catch {}
}

async function stamp(db: any, vendorId: string, documentId: string, result: any) {
  const { error } = await db.from("vendor_documents").update({
    provider_status: result.providerStatus,
    provider_name: result.provider || null,
    provider_ref: result.reference || null,
    provider_at: new Date().toISOString(),
    review_note: result.says || null,
  }).eq("id", documentId).eq("vendor_id", vendorId);
  if (error) throw error;
}

async function providerJson(url: string, key: string, body: any) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("provider " + response.status);
  return data;
}

async function aadhaarStart(aadhaar: string) {
  if (AADHAAR_MODE === "mock") {
    return {
      providerStatus: "pending",
      provider: "mock-aadhaar",
      requestId: crypto.randomUUID(),
      maskedMobile: "******1234",
      says: "Test OTP session created.",
    };
  }
  if (AADHAAR_MODE !== "generic" || !AADHAAR_URL || !AADHAAR_KEY) {
    return { providerStatus: "unavailable", provider: AADHAAR_NAME, says: "Aadhaar OTP provider is not configured on the Sambramo verification server." };
  }
  const d = await providerJson(AADHAAR_URL, AADHAAR_KEY, {
    action: "start",
    mode: "otp",
    aadhaar,
    consent: true,
    callback_url: Deno.env.get("AADHAAR_CALLBACK_URL") || undefined,
  });
  return {
    providerStatus: normaliseProviderStatus(d?.status || d?.data?.status || d?.result?.status),
    provider: AADHAAR_NAME,
    requestId: d?.requestId || d?.request_id || d?.data?.requestId || d?.data?.request_id || crypto.randomUUID(),
    maskedMobile: d?.maskedMobile || d?.masked_mobile || d?.data?.maskedMobile || d?.data?.masked_mobile || "your Aadhaar-linked mobile",
    says: d?.message || d?.data?.message || "OTP sent to your Aadhaar-linked mobile.",
  };
}

async function aadhaarResend(requestId: string) {
  if (AADHAAR_MODE === "mock") {
    return { providerStatus: "pending", provider: "mock-aadhaar", requestId: crypto.randomUUID(), maskedMobile: "******1234", says: "A new test OTP was sent." };
  }
  if (AADHAAR_MODE !== "generic" || !AADHAAR_URL || !AADHAAR_KEY) {
    return { providerStatus: "unavailable", provider: AADHAAR_NAME, requestId, says: "Aadhaar OTP provider is not configured on the Sambramo verification server." };
  }
  const d = await providerJson(AADHAAR_URL, AADHAAR_KEY, { action: "resend", mode: "otp", request_id: requestId, consent: true });
  return {
    providerStatus: normaliseProviderStatus(d?.status || d?.data?.status || d?.result?.status),
    provider: AADHAAR_NAME,
    requestId: d?.requestId || d?.request_id || requestId,
    maskedMobile: d?.maskedMobile || d?.masked_mobile || d?.data?.maskedMobile || d?.data?.masked_mobile || "your Aadhaar-linked mobile",
    says: d?.message || d?.data?.message || "A new OTP has been sent.",
  };
}

async function aadhaarVerify(requestId: string, otp: string) {
  if (AADHAAR_MODE === "mock") {
    return otp === String(Deno.env.get("AADHAAR_MOCK_OTP") || "123456")
      ? { providerStatus: "verified", provider: "mock-aadhaar", reference: requestId, says: "Identity verified." }
      : { providerStatus: "mismatch", provider: "mock-aadhaar", reference: requestId, says: "The OTP is not correct." };
  }
  if (AADHAAR_MODE !== "generic" || !AADHAAR_URL || !AADHAAR_KEY) {
    return { providerStatus: "unavailable", provider: AADHAAR_NAME, reference: requestId, says: "Aadhaar OTP provider is not configured on the Sambramo verification server." };
  }
  const d = await providerJson(AADHAAR_URL, AADHAAR_KEY, { action: "verify", mode: "otp", request_id: requestId, otp });
  return {
    providerStatus: normaliseProviderStatus(d?.status || d?.data?.status || d?.result?.status),
    provider: AADHAAR_NAME,
    reference: d?.reference || d?.ref || d?.requestId || d?.request_id || requestId,
    says: d?.message || d?.data?.message || "Aadhaar authentication result received.",
  };
}

async function aiRead(imageBase64: string, mimeType: string, expectedType: string | null, vendorId: string, requirementId: string) {
  if (!OPENROUTER_KEY) return { providerStatus: "unavailable", says: "Instant document reading is not configured; Sambramo can still keep the document for manual review." };
  const prompt =
    "Classify this Indian identity/business document. Return JSON only with keys " +
    "{documentType,confidence,isDocument,whatYouSee,legible,extracted}. " +
    "extracted must be an object with optional number,name,expiry,authority. " +
    "Expected document type: " + String(expectedType || "unknown") + ". Never guess. " +
    "Do not call a screenshot a real document. Do not invent numbers.";
  const data = await providerJson("https://openrouter.ai/api/v1/chat/completions", OPENROUTER_KEY, {
    model: AI_MODEL,
    temperature: 0,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: "data:" + mimeType + ";base64," + imageBase64 } },
      ],
    }],
  }).catch(() => null);

  const text = data?.choices?.[0]?.message?.content || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { providerStatus: "unavailable", says: "We could not read the document clearly. Sambramo can still keep it for review." };
  try {
    const parsed = JSON.parse(match[0]);
    const ticket = await signChallenge({
      v: 2,
      kind: "document-read",
      vendorId,
      requirementId,
      expectedType,
      documentType: parsed?.documentType || null,
      confidence: Number(parsed?.confidence || 0),
      exp: Date.now() + 10 * 60 * 1000,
    });
    return { providerStatus: "checked", provider: "openrouter", readTicket: ticket, ...parsed };
  } catch {
    return { providerStatus: "unavailable", says: "We could not read the document clearly. Sambramo can still keep it for review." };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return respond({ ok: true });
  if (req.method !== "POST") return respond({ ok: false, says: "POST only." }, 405);

  const auth = await authVendor(req);
  if (!auth) return respond({ ok: false, says: "Please sign in again." }, 401);

  const { db, vendor } = auth;
  const body = await req.json().catch(() => ({}));
  const trades = await tradesFor(db, vendor.id);
  const requirementIds = relevantRequirements(trades, vendor.identity_document || "aadhaar");
  const allowed = new Set(requirementIds);

  if (body.action === "requirements") {
    const options = identityOptions(trades);
    const identity = options.some(o => o.kind === vendor.identity_document)
      ? vendor.identity_document
      : "aadhaar";
    return respond({
      ok: true,
      trades,
      requirements: requirementIds.map(id => ({
        id,
        label: LABELS[id] || id,
        hint: HINTS[id] || "Shown because it matches the services you selected.",
        required: id === "VER-ID-IDENTITY",
      })),
      identityOptions: options,
      identity,
    });
  }

  if (body.vendorId && body.vendorId !== vendor.id) return respond({ ok: false, says: "Partner profile mismatch." }, 403);

  if (body.action === "aadhaar_start") {
    const n = String(body.aadhaar || "").replace(/\D/g, "");
    if (!allowed.has("VER-ID-IDENTITY")) return respond({ ok: false, says: "Identity verification is not available." }, 403);
    if (!aadhaarVerhoeff(n)) return respond({ ok: false, says: "Enter a valid 12-digit Aadhaar number." }, 400);
    if (body.consent !== true) return respond({ ok: false, says: "Your consent is required before Aadhaar authentication." }, 400);
    try {
      const result = await aadhaarStart(n);
      if (result.providerStatus === "unavailable") return respond({ ok: false, ...result }, 503);
      const challenge = await signChallenge({
        v: 3,
        kind: "aadhaar-otp",
        vendorId: vendor.id,
        requirementId: "VER-ID-IDENTITY",
        requestId: result.requestId,
        provider: result.provider,
        last4: n.slice(-4),
        exp: Date.now() + 10 * 60 * 1000,
      });
      await audit(vendor.id, result.provider, "request", result.requestId, { action: "aadhaar_start", requirementId: "VER-ID-IDENTITY", aadhaar_last4: n.slice(-4), consent: true });
      return respond({ ok: true, ...result, challenge });
    } catch {
      return respond({ ok: false, says: "Aadhaar OTP could not be started. Check the configured Aadhaar provider connection." }, 502);
    }
  }

  if (body.action === "aadhaar_resend" || body.action === "aadhaar_verify") {
    const challenge = await readChallenge(String(body.challenge || ""));
    if (!challenge || challenge.vendorId !== vendor.id || challenge.kind !== "aadhaar-otp") {
      return respond({ ok: false, says: "That Aadhaar verification session has expired. Start again." }, 400);
    }

    if (body.action === "aadhaar_resend") {
      try {
        const result = await aadhaarResend(String(challenge.requestId));
        if (result.providerStatus === "unavailable") return respond({ ok: false, ...result }, 503);
        const next = await signChallenge({
          ...challenge,
          requestId: result.requestId || challenge.requestId,
          exp: Date.now() + 10 * 60 * 1000,
        });
        await audit(vendor.id, result.provider, "request", result.requestId || null, { action: "aadhaar_resend", requirementId: "VER-ID-IDENTITY", aadhaar_last4: challenge.last4, consent: true });
        return respond({ ok: true, ...result, challenge: next });
      } catch {
        return respond({ ok: false, says: "We could not resend the Aadhaar OTP. Please try again." }, 503);
      }
    }

    const otp = String(body.otp || "");
    if (!/^\d{6}$/.test(otp)) return respond({ ok: false, says: "Enter the 6-digit OTP." }, 400);
    try {
      const result = await aadhaarVerify(String(challenge.requestId), otp);
      await audit(vendor.id, result.provider, "response", result.reference || challenge.requestId, { action: "aadhaar_verify", status: result.providerStatus });
      if (result.providerStatus === "verified") {
        const { data: doc } = await db.from("vendor_documents").select("id").eq("vendor_id", vendor.id).eq("requirement_id", "VER-ID-IDENTITY").maybeSingle();
        if (doc) await stamp(db, vendor.id, doc.id, { ...result });
      }
      return respond({ ok: true, providerStatus: result.providerStatus, says: result.says || "Aadhaar authentication result received." });
    } catch {
      return respond({ ok: false, says: "The Aadhaar verification provider could not be reached. Please try again." }, 503);
    }
  }

  if (body.action === "verify_document") {
    const id = String(body.requirementId || "");
    if (!allowed.has(id)) return respond({ ok: false, says: "That document is not relevant to your selected services." }, 403);
    const result = await aiRead(
      String(body.imageBase64 || ""),
      String(body.mimeType || "image/jpeg"),
      body.expectedType || null,
      vendor.id,
      id,
    );
    if (result.providerStatus === "checked") {
      await audit(vendor.id, result.provider || "openrouter", "read", null, {
        requirementId: id,
        documentType: result.documentType || null,
        confidence: result.confidence || null,
      });
    }
    return respond({ ok: true, ...result });
  }

  if (body.action === "stamp_document") {
    const documentId = String(body.documentId || "");
    if (!allowed.has(String(body.requirementId || ""))) {
      const row = await db.from("vendor_documents").select("requirement_id").eq("id", documentId).eq("vendor_id", vendor.id).maybeSingle();
      if (!row.data?.requirement_id || !allowed.has(row.data.requirement_id)) {
        return respond({ ok: false, says: "That document is not relevant to your selected services." }, 403);
      }
    }
    const { data: doc } = await db.from("vendor_documents").select("*").eq("id", documentId).eq("vendor_id", vendor.id).maybeSingle();
    if (!doc) return respond({ ok: false, says: "Document not found." }, 404);
    const requirementId = String(doc.requirement_id);
    if (!allowed.has(requirementId)) return respond({ ok: false, says: "That document is not relevant to your selected services." }, 403);

    const checked = checkDocument(requirementId, doc, String(body.number || ""), vendor.identity_document || null, trades);
    if (!checked.ok) return respond({ ok: false, says: checked.says }, 400);

    if (requirementId === "VER-ID-IDENTITY" && doc.kind === "dl" && !driveIdentity(trades)) {
      return respond({ ok: false, says: "Driving licence identity is available only for driving services." }, 403);
    }

    if (body.readTicket) {
      const ticket = await readChallenge(String(body.readTicket));
      if (!ticket || ticket.kind !== "document-read" || ticket.vendorId !== vendor.id || ticket.requirementId !== requirementId) {
        return respond({ ok: false, says: "The document reading check has expired. Capture the document again." }, 400);
      }
      const expected = ticket.expectedType;
      if (expected && ticket.documentType && ticket.documentType !== expected) {
        return respond({ ok: false, says: "The uploaded document does not match the selected verification heading." }, 400);
      }
    }

    const result = {
      providerStatus: "verified",
      provider: "sambramo-instant-document-check",
      reference: null,
      says: checked.says,
    };
    await stamp(db, vendor.id, documentId, result);
    await audit(vendor.id, result.provider, "response", null, { requirementId, status: result.providerStatus });
    return respond({ ok: true, ...result });
  }

  if (body.action === "verify_dl") {
    const documentId = String(body.documentId || "");
    const { data: doc } = await db.from("vendor_documents").select("*").eq("id", documentId).eq("vendor_id", vendor.id).maybeSingle();
    if (!doc) return respond({ ok: false, says: "Document not found." }, 404);
    if (doc.requirement_id !== "VER-TRADE-DL" && doc.requirement_id !== "VER-ID-IDENTITY") return respond({ ok: false, says: "This document is not a driving licence requirement." }, 400);
    if (!allowed.has(doc.requirement_id)) return respond({ ok: false, says: "Driving licence verification is not relevant to your selected services." }, 403);

    const dlNumber = clean(body.dlNumber);
    if (dlNumber.length < 6 || dlNumber.length > 20) return respond({ ok: false, says: "Enter the driving licence number as printed." }, 400);

    if (DL_URL && DL_KEY) {
      try {
        const d = await providerJson(DL_URL, DL_KEY, { action: "verify", dl_number: dlNumber, name: body.holderName || undefined });
        const result = {
          providerStatus: normaliseProviderStatus(d?.status || d?.data?.status || d?.result?.status),
          provider: DL_NAME,
          reference: d?.reference || d?.ref || d?.requestId || d?.request_id || null,
          says: d?.message || d?.data?.message || "Driving licence verification result received.",
        };
        if (result.providerStatus !== "unavailable") await stamp(db, vendor.id, documentId, result);
        return respond({ ok: true, ...result });
      } catch {}
    }

    const checked = checkDocument(doc.requirement_id, doc, dlNumber, vendor.identity_document || null, trades);
    if (!checked.ok) return respond({ ok: false, says: checked.says }, 400);
    const result = {
      providerStatus: "verified",
      provider: "sambramo-instant-document-check",
      reference: null,
      says: checked.says + " RTO verification provider is not configured, so this is an instant Sambramo document check rather than a government verification.",
    };
    await stamp(db, vendor.id, documentId, result);
    return respond({ ok: true, ...result });
  }

  if (body.action === "verify_fssai") {
    const documentId = String(body.documentId || "");
    if (!allowed.has("VER-TRADE-FSSAI")) return respond({ ok: false, says: "FSSAI verification is not relevant to your selected services." }, 403);
    const { data: doc } = await db.from("vendor_documents").select("*").eq("id", documentId).eq("vendor_id", vendor.id).maybeSingle();
    if (!doc || doc.requirement_id !== "VER-TRADE-FSSAI") return respond({ ok: false, says: "FSSAI document not found." }, 404);
    const n = clean(body.fssaiNumber);
    if (!/^\d{14}$/.test(n)) return respond({ ok: false, says: "Enter the 14-digit FSSAI number." }, 400);

    if (FSSAI_URL && FSSAI_KEY) {
      try {
        const d = await providerJson(FSSAI_URL, FSSAI_KEY, { action: "verify", fssai_number: n, name: doc.holder_name || undefined });
        const result = {
          providerStatus: normaliseProviderStatus(d?.status || d?.data?.status || d?.result?.status),
          provider: FSSAI_NAME,
          reference: d?.reference || d?.ref || d?.requestId || d?.request_id || null,
          says: d?.message || d?.data?.message || "FSSAI verification result received.",
        };
        if (result.providerStatus !== "unavailable") await stamp(db, vendor.id, documentId, result);
        return respond({ ok: true, ...result });
      } catch {}
    }

    const checked = checkDocument("VER-TRADE-FSSAI", doc, n, vendor.identity_document || null, trades);
    if (!checked.ok) return respond({ ok: false, says: checked.says }, 400);
    const result = {
      providerStatus: "verified",
      provider: "sambramo-instant-document-check",
      reference: null,
      says: checked.says + " FSSAI issuer verification will use the configured provider when connected.",
    };
    await stamp(db, vendor.id, documentId, result);
    return respond({ ok: true, ...result });
  }

  if (body.action === "aadhaar_callback") {
    if (!AADHAAR_CALLBACK_SECRET || req.headers.get("x-sambramo-verification-secret") !== AADHAAR_CALLBACK_SECRET) {
      return respond({ ok: false, says: "Unauthorised callback." }, 401);
    }
    const reference = body.reference || body.requestId || body.request_id;
    if (!reference) return respond({ ok: false, says: "Provider reference is required." }, 400);
    const providerStatus = normaliseProviderStatus(body.status || body.result || body.outcome);
    const svc = serviceDb();
    if (!svc) return respond({ ok: false, says: "Callback storage is not configured." }, 503);
    const { data: event } = await svc.from("verification_events").select("vendor_id,payload").eq("reference", reference).eq("direction", "request").order("at", { ascending: false }).limit(1).maybeSingle();
    if (!event?.vendor_id) return respond({ ok: false, says: "Verification session not found." }, 404);
    const { data: doc } = await svc.from("vendor_documents").select("id").eq("vendor_id", event.vendor_id).eq("requirement_id", "VER-ID-IDENTITY").maybeSingle();
    if (doc && providerStatus !== "unavailable") {
      await stamp(svc, event.vendor_id, doc.id, {
        providerStatus,
        provider: body.provider || AADHAAR_NAME,
        reference,
        says: body.message || "Aadhaar verification result received.",
      });
    }
    await audit(event.vendor_id, body.provider || AADHAAR_NAME, "webhook", reference, { status: providerStatus });
    return respond({ ok: true, providerStatus });
  }

  return respond({ ok: false, says: "Unknown verification action." }, 400);
});
