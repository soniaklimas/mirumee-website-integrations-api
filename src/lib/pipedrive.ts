interface PipedriveResponse<T = Record<string, unknown>> {
  success: boolean;
  data: T;
}

interface PipedriveEntity {
  id: number;
  [key: string]: unknown;
}

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

function getApiToken(): string {
  const token = process.env.PIPEDRIVE_X_API_TOKEN;
  if (!token) throw new Error("Missing PIPEDRIVE_X_API_TOKEN");
  return token;
}

function apiUrl(path: string): string {
  return `${PIPEDRIVE_BASE}${path}?api_token=${getApiToken()}`;
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

interface CreatePersonParams {
  name: string;
  email: string;
  phone?: string;
}

export async function createPerson({ name, email, phone }: CreatePersonParams) {
  const response = await fetch(apiUrl("/persons"), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      name,
      email: [{ value: email, primary: true, label: "Work" }],
      phone: [{ value: phone ?? "", primary: true, label: "Work" }],
      label: "109",
    }),
  });

  const json: PipedriveResponse<PipedriveEntity> = await response.json();
  if (!response.ok) throw new Error(`Pipedrive createPerson failed: ${JSON.stringify(json)}`);
  return json.data;
}

interface CreateDealParams {
  name: string;
  email: string;
  message: string;
  userId: string;
  personId: number;
}

export async function createDeal({ name, email, message, userId, personId }: CreateDealParams) {
  const response = await fetch(apiUrl("/deals"), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      title: `${name} (${email})`,
      value: message,
      user_id: userId,
      person_id: personId,
    }),
  });

  const json: PipedriveResponse<PipedriveEntity> = await response.json();
  if (!response.ok) throw new Error(`Pipedrive createDeal failed: ${JSON.stringify(json)}`);
  return json.data;
}

interface CreateNoteParams {
  message: string;
  dealId: number;
  personId: number;
  userId: string;
}

export async function createNote({ message, dealId, personId, userId }: CreateNoteParams) {
  const response = await fetch(apiUrl("/notes"), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      content: message,
      deal_id: dealId,
      person_id: personId,
      user_id: userId,
    }),
  });

  const json: PipedriveResponse<PipedriveEntity> = await response.json();
  if (!response.ok) throw new Error(`Pipedrive createNote failed: ${JSON.stringify(json)}`);
  return json.data;
}

export interface PipedriveUserData {
  id: number;
  name: string;
  icon_url: string | null;
}

export async function fetchUser(userId: string): Promise<PipedriveUserData | null> {
  try {
    const response = await fetch(apiUrl(`/users/${userId}`), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data: PipedriveResponse<PipedriveEntity> = await response.json();
    if (data.success && data.data) {
      return {
        id: data.data.id,
        name: data.data.name as string,
        icon_url: (data.data.icon_url as string | null),
      };
    }
  } catch (error) {
    console.error("Error fetching Pipedrive user:", error);
  }
  return null;
}
