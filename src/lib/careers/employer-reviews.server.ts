import { logSystemError } from "@/lib/logger";

export interface ResumeExperienceReviewInput {
  company?: string | null;
  store_id?: string | null;
  title?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  salary_cents?: number | string | null;
  exit_reason?: string | null;
  company_rating?: number | string | null;
  would_recommend?: boolean | null;
  review_text?: string | null;
  is_anonymous?: boolean | null;
}

/**
 * Sincroniza avaliações corporativas (`employer_reviews`) derivadas das experiências
 * profissionais do currículo do usuário, garantindo fonte única entre Perfil, Currículo e InfoJobs.
 */
export async function syncEmployerReviewsForUser(
  db: any,
  userId: string,
  experiences: ResumeExperienceReviewInput[],
  options?: { route?: string; defaultAnonymous?: boolean },
): Promise<{ synced: number; errors: number }> {
  if (!userId || !Array.isArray(experiences) || experiences.length === 0) {
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;
  const route = options?.route || "careers.syncEmployerReviewsForUser";

  for (const exp of experiences) {
    const companyName = typeof exp?.company === "string" ? exp.company.trim() : "";
    if (!companyName) continue;

    const hasCareerInsight = Boolean(
      exp.company_rating ||
        exp.salary_cents ||
        (exp.exit_reason && exp.exit_reason.trim()) ||
        (exp.review_text && exp.review_text.trim()),
    );
    if (!hasCareerInsight) continue;

    try {
      const { error: delErr } = await db
        .from("employer_reviews")
        .delete()
        .eq("user_id", userId)
        .eq("company_name", companyName);

      if (delErr) {
        errors++;
        logSystemError({
          route,
          contractName: "syncEmployerReviewsForUser.delete",
          schemaName: "public",
          tableName: "employer_reviews",
          error: delErr,
          userId,
          payload: { companyName },
        });
        continue;
      }

      const numericSalary = exp.salary_cents ? Number(exp.salary_cents) : null;
      const numericRating = exp.company_rating ? Number(exp.company_rating) : null;

      const { error: insErr } = await db.from("employer_reviews").insert({
        user_id: userId,
        company_name: companyName,
        store_id: exp.store_id || null,
        job_title: (exp.title || "Colaborador").trim(),
        employment_type: exp.employment_type || null,
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
        is_current: exp.is_current ?? false,
        salary_cents: numericSalary && numericSalary > 0 ? Math.round(numericSalary) : null,
        exit_reason: exp.exit_reason?.trim() || null,
        company_rating: numericRating && numericRating > 0 ? Math.min(5, Math.max(1, numericRating)) : null,
        would_recommend: exp.would_recommend ?? true,
        pros: exp.review_text?.trim() || null,
        is_anonymous: exp.is_anonymous ?? (options?.defaultAnonymous ?? true),
        status: "published",
      });

      if (insErr) {
        errors++;
        logSystemError({
          route,
          contractName: "syncEmployerReviewsForUser.insert",
          schemaName: "public",
          tableName: "employer_reviews",
          error: insErr,
          userId,
          payload: { companyName, storeId: exp.store_id || null },
        });
      } else {
        synced++;
      }
    } catch (err) {
      errors++;
      logSystemError({
        route,
        contractName: "syncEmployerReviewsForUser",
        schemaName: "public",
        tableName: "employer_reviews",
        error: err,
        userId,
        payload: { companyName },
      });
    }
  }

  return { synced, errors };
}
