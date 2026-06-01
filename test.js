const fs = require('fs');
const vm = require('vm');

const context = {
  window: { addEventListener: () => {} },
  document: { body: { classList: { add:()=>{}, remove:()=>{} } }, getElementById: (id) => ({ value: 'A,B,C,D', style: {}, classList: { add:()=>{}, remove:()=>{} }, innerHTML: '', innerText: '' }), addEventListener: () => {} },
  requestAnimationFrame: () => {},
  cancelAnimationFrame: () => {},
  Math: Math,
  performance: { now: () => 0 },
  console: console,
  setTimeout: setTimeout,
  Date: Date
};
vm.createContext(context);

const scripts = [
  'constants.js',
  'physics.js',
  'entities.js',
  'ball.js',
  'collision.js',
  'camera.js',
  'effects.js',
  'race.js',
  'maps/neon.js',
  'maps/canyon.js',
  'maps/classic.js',
  'ui.js',
  'game.js'
];

try {
  for (const src of scripts) {
    const code = fs.readFileSync('d:/chaos-drop/' + src, 'utf8');
    vm.runInContext(code, context, { filename: src });
  }
  console.log("Scripts loaded successfully.");
  
  // Try to simulate switchMap('classic')
  vm.runInContext("switchMap('classic');", context);
  console.log("switchMap executed successfully.");
  
  // Create a fake canvas context
  vm.runInContext(`
    ctx = {
      save:()=>{}, restore:()=>{}, beginPath:()=>{}, closePath:()=>{},
      moveTo:()=>{}, lineTo:()=>{}, arc:()=>{}, fill:()=>{}, stroke:()=>{},
      fillText:()=>{}, fillRect:()=>{}, strokeRect:()=>{}, translate:()=>{},
      rotate:()=>{}, scale:()=>{}, bezierCurveTo:()=>{}, quadraticCurveTo:()=>{},
      setLineDash:()=>{}
    };
    pinballCanvas = { width: 900, height: 1600 };
    animatePinball(16);
  `, context);
  console.log("animatePinball executed successfully.");
} catch (e) {
  console.error("ERROR:", e);
}
