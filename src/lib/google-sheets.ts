interface ContactData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textToBase64Url(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function createSignedJwt(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = textToBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = textToBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = await createSignedJwt(clientEmail, privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get Google access token: ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function appendContactToSheet(contact: ContactData): Promise<void> {
  const spreadsheetId = process.env.GMAIL_CONTACT_SPREADSHEET_ID;
  const range = process.env.GMAIL_CONTACT_SPREADSHEET_RANGE ?? "Sheet1!A:D";
  const clientEmail = process.env.GOOGLE_SERVICE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_PRIVATE_KEY_2;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Sheets env vars: GMAIL_CONTACT_SPREADSHEET_ID, GOOGLE_SERVICE_CLIENT_EMAIL, GOOGLE_SERVICE_PRIVATE_KEY_2",
    );
  }

  const key = privateKey.replace(/\\n/g, "\n");
  const accessToken = await getAccessToken(clientEmail, key);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [[contact.name, contact.email, contact.phone ?? "", contact.message]],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Sheets append failed: ${text}`);
  }
}
