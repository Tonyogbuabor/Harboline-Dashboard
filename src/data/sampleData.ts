import { RawOrderRow } from '../types/dashboard';

interface ProductCatalogItem {
  category: string;
  product: string;
  basePrice: number;
  unitCostRatio: number;
}

const CATALOG: ProductCatalogItem[] = [
  { category: 'Industrial Valves', product: 'High-Pressure Ball Valve 4"', basePrice: 680, unitCostRatio: 0.56 },
  { category: 'Industrial Valves', product: 'Stainless Gate Valve 6"', basePrice: 920, unitCostRatio: 0.58 },
  { category: 'Industrial Valves', product: 'Cryogenic Check Valve', basePrice: 1140, unitCostRatio: 0.54 },
  { category: 'Marine & Cargo Rigging', product: 'Galvanized Shackle Set (20T)', basePrice: 410, unitCostRatio: 0.61 },
  { category: 'Marine & Cargo Rigging', product: 'Container Twist-Lock Kit', basePrice: 540, unitCostRatio: 0.59 },
  { category: 'Marine & Cargo Rigging', product: 'Heavy-Duty Winch Cable 150ft', basePrice: 790, unitCostRatio: 0.60 },
  { category: 'Hydraulic Systems', product: 'Axial Piston Pump 3500 PSI', basePrice: 1480, unitCostRatio: 0.52 },
  { category: 'Hydraulic Systems', product: 'Hydraulic Manifold Block 8-Port', basePrice: 860, unitCostRatio: 0.53 },
  { category: 'Hydraulic Systems', product: 'Braided Hose Reel Assembly', basePrice: 495, unitCostRatio: 0.55 },
  { category: 'Safety & PPE', product: 'Offshore Immersion Suit', basePrice: 620, unitCostRatio: 0.63 },
  { category: 'Safety & PPE', product: 'Multi-Gas Detection Monitor', basePrice: 740, unitCostRatio: 0.58 },
  { category: 'Safety & PPE', product: 'Spill Containment Pallet Kit', basePrice: 380, unitCostRatio: 0.62 },
];

interface TerritoryDef {
  region: string;
  states: string[];
  rep: string;
  segment: string;
}

const TERRITORIES: TerritoryDef[] = [
  { region: 'Gulf Coast', states: ['TX', 'LA'], rep: 'Sofia Mendoza', segment: 'Energy & Utilities' },
  { region: 'West Coast', states: ['CA', 'WA', 'OR'], rep: 'Elena Vance', segment: 'Maritime Fleet' },
  { region: 'Southeast', states: ['FL', 'GA', 'NC'], rep: 'Priya Nair', segment: 'Logistics' },
  { region: 'Midwest', states: ['IL', 'OH', 'MI'], rep: 'Marcus Thorne', segment: 'Manufacturing' },
  { region: 'Northeast', states: ['NY', 'MA', 'PA'], rep: 'David Kowalski', segment: 'Manufacturing' },
];

const CHANNELS = ['Direct B2B', 'Distributor', 'E-Commerce Portal', 'Government Contract'];

