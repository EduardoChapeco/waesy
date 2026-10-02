/**
 * @fileoverview DTOs e Tipos Canônicos para Perfil Profissional, Currículo e Integração LinkedIn (Waesy BigTech).
 */

export interface ResumeDataDTO {
  headline?: string;
  summary?: string;
  hiringStatus?: "none" | "open_to_work" | "open_to_proposals" | "hiring" | "not_looking";
  skills?: string[];
  availability?: {
    jobTitle?: string;
    seniority?: "internship" | "junior" | "mid" | "senior" | "specialist" | "lead" | "director";
    workplacePreference?: "remote" | "hybrid" | "on_site" | "any";
    employmentTypePreference?: "clt" | "pj" | "any" | "freelance";
    salaryExpectationCents?: number;
    immediateStart?: boolean;
    willingToRelocate?: boolean;
    willingToTravel?: boolean;
    open_to_work?: { active?: boolean; roles?: string[] };
    hiring?: { active?: boolean; roles?: string[] };
    providing_services?: { active?: boolean; services?: string[] };
    volunteering?: { active?: boolean };
  };
  experiences?: Array<{
    id: string;
    title: string;
    company: string;
    location?: string;
    location_type?: string;
    employment_type?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
    store_id?: string;
    store_logo?: string;
    media_urls?: string[];
    salary_cents?: number;
    exit_reason?: string;
    company_rating?: number;
    would_recommend?: boolean;
    review_text?: string;
    is_anonymous?: boolean;
  }>;
  educations?: Array<{
    id: string;
    school: string;
    degree?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    media_urls?: string[];
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    issue_date?: string;
    expiration_date?: string;
    credential_id?: string;
    credential_url?: string;
  }>;
  licenses?: Array<{
    id: string;
    council: string;
    register_number: string;
    uf?: string;
    status?: string;
    expiration_date?: string;
    document_url?: string;
    specialty?: string;
  }>;
  projects?: Array<{
    id: string;
    title: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    associated_with?: string;
    project_url?: string;
    description?: string;
    media_urls?: string[];
  }>;
  volunteering?: Array<{
    id: string;
    organization: string;
    role: string;
    cause?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
  }>;
  causes?: string[];
  languages?: Array<{
    id: string;
    name: string;
    proficiency: "basic" | "intermediate" | "advanced" | "fluent" | "native";
  }>;
}
