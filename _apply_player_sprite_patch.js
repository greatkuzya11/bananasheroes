const fs = require('fs');
const path = require('path');

function patchFile(file, transform) {
  const full = path.resolve(file);
  let s = fs.readFileSync(full, 'utf8');
  const ns = transform(s);
  if (ns !== s) {
    fs.writeFileSync(full, ns, 'utf8');
    console.log(file + ': patched');
  } else {
    console.log(file + ': no change');
  }
}

// Patch player.js: constructor signature + this.spriteSystem assignment
patchFile('js/entities/player.js', (s) => {
  let t = s;
  if (t.includes('constructor(type, spriteSystem)')) return t;
  t = t.replace(/constructor\(type\)\s*\{/, 'constructor(type, spriteSystem) {');
  // Insert assignment after gravity line
  t = t.replace(/this\.gravity = 0;([^\n]*)\n/, "this.gravity = 0;$1\n        this.spriteSystem = spriteSystem || type;\n");
  return t;
});

// Patch state.js: create player with sprite system
patchFile('js/core/state.js', (s) => {
  let t = s;
  t = t.replace(/player = new Player\(selectedChar\);/g, 'player = new Player(selectedChar, selectedSpriteSystem);');
  return t;
});

console.log('\nDone');
