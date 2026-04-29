const sharp = require('sharp');

sharp('./assets/splash.png')
  .resize(1284, 2778, {
    fit: 'contain',           // keeps your design, adds background padding
    background: { r: 10, g: 28, b: 35, alpha: 1 }  // #0A1C23
  })
  .toFile('./assets/splash-fixed.png', (err, info) => {
    if (err) return console.error(err);
    console.log('✅ Done! New size:', info.width, 'x', info.height);
    console.log('Now rename splash-fixed.png to splash.png');
  });