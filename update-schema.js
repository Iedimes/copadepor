const fs = require('fs');
const path = 'C:\\wamp64\\www\\copadepor\\prisma\\schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// Agregar events a Team
content = content.replace(
  '   messages        Message[]\n}',
  '   messages        Message[]\n   events          MatchEvent[]  @relation("TeamEvents")\n}'
);

// Agregar events a PlayerProfile
content = content.replace(
  '   teamPlayers TeamPlayer[]\n}',
  '   teamPlayers    TeamPlayer[]\n   matchEvents     MatchEvent[]  @relation("PlayerEvents")\n}'
);

fs.writeFileSync(path, content);
console.log('✅ Archivo schema.prisma actualizado con relaciones para MatchEvent');
