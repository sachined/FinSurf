import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PASSES_FILE = process.env.VIP_PASSES_FILE ?? path.join(__dirname, '..', 'vip_passes.json');

interface Pass {
  code: string;
  label: string;
  type?: "admin" | "paid";
  createdAt: number;
  expiresAt: number;
}

function generatePassCode(): string {
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `FINSURF-${part()}-${part()}`;
}

function loadPasses(): Pass[] {
  try {
    if (!fs.existsSync(PASSES_FILE)) return [];
    return JSON.parse(fs.readFileSync(PASSES_FILE, "utf-8")) as Pass[];
  } catch {
    return [];
  }
}

function savePasses(passes: Pass[]): void {
  fs.mkdirSync(path.dirname(PASSES_FILE), { recursive: true });
  fs.writeFileSync(PASSES_FILE, JSON.stringify(passes, null, 2), "utf-8");
}

const count = parseInt(process.argv[2]) || 5;
const label = process.argv[3] || `Admin Generated - ${new Date().toISOString().split('T')[0]}`;
const days = 365 * 10; // 10 years by default for "lifetime"
const now = Date.now();
const passes = loadPasses();

console.log(`Generating ${count} unique access codes...`);
console.log('------------------------------------------');

const newCodes: string[] = [];

for (let i = 0; i < count; i++) {
  const code = generatePassCode();
  const pass: Pass = {
    code,
    label,
    type: "admin",
    createdAt: now,
    expiresAt: now + days * 24 * 60 * 60 * 1000
  };
  passes.push(pass);
  newCodes.push(code);
  console.log(`[${i+1}] Code: ${code} (Expires: ${new Date(pass.expiresAt).toLocaleDateString()})`);
}

savePasses(passes);
console.log('------------------------------------------');
console.log(`Successfully generated ${count} codes and saved to ${PASSES_FILE}`);
