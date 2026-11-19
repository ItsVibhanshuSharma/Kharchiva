import fs from 'fs';
import path from 'path';
import { ALL_STRINGS } from './strings';

const ROOT = path.resolve(__dirname, '..');
const FOLDERS = ['screens', 'features', 'components'];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.tsx$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [full]
      : [];
  });
}

/** Text written straight between JSX tags, e.g. <Text>Get started</Text>. */
function jsxTexts(source: string): string[] {
  const found: string[] = [];
  const pattern = />([^<>{}]*[A-Za-z][^<>{}]*)</g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const text = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/\s*\n\s*/g, ' ')
      .trim();
    // Skip matches that are really code (generics such as useState<...>), not text.
    if (text && !/[;=]|^[()\]]|Promise$|\?\s*\($/.test(text)) found.push(text);
  }
  return found;
}

// Text that is meant to stay as it is (brand, abbreviations, user-facing symbols).
const KEEP = new Set([
  'Kharchiva',
  'UPI',
  'PDF',
  'OTP',
  'MPIN',
  'INR',
  'X',
  'VS',
]);

describe('translation coverage', () => {
  it('has a translation for every plain text written inside <Text> in the translated screens', () => {
    const missing: string[] = [];
    for (const folder of FOLDERS) {
      for (const file of files(path.join(ROOT, folder))) {
        for (const text of jsxTexts(fs.readFileSync(file, 'utf8'))) {
          if (KEEP.has(text) || /^[^A-Za-z]*$/.test(text)) continue;
          if (!Object.prototype.hasOwnProperty.call(ALL_STRINGS, text)) {
            missing.push(`${path.relative(ROOT, file)}: ${text}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
