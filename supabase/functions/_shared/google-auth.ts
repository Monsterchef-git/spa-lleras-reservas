// Shared Google Service Account JWT signer (no external deps).
// Used by google-calendar-* edge functions to obtain an OAuth2 access token.

function base64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no está configurado");
  let parsed: any;
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

  // 1) As-is
  parsed = tryParse(raw);

  // 2) Repair: real newlines inside the PEM block broke the JSON. Escape only those.
  if (!parsed) {
    const repaired = raw.replace(
      /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
      (block) => block.replace(/\r\n|\r|\n/g, "\\n"),
    );
    parsed = tryParse(repaired);
  }

  // 2b) Last-resort repair: walk the string and escape unescaped newlines that fall
  //     inside double-quoted JSON string values.
  if (!parsed) {
    let out = "";
    let inString = false;
    let escape = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (escape) { out += c; escape = false; continue; }
      if (c === "\\") { out += c; escape = true; continue; }
      if (c === '"') { inString = !inString; out += c; continue; }
      if (inString && (c === "\n" || c === "\r")) { out += "\\n"; continue; }
      out += c;
    }
    parsed = tryParse(out);
  }

  // 3) Maybe the user pasted base64 of the JSON
  if (!parsed) {
    try {
      const decoded = atob(raw.trim());
      parsed = tryParse(decoded);
    } catch { /* ignore */ }
  }

  if (!parsed) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido. Pega el contenido completo del archivo .json (incluyendo las llaves { ... }), tal cual, sin modificar.",
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service Account JSON inválido: faltan client_email o private_key");
  }

  // Normalize: convert literal "\\n" sequences to real newlines in the PEM body
  if (typeof parsed.private_key === "string" && parsed.private_key.includes("\\n")) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed as ServiceAccount;
}

export async function getGoogleAccessToken(
  sa: ServiceAccount,
  scope = "https://www.googleapis.com/auth/calendar.readonly",
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope,
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(sig)}`;

  const resp = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`Error obteniendo token de Google: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}