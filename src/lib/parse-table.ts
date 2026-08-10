/**
 * Parser for pasted spreadsheet / CSV data.
 *
 * Copying cells out of Excel, Google Sheets, or Numbers yields tab-separated
 * text; a downloaded export is comma-separated. Both arrive through the same
 * textarea, so the delimiter is detected rather than configured.
 */

export type Row = Record<string, string>;

/** Splits one line, honouring "quoted, fields" and "" escapes. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === delimiter) {
      out.push(field);
      field = "";
    } else field += char;
  }

  out.push(field);
  return out.map((f) => f.trim());
}

function detectDelimiter(sample: string): string {
  const tabs = (sample.match(/\t/g) ?? []).length;
  const commas = (sample.match(/,/g) ?? []).length;
  return tabs >= commas ? "\t" : ",";
}

/**
 * Header aliases seen across Google Maps exports, chamber directories, and
 * scraping tools. Matching is loose so "Business Name", "name", and "Company"
 * all land on the same field.
 */
const FIELD_ALIASES: Record<string, RegExp> = {
  business_name: /^(business[_ ]?name|name|company|title|business)$/i,
  contact_name: /^(contact|contact[_ ]?name|owner|first[_ ]?name|person)$/i,
  phone: /^(phone|phone[_ ]?number|telephone|tel|mobile|number)$/i,
  email: /^(e[-_ ]?mail|email[_ ]?address)$/i,
  category: /^(category|type|industry|business[_ ]?type|niche|main[_ ]?category)$/i,
  city: /^(city|town|locality|area)$/i,
  website: /^(website|web[_ ]?site|url|site|domain|website[_ ]?url)$/i,
  source_url: /^(source|source[_ ]?url|listing|listing[_ ]?url|maps[_ ]?url|link|profile)$/i,
  notes: /^(notes?|description|comment|about|review[_ ]?quote)$/i,
};

export interface ParseResult {
  headers: string[];
  /** Detected mapping from our field name -> the header it came from. */
  mapping: Record<string, string>;
  rows: Row[];
  /** Rows whose column count didn't match the header. */
  malformed: number;
}

export function parseTable(text: string): ParseResult {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { headers: [], mapping: {}, rows: [], malformed: 0 };
  }

  const delimiter = detectDelimiter(lines.slice(0, 5).join("\n"));
  const headers = splitLine(lines[0], delimiter);

  const mapping: Record<string, string> = {};
  for (const [field, pattern] of Object.entries(FIELD_ALIASES)) {
    const hit = headers.find((h) => pattern.test(h));
    if (hit) mapping[field] = hit;
  }

  const rows: Row[] = [];
  let malformed = 0;

  for (const line of lines.slice(1)) {
    const cells = splitLine(line, delimiter);
    if (cells.length !== headers.length) {
      malformed++;
      // Still keep it if there's at least a first column — a trailing stray
      // delimiter shouldn't cost you the whole row.
      if (cells.length < 1 || !cells[0]) continue;
    }

    const row: Row = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? "";
    });
    rows.push(row);
  }

  return { headers, mapping, rows, malformed };
}

/** Applies a field->header mapping to produce import-shaped objects. */
export function applyMapping(
  rows: Row[],
  mapping: Record<string, string>,
): Record<string, string | null>[] {
  return rows.map((row) => {
    const out: Record<string, string | null> = {};
    for (const [field, header] of Object.entries(mapping)) {
      if (!header) continue;
      out[field] = row[header]?.trim() || null;
    }
    return out;
  });
}
