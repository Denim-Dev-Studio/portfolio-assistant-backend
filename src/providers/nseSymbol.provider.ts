import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

let isinToSymbolMap: Record<string, string> = {};

export const loadNseSymbols = async () => {
  try {
    const csvPath = join(process.cwd(), 'EQUITY_L.csv');
    const csvData = readFileSync(csvPath, 'utf-8');

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const map: Record<string, string> = {};

    for (const row of records) {
      const r = row as Record<string, string>;
      const isin = r['ISIN NUMBER']?.trim();
      const symbol = r['SYMBOL']?.trim();

      if (isin && symbol) {
        map[isin] = `${symbol}.NS`;
      }
    }

    isinToSymbolMap = map;

    console.log(`Loaded ${Object.keys(map).length} NSE symbols`);
  } catch (err) {
    console.error('Failed to load NSE symbols', err);
    throw err;
  }
};

export const resolveSymbolFromISIN = (
  isin: string
): string | null => {
  return isinToSymbolMap[isin] || null;
};