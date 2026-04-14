# Requirements Document

## Introduction

LibroHub Backend API es el servidor REST que alimenta la aplicación móvil LibroHub (React Native + Expo). Expone endpoints para autenticación de usuarios, gestión de libros, comentarios, favoritos, administración de usuarios y estadísticas del dashboard. El backend se construye con Express 4, TypeScript 5, TypeORM 0.3 y PostgreSQL, usando JWT para autenticación y bcrypt para hashing de contraseñas.

## Glossary

- **API**: El servidor Express/TypeScript que implementa los endpoints REST.
- **Auth_Module**: Módulo responsable de autenticación, registro y gestión de contraseñas.
- **Book_Module**: Módulo responsable de la gestión de libros, comentarios y favoritos.
- **User_Module**: Módulo responsable de la administración de usuarios (solo admin).
- **Dashboard_Module**: Módulo responsable de estadísticas agregadas (solo admin).
- **JWT**: JSON Web Token usado como mecanismo de autenticación stateless.
- **Auth_Middleware**: Middleware que valida el JWT en cabeceras de peticiones protegidas.
- **Admin_Middleware**: Middleware que verifica que el usuario autenticado tenga rol `admin`.
- **Reset_Code**: Código numérico de 6 dígitos enviado por email para recuperación de contraseña.
- **UserRole**: Enumeración con valores `reader` y `admin`.
- **BookStatus**: Enumeración con valores `active` y `coming_soon`.
- **Validator**: Componente de express-validator que valida los cuerpos de las peticiones.
- **Password_Reset_Store**: Almacén temporal (en memoria o base de datos) que guarda los Reset_Code activos con su expiración.

---

## Requirements

### Requirement 1: Autenticación — Login

**User Story:** Como usuario de la app móvil, quiero iniciar sesión con mi nombre de usuario y contraseña, para obtener un token JWT y acceder a las funcionalidades de la app.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /auth/login` con `{ username, password }` válidos, THE Auth_Module SHALL responder con `{ token, role, userId }` y código HTTP 200.
2. WHEN el cliente envía `POST /auth/login` con credenciales incorrectas, THE Auth_Module SHALL responder con código HTTP 401 y un mensaje de error descriptivo.
3. WHEN el cliente envía `POST /auth/login` con campos faltantes o vacíos, THE Validator SHALL responder con código HTTP 422 y la lista de errores de validación.
4. THE Auth_Module SHALL generar el JWT con `userId`, `role` y tiempo de expiración de 7 días.

---

### Requirement 2: Autenticación — Registro

**User Story:** Como nuevo usuario, quiero registrarme con mis datos personales, para crear una cuenta con rol `reader` por defecto.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /auth/register` con `{ name, document, email, phone, password }` válidos, THE Auth_Module SHALL crear el usuario con rol `reader`, hashear la contraseña con bcrypt y responder con código HTTP 201.
2. WHEN el cliente envía `POST /auth/register` con un email ya registrado, THE Auth_Module SHALL responder con código HTTP 409 y un mensaje indicando que el email ya existe.
3. WHEN el cliente envía `POST /auth/register` con un documento ya registrado, THE Auth_Module SHALL responder con código HTTP 409 y un mensaje indicando que el documento ya existe.
4. WHEN el cliente envía `POST /auth/register` con campos faltantes o con formato inválido, THE Validator SHALL responder con código HTTP 422 y la lista de errores de validación.
5. THE Auth_Module SHALL almacenar la contraseña usando bcrypt con un factor de costo mínimo de 10.

---

### Requirement 3: Recuperación de Contraseña — Envío de Código

**User Story:** Como usuario que olvidó su contraseña, quiero solicitar un código de recuperación por email, para poder restablecer mi contraseña.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /auth/forgot-password` con un `email` registrado, THE Auth_Module SHALL generar un Reset_Code de 6 dígitos, almacenarlo con expiración de 15 minutos y responder con código HTTP 200.
2. WHEN el cliente envía `POST /auth/forgot-password` con un `email` no registrado, THE Auth_Module SHALL responder con código HTTP 200 para no revelar si el email existe en el sistema.
3. WHEN el cliente envía `POST /auth/forgot-password` con un campo `email` con formato inválido, THE Validator SHALL responder con código HTTP 422 y la lista de errores de validación.

---

### Requirement 4: Recuperación de Contraseña — Validación de Código

**User Story:** Como usuario en proceso de recuperación, quiero validar el código recibido por email, para confirmar mi identidad antes de cambiar la contraseña.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /auth/validate-code` con `{ email, code }` donde el código es válido y no ha expirado, THE Auth_Module SHALL responder con código HTTP 200.
2. WHEN el cliente envía `POST /auth/validate-code` con un código incorrecto o expirado, THE Auth_Module SHALL responder con código HTTP 400 y un mensaje descriptivo.
3. WHEN el cliente envía `POST /auth/validate-code` con campos faltantes, THE Validator SHALL responder con código HTTP 422 y la lista de errores de validación.

---

### Requirement 5: Recuperación de Contraseña — Restablecimiento

**User Story:** Como usuario que validó su código, quiero establecer una nueva contraseña, para recuperar el acceso a mi cuenta.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /auth/reset-password` con `{ email, code, newPassword }` donde el código es válido y no ha expirado, THE Auth_Module SHALL actualizar la contraseña hasheada del usuario y responder con código HTTP 200.
2. WHEN el cliente envía `POST /auth/reset-password` con un código incorrecto o expirado, THE Auth_Module SHALL responder con código HTTP 400 y un mensaje descriptivo.
3. WHEN el cliente envía `POST /auth/reset-password` con `newPassword` que no cumple los requisitos mínimos (menos de 8 caracteres), THE Validator SHALL responder con código HTTP 422.
4. AFTER un restablecimiento exitoso, THE Auth_Module SHALL invalidar el Reset_Code usado para que no pueda reutilizarse.

---

### Requirement 6: Cambio de Contraseña (Autenticado)

**User Story:** Como usuario autenticado, quiero cambiar mi contraseña actual por una nueva, para mantener la seguridad de mi cuenta.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /auth/change-password` con JWT válido y `{ currentPassword, newPassword }` correctos, THE Auth_Module SHALL actualizar la contraseña y responder con código HTTP 200.
2. WHEN el cliente envía `POST /auth/change-password` con `currentPassword` incorrecta, THE Auth_Module SHALL responder con código HTTP 400 y un mensaje descriptivo.
3. WHEN el cliente envía `POST /auth/change-password` sin JWT o con JWT inválido, THE Auth_Middleware SHALL responder con código HTTP 401.
4. WHEN el cliente envía `POST /auth/change-password` con `newPassword` de menos de 8 caracteres, THE Validator SHALL responder con código HTTP 422.

---

### Requirement 7: Libros — Listado por Categoría

**User Story:** Como usuario de la app, quiero obtener los libros agrupados por categoría, para ver la pantalla principal con secciones organizadas.

#### Acceptance Criteria

1. WHEN el cliente envía `GET /books/by-category` con JWT válido, THE Book_Module SHALL responder con un array de `{ category: string, books: Book[] }` y código HTTP 200.
2. THE Book_Module SHALL incluir únicamente libros con `status = 'active'` en la respuesta de `/books/by-category`.
3. WHEN no existen libros activos, THE Book_Module SHALL responder con un array vacío y código HTTP 200.

---

### Requirement 8: Libros — Listado con Filtros

**User Story:** Como usuario de la app, quiero filtrar libros por categoría y/o año, para encontrar libros específicos.

#### Acceptance Criteria

1. WHEN el cliente envía `GET /books` con JWT válido y sin parámetros, THE Book_Module SHALL responder con todos los libros y código HTTP 200.
2. WHEN el cliente envía `GET /books?category=<valor>`, THE Book_Module SHALL responder únicamente con libros cuya categoría coincida (case-insensitive) con el valor proporcionado.
3. WHEN el cliente envía `GET /books?year=<valor>`, THE Book_Module SHALL responder únicamente con libros publicados en ese año.
4. WHEN el cliente envía `GET /books?category=<valor>&year=<valor>`, THE Book_Module SHALL aplicar ambos filtros simultáneamente.
5. WHEN el cliente envía `GET /books?year=<valor>` con un valor no numérico, THE Validator SHALL responder con código HTTP 422.

---

### Requirement 9: Libros — Detalle de Libro

**User Story:** Como usuario de la app, quiero ver el detalle completo de un libro, incluyendo sinopsis, comentarios y si está en mis favoritos.

#### Acceptance Criteria

1. WHEN el cliente envía `GET /books/:id` con JWT válido y un ID existente, THE Book_Module SHALL responder con el objeto `BookDetail` completo (incluyendo `comments`, `rating`, `isFavorite` para el usuario autenticado) y código HTTP 200.
2. WHEN el cliente envía `GET /books/:id` con un ID inexistente, THE Book_Module SHALL responder con código HTTP 404 y un mensaje descriptivo.
3. THE Book_Module SHALL calcular el campo `isFavorite` en función del usuario identificado por el JWT.
4. THE Book_Module SHALL calcular el campo `rating` como el promedio de todas las valoraciones del libro, redondeado a un decimal.

---

### Requirement 10: Libros — Creación (Admin)

**User Story:** Como administrador, quiero crear nuevos libros en el catálogo, para mantener el contenido actualizado.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /books` con JWT de rol `admin` y datos válidos del libro, THE Book_Module SHALL crear el libro y responder con el objeto `Book` creado y código HTTP 201.
2. WHEN el cliente envía `POST /books` con JWT de rol `reader`, THE Admin_Middleware SHALL responder con código HTTP 403.
3. WHEN el cliente envía `POST /books` sin JWT o con JWT inválido, THE Auth_Middleware SHALL responder con código HTTP 401.
4. WHEN el cliente envía `POST /books` con campos obligatorios faltantes (`title`, `author`, `coverUrl`, `isbn`), THE Validator SHALL responder con código HTTP 422.
5. WHEN el cliente envía `POST /books` con un `isbn` ya registrado, THE Book_Module SHALL responder con código HTTP 409.

---

### Requirement 11: Libros — Actualización (Admin)

**User Story:** Como administrador, quiero actualizar los datos de un libro existente, para corregir información o cambiar su estado.

#### Acceptance Criteria

1. WHEN el cliente envía `PUT /books/:id` con JWT de rol `admin` y datos válidos, THE Book_Module SHALL actualizar el libro y responder con el objeto `Book` actualizado y código HTTP 200.
2. WHEN el cliente envía `PUT /books/:id` con un ID inexistente, THE Book_Module SHALL responder con código HTTP 404.
3. WHEN el cliente envía `PUT /books/:id` con JWT de rol `reader`, THE Admin_Middleware SHALL responder con código HTTP 403.
4. WHEN el cliente envía `PUT /books/:id` sin JWT o con JWT inválido, THE Auth_Middleware SHALL responder con código HTTP 401.

---

### Requirement 12: Libros — Eliminación (Admin)

**User Story:** Como administrador, quiero eliminar un libro del catálogo, para retirar contenido obsoleto o incorrecto.

#### Acceptance Criteria

1. WHEN el cliente envía `DELETE /books/:id` con JWT de rol `admin` y un ID existente, THE Book_Module SHALL eliminar el libro y responder con código HTTP 204.
2. WHEN el cliente envía `DELETE /books/:id` con un ID inexistente, THE Book_Module SHALL responder con código HTTP 404.
3. WHEN el cliente envía `DELETE /books/:id` con JWT de rol `reader`, THE Admin_Middleware SHALL responder con código HTTP 403.
4. WHEN el cliente envía `DELETE /books/:id` sin JWT o con JWT inválido, THE Auth_Middleware SHALL responder con código HTTP 401.

---

### Requirement 13: Comentarios — Agregar Comentario

**User Story:** Como usuario autenticado, quiero agregar un comentario a un libro, para compartir mi opinión con otros lectores.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /books/:bookId/comments` con JWT válido y `{ text }` no vacío, THE Book_Module SHALL crear el comentario asociado al usuario autenticado y responder con el objeto `Comment` y código HTTP 201.
2. WHEN el cliente envía `POST /books/:bookId/comments` con un `bookId` inexistente, THE Book_Module SHALL responder con código HTTP 404.
3. WHEN el cliente envía `POST /books/:bookId/comments` sin JWT o con JWT inválido, THE Auth_Middleware SHALL responder con código HTTP 401.
4. WHEN el cliente envía `POST /books/:bookId/comments` con `text` vacío o faltante, THE Validator SHALL responder con código HTTP 422.
5. THE Book_Module SHALL incluir en la respuesta del comentario los campos `id`, `userId`, `authorName`, `avatarUrl`, `text` y `createdAt`.

---

### Requirement 14: Favoritos — Toggle de Favorito

**User Story:** Como usuario autenticado, quiero marcar o desmarcar un libro como favorito, para gestionar mi lista de lectura personal.

#### Acceptance Criteria

1. WHEN el cliente envía `POST /books/:bookId/favorite` con JWT válido y el libro NO está en favoritos del usuario, THE Book_Module SHALL agregar el libro a favoritos y responder con `{ isFavorite: true }` y código HTTP 200.
2. WHEN el cliente envía `POST /books/:bookId/favorite` con JWT válido y el libro YA está en favoritos del usuario, THE Book_Module SHALL eliminar el libro de favoritos y responder con `{ isFavorite: false }` y código HTTP 200.
3. WHEN el cliente envía `POST /books/:bookId/favorite` con un `bookId` inexistente, THE Book_Module SHALL responder con código HTTP 404.
4. WHEN el cliente envía `POST /books/:bookId/favorite` sin JWT o con JWT inválido, THE Auth_Middleware SHALL responder con código HTTP 401.

---

### Requirement 15: Usuarios — Gestión (Admin)

**User Story:** Como administrador, quiero gestionar los usuarios del sistema (listar, crear, actualizar, eliminar), para mantener el control de acceso a la plataforma.

#### Acceptance Criteria

1. WHEN el cliente envía `GET /users` con JWT de rol `admin`, THE User_Module SHALL responder con el array de todos los usuarios (sin incluir el campo `password`) y código HTTP 200.
2. WHEN el cliente envía `POST /users` con JWT de rol `admin` y datos válidos `{ name, document, email, phone, password, role }`, THE User_Module SHALL crear el usuario y responder con el objeto `User` y código HTTP 201.
3. WHEN el cliente envía `PUT /users/:id` con JWT de rol `admin` y datos válidos, THE User_Module SHALL actualizar el usuario y responder con el objeto `User` actualizado y código HTTP 200.
4. WHEN el cliente envía `DELETE /users/:id` con JWT de rol `admin` y un ID existente, THE User_Module SHALL eliminar el usuario y responder con código HTTP 204.
5. WHEN el cliente envía cualquier endpoint de `/users` con JWT de rol `reader`, THE Admin_Middleware SHALL responder con código HTTP 403.
6. WHEN el cliente envía `POST /users` con un email ya registrado, THE User_Module SHALL responder con código HTTP 409.
7. WHEN el cliente envía `PUT /users/:id` o `DELETE /users/:id` con un ID inexistente, THE User_Module SHALL responder con código HTTP 404.

---

### Requirement 16: Dashboard — Estadísticas (Admin)

**User Story:** Como administrador, quiero ver estadísticas del sistema (usuarios y libros activos/inactivos), para monitorear el estado de la plataforma.

#### Acceptance Criteria

1. WHEN el cliente envía `GET /dashboard/stats` con JWT de rol `admin`, THE Dashboard_Module SHALL responder con `{ users: { active, inactive }, books: { active, inactive } }` y código HTTP 200.
2. THE Dashboard_Module SHALL calcular `users.active` como el conteo de usuarios con `isActive = true`.
3. THE Dashboard_Module SHALL calcular `users.inactive` como el conteo de usuarios con `isActive = false`.
4. THE Dashboard_Module SHALL calcular `books.active` como el conteo de libros con `status = 'active'`.
5. THE Dashboard_Module SHALL calcular `books.inactive` como el conteo de libros con `status = 'coming_soon'`.
6. WHEN el cliente envía `GET /dashboard/stats` con JWT de rol `reader`, THE Admin_Middleware SHALL responder con código HTTP 403.

---

### Requirement 17: Seguridad y Transversales

**User Story:** Como operador del sistema, quiero que la API aplique buenas prácticas de seguridad de forma consistente, para proteger los datos de los usuarios.

#### Acceptance Criteria

1. THE API SHALL habilitar CORS para permitir peticiones desde cualquier origen durante el desarrollo.
2. THE API SHALL parsear cuerpos JSON con un límite máximo de 1MB por petición.
3. WHEN ocurre un error no controlado en cualquier endpoint, THE API SHALL responder con código HTTP 500 y un mensaje genérico sin exponer detalles internos del stack.
4. THE Auth_Middleware SHALL extraer el JWT del header `Authorization: Bearer <token>` y rechazar peticiones con tokens malformados o expirados con código HTTP 401.
5. THE API SHALL responder siempre con `Content-Type: application/json`.
6. THE API SHALL exponer un endpoint `GET /health` que responda con `{ status: 'ok' }` y código HTTP 200, sin requerir autenticación.
