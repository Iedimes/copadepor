const fs = require('fs');

const oldFile = 'src/app/api/matches/[matchId]/route.ts';
const newFile = 'src/app/api/matches/[id]/route.ts';

if (fs.existsSync(oldFile)) {
  fs.renameSync(oldFile, newFile);
  console.log('Movido:', oldFile, '->', newFile);
} else {
  console.log('No existe:', oldFile);
}

// Borrar la carpeta si quedó vacía
try {
  fs.rmdirSync('src/app/api/matches/[matchId]');
  console.log('Eliminada carpeta [matchId]');
} catch(e) {
  console.log('Carpeta no se puede eliminar');
}

// Leer el archivo y reemplazar [matchId] por [id]
let content = fs.readFileSync(newFile, 'utf8');
content = content.replace(/\[matchId\]/g, '[id]');
fs.writeFileSync(newFile, content);
console.log('Reemplazado [matchId] por [id] en:', newFile);