// Deterministic pseudo-random generator for reproducible sample data
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleRawRows(): RawOrderRow[] {
  const rand = mulberry32(20261120);
  const rows: RawOrderRow[] = [];
  let seq = 1001;

  // Generate paired monthly orders across 2025 (months 1..11) and 2026 (months 1..11)
  // Plus a Dec 2025 cohort so All Time & 12-month histories are continuous.
  const monthPairs: Array<{ year: number; month: number; count: number }> = [];
  for (let m = 1; m <= 12; m++) {
    monthPairs.push({ year: 2025, month: m, count: m === 12 ? 4 : 5 });
  }
  for (let m = 1; m <= 11; m++) {
    monthPairs.push({ year: 2026, month: m, count: m >= 9 ? 6 : 5 });
  }

  for (const { year, month, count } of monthPairs) {
    for (let i = 0; i < count; i++) {
      const territoryIdx = (month + i) % TERRITORIES.length;
      const territory = TERRITORIES[territoryIdx];
      const state = territory.states[(i + month) % territory.states.length];

      // Pick product with intentional regional/year tilt
      let catalogIdx = Math.floor(rand() * CATALOG.length);
      if (year === 2026 && territory.region === 'Gulf Coast' && i % 2 === 0) {
        catalogIdx = 6 + (i % 3); // Hydraulic Systems surge in Gulf Coast
      } else if (territory.region === 'Northeast' && i % 2 === 0) {
        catalogIdx = i % 3; // Industrial Valves concentration in Northeast
      }

      const item = CATALOG[catalogIdx];
      const channel = CHANNELS[(i + territoryIdx + (year === 2026 ? 1 : 0)) % CHANNELS.length];
      const rep =
        i % 4 === 3 && territory.region !== 'Northeast'
          ? "Liam O'Connor"
          : territory.rep;

      // Date within month (cap Nov 2026 at Nov 19 so it aligns cleanly with 2026-11-20)
      const maxDay = year === 2026 && month === 11 ? 19 : 27;
      const day = Math.min(maxDay, 2 + Math.floor(rand() * (maxDay - 1)));
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Units & discount engineering for realistic YoY signals
      let units = 6 + Math.floor(rand() * 18);
      let discountPct = 4 + Math.floor(rand() * 5); // 4% - 8%

      if (year === 2026) {
        if (territory.region === 'Gulf Coast') {
          units = Math.round(units * 1.38);
          discountPct = 4.5;
        } else if (territory.region === 'West Coast') {
          units = Math.round(units * 1.24);
          discountPct = 5.0;
        } else if (territory.region === 'Southeast') {
          units = Math.round(units * 1.15);
        } else if (territory.region === 'Northeast') {
          // Deliberate YoY contraction + discount creep in Northeast Industrial Valves
          units = Math.max(3, Math.round(units * 0.68));
          discountPct = item.category === 'Industrial Valves' ? 12.5 : 10.2;
        }

        if (item.category === 'Safety & PPE' || channel === 'E-Commerce Portal') {
          discountPct = Math.max(discountPct, 11.8);
        }
      }

      const gross = units * item.basePrice;
      const revenue = Number((gross * (1 - discountPct / 100)).toFixed(2));
      // Cost slightly higher in 2026 for Safety & PPE to trigger realistic margin compression alert
      const costRatio =
        year === 2026 && item.category === 'Safety & PPE'
          ? item.unitCostRatio + 0.04
          : item.unitCostRatio;
      const cost = Number((gross * costRatio).toFixed(2));
      const profit = Number((revenue - cost).toFixed(2));

      const orderId = `HL-${year}-${seq++}`;

      // Deliberately format a few rows as messy spreadsheet strings to exercise cleaner
      const useMessyFormat = seq % 11 === 0;
      const formattedDate =
        seq % 17 === 0 ? `${month}/${day}/${year}` : isoDate;

      rows.push({
        'Order ID': useMessyFormat ? ` ${orderId} ` : orderId,
        'Order Date': formattedDate,
        Country: 'United States',
        Region: useMessyFormat ? ` ${territory.region} ` : territory.region,
        State: state,
        'Product Category': item.category,
        Product: item.product,
        'Sales Rep': rep,
        'Customer Segment': territory.segment,
        Channel: channel,
        Units: units,
        'Unit Price (USD)': useMessyFormat ? `$${item.basePrice.toLocaleString('en-US')}.00` : item.basePrice,
        'Discount %': useMessyFormat ? `${discountPct}%` : discountPct,
        'Revenue (USD)': useMessyFormat ? `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : revenue,
        'Cost (USD)': useMessyFormat ? `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : cost,
        'Profit (USD)': profit,
      });
    }
  }

  // Inject 2 duplicate rows and 1 blank row to demonstrate real cleaning hygiene stats
  if (rows.length > 10) {
    rows.push({ ...rows[4] });
    rows.push({ ...rows[18] });
    rows.push({
      'Order ID': '',
      'Order Date': '',
      Country: '',
      Region: '',
      State: '',
      'Product Category': '',
      Product: '',
      'Sales Rep': '',
      'Customer Segment': '',
      Channel: '',
      Units: '',
      'Unit Price (USD)': '',
      'Discount %': '',
      'Revenue (USD)': '',
      'Cost (USD)': '',
      'Profit (USD)': '',
    });
  }

  return rows;
}
