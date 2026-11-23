import type { AppState, Collections, Company, JournalEntry, Row } from "./types";
import { addMonths, isoDate } from "./format";
import {
  incomeLines,
  expenseLines,
  intercompanyLoanEntries,
  intercompanyServiceEntries,
} from "./accounting";
import { assetPurchaseEntry, mkEntry, payrollEntry, pendingDepreciation } from "./ledger-ops";
import { seedOperations } from "./seed-operations";

export const STATE_VERSION = 1;

export const DEFAULT_SETTINGS: AppState["settings"] = {
  lang: "en",
  theme: "light",
  lowCashThreshold: 1_500_000,
  approvalLimits: [
    { upTo: 100_000, levels: 1 },
    { upTo: 2_000_000, levels: 2 },
    { upTo: Number.MAX_SAFE_INTEGER, levels: 3 },
  ],
  documentExpiryDays: 60,
  emailAlerts: ["Daily Report Missing", "Document Expiry", "Low Cash Balance"],
  alertEmail: "",
  brandName: "b Group",
  brandTagline: "Enterprise operating system",
  logoDataUrl: "",
  faviconDataUrl: "",
  customOptions: {},
  customAccounts: [],
  heroTitle: "Run a portfolio of companies without being in every office.",
  heroText:
    "b Group gives the Group Owner a single dashboard over every company: daily operations, finances, assets, people, land, investments and new ventures, with individual accountability and complete financial control.",
};
export const OWNER_ID = "u-owner";

export const COMPANY_IDS = {
  bbike: "bbike",
  rahmat: "bag-e-rahmat",
  health: "best-health",
  nexovia: "nexovia-it",
  nogor: "nogor-bangla",
  bagro: "bagro",
  bblock: "bblock",
  solar: "solar-business",
  aihub: "ai-hub-bd",
} as const;

const blank = (id: string, name: string, category: string, status: Company["status"]): Company => ({
  id,
  name,
  category,
  status,
  registrationNo: "",
  tradeLicense: "",
  tin: "",
  bin: "",
  incorporationDate: "",
  address: "",
  website: "",
  contact: "",
  managingDirector: "",
  administrator: "",
  vision: "",
  mission: "",
  objectives: "",
  businessModel: "",
  initialInvestment: 0,
  currentValuation: 0,
  legalParentId: "",
  reportingParentId: "",
  fixedMonthlyCosts: 0,
  currency: "BDT",
});

