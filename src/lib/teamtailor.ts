const TEAMTAILOR_BASE_URL = "https://api.teamtailor.com/v1";
const TEAMTAILOR_API_VERSION = "20240404";

function getTeamtailorApiKey(): string {
  const apiKey = process.env.TEAMTAILOR_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TEAMTAILOR_API_KEY");
  }
  return apiKey;
}

function getTeamtailorHeaders(): HeadersInit {
  return {
    Authorization: `Token token=${getTeamtailorApiKey()}`,
    "X-Api-Version": TEAMTAILOR_API_VERSION,
    // Teamtailor API is JSON:API; it rejects plain `application/json` with HTTP 406.
    Accept: "application/vnd.api+json",
  };
}

interface TeamtailorRelationRef {
  id: string;
  type: string;
}

interface TeamtailorJobRaw {
  id: string;
  attributes: {
    title: string;
    "remote-status"?: "none" | "hybrid" | "remote";
    "min-salary"?: number | null;
    "max-salary"?: number | null;
    currency?: string | null;
  };
  links?: {
    "careersite-job-url"?: string;
    "careersite-job-apply-url"?: string;
  };
  relationships: {
    department?: {
      data?: TeamtailorRelationRef | null;
    };
    locations?: {
      data?: TeamtailorRelationRef[];
    };
    "custom-field-values"?: {
      data?: TeamtailorRelationRef[];
    };
  };
}

interface TeamtailorCustomFieldValue {
  id: string;
  attributes: {
    value?: string[] | null;
  };
}

export interface JobOffer {
  id: string;
  title: string;
  departmentId: string | null;
  locationIds: string[];
  url: string | null;
  applyUrl: string | null;
  remoteStatus: "none" | "hybrid" | "remote";
  minSalary: number | null;
  maxSalary: number | null;
  currency: string | null;
  company: string | null;
}

export async function fetchJobOffers(): Promise<JobOffer[]> {
  const companyFieldId = process.env.TEAMTAILOR_COMPANY_CUSTOM_FIELD_API_ID;

  const jobsRequest = fetch(
    `${TEAMTAILOR_BASE_URL}/jobs?include=department,locations,custom-field-values&filter[status]=open`,
    { headers: getTeamtailorHeaders() },
  );

  const customFieldRequest = companyFieldId
    ? fetch(
        `${TEAMTAILOR_BASE_URL}/custom-fields/${companyFieldId}?include=custom-field-values`,
        { headers: getTeamtailorHeaders() },
      )
    : Promise.resolve(null);

  const [jobsResponse, customFieldResponse] = await Promise.all([jobsRequest, customFieldRequest]);

  if (!jobsResponse.ok) {
    const payload = await jobsResponse.text();
    throw new Error(`Teamtailor jobs request failed: ${jobsResponse.status} ${payload}`);
  }

  const jobsJson = (await jobsResponse.json()) as { data?: TeamtailorJobRaw[] };
  const jobs = jobsJson.data ?? [];

  const companyByCustomFieldValueId = new Map<string, string>();
  if (companyFieldId && customFieldResponse && customFieldResponse.ok) {
    const customFieldJson = (await customFieldResponse.json()) as {
      included?: TeamtailorCustomFieldValue[];
    };

    for (const fieldValue of customFieldJson.included ?? []) {
      const company = fieldValue.attributes?.value?.[0] ?? null;
      if (company) {
        companyByCustomFieldValueId.set(fieldValue.id, company);
      }
    }
  }

  return jobs.map((job) => {
    const customFieldRefs = job.relationships["custom-field-values"]?.data ?? [];
    const company =
      customFieldRefs
        .map((fieldRef) => companyByCustomFieldValueId.get(fieldRef.id))
        .find((value): value is string => Boolean(value)) ?? null;

    return {
      id: job.id,
      title: job.attributes.title,
      departmentId: job.relationships.department?.data?.id ?? null,
      locationIds: (job.relationships.locations?.data ?? []).map((loc) => loc.id),
      url: job.links?.["careersite-job-url"] ?? null,
      applyUrl: job.links?.["careersite-job-apply-url"] ?? null,
      remoteStatus: job.attributes["remote-status"] ?? "none",
      minSalary: job.attributes["min-salary"] ?? null,
      maxSalary: job.attributes["max-salary"] ?? null,
      currency: job.attributes.currency ?? null,
      company,
    };
  });
}
