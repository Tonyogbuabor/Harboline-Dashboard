import { CleanedOrder, CleaningStats, RawOrderRow } from '../types/dashboard';

export const DEFAULT_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbxoRk9G7eYn8WyxGmomEt2GB31v30poQ3cn0KpkiLYJG0diF4n8RyUdFJxMn152uPdytg/exec';

export const STORAGE_EXEC_URL_KEY = 'harborline_exec_url';

function cleanString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseNumeric(val: unknown): { num: number; hadFormatting: boolean } {
  if (typeof val === 'number') {
    return { num: Number.isFinite(val) ? val : 0, hadFormatting: false };
  }
  const raw = cleanString(val);
  if (!raw) return { num: 0, hadFormatting: false };
  const hasSymbols = /[$,%\s,]/.test(raw);
  const cleaned = raw.replace(/[$,%\s,]/g, '');
  const parsed = Number(cleaned);
  return {
    num: Number.isFinite(parsed) ? parsed : 0,
    hadFormatting: hasSymbols,
  };
}

function parseDiscount(val: unknown): { pct: number; hadFormatting: boolean } {
  const raw = cleanString(val);
  const hasPercent = raw.includes('%');
  const { num, hadFormatting } = parseNumeric(val);
  if (num === 0) return { pct: 0, hadFormatting };
  // If sheet stores 8.5% as 0.085 decimal without %, convert to 8.5
  if (!hasPercent && num > 0 && num < 1) {
    return { pct: Number((num * 100).toFixed(2)), hadFormatting: true };
  }
  return { pct: Number(num.toFixed(2)), hadFormatting };
}

export function parseOrderDate(val: unknown): { iso: string; dateObj: Date; normalized: boolean } | null {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    return { iso, dateObj: new Date(`${iso}T00:00:00Z`), normalized: true };
  }

  // Handle Google Sheets / Excel numeric serial dates if provided
  if (typeof val === 'number' && Number.isFinite(val) && val > 25000 && val < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(epoch.getTime() + val * 86400000);
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    return { iso, dateObj: new Date(`${iso}T00:00:00Z`), normalized: true };
  }

  const raw = cleanString(val);
  if (!raw) return null;

  // Strict YYYY-MM-DD match
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dt = new Date(`${iso}T00:00:00Z`);
      if (!Number.isNaN(dt.getTime()) && dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day) {
        return { iso, dateObj: dt, normalized: raw !== iso };
      }
    }
    return null;
  }

  // MM/DD/YYYY or M/D/YYYY or YYYY/MM/DD
  const slashMatch = raw.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (slashMatch) {
    const a = Number(slashMatch[1]);
    const b = Number(slashMatch[2]);
    const c = Number(slashMatch[3]);
    let year: number, month: number, day: number;
    if (a > 1900) {
      year = a;
      month = b;
      day = c;
    } else {
      year = c < 100 ? 2000 + c : c;
      if (a > 12) {
        // DD/MM/YYYY
        day = a;
        month = b;
      } else {
        // MM/DD/YYYY
        month = a;
        day = b;
      }
    }
    if (year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dt = new Date(`${iso}T00:00:00Z`);
      if (!Number.isNaN(dt.getTime()) && dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day) {
        return { iso, dateObj: dt, normalized: true };
      }
    }
    return null;
  }

  // Fallback native Date parse (e.g., "Nov 14, 2026")
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    const year = fallback.getFullYear();
    if (year >= 1990 && year <= 2100) {
      const month = fallback.getMonth() + 1;
      const day = fallback.getDate();
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { iso, dateObj: new Date(`${iso}T00:00:00Z`), normalized: true };
    }
  }

  return null;
}

function getField(row: RawOrderRow, targetKey: string): unknown {
  if (targetKey in row) return row[targetKey];
  const lower = targetKey.toLowerCase().trim();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().trim() === lower) {
      return row[k];
    }
  }
  return undefined;
}

function scoreCompleteness(order: CleanedOrder): number {
  let score = 0;
  if (order.country !== 'Unspecified') score++;
  if (order.region !== 'Unspecified') score++;
  if (order.state !== 'Unspecified') score++;
  if (order.productCategory !== 'Unspecified') score++;
  if (order.product !== 'Unspecified') score++;
  if (order.salesRep !== 'Unspecified') score++;
  if (order.customerSegment !== 'Unspecified') score++;
  if (order.channel !== 'Unspecified') score++;
  if (order.revenue > 0) score += 2;
  if (order.cost > 0) score++;
  if (order.units > 0) score++;
  return score;
}

