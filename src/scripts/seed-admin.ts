/**
 * Script para crear el primer usuario administrador.
 *
 * Uso:
 *   npx ts-node src/scripts/seed-admin.ts
 *
 * Puedes cambiar las credenciales en las constantes de abajo antes de correrlo.
 * Si ya existe un admin con ese documento o email, el script lo indica y no duplica.
 */

import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';
import { User } from '../modules/users/user.entity';
import { hashPassword } from '../modules/auth/auth.utils';

// ── Credenciales del admin ────────────────────────────────────────────────────
const ADMIN_NAME     = 'Administrador';
const ADMIN_DOCUMENT = 'admin001';       // se usa como username para iniciar sesión
const ADMIN_EMAIL    = 'admin@librohub.com';
const ADMIN_PHONE    = '3000000000';
const ADMIN_PASSWORD = 'Admin1234!';     // cámbiala después de entrar
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.log('✔ Conectado a la base de datos');

  const repo = AppDataSource.getRepository(User);

  const byDocument = await repo.findOne({ where: { document: ADMIN_DOCUMENT } });
  if (byDocument) {
    console.log(`⚠  Ya existe un usuario con documento "${ADMIN_DOCUMENT}" (rol: ${byDocument.role}). No se creó nada.`);
    await AppDataSource.destroy();
    return;
  }

  const byEmail = await repo.findOne({ where: { email: ADMIN_EMAIL } });
  if (byEmail) {
    console.log(`⚠  Ya existe un usuario con email "${ADMIN_EMAIL}" (rol: ${byEmail.role}). No se creó nada.`);
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = repo.create({
    name:         ADMIN_NAME,
    document:     ADMIN_DOCUMENT,
    email:        ADMIN_EMAIL,
    phone:        ADMIN_PHONE,
    passwordHash,
    role:         'admin',
    isActive:     true,
  });

  await repo.save(admin);

  console.log('✔ Admin creado exitosamente:');
  console.log(`   Nombre:    ${ADMIN_NAME}`);
  console.log(`   Documento: ${ADMIN_DOCUMENT}  ← usa esto como usuario al iniciar sesión`);
  console.log(`   Email:     ${ADMIN_EMAIL}`);
  console.log(`   Contraseña: ${ADMIN_PASSWORD}  ← cámbiala después de entrar`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('✖ Error al crear el admin:', err);
  process.exit(1);
});
