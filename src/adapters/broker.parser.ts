import * as XLSX from "xlsx";
import { ParsedPortfolioItemInput } from "../models/types";

// Entry point (used by service)
export const parsePortfolioFile = (
  file: Express.Multer.File,
): ParsedPortfolioItemInput[] => {
  const mime = file.mimetype;

  if (mime === "text/csv" || file.originalname.endsWith(".csv")) {
    return parseCSV(file.buffer);
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.originalname.endsWith(".xlsx")
  ) {
    return parseXLSX(file.buffer);
  }

  throw new Error("Unsupported file format. Only CSV and XLSX are allowed.");
};

// ================= CSV =================

const parseCSV = (buffer: Buffer): ParsedPortfolioItemInput[] => {
  const content = buffer.toString("utf-8");

  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Invalid CSV format");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",");

    const row: Record<string, any> = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });

    return normalizeRow(row);
  });
};

// ================= XLSX =================

const parseXLSX = (buffer: Buffer): ParsedPortfolioItemInput[] => {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to raw 2D array (NOT JSON)
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1, // returns array of arrays
    defval: "",
  });

  // 🔍 Find header row dynamically
  const headerIndex = rows.findIndex((row) => {
    const joined = row.join(" ").toLowerCase();

    return (
      joined.includes("scrip") &&
      (joined.includes("qty") || joined.includes("quantity"))
    );
  });

  if (headerIndex === -1) {
    throw new Error("Could not find valid header row in XLSX");
  }

  const headers = rows[headerIndex].map((h: string) =>
    h.toLowerCase().replace(/\s+/g, ""),
  );

  const dataRows = rows.slice(headerIndex + 1);

  const parsed = dataRows
    .filter((row) => row.some((cell) => cell !== "")) // remove empty rows
    .map((row) => {
      const obj: Record<string, any> = {};

      headers.forEach((header, i) => {
        obj[header] = row[i];
      });

      return obj;
    });

  return parsed
    .map((row) => {
      try {
        return normalizeRow(row);
      } catch {
        return null;
      }
    })
    .filter((item): item is ParsedPortfolioItemInput => item !== null);
};

// ================= NORMALIZER =================

const normalizeRow = (row: Record<string, any>): ParsedPortfolioItemInput => {
  const normalized: Record<string, any> = {};

  // Normalize keys (lowercase + remove spaces)
  Object.keys(row).forEach((key) => {
    normalized[key.toLowerCase().replace(/\s+/g, "")] = row[key];
  });

  // ===== DISPLAY NAME (Scrip Name) =====
  const displayName =
    normalized.scripname ||        // ✅ Upstox
    normalized.companyname ||
    normalized.name;

  // ===== ISIN (MANDATORY) =====
  const isin =
    normalized.isin ||
    normalized.isinnumber;

  // ===== QUANTITY =====
  const quantity =
    normalized.currentqty ||       // ✅ Upstox
    normalized.freeqty ||
    normalized.quantity ||
    normalized.qty;

  // ===== AVG PRICE =====
  const avgPrice =
    normalized.avgprice ||         // manual / optional
    normalized.averageprice ||
    normalized.buyprice;

  // ===== CURRENT PRICE =====
  const currentPrice =
    normalized.rate ||             // ✅ Upstox
    normalized.ltp ||
    normalized.price;

  // ===== VALIDATION =====
  if (!displayName || !isin || !quantity) {
    throw new Error(
      `Invalid row: missing displayName/isin/quantity → ${JSON.stringify(row)}`
    );
  }

  return {
    displayName: String(displayName).trim(),
    isin: String(isin).trim(),
    quantity: Number(quantity),
    avgPrice: avgPrice
      ? Number(avgPrice)
      : currentPrice
      ? Number(currentPrice)
      : 0,
    currentPrice: currentPrice ? Number(currentPrice) : undefined,
  };
};