export function extractPayloadRows(payload: unknown): {
  rawRows: RawOrderRow[];
  updatedAt?: string;
} {
  if (Array.isArray(payload)) {
    // Check if it's a 2D array from Google Sheets getValues()
    if (payload.length > 0 && Array.isArray(payload[0])) {
      const headers = (payload[0] as unknown[]).map((h) => cleanString(h));
      const rows: RawOrderRow[] = [];
      for (let i = 1; i < payload.length; i++) {
        const arr = payload[i];
        if (!Array.isArray(arr)) continue;
        const obj: RawOrderRow = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = arr[idx];
        });
        rows.push(obj);
      }
      return { rawRows: rows };
    }
    return { rawRows: payload as RawOrderRow[] };
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const updatedAt =
      cleanString(obj.updatedAt) ||
      cleanString(obj.lastUpdated) ||
      cleanString(obj.timestamp) ||
      undefined;

    const candidates = obj.data ?? obj.rows ?? obj.records ?? obj.orders ?? obj.items;
    if (Array.isArray(candidates)) {
      const extracted = extractPayloadRows(candidates);
      return { rawRows: extracted.rawRows, updatedAt };
    }
  }

  return { rawRows: [] };
}

export function cleanOrderRows(rawRows: RawOrderRow[]): {
  orders: CleanedOrder[];
  stats: CleaningStats;
} {
  let blanksDiscarded = 0;
  let invalidDatesRemoved = 0;
  let duplicatesRemoved = 0;
  let normalizedFields = 0;

  const dedupeMap = new Map<string, CleanedOrder>();
  const noIdOrders: CleanedOrder[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || typeof row !== 'object') {
      blanksDiscarded++;
      continue;
    }

    const orderIdRaw = cleanString(getField(row, 'Order ID'));
    const revenueParsed = parseNumeric(getField(row, 'Revenue (USD)'));
    const rawRevStr = cleanString(getField(row, 'Revenue (USD)'));

    // Discard rows missing both Order ID and Revenue (USD)
    if (!orderIdRaw && !rawRevStr) {
      blanksDiscarded++;
      continue;
    }

    const parsedDate = parseOrderDate(getField(row, 'Order Date'));
    if (!parsedDate) {
      invalidDatesRemoved++;
      continue;
    }
    if (parsedDate.normalized) normalizedFields++;

    const normalizeCat = (key: string): string => {
      const raw = getField(row, key);
      const trimmed = cleanString(raw);
      if (typeof raw === 'string' && raw !== trimmed) normalizedFields++;
      if (!trimmed) {
        normalizedFields++;
        return 'Unspecified';
      }
      return trimmed;
    };

    const unitsParsed = parseNumeric(getField(row, 'Units'));
    const unitPriceParsed = parseNumeric(getField(row, 'Unit Price (USD)'));
    const discountParsed = parseDiscount(getField(row, 'Discount %'));
    const costParsed = parseNumeric(getField(row, 'Cost (USD)'));
    const profitParsed = parseNumeric(getField(row, 'Profit (USD)'));

    if (unitsParsed.hadFormatting) normalizedFields++;
    if (unitPriceParsed.hadFormatting) normalizedFields++;
    if (discountParsed.hadFormatting) normalizedFields++;
    if (revenueParsed.hadFormatting) normalizedFields++;
    if (costParsed.hadFormatting) normalizedFields++;
    if (profitParsed.hadFormatting) normalizedFields++;

    const revenue = Number(revenueParsed.num.toFixed(2));
    const cost = Number(costParsed.num.toFixed(2));
    // If profit cell is blank/zero when revenue and cost exist, derive cleanly if Profit was omitted
    const rawProfitStr = cleanString(getField(row, 'Profit (USD)'));
    const profit =
      rawProfitStr === '' && (revenue !== 0 || cost !== 0)
        ? Number((revenue - cost).toFixed(2))
        : Number(profitParsed.num.toFixed(2));

    const order: CleanedOrder = {
      orderId: orderIdRaw || `ROW-${i + 1}`,
      orderDate: parsedDate.iso,
      dateObj: parsedDate.dateObj,
      country: normalizeCat('Country'),
      region: normalizeCat('Region'),
      state: normalizeCat('State'),
      productCategory: normalizeCat('Product Category'),
      product: normalizeCat('Product'),
      salesRep: normalizeCat('Sales Rep'),
      customerSegment: normalizeCat('Customer Segment'),
      channel: normalizeCat('Channel'),
      units: Math.max(0, Math.round(unitsParsed.num)),
      unitPrice: Number(unitPriceParsed.num.toFixed(2)),
      discountPct: discountParsed.pct,
      revenue,
      cost,
      profit,
    };

    if (!orderIdRaw) {
      noIdOrders.push(order);
      continue;
    }

    const existing = dedupeMap.get(order.orderId);
    if (!existing) {
      dedupeMap.set(order.orderId, order);
    } else {
      duplicatesRemoved++;
      // Keep the latest date or more complete record
      const existingScore = scoreCompleteness(existing);
      const nextScore = scoreCompleteness(order);
      if (
        order.orderDate > existing.orderDate ||
        (order.orderDate === existing.orderDate && nextScore >= existingScore)
      ) {
        dedupeMap.set(order.orderId, order);
      }
    }
  }

  const orders = [...dedupeMap.values(), ...noIdOrders].sort((a, b) =>
    b.orderDate.localeCompare(a.orderDate)
  );

  return {
    orders,
    stats: {
      totalRawRows: rawRows.length,
      validRows: orders.length,
      duplicatesRemoved,
      blanksDiscarded,
      invalidDatesRemoved,
      normalizedFields,
    },
  };
}
