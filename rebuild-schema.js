// Script para reconstruir schema.prisma correctamente

const fs = require('fs');
const path = 'C:\\wamp64\\www\\copadepor\\prisma\\schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// Primero, asegurarnos de que no haya MatchEvent mal agregado
// Eliminar cualquier MatchEvent existente
content = content.replace(/\\nmodel MatchEvent \{[^}]*\}/g, '');

// Ahora agregar MatchEvent correctamente después de Goal
content = content.replace(
  'model Goal {\n   id         String   @id @default(cuid())\n   matchId    String\n   playerId   String\n   teamId     String\n   isOwnGoal  Boolean @default(false)\n   minute     Int?\n   createdAt  DateTime @default(now())\n\n   match  Match          @relation(fields: [matchId], references: [id], onDelete: Cascade)\n   player PlayerProfile @relation(fields: [playerId], references: [id])\n}\n\nmodel Sanction {',
  'model Goal {\n   id         String   @id @default(cuid())\n   matchId    String\n   playerId   String\n   teamId     String\n   isOwnGoal  Boolean @default(false)\n   minute     Int?\n   createdAt  DateTime @default(now())\n\n   match  Match          @relation(fields: [matchId], references: [id], onDelete: Cascade)\n   player PlayerProfile @relation(fields: [playerId], references: [id])\n}\n\nmodel MatchEvent {\n   id          String   @id @default(cuid())\n   matchId     String\n   teamId      String\n   playerId    String?\n   eventType   String   // \'goal\', \'assist\', \'yellow_card\', \'red_card\', \'minute_marker\'
   minute      Int?\n   description String?\n   createdAt   DateTime @default(now())\n\n   match  Match  @relation(fields: [matchId], references: [id], onDelete: Cascade, name: "MatchEvents")\n   team   Team   @relation(fields: [teamId], references: [id], name: "TeamEvents")\n   player PlayerProfile? @relation(fields: [playerId], references: [id], name: "PlayerEvents")\n}\n\nmodel Sanction {'
);

// Agregar relaciones inversas en Team
content = content.replace(
  '   messages        Message[]\n }\n}',
  '   messages        Message[]\n   events          MatchEvent[] @relation("TeamEvents")\n }\n}'
);

// Agregar relaciones inversas en PlayerProfile  
content = content.replace(
  '   teamPlayers    TeamPlayer[]\n }\n}',
  '   teamPlayers    TeamPlayer[]\n   matchEvents     MatchEvent[] @relation("PlayerEvents")\n }\n}'
);

// Agregar relación en Match
content = content.replace(
  '   goals      Goal[]\n   report     MatchReport?\n }',
  '   goals      Goal[]\n   report     MatchReport?\n   events     MatchEvent[] @relation("MatchEvents")\n }'
);

fs.writeFileSync(path, content);
console.log('✅ Schema.prisma reconstruido correctamente con MatchEvent');
