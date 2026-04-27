const fs = require('fs');
const path = require('path');

// Leer el archivo route.ts actual
const routePath = 'src/app/api/teams/[id]/members/route.ts';
let content = fs.readFileSync(routePath, 'utf8');

// Verificar que las funciones exportadas estén bien
const hasGet = content.includes('export async function GET');
const hasPost = content.includes('export async function POST');
const hasDelete = content.includes('export async function DELETE');

console.log('=== Verificación de endpoint ===');
console.log('✓ GET exportada:', hasGet);
console.log('✓ POST exportada:', hasPost);
console.log('✓ DELETE exportada:', hasDelete);

// Verificar imports
const hasPrisma = content.includes('import prisma from');
const hasAuth = content.includes('import { verifyToken }');
console.log('✓ Prisma importado:', hasPrisma);
console.log('✓ Auth importado:', hasAuth);

// Verificar uso de teamMembers
const hasTeamMembers = content.includes('teamMembers');
console.log('✓ Usa teamMembers:', hasTeamMembers);

// Verificar métodos
const hasFindUnique = content.includes('findUnique');
const hasTeamMemberCreate = content.includes('teamMember.create');
const hasTeamMemberDelete = content.includes('teamMember.delete');
console.log('✓ findUnique:', hasFindUnique);
console.log('✓ teamMember.create:', hasTeamMemberCreate);
console.log('✓ teamMember.delete:', hasTeamMemberDelete);

console.log('\n=== Si todo es true, el archivo debería compilar ===');