function seedCompanies(): Company[] {
  const c = COMPANY_IDS;
  return [
    {
      ...blank(c.bbike, "bBike Ltd.", "Mobility & Transport", "Active"),
      registrationNo: "C-201845/2022",
      tradeLicense: "TL-0045821",
      tin: "TIN-1001-2201",
      bin: "BIN-0023-4411",
      incorporationDate: "2022-03-14",
      address: "Dhaka, Bangladesh",
      website: "bbike.example",
      contact: "+880 1700-000001",
      managingDirector: "Rafiq Hasan",
      administrator: "Nasrin Akter",
      vision: "Affordable smart mobility for every city in Bangladesh.",
      mission: "Deliver reliable bike services at scale.",
      objectives: "Reach 5,000 active riders; expand to 4 cities.",
      businessModel: "Rental, ride-hailing commissions, bike sales.",
      initialInvestment: 20_000_000,
      currentValuation: 48_000_000,
      fixedMonthlyCosts: 1_400_000,
    },
    {
      ...blank(c.rahmat, "Bag E Rahmat Holdings Ltd.", "Real Estate & Holdings", "Active"),
      registrationNo: "C-188220/2021",
      tradeLicense: "TL-0031190",
      tin: "TIN-1001-1810",
      bin: "BIN-0019-8802",
      incorporationDate: "2021-07-02",
      address: "Bagerhat, Khulna",
      contact: "+880 1700-000002",
      managingDirector: "Kamal Uddin",
      administrator: "Shirin Sultana",
      vision: "Build lasting property and land assets.",
      mission: "Develop, hold and manage quality property.",
      objectives: "Complete Phase 1 building; lease 80% of space.",
      businessModel: "Land holding, construction, rental income.",
      initialInvestment: 60_000_000,
      currentValuation: 140_000_000,
      fixedMonthlyCosts: 900_000,
    },
    {
      ...blank(c.health, "Best Health Diagnostic Limited", "Healthcare", "Active"),
      registrationNo: "C-205511/2023",
      tradeLicense: "TL-0051722",
      tin: "TIN-1001-3340",
      bin: "BIN-0031-2290",
      incorporationDate: "2023-01-20",
      address: "Khulna, Bangladesh",
      website: "besthealth.example",
      contact: "+880 1700-000003",
      managingDirector: "Dr. Tahmina Rahman",
      administrator: "Mizanur Rahman",
      vision: "Trusted diagnostics for every family.",
      mission: "Accurate, affordable, fast diagnostic services.",
      objectives: "Add MRI and expand pathology.",
      businessModel: "Fee-for-service diagnostics.",
      initialInvestment: 80_000_000,
      currentValuation: 110_000_000,
      fixedMonthlyCosts: 2_300_000,
    },
    {
      ...blank(c.nexovia, "Nexovia IT", "Software & IT Services", "Active"),
      registrationNo: "C-211930/2024",
      tradeLicense: "TL-0068814",
      tin: "TIN-1001-4412",
      bin: "BIN-0040-7731",
      incorporationDate: "2024-02-05",
      address: "Dhaka, Bangladesh",
      website: "nexovia.example",
      contact: "+880 1700-000004",
      managingDirector: "Sabbir Ahmed",
      administrator: "Farhana Yasmin",
      vision: "Software that runs Bangladeshi businesses.",
      mission: "Build and operate dependable digital products.",
      objectives: "Ship ERP product; 25 retainer clients.",
      businessModel: "Project fees and monthly retainers.",
      initialInvestment: 5_000_000,
      currentValuation: 14_000_000,
      fixedMonthlyCosts: 700_000,
    },
    {
      ...blank(c.nogor, "Nogor Bangla", "Retail & Services", "Active"),
      registrationNo: "C-199004/2022",
      tradeLicense: "TL-0040090",
      tin: "TIN-1001-2290",
      bin: "BIN-0027-1190",
      incorporationDate: "2022-11-11",
      address: "Dhaka, Bangladesh",
      contact: "+880 1700-000005",
      managingDirector: "Jahangir Alam",
      administrator: "Rumana Haque",
      vision: "A neighbourhood brand people trust.",
      mission: "Quality goods and services at fair prices.",
      objectives: "Open 3 outlets.",
      businessModel: "Retail margin and service fees.",
      initialInvestment: 8_000_000,
      currentValuation: 12_000_000,
      fixedMonthlyCosts: 650_000,
    },
    {
      ...blank(c.bagro, "bAgro", "Agriculture", "Under Development"),
      registrationNo: "C-219007/2025",
      tradeLicense: "TL-0079120",
      tin: "TIN-1001-5501",
      incorporationDate: "2025-04-01",
      address: "Jashore, Bangladesh",
      contact: "+880 1700-000006",
      managingDirector: "Anwar Hossain",
      administrator: "Lutfa Begum",
      vision: "Modern, profitable farming.",
      mission: "Supply fresh produce with traceability.",
      objectives: "First harvest cycle; contract buyers.",
      businessModel: "Crop sales and contract farming.",
      initialInvestment: 10_000_000,
      currentValuation: 10_000_000,
      fixedMonthlyCosts: 450_000,
    },
    {
      ...blank(c.bblock, "bBlock", "Technology (Planned)", "Planned"),
      objectives: "Validate market, then register.",
    },
    {
      ...blank(c.solar, "Solar Business", "Renewable Energy (Planned)", "Planned"),
      objectives: "Rooftop solar for SMEs.",
    },
    {
      ...blank(c.aihub, "AI Hub Bangladesh", "Artificial Intelligence (Planned)", "Planned"),
      objectives: "AI training and applied solutions hub.",
    },
  ];
}

type Profile = {
  capital: number;
  revenue: number;
  revenueAccount: string;
  growth: number;
  rent: number;
  utilities: number;
  marketing: number;
  transport: number;
  materials: number;
  admin: number;
};

