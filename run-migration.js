const { execSync } = require('child_process');
const path = require('path');

const nodePath = 'C:\\nvm4w\\nodejs\\node.exe';
const prismaPath = path.join(__dirname, 'node_modules', '.bin', 'prisma.cmd');

console.log('🚀 Ejecutando migración de Prisma...');
console.log('📍 Prisma CLI:', prismaPath);

try {
  // Ejecutar migrate deploy
  console.log('\n📝 Ejecutando: prisma migrate deploy');
  execSync(`"${nodePath}" "${path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js')}" migrate deploy`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: 'mysql://root:@localhost:3306/copadepor' }
  });
  
  console.log('\n✅ Migración completada exitosamente');
  console.log('📊 La columna classificationCriteria fue agregada a Tournament');
  
} catch (error) {
  console.error('\n❌ Error al ejecutar migración:');
  console.error(error.message);
  
  console.log('\n🔧 Intentando generar cliente Prisma...');
  try {
    execSync(`"${nodePath}" "${path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js')}" generate`, {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: 'mysql://root:@localhost:3306/copadepor' }
    });
    console.log('✅ Cliente Prisma regenerado');
  } catch (genError) {
    console.error('❌ Error al generar cliente:', genError.message);
  }
}
