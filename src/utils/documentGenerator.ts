import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import PptxGenJS from "pptxgenjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type DocType = "pdf" | "docx" | "pptx" | "xlsx";

export async function generateDocument({ title, content, type }: { title: string; content: string; type: DocType }) {
  switch (type) {
    case "pdf": return generatePDF(content, title);
    case "docx": return generateDOCX(content, title);
    case "pptx": return generatePPTX(content, title);
    case "xlsx": return generateXLSX(content, title);
    default: throw new Error(`Unsupported document type: ${type}`);
  }
}

// Parse markdown into simple blocks
interface Block {
  type: "h1" | "h2" | "h3" | "paragraph" | "bullet" | "code" | "table";
  text: string;
  rows?: string[][];
}

function parseMarkdown(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let inCode = false;
  let codeBuffer = "";

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", text: codeBuffer.trim() });
        codeBuffer = "";
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer += line + "\n";
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("### ")) blocks.push({ type: "h3", text: trimmed.slice(4).replace(/\*\*/g, "") });
    else if (trimmed.startsWith("## ")) blocks.push({ type: "h2", text: trimmed.slice(3).replace(/\*\*/g, "") });
    else if (trimmed.startsWith("# ")) blocks.push({ type: "h1", text: trimmed.slice(2).replace(/\*\*/g, "") });
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
      blocks.push({ type: "bullet", text: trimmed.replace(/^[-*]\s|^\d+\.\s/, "").replace(/\*\*/g, "") });
    } else if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Table row - collect into table block
      const cells = trimmed.split("|").filter(c => c.trim()).map(c => c.trim());
      if (cells.some(c => /^[-:]+$/.test(c))) continue; // separator row
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.type === "table") {
        lastBlock.rows!.push(cells);
      } else {
        blocks.push({ type: "table", text: "", rows: [cells] });
      }
    } else {
      blocks.push({ type: "paragraph", text: trimmed.replace(/\*\*/g, "") });
    }
  }

  return blocks;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
}

export async function generatePDF(content: string, title: string = "Document") {
  const doc = new jsPDF();
  const blocks = parseMarkdown(content);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 25;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  for (const block of blocks) {
    const text = stripMarkdown(block.text);
    switch (block.type) {
      case "h1":
        checkPage(15);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(text, margin, y);
        y += 12;
        break;
      case "h2":
        checkPage(12);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(text, margin, y);
        y += 10;
        break;
      case "h3":
        checkPage(10);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(text, margin, y);
        y += 8;
        break;
      case "bullet":
        checkPage(8);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const bulletLines = doc.splitTextToSize(`• ${text}`, maxWidth - 5);
        doc.text(bulletLines, margin + 5, y);
        y += bulletLines.length * 6;
        break;
      case "code":
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont("courier", "normal");
        const codeLines = doc.splitTextToSize(text, maxWidth - 10);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, maxWidth, codeLines.length * 5 + 6, "F");
        doc.text(codeLines, margin + 3, y);
        y += codeLines.length * 5 + 8;
        doc.setFont("helvetica", "normal");
        break;
      case "table":
        if (block.rows && block.rows.length > 0) {
          checkPage(block.rows.length * 8 + 5);
          doc.setFontSize(10);
          const colWidth = maxWidth / block.rows[0].length;
          block.rows.forEach((row, ri) => {
            row.forEach((cell, ci) => {
              if (ri === 0) doc.setFont("helvetica", "bold");
              else doc.setFont("helvetica", "normal");
              doc.text(cell, margin + ci * colWidth + 2, y);
            });
            y += 7;
          });
          y += 4;
        }
        break;
      default:
        checkPage(8);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const paraLines = doc.splitTextToSize(text, maxWidth);
        doc.text(paraLines, margin, y);
        y += paraLines.length * 6;
        break;
    }
    y += 2;
  }

  doc.save(`${title}.pdf`);
}