const PROFILES: Record<string, Profile> = {
  [COMPANY_IDS.bbike]: {
    capital: 20_000_000,
    revenue: 3_600_000,
    revenueAccount: "4100",
    growth: 0.04,
    rent: 220_000,
    utilities: 80_000,
    marketing: 180_000,
    transport: 160_000,
    materials: 700_000,
    admin: 90_000,
  },
  [COMPANY_IDS.rahmat]: {
    capital: 60_000_000,
    revenue: 2_400_000,
    revenueAccount: "4400",
    growth: 0.03,
    rent: 0,
    utilities: 70_000,
    marketing: 60_000,
    transport: 50_000,
    materials: 600_000,
    admin: 100_000,
  },
  [COMPANY_IDS.health]: {
    capital: 80_000_000,
    revenue: 5_400_000,
    revenueAccount: "4200",
    growth: 0.035,
    rent: 320_000,
    utilities: 180_000,
    marketing: 90_000,
    transport: 40_000,
    materials: 900_000,
    admin: 120_000,
  },
  [COMPANY_IDS.nexovia]: {
    capital: 5_000_000,
    revenue: 1_900_000,
    revenueAccount: "4200",
    growth: 0.06,
    rent: 120_000,
    utilities: 40_000,
    marketing: 60_000,
    transport: 20_000,
    materials: 0,
    admin: 50_000,
  },
  [COMPANY_IDS.nogor]: {
    capital: 8_000_000,
    revenue: 2_100_000,
    revenueAccount: "4100",
    growth: 0.02,
    rent: 150_000,
    utilities: 60_000,
    marketing: 70_000,
    transport: 80_000,
    materials: 900_000,
    admin: 40_000,
  },
  [COMPANY_IDS.bagro]: {
    capital: 10_000_000,
    revenue: 350_000,
    revenueAccount: "4100",
    growth: 0.1,
    rent: 60_000,
    utilities: 30_000,
    marketing: 20_000,
    transport: 40_000,
    materials: 200_000,
    admin: 25_000,
  },
};

type EmpSeed = [name: string, designation: string, dept: string, basic: number];
const STAFF: Record<string, EmpSeed[]> = {
  [COMPANY_IDS.bbike]: [
    ["Rafiq Hasan", "Managing Director", "Management", 200000],
    ["Tania Islam", "Operations Manager", "Operations", 110000],
    ["Sohel Rana", "Finance Manager", "Finance", 100000],
    ["Imran Khan", "Fleet Supervisor", "Operations", 60000],
    ["Mitu Das", "Customer Support", "Support", 40000],
  ],
  [COMPANY_IDS.rahmat]: [
    ["Kamal Uddin", "Managing Director", "Management", 180000],
    ["Shirin Sultana", "Administrator", "Admin", 90000],
    ["Joynal Abedin", "Site Engineer", "Projects", 85000],
    ["Rina Parvin", "Accountant", "Finance", 60000],
  ],
  [COMPANY_IDS.health]: [
    ["Dr. Tahmina Rahman", "Managing Director", "Management", 250000],
    ["Mizanur Rahman", "Administrator", "Admin", 120000],
    ["Dr. Arif Chowdhury", "Radiologist", "Radiology", 160000],
    ["Salma Khatun", "Lab Manager", "Pathology", 90000],
    ["Hasan Mahmud", "Technician", "Radiology", 55000],
    ["Nurun Nahar", "Finance Officer", "Finance", 70000],
  ],
  [COMPANY_IDS.nexovia]: [
    ["Sabbir Ahmed", "Managing Director", "Management", 180000],
    ["Farhana Yasmin", "Administrator", "Admin", 80000],
    ["Rakib Hossain", "Senior Engineer", "Engineering", 120000],
    ["Mehedi Hasan", "Engineer", "Engineering", 80000],
  ],
  [COMPANY_IDS.nogor]: [
    ["Jahangir Alam", "Managing Director", "Management", 150000],
    ["Rumana Haque", "Administrator", "Admin", 70000],
    ["Salim Mia", "Store Manager", "Retail", 55000],
    ["Bithi Akter", "Cashier", "Retail", 30000],
  ],
  [COMPANY_IDS.bagro]: [
    ["Anwar Hossain", "Managing Director", "Management", 100000],
    ["Lutfa Begum", "Administrator", "Admin", 50000],
    ["Karim Sheikh", "Farm Supervisor", "Farming", 35000],
  ],
};

