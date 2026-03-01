const fs = require('fs');

// Patch bullets.js: set kuzy speed to 6 within case block
const bulletsFile = 'js/systems/bullets.js';
let bullets = fs.readFileSync(bulletsFile, 'utf8');

// Replace speed assignment within kuzy case
const kuzyCaseRegex = /(case\s+"kuzy"\s*:\s*\n[\s\S]*?speed\s*=\s*)(\d+)(\s*;)/m;
if (kuzyCaseRegex.test(bullets)){
  bullets = bullets.replace(kuzyCaseRegex, (m, g1, g2, g3) => g1 + '6' + g3);
  fs.writeFileSync(bulletsFile, bullets, 'utf8');
  console.log('bullets.js: kuzy speed set to 6 — OK');
} else {
  console.log('bullets.js: kuzy case not found (no change)');
}

// Patch index.html: insert help subsection after controls table
const htmlFile = 'index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const insertAfter = '</table>';
const helpSectionHTML = `\n            <section>\n                <h3>👥 Персонажи — характеристики</h3>\n                <p>Кузя: скорость пули — <strong>6</strong></p>\n                <p>Дрон: скорость пули — <strong>9</strong></p>\n                <p>Макс: скорость пули — <strong>11</strong></p>\n            </section>\n`;

// Find the first occurrence of the controls table within help-scroll and add section after its closing tag
const helpScrollIndex = html.indexOf('<div class="help-scroll">');
if (helpScrollIndex !== -1) {
  const tableIdx = html.indexOf('<table class="help-table">', helpScrollIndex);
  if (tableIdx !== -1) {
    const tableCloseIdx = html.indexOf('</table>', tableIdx);
    if (tableCloseIdx !== -1) {
      const insertPos = tableCloseIdx + '</table>'.length;
      // Insert help section after the table close
      html = html.slice(0, insertPos) + helpSectionHTML + html.slice(insertPos);
      fs.writeFileSync(htmlFile, html, 'utf8');
      console.log('index.html: help characters section inserted — OK');
    } else {
      console.log('index.html: closing </table> not found after help table');
    }
  } else {
    console.log('index.html: help table not found inside help-scroll');
  }
} else {
  console.log('index.html: help-scroll not found');
}

console.log('\nDone');
