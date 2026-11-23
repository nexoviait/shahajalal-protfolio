import type { ModuleId } from "./rbac";

export type Lang = "en" | "bn";

/** Sidebar and common labels in English and Bangla. */
export const NAV: { id: ModuleId; to: string; en: string; bn: string }[] = [
  { id: "dashboard", to: "/app", en: "Master Dashboard", bn: "মাস্টার ড্যাশবোর্ড" },
  { id: "companies", to: "/app/companies", en: "Company Portfolio", bn: "কোম্পানি পোর্টফোলিও" },
  { id: "daily", to: "/app/daily", en: "Daily Reports", bn: "দৈনিক রিপোর্ট" },
  { id: "finance", to: "/app/finance", en: "Finance & Accounting", bn: "অর্থ ও হিসাব" },
  { id: "treasury", to: "/app/treasury", en: "Group Treasury", bn: "গ্রুপ ট্রেজারি" },
  { id: "assets", to: "/app/assets", en: "Assets & Depreciation", bn: "সম্পদ ও অবচয়" },
  { id: "hr", to: "/app/hr", en: "HR & Payroll", bn: "এইচআর ও বেতন" },
  { id: "management", to: "/app/management", en: "Management Team", bn: "ব্যবস্থাপনা দল" },
  { id: "projects", to: "/app/projects", en: "Projects", bn: "প্রকল্প" },
  { id: "land", to: "/app/land", en: "Land & Properties", bn: "ভূমি ও সম্পত্তি" },
  {
    id: "investments",
    to: "/app/investments",
    en: "Investment & Shareholders",
    bn: "বিনিয়োগ ও শেয়ারহোল্ডার",
  },
  { id: "planning", to: "/app/planning", en: "Business Planning", bn: "ব্যবসা পরিকল্পনা" },
  { id: "breakeven", to: "/app/breakeven", en: "Break-even Analysis", bn: "ব্রেক-ইভেন বিশ্লেষণ" },
  { id: "documents", to: "/app/documents", en: "Documents", bn: "ডকুমেন্ট" },
  { id: "tasks", to: "/app/tasks", en: "Tasks & Workflow", bn: "কাজ ও ওয়ার্কফ্লো" },
  { id: "approvals", to: "/app/approvals", en: "Approvals", bn: "অনুমোদন" },
  { id: "ai", to: "/app/ai", en: "AI Business Intelligence", bn: "এআই ব্যবসায়িক বিশ্লেষণ" },
  { id: "reports", to: "/app/reports", en: "Reports & Analytics", bn: "রিপোর্ট ও বিশ্লেষণ" },
  { id: "notifications", to: "/app/notifications", en: "Notifications", bn: "নোটিফিকেশন" },
  { id: "personal", to: "/app/personal", en: "Personal Owner Profile", bn: "ব্যক্তিগত প্রোফাইল" },
  { id: "users", to: "/app/users", en: "User Management", bn: "ইউজার ম্যানেজমেন্ট" },
  { id: "settings", to: "/app/settings", en: "System Settings", bn: "সিস্টেম সেটিংস" },
];

/** Modules shown in a single company's workspace sidebar. */
export const COMPANY_NAV: ModuleId[] = [
  "dashboard",
  "daily",
  "finance",
  "assets",
  "hr",
  "management",
  "projects",
  "land",
  "documents",
  "tasks",
  "approvals",
  "breakeven",
  "reports",
];

const DICT = {
  allCompanies: { en: "All companies", bn: "সব কোম্পানি" },
  group: { en: "Group", bn: "গ্রুপ" },
  search: { en: "Search", bn: "খুঁজুন" },
  add: { en: "Add", bn: "যোগ করুন" },
  save: { en: "Save", bn: "সংরক্ষণ" },
  cancel: { en: "Cancel", bn: "বাতিল" },
  delete: { en: "Delete", bn: "মুছুন" },
  company: { en: "Company", bn: "কোম্পানি" },
  revenue: { en: "Revenue", bn: "আয়" },
  expenses: { en: "Expenses", bn: "ব্যয়" },
  profit: { en: "Net profit", bn: "নিট মুনাফা" },
  backToGroup: { en: "Back to group", bn: "গ্রুপে ফিরুন" },
  workspace: { en: "Company workspace", bn: "কোম্পানি ওয়ার্কস্পেস" },
} as const;

export type DictKey = keyof typeof DICT;

export function tr(lang: Lang, key: DictKey): string {
  return DICT[key][lang];
}

export function navLabel(lang: Lang, item: { en: string; bn: string }): string {
  return lang === "bn" ? item.bn : item.en;
}