function seedEmployees(): Row[] {
  const rows: Row[] = [];
  let n = 1;
  for (const [companyId, list] of Object.entries(STAFF)) {
    list.forEach(([name, designation, department, basic], i) => {
      rows.push({
        id: `emp-${n}`,
        companyId,
        name,
        employeeCode: `E-${String(n).padStart(4, "0")}`,
        designation,
        department,
        joiningDate: "2024-01-15",
        basicSalary: basic,
        allowances: Math.round(basic * 0.15),
        bonus: 0,
        overtime: 0,
        deductions: 0,
        loanRecovery: i === 3 ? 2000 : 0,
        taxDeduction: Math.round(basic * 0.03),
        phone: `+880 17${String(10000000 + n * 137).slice(0, 8)}`,
        address: "Bangladesh",
        emergencyContact: "Family member",
        status: "Active",
        reportingManager: i === 0 ? "Group Owner" : (list[0]?.[0] ?? "Group Owner"),
      });
      n += 1;
    });
  }
  return rows;
}

function seedAssets(ref: Date): Row[] {
  const d = (back: number) => isoDate(addMonths(ref, -back));
  const mk = (
    id: string,
    companyId: string,
    name: string,
    category: string,
    department: string,
    back: number,
    price: number,
    install: number,
    life: number,
    salvage: number,
    method: string,
    rate = 0,
  ): Row => ({
    id,
    companyId,
    name,
    assetCode: id.toUpperCase(),
    category,
    department,
    purchaseDate: d(back),
    purchasePrice: price,
    installationCost: install,
    supplier: "Registered supplier",
    invoiceNo: `INV-${id}`,
    usefulLifeYears: life,
    salvageValue: salvage,
    method,
    ratePercent: rate,
    customSchedule: "",
    location: "Main premises",
    responsiblePerson: "Administrator",
    warranty: "2 years",
    insurance: "Covered",
    maintenance: "",
    status: "In Use",
  });
  return [
    mk(
      "ast-1",
      COMPANY_IDS.health,
      "Diagnostic Machine (CT / X-Ray)",
      "Diagnostic Machines",
      "Radiology",
      6,
      5_000_000,
      0,
      10,
      500_000,
      "Straight-Line",
    ),
    mk(
      "ast-2",
      COMPANY_IDS.health,
      "Laboratory Analyzer Set",
      "Laboratory Equipment",
      "Pathology",
      5,
      1_800_000,
      100_000,
      8,
      200_000,
      "Straight-Line",
    ),
    mk(
      "ast-3",
      COMPANY_IDS.rahmat,
      "Bagerhat Land Parcel (Phase 1)",
      "Land",
      "Projects",
      6,
      25_000_000,
      500_000,
      0,
      25_500_000,
      "Straight-Line",
    ),
    mk(
      "ast-4",
      COMPANY_IDS.bbike,
      "Electric Bike Fleet (60 units)",
      "Vehicles",
      "Operations",
      6,
      4_800_000,
      0,
      5,
      480_000,
      "Written Down Value",
      20,
    ),
    mk(
      "ast-5",
      COMPANY_IDS.nexovia,
      "Developer Workstations & Servers",
      "Computers",
      "Engineering",
      5,
      1_400_000,
      0,
      4,
      100_000,
      "Straight-Line",
    ),
    mk(
      "ast-6",
      COMPANY_IDS.nogor,
      "Shop Fit-out & Furniture",
      "Furniture",
      "Retail",
      5,
      900_000,
      60_000,
      8,
      60_000,
      "Straight-Line",
    ),
  ];
}

function monthOffsetDate(ref: Date, back: number, day: number): string | null {
  const d = new Date(ref.getFullYear(), ref.getMonth() - back, day);
  return d <= ref ? isoDate(d) : null;
}

