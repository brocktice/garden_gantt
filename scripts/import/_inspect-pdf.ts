// scripts/import/_inspect-pdf.ts
// Dev helper: dump a PDF's text-with-coordinates so we can design a parser.
// Not wired into the build. Run: npx tsx scripts/import/_inspect-pdf.ts <path>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('usage: tsx scripts/import/_inspect-pdf.ts <pdf-path>');
    process.exit(1);
  }
  const path = resolve(arg);
  const buf = readFileSync(path);
  const data = new Uint8Array(buf);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  console.log(`# ${path}`);
  console.log(`# pages: ${doc.numPages}`);
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const text = await page.getTextContent();
    console.log(`\n=== page ${p} ===`);
    for (const item of text.items as Array<{
      str: string;
      transform: number[];
    }>) {
      const x = Math.round(item.transform[4] ?? 0);
      const y = Math.round(item.transform[5] ?? 0);
      if (item.str.trim() === '') continue;
      console.log(`  [${x},${y}] ${JSON.stringify(item.str)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