export async function generateDOCX(content: string, title: string = "Document") {
  const blocks = parseMarkdown(content);
  const children: Paragraph[] = [];

  for (const block of blocks) {
    const text = stripMarkdown(block.text);
    switch (block.type) {
      case "h1":
        children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
        break;
      case "h2":
        children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
        break;
      case "h3":
        children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 } }));
        break;
      case "bullet":
        children.push(new Paragraph({
          children: [new TextRun(text)],
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        }));
        break;
      case "code":
        children.push(new Paragraph({
          children: [new TextRun({ text, font: "Courier New", size: 20 })],
          spacing: { before: 100, after: 100 },
          shading: { type: "clear" as any, color: "auto", fill: "F5F5F5" },
        }));
        break;
      case "table":
        if (block.rows) {
          for (const row of block.rows) {
            children.push(new Paragraph({
              children: [new TextRun(row.join("  |  "))],
              spacing: { before: 40, after: 40 },
            }));
          }
        }
        break;
      default:
        children.push(new Paragraph({
          children: [new TextRun(text)],
          spacing: { before: 80, after: 80 },
        }));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}.docx`);
}

export async function generatePPTX(content: string, title: string = "Presentation") {
  const pptx = new PptxGenJS();
  pptx.author = "CUEA AI";
  pptx.title = title;

  const blocks = parseMarkdown(content);
  let currentSlide: PptxGenJS.Slide | null = null;
  let bulletBuffer: string[] = [];
  let yPos = 1.5;

  const flushBullets = () => {
    if (bulletBuffer.length > 0 && currentSlide) {
      currentSlide.addText(
        bulletBuffer.map(b => ({ text: b, options: { bullet: true, fontSize: 14 } })),
        { x: 0.5, y: yPos, w: 9, h: bulletBuffer.length * 0.4, valign: "top" }
      );
      yPos += bulletBuffer.length * 0.35 + 0.2;
      bulletBuffer = [];
    }
  };

  for (const block of blocks) {
    const text = stripMarkdown(block.text);
    if (block.type === "h1" || block.type === "h2") {
      flushBullets();
      currentSlide = pptx.addSlide();
      yPos = 1.5;
      currentSlide.addText(text, {
        x: 0.5, y: 0.3, w: 9, h: 1, fontSize: block.type === "h1" ? 28 : 24,
        bold: true, color: "800000",
      });
    } else if (block.type === "h3" && currentSlide) {
      flushBullets();
      currentSlide.addText(text, {
        x: 0.5, y: yPos, w: 9, h: 0.5, fontSize: 18, bold: true, color: "333333",
      });
      yPos += 0.5;
    } else if (block.type === "bullet") {
      if (!currentSlide) { currentSlide = pptx.addSlide(); yPos = 0.5; }
      bulletBuffer.push(text);
    } else if (block.type === "paragraph") {
      if (!currentSlide) { currentSlide = pptx.addSlide(); yPos = 0.5; }
      flushBullets();
      currentSlide.addText(text, { x: 0.5, y: yPos, w: 9, h: 0.5, fontSize: 14 });
      yPos += 0.5;
    }
  }
  flushBullets();

  if (!currentSlide) {
    const slide = pptx.addSlide();
    slide.addText(stripMarkdown(content).slice(0, 2000), { x: 0.5, y: 0.5, w: 9, h: 5, fontSize: 14 });
  }

  const blob = await pptx.write({ outputType: "blob" }) as Blob;
  saveAs(blob, `${title}.pptx`);
}

export async function generateXLSX(content: string, title: string = "Spreadsheet") {
  const blocks = parseMarkdown(content);
  const wb = XLSX.utils.book_new();

  // Find table blocks
  const tableBlocks = blocks.filter(b => b.type === "table" && b.rows && b.rows.length > 0);
  
  if (tableBlocks.length > 0) {
    tableBlocks.forEach((tb, idx) => {
      const ws = XLSX.utils.aoa_to_sheet(tb.rows!);
      XLSX.utils.book_append_sheet(wb, ws, `Sheet${idx + 1}`);
    });
  } else {
    // If no tables, create a sheet from lines
    const lines = stripMarkdown(content).split("\n").filter(l => l.trim());
    const data = lines.map(l => [l]);
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  saveAs(blob, `${title}.xlsx`);
}
