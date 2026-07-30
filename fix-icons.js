const sharp = require('sharp');

// Fix icon.png - 1024x1024 with proper background
sharp('./assets/icon.png')
  .resize(1024, 1024, {
    fit: 'contain',
    background: { r: 10, g: 28, b: 35, alpha: 1 } // #0A1C23
  })
  .toFile('./assets/icon-fixed.png', (err, info) => {
    if (err) return console.error('icon error:', err);
    console.log('✅ icon-fixed.png done:', info.width, 'x', info.height);
  });

// Fix adaptive-icon.png - 1024x1024 with logo centered and padded
sharp('./assets/adaptive-icon.png')
  .resize(720, 720, {
    fit: 'contain',
    background: { r: 10, g: 28, b: 35, alpha: 1 } // #0A1C23
  })
  .extend({
    top: 152,
    bottom: 152,
    left: 152,
    right: 152,
    background: { r: 10, g: 28, b: 35, alpha: 1 }
  })
  .toFile('./assets/adaptive-icon-fixed.png', (err, info) => {
    if (err) return console.error('adaptive error:', err);
    console.log('✅ adaptive-icon-fixed.png done:', info.width, 'x', info.height);
  });