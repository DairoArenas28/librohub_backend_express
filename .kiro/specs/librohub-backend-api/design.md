# Design Document — LibroHub Backend API

## Overview

LibroHub Backend API es un servidor REST construido con **Express 4 + TypeScript 5**, **TypeORM 0.3** y **PostgreSQL**. Expone los recursos necesarios para que la app móvil React Native/Expo funcione: autenticación JWT, catálogo de libros, comentarios, favoritos, administración de usuarios y estadísticas de dashboard.

La arquitectura sigue un patrón de **módulos verticales** (feature-based): cada dominio (auth, books, users, dashboard) agrupa su propio controller, service, routes, validadores y tipos. Los middlewares transversales (autenticación, autorización, manejo de errores) viven en `src/shared/`.

### Decisiones de diseño clave

- **TypeORM con decoradores**: Entidades como clases TypeScript con `@Entity`, `@Column`, `@ManyToOne`, etc. El `DataSource` se configura una sola vez en `src/database/data-source.ts`.
- **Módulos verticales**: Cada módulo es autocontenido. Las rutas se montan en `app.ts` con prefijos `/auth`, `/books`, `/users`, `/dashboard`.
- **JWT stateless**: No hay sesiones en servidor. El token contiene `userId` y `role`, firmado con `jsonwebtoken` y expiración de 7 días.
- **Password Reset en BD**: Los `PasswordResetCode` se almacenan en PostgreSQL (no en memoria) para sobrevivir reinicios del servidor.
- **Respuestas consistentes**: Todos los endpoints responden `Content-Type: application/json`. Los errores siguen la forma `{ message: string, errors?: ValidationError[] }`.

---

## Architecture

```
src/
├── index.ts                    # Bootstrap: carga .env, inicializa DataSource, arranca Express
├── app.ts                      # Configura Express: middlewares globales, monta rutas, error handler
├── database/
│   └── data-source.ts          # TypeORM DataSource (AppDataSource)
├── shared/
│   ├── auth.middleware.ts       # Verifica JWT → adjunta req.user
│   ├── admin.middleware.ts      # Verifica req.user.role === 'admin'
│   ├── error.handler.ts         # Global error handler (Express 4 signature)
│   └── validation.middleware.ts # Ejecuta express-validator y devuelve 422
├── modules/
│   ├── auth/
│   │   ├── auth.entity.ts       # Entidad PasswordResetCode
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.schema.ts       # Validadores express-validator
│   │   ├── auth.types.ts
│   │   ├── auth.utils.ts        # generateResetCode, hashPassword, comparePassword
│   │   ├── auth.constants.ts
│   │   └── auth.middleware.ts   # (re-exporta desde shared o extiende)
│   ├── books/
│   │   ├── book.entity.ts
│   │   ├── comment.entity.ts
│   │   ├── favorite.entity.ts
│   │   ├── books.routes.ts
│   │   ├── books.controller.ts
│   │   ├── books.service.ts
│   │   ├── books.schema.ts
│   │   └── books.types.ts
│   ├── users/
│   │   ├── user.entity.ts
│   │   ├── users.routes.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.schema.ts
│   │   └── users.types.ts
│   └── dashboard/
│       ├── dashboard.routes.ts
│       ├── dashboard.controller.ts
│       └── dashboard.service.ts
```

### Flujo de una petición

```
Cliente HTTP
    │
    ▼
Express (app.ts)
    │  cors(), express.json({ limit: '1mb' })
    ▼
Router (auth | books | users | dashboard)
    │  express-validator schemas
    │  validationMiddleware (→ 422 si hay errores)
    │  authMiddleware (→ 401 si JWT inválido)
    │  adminMiddleware (→ 403 si role != admin)
    ▼
Controller
    │  llama a Service
    ▼
Service
    │  usa TypeORM Repositories
    ▼
PostgreSQL
    │
    ▼
Controller → res.json(...)
    │
    ▼ (si lanza error)
Global Error Handler (→ 500)
```

---

## Components and Interfaces

### Shared Middlewares

```typescript
// src/shared/auth.middleware.ts
interface JwtPayload {
  userId: string;
  role: 'reader' | 'admin';
  iat: number;
  exp: number;
}

// Extiende Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void;
```

```typescript
// src/shared/validation.middleware.ts
// Ejecuta validationResult(req); si hay errores → res.status(422).json({ errors })
export function validate(req: Request, res: Response, next: NextFunction): void;
```

```typescript
// src/shared/error.handler.ts
// Firma de error handler de Express 4
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void;
```

### Auth Module

```typescript
// auth.service.ts — métodos públicos
interface AuthService {
  login(username: string, password: string): Promise<{ token: string; role: UserRole; userId: string }>;
  register(data: RegisterData): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  validateCode(email: string, code: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
```

### Books Module

```typescript
// books.service.ts — métodos públicos
interface BooksService {
  getByCategory(): Promise<CategoryBooks[]>;
  getAll(filters: BookFilters): Promise<Book[]>;
  getById(id: string, userId: string): Promise<BookDetail>;
  create(data: BookFormData): Promise<Book>;
  update(id: string, data: Partial<BookFormData>): Promise<Book>;
  remove(id: string): Promise<void>;
  addComment(bookId: string, userId: string, text: string): Promise<Comment>;
  toggleFavorite(bookId: string, userId: string): Promise<{ isFavorite: boolean }>;
}
```

### Users Module

```typescript
// users.service.ts — métodos públicos
interface UsersService {
  getAll(): Promise<User[]>;
  create(data: UserFormData): Promise<User>;
  update(id: string, data: Partial<UserFormData>): Promise<User>;
  remove(id: string): Promise<void>;
}
```

### Dashboard Module

```typescript
// dashboard.service.ts — métodos públicos
interface DashboardService {
  getStats(): Promise<DashboardStats>;
}
```

---

## Data Models

### Entidad: User

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  document: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: ['reader', 'admin'], default: 'reader' })
  role: 'reader' | 'admin';

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];
}
```

### Entidad: Book

```typescript
@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ name: 'cover_url' })
  coverUrl: string;

  @Column({ type: 'int', nullable: true })
  pages: number;

  @Column({ nullable: true })
  language: string;

  @Column({ unique: true })
  isbn: string;

  @Column({ nullable: true })
  publisher: string;

  @Column({ type: 'text', nullable: true })
  synopsis: string;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'enum', enum: ['active', 'coming_soon'], default: 'active' })
  status: 'active' | 'coming_soon';

  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Comment, (comment) => comment.book)
  comments: Comment[];

  @OneToMany(() => Favorite, (favorite) => favorite.book)
  favorites: Favorite[];
}
```

### Entidad: Comment

```typescript
@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Book, (book) => book.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;
}
```

### Entidad: Favorite

```typescript
@Entity('favorites')
@Unique(['user', 'book'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Book, (book) => book.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;
}
```

### Entidad: PasswordResetCode

```typescript
@Entity('password_reset_codes')
export class PasswordResetCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ length: 6 })
  code: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;
}
```

### Relaciones entre entidades

```
User ──< Comment >── Book
User ──< Favorite >── Book
User ──< PasswordResetCode (por email)
```

---

## API Design

### Base URL: `/api/v1` (configurable vía env)

### Auth Endpoints

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| POST | `/auth/login` | No | `{ username, password }` | `{ token, role, userId }` 200 |
| POST | `/auth/register` | No | `{ name, document, email, phone, password }` | `{}` 201 |
| POST | `/auth/forgot-password` | No | `{ email }` | `{ message }` 200 |
| POST | `/auth/validate-code` | No | `{ email, code }` | `{ message }` 200 |
| POST | `/auth/reset-password` | No | `{ email, code, newPassword }` | `{ message }` 200 |
| POST | `/auth/change-password` | JWT | `{ currentPassword, newPassword }` | `{ message }` 200 |

**Nota sobre login**: El campo `username` del frontend corresponde al `document` del usuario (número de documento de identidad).

### Books Endpoints

| Método | Ruta | Auth | Query/Body | Respuesta |
|--------|------|------|-----------|-----------|
| GET | `/books/by-category` | JWT | — | `CategoryBooks[]` 200 |
| GET | `/books` | JWT | `?category=&year=` | `Book[]` 200 |
| GET | `/books/:id` | JWT | — | `BookDetail` 200 |
| POST | `/books` | JWT+Admin | `BookFormData` | `Book` 201 |
| PUT | `/books/:id` | JWT+Admin | `Partial<BookFormData>` | `Book` 200 |
| DELETE | `/books/:id` | JWT+Admin | — | `{}` 204 |
| POST | `/books/:bookId/comments` | JWT | `{ text }` | `Comment` 201 |
| POST | `/books/:bookId/favorite` | JWT | — | `{ isFavorite: boolean }` 200 |

### Users Endpoints

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| GET | `/users` | JWT+Admin | — | `User[]` 200 |
| POST | `/users` | JWT+Admin | `{ name, document, email, phone, password, role }` | `User` 201 |
| PUT | `/users/:id` | JWT+Admin | `Partial<UserFormData>` | `User` 200 |
| DELETE | `/users/:id` | JWT+Admin | — | `{}` 204 |

### Dashboard Endpoints

| Método | Ruta | Auth | Respuesta |
|--------|------|------|-----------|
| GET | `/dashboard/stats` | JWT+Admin | `DashboardStats` 200 |

### Health

| Método | Ruta | Auth | Respuesta |
|--------|------|------|-----------|
| GET | `/health` | No | `{ status: 'ok' }` 200 |

### Shapes de respuesta

```typescript
// BookDetail (GET /books/:id)
interface BookDetailResponse {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  category: string;       // primera categoría del array
  year: number;
  status: BookStatus;
  pages: number;
  language: string;
  isbn: string;
  publisher: string;
  synopsis: string;
  rating: number;         // promedio redondeado a 1 decimal
  categories: string[];
  comments: CommentResponse[];
  isFavorite: boolean;    // calculado para el usuario del JWT
}

interface CommentResponse {
  id: string;
  userId: string;
  authorName: string;
  avatarUrl?: string;     // null si no existe
  text: string;
  createdAt: string;      // ISO 8601
}

// DashboardStats (GET /dashboard/stats)
interface DashboardStats {
  users: { active: number; inactive: number };
  books: { active: number; inactive: number };
}
```

---

## JWT Authentication Flow

```
1. Cliente → POST /auth/login { username, password }
2. AuthService busca User por document = username
3. bcrypt.compare(password, user.passwordHash)
4. Si OK → jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' })
5. Responde { token, role, userId }

6. Cliente incluye en cada petición protegida:
   Authorization: Bearer <token>

7. authMiddleware:
   a. Extrae token del header
   b. jwt.verify(token, JWT_SECRET) → payload
   c. req.user = { userId, role }
   d. next()
   e. Si falla → res.status(401).json({ message: 'Unauthorized' })

8. adminMiddleware (solo rutas admin):
   a. Verifica req.user.role === 'admin'
   b. Si no → res.status(403).json({ message: 'Forbidden' })
```

### Variables de entorno requeridas

```
DATABASE_URL=postgresql://user:pass@localhost:5432/librohub
JWT_SECRET=<secret-largo-y-aleatorio>
PORT=3000
```

### TypeORM DataSource

```typescript
// src/database/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/user.entity';
import { Book } from '../modules/books/book.entity';
import { Comment } from '../modules/books/comment.entity';
import { Favorite } from '../modules/books/favorite.entity';
import { PasswordResetCode } from '../modules/auth/auth.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV !== 'production', // solo en dev
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Book, Comment, Favorite, PasswordResetCode],
  migrations: ['src/database/migrations/*.ts'],
});
```

---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquinas.*

La librería de property-based testing utilizada es **fast-check** (ya incluida en `devDependencies`). Cada test de propiedad se ejecuta con un mínimo de 100 iteraciones.

---

### Property 1: JWT contiene userId y role correctos

*Para cualquier* usuario válido en el sistema, el JWT generado durante el login debe decodificarse y contener exactamente el `userId` y `role` del usuario que inició sesión.

**Validates: Requirements 1.4**

---

### Property 2: Contraseñas se almacenan con bcrypt (cost >= 10)

*Para cualquier* string de contraseña, el hash almacenado en la base de datos debe ser verificable con `bcrypt.compare(password, hash)` y el hash debe tener un cost factor mayor o igual a 10 (verificable por el prefijo del hash bcrypt).

**Validates: Requirements 2.5**

---

### Property 3: Registro siempre asigna rol reader

*Para cualquier* conjunto de datos de registro válidos (`name`, `document`, `email`, `phone`, `password`), el usuario creado debe tener `role = 'reader'` independientemente de los valores de los campos.

**Validates: Requirements 2.1**

---

### Property 4: Código de recuperación es numérico de 6 dígitos

*Para cualquier* email de usuario registrado, el `PasswordResetCode` generado debe ser una cadena de exactamente 6 caracteres numéricos (`/^\d{6}$/`) y su `expiresAt` debe ser aproximadamente 15 minutos en el futuro (entre 14 y 16 minutos desde el momento de creación).

**Validates: Requirements 3.1**

---

### Property 5: Reset de contraseña invalida el código usado

*Para cualquier* código de recuperación usado exitosamente en `POST /auth/reset-password`, intentar usar ese mismo código nuevamente debe resultar en HTTP 400. El campo `used` del registro `PasswordResetCode` debe ser `true` después del primer uso.

**Validates: Requirements 5.4**

---

### Property 6: Nueva contraseña tras reset es verificable con bcrypt

*Para cualquier* string de nueva contraseña válida (>= 8 caracteres), después de un reset exitoso, `bcrypt.compare(newPassword, user.passwordHash)` debe retornar `true`.

**Validates: Requirements 5.1**

---

### Property 7: Filtros de libros son correctos y combinables

*Para cualquier* combinación de filtros `{ category?, year? }` aplicados a `GET /books`, todos los libros en la respuesta deben satisfacer simultáneamente todos los filtros activos: si `category` está presente, `book.categories` debe contener esa categoría (case-insensitive); si `year` está presente, `book.year` debe ser igual al año especificado.

**Validates: Requirements 8.2, 8.3, 8.4**

---

### Property 8: by-category nunca incluye libros inactivos

*Para cualquier* estado de la base de datos con libros activos e inactivos, la respuesta de `GET /books/by-category` nunca debe contener libros con `status !== 'active'`. Cada libro en cualquier categoría de la respuesta debe tener `status = 'active'`.

**Validates: Requirements 7.2**

---

### Property 9: isFavorite refleja el estado real en la BD

*Para cualquier* par `(userId, bookId)`, el campo `isFavorite` en la respuesta de `GET /books/:id` debe ser `true` si y solo si existe un registro `Favorite` con ese `userId` y `bookId` en la base de datos.

**Validates: Requirements 9.3**

---

### Property 10: Toggle de favorito es idempotente en pares

*Para cualquier* par `(userId, bookId)`, hacer toggle dos veces consecutivas debe restaurar el estado original: si el libro no era favorito, después de dos toggles sigue sin serlo; si era favorito, después de dos toggles sigue siéndolo. Formalmente: `toggle(toggle(state)) == state`.

**Validates: Requirements 14.1, 14.2**

---

### Property 11: Respuesta de comentario contiene todos los campos requeridos

*Para cualquier* texto de comentario no vacío enviado a `POST /books/:bookId/comments`, el objeto `Comment` en la respuesta debe contener los campos `id`, `userId`, `authorName`, `text` y `createdAt`, todos con valores no nulos.

**Validates: Requirements 13.1, 13.5**

---

### Property 12: GET /users nunca expone passwordHash

*Para cualquier* estado de la base de datos, la respuesta de `GET /users` no debe incluir el campo `passwordHash` (ni `password`) en ningún objeto de usuario del array. Esta propiedad debe mantenerse independientemente del número de usuarios o sus datos.

**Validates: Requirements 15.1**

---

### Property 13: Conteos del dashboard son consistentes con el total

*Para cualquier* estado de la base de datos, los conteos del dashboard deben satisfacer: `users.active + users.inactive = total de usuarios` y `books.active + books.inactive = total de libros`. Ningún usuario o libro debe quedar sin contar ni contarse dos veces.

**Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

---

### Property 14: Auth middleware rechaza cualquier token inválido con 401

*Para cualquier* string que no sea un JWT válido y vigente (tokens malformados, expirados, con firma incorrecta, o ausentes) en el header `Authorization: Bearer <token>`, el `authMiddleware` debe responder con HTTP 401 y nunca llamar a `next()`.

**Validates: Requirements 17.4**

---

## Error Handling

### Estrategia de errores

Todos los errores siguen una jerarquía de clases custom que el global error handler sabe interpretar:

```typescript
// src/shared/errors.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}
```

### Global Error Handler

```typescript
// src/shared/error.handler.ts
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  // Error no controlado: no exponer detalles internos
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}
```

### Tabla de códigos HTTP

| Situación | Código |
|-----------|--------|
| Éxito con cuerpo | 200 |
| Recurso creado | 201 |
| Sin contenido (DELETE) | 204 |
| Validación fallida (express-validator) | 422 |
| Credenciales incorrectas / código inválido | 400 |
| Sin autenticación / token inválido | 401 |
| Sin permisos (rol insuficiente) | 403 |
| Recurso no encontrado | 404 |
| Conflicto (email/document/isbn duplicado) | 409 |
| Error interno no controlado | 500 |

---

## Testing Strategy

### Enfoque dual

Se combinan **tests de ejemplo** (unit/integration con Supertest) y **tests de propiedad** (fast-check) para cobertura completa.

### Tests de ejemplo (Jest + Supertest)

Cubren flujos concretos, casos de error y edge cases:
- Flujos exitosos de cada endpoint (login, register, CRUD de libros, etc.)
- Casos de error específicos (401, 403, 404, 409, 422)
- Edge cases de validación (campos vacíos, formatos inválidos, passwords cortas)

Cada módulo tiene su propio archivo de tests en `src/modules/<module>/__tests__/`.

### Tests de propiedad (fast-check, mínimo 100 iteraciones)

Cada propiedad del diseño se implementa como un test de propiedad independiente. Los tests de propiedad usan repositorios mockeados para evitar dependencias de BD en tests unitarios.

Convención de etiquetado:
```
// Feature: librohub-backend-api, Property N: <texto de la propiedad>
```

**Archivo**: `src/modules/<module>/__tests__/<module>.property.test.ts`

#### Propiedades a implementar:

| Test | Propiedad | Librería |
|------|-----------|---------|
| JWT payload correcto | Property 1 | fast-check |
| bcrypt cost >= 10 | Property 2 | fast-check |
| Registro siempre reader | Property 3 | fast-check |
| Código 6 dígitos + expiración | Property 4 | fast-check |
| Código usado → invalidado | Property 5 | fast-check |
| Nueva password verificable | Property 6 | fast-check |
| Filtros combinables | Property 7 | fast-check |
| by-category solo activos | Property 8 | fast-check |
| isFavorite refleja BD | Property 9 | fast-check |
| Toggle idempotente | Property 10 | fast-check |
| Comentario con campos requeridos | Property 11 | fast-check |
| GET /users sin passwordHash | Property 12 | fast-check |
| Conteos dashboard consistentes | Property 13 | fast-check |
| Auth middleware rechaza inválidos | Property 14 | fast-check |

### Configuración de Jest

```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterFramework: ['<rootDir>/src/test-setup.ts'],
};
```

### Smoke tests

- `GET /health` responde `{ status: 'ok' }` sin autenticación
- CORS headers presentes en respuestas
- Payload > 1MB rechazado con 413
