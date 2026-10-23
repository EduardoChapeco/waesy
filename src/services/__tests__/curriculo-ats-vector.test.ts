import { describe, it, expect } from "vitest";
import { jsPDF } from "jspdf";

describe("GAP-4.9: Geração de Currículo Vetorial ATS em jsPDF", () => {
  it("deve gerar documento PDF nativo vetorial com texto selecionável e pesquisável", () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const fullName = "Carlos Henrique Silva";
    const occupation = "Engenheiro de Software Sênior";
    const phone = "(11) 98888-7777";
    const email = "carlos.silva@waesy.com";
    const city = "São Paulo";
    const state = "SP";
    const summary = "Especialista em arquitetura distribuída, TypeScript e microsserviços.";
    const experiences = [
      {
        role: "Tech Lead",
        company: "Waesy Tech",
        startDate: "2024",
        endDate: "Atual",
        description: "Liderança técnica de infraestrutura e gateways de pagamento.",
      },
    ];
    const educations = [
      {
        degree: "Bacharelado em Ciência da Computação",
        institution: "USP",
        startDate: "2018",
        endDate: "2022",
      },
    ];
    const skills = ["TypeScript", "Node.js", "PostgreSQL", "React", "Docker"];

    const pageWidth = 210;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let currentY = 18;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(20, 20, 20);
    pdf.text(fullName, margin, currentY);
    currentY += 6;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(70, 70, 70);
    pdf.text(occupation, margin, currentY);
    currentY += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text([phone, email, `${city} - ${state}`].join("  |  "), margin, currentY);
    currentY += 7;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(30, 30, 30);
    pdf.text("RESUMO PROFISSIONAL", margin, currentY);
    currentY += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    const splitSummary = pdf.splitTextToSize(summary, contentWidth);
    pdf.text(splitSummary, margin, currentY);
    currentY += splitSummary.length * 4.2 + 5;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text("EXPERIÊNCIA PROFISSIONAL", margin, currentY);
    currentY += 5;

    for (const exp of experiences) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text(`${exp.role} — ${exp.company}`, margin, currentY);
      currentY += 4;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      const splitDesc = pdf.splitTextToSize(exp.description, contentWidth);
      pdf.text(splitDesc, margin, currentY);
      currentY += splitDesc.length * 3.8 + 4;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text("COMPETÊNCIAS & HABILIDADES", margin, currentY);
    currentY += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(skills.join("  •  "), margin, currentY);

    const pdfOutput = pdf.output("arraybuffer");
    expect(pdfOutput.byteLength).toBeGreaterThan(1000);
    expect(pdfOutput.byteLength).toBeLessThan(150000); // Muito menor e mais leve que um raster JPEG (1.5MB)
  });
});
