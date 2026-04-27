const fs = require('fs');
const path = require('path');

// Mover route.ts de [matchId] a [id]
const oldFile = 'src\\app\\api\\matches\\[matchId]\\route.ts';
const newFile = 'src\\app\\api\\matches\\[id]\\route.ts';

if (fs.existsSync(oldFile)) {
  fs.renameSync(oldFile, newFile);
  console.log('Archivo movido:', oldFile, '->', newFile);
} else {
  console.log('Archivo no encontrado:', oldFile);
}

// Eliminar carpeta [matchId] si está vacía
try {
  fs.rmdirSync('src\\app\\api\\matches\\[matchId]');
  console.log('Carpeta [matchId] eliminada');
} catch (e) {
  console.log('Carpeta [matchId] no se puede eliminar (posiblemente no vacía)');
}

console.log('\\nContenido de [id]:', fs.readdirSync('src\\app\\api\\matches\\[id]'));