function seedJournal(ref: Date, assets: Row[], employees: Row[]): JournalEntry[] {
  const out: JournalEntry[] = [];
  const push = (
    companyId: string,
    date: string | null,
    memo: string,
    lines: JournalEntry["lines"],
    source = "",
  ) => {
    if (!date || lines.length < 2) return;
    const e = mkEntry(companyId, date, memo, lines, source, OWNER_ID);
    if (!source) delete e.source;
    out.push(e);
  };

  for (const [cid, p] of Object.entries(PROFILES)) {
    push(
      cid,
      monthOffsetDate(ref, 7, 1),
      "Initial capital contribution",
      [
        { account: "1200", debit: p.capital, credit: 0 },
        { account: "3100", debit: 0, credit: p.capital },
      ],
      `capital:${cid}`,
    );
    for (let back = 6; back >= 0; back--) {
      const f = 1 + p.growth * (6 - back);
      const rev = Math.round(p.revenue * f);
      const at = (day: number) => monthOffsetDate(ref, back, day);
      push(
        cid,
        at(5),
        "Sales received in cash",
        incomeLines(p.revenueAccount, Math.round(rev * 0.35), "cash"),
      );
      push(
        cid,
        at(10),
        "Sales received in bank",
        incomeLines(p.revenueAccount, Math.round(rev * 0.5), "bank"),
      );
      push(
        cid,
        at(18),
        "Sales on credit",
        incomeLines(p.revenueAccount, Math.round(rev * 0.15), "credit"),
      );
      if (p.rent) push(cid, at(2), "Office rent", expenseLines("5200", p.rent, "bank"));
      push(cid, at(8), "Utilities", expenseLines("5300", p.utilities, "bank"));
      push(
        cid,
        at(12),
        "Marketing",
        expenseLines("5400", Math.round(p.marketing * (0.9 + 0.05 * (back % 3))), "bank"),
      );
      push(cid, at(14), "Transportation", expenseLines("5500", p.transport, "cash"));
      if (p.materials) {
        const acc = cid === COMPANY_IDS.rahmat ? "5720" : "5710";
        push(cid, at(9), "Materials / consumables", expenseLines(acc, p.materials, "credit"));
        const settle = Math.round(p.materials * 0.8);
        push(cid, at(20), "Settle supplier payable", [
          { account: "2100", debit: settle, credit: 0 },
          { account: "1200", debit: 0, credit: settle },
        ]);
      }
      push(cid, at(16), "Administrative expenses", expenseLines("5730", p.admin, "cash"));
      const collect = Math.round(rev * 0.1);
      push(cid, at(22), "Collect receivable", [
        { account: "1200", debit: collect, credit: 0 },
        { account: "1400", debit: 0, credit: collect },
      ]);
    }
  }

  // A one-off large expense this month so anomaly detection has something real to find.
  push(
    COMPANY_IDS.bbike,
    monthOffsetDate(ref, 0, 1),
    "Fleet accident repairs (one-off)",
    expenseLines("5600", 1_400_000, "bank"),
  );

  for (const a of assets) {
    const e = assetPurchaseEntry(a, OWNER_ID);
    if (e) out.push(e);
  }
  const months: string[] = [];
  for (let back = 6; back >= 0; back--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - back, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const today = isoDate(ref);
  for (const m of months) {
    for (const cid of Object.keys(STAFF)) {
      const e = payrollEntry(cid, m, employees, out, OWNER_ID);
      if (e && e.date <= today) out.push(e);
    }
  }
  out.push(
    ...pendingDepreciation(assets, out, months[months.length - 1] ?? "", OWNER_ID).filter(
      (e) => e.date <= today,
    ),
  );

  const loanDate = monthOffsetDate(ref, 3, 12);
  for (const part of intercompanyLoanEntries(COMPANY_IDS.bbike, COMPANY_IDS.bagro, 2_000_000)) {
    push(part.companyId, loanDate, "Intercompany loan bBike → bAgro", part.lines);
  }
  const svcDate = monthOffsetDate(ref, 1, 20);
  for (const part of intercompanyServiceEntries(COMPANY_IDS.nexovia, COMPANY_IDS.health, 150_000)) {
    push(part.companyId, svcDate, "Intercompany IT services Nexovia → Best Health", part.lines);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildSeed(ref: Date = new Date()): AppState {
  const assets = seedAssets(ref);
  const employees = seedEmployees();
  const other: Omit<Collections, "assets" | "employees"> = seedOperations(ref);
  return {
    version: STATE_VERSION,
    companies: seedCompanies(),
    journal: seedJournal(ref, assets, employees),
    collections: { ...other, assets, employees },
    audit: [
      {
        id: "aud-1",
        at: `${isoDate(ref)}T08:00:00.000Z`,
        user: "System",
        action: "Seeded",
        target: "Workspace",
        detail: "Demo data created. Replace with real records.",
      },
    ],
    settings: {
      ...DEFAULT_SETTINGS,
      approvalLimits: DEFAULT_SETTINGS.approvalLimits.map((l) => ({ ...l })),
    },
    activeCompanyId: "all",
    period: "month",
    customFrom: "",
    customTo: "",
    currentUserId: OWNER_ID,
    readNotifications: [],
  };
}
