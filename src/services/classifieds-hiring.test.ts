import { describe, it, expect } from "vitest";
import { CANONICAL_EDUCATION_LEVELS, CANONICAL_EXPERIENCE_LEVELS, CANONICAL_JOB_REGIMES, CANONICAL_WORKPLACE_MODELS, CANONICAL_WORK_SCHEDULES, CANONICAL_SALARY_RANGES, CANONICAL_JOB_BENEFITS, SUGGESTED_JOB_SKILLS, getEducationLabel, getExperienceLabel, getRegimeLabel, getWorkplaceModelLabel } from "@/lib/classifieds/canonical-hiring";

describe("Canonical Hiring Taxonomy & Measurable Market Scale (Microfase 78B)", () => {
 it("valida que os 11 níveis canônicos de escolaridade estão ordenados e ponderados", () => {
 expect(CANONICAL_EDUCATION_LEVELS.length).toBe(11);
 expect(CANONICAL_EDUCATION_LEVELS[0].value).toBe("fundamental_incompleto");
 expect(CANONICAL_EDUCATION_LEVELS[10].value).toBe("doutorado");
 
 // Todos devem ter peso crescente para comparação gráfica
 for (let i = 0; i < CANONICAL_EDUCATION_LEVELS.length - 1; i++) {
 expect((CANONICAL_EDUCATION_LEVELS[i].weight || 0)).toBeLessThan(
 CANONICAL_EDUCATION_LEVELS[i + 1].weight || 0
 );
 }
 });

 it("valida que as faixas de experiência mensurável contêm 6 categorias padronizadas", () => {
 expect(CANONICAL_EXPERIENCE_LEVELS.length).toBe(6);
 expect(CANONICAL_EXPERIENCE_LEVELS[0].value).toBe("sem_experiencia");
 expect(CANONICAL_EXPERIENCE_LEVELS[5].value).toBe("mais_5_anos");
 });

 it("valida a humanização precisa dos rótulos de escolaridade, experiência e regime", () => {
 expect(getEducationLabel("superior_completo")).toBe("Ensino Superior Completo");
 expect(getEducationLabel("pos_graduacao")).toBe("Pós-Graduação / Especialização / MBA");
 expect(getEducationLabel("inexistente")).toBe("inexistente");

 expect(getExperienceLabel("1_a_2_anos")).toBe("1 a 2 anos (Júnior)");
 expect(getExperienceLabel("mais_5_anos")).toBe("Mais de 5 anos (Sênior / Especialista)");

 expect(getRegimeLabel("CLT")).toBe("CLT (Carteira Assinada / Efetivo)");
 expect(getRegimeLabel("PJ")).toBe("PJ (Prestador de Serviço / Contrato)");

 expect(getWorkplaceModelLabel("remoto")).toBe("100% Remoto (Home Office)");
 expect(getWorkplaceModelLabel("presencial")).toBe("100% Presencial na Empresa");
 });

 it("valida a presença de benefícios e habilidades recomendadas pelo mercado corporativo", () => {
 expect(CANONICAL_JOB_BENEFITS).toContain("Vale Refeição (VR)");
 expect(CANONICAL_JOB_BENEFITS).toContain("Plano de Saúde");
 expect(CANONICAL_JOB_BENEFITS).toContain("Gympass / TotalPass");

 expect(SUGGESTED_JOB_SKILLS).toContain("Comunicação Assertiva");
 expect(SUGGESTED_JOB_SKILLS).toContain("Atendimento ao Cliente");
 expect(SUGGESTED_JOB_SKILLS).toContain("Excel Intermediário / Avançado");
 });
});
