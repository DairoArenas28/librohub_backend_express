# 📚 API REST — LibroHub

**Base URL:** https://librohub-backend-express-1.onrender.com/api/v1

**Autenticación:** Bearer Token JWT en el header `Authorization: Bearer <token>`

**Formato de errores:**
```json
{ "message": "Descripción del error", "code": "CODIGO_ERROR" }
```

---

## 🔑 Niveles de acceso

| Ícono | Nivel | Descripción |
|-------|-------|-------------|
| 🌐 | Público | No requiere autenticación |
| 🔒 | Autenticado | Requiere token JWT válido |
| 🛡️ | Admin | Requiere token JWT con rol `admin` |

---

## 🔐 Autenticación

### POST `/auth/login`
Inicia sesión y retorna un token JWT.

**Acceso:** 🌐 Público

**Body:**
```json
{ "username": "12345678", "password": "miContraseña" }
```

**Respuesta `200`:**
```json
{ "token": "eyJhbGci...", "role": "reader", "userId": "uuid" }
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Usuario o contraseña incorrectos |
| `VALIDATION_ERROR` | Campos requeridos faltantes |

---

### POST `/auth/register`
Registra un nuevo usuario con rol `reader`.

**Acceso:** 🌐 Público

**Body:**
```json
{ "name": "Juan Pérez", "document": "12345678", "email": "juan@email.com", "phone": "3001234567", "password": "minimo8chars" }
```

**Respuesta `201`:** `{}`

**Errores:**
| Código | Descripción |
|--------|-------------|
| `USER_DUPLICATE_EMAIL` | El correo ya está registrado |
| `USER_DUPLICATE_DOCUMENT` | El documento ya está registrado |
| `VALIDATION_ERROR` | Campos inválidos o faltantes |

---

### POST `/auth/forgot-password`
Envía un código de verificación de 6 dígitos al correo registrado.

**Acceso:** 🌐 Público

**Body:**
```json
{ "email": "juan@email.com" }
```

**Respuesta `200`:**
```json
{ "message": "If the email exists, a reset code has been sent" }
```

> ⚠️ El mensaje es genérico por seguridad — no revela si el correo existe.

---

### POST `/auth/validate-code`
Valida el código de recuperación enviado por correo.

**Acceso:** 🌐 Público

**Body:**
```json
{ "email": "juan@email.com", "code": "483920" }
```

**Respuesta `200`:**
```json
{ "message": "Code is valid" }
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| `AUTH_CODE_INVALID` | Código incorrecto, expirado o ya usado |

---

### POST `/auth/reset-password`
Restablece la contraseña usando el código validado.

**Acceso:** 🌐 Público

**Body:**
```json
{ "email": "juan@email.com", "code": "483920", "newPassword": "nuevaContraseña8" }
```

**Respuesta `200`:**
```json
{ "message": "Password reset successfully" }
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| `AUTH_CODE_INVALID` | Código incorrecto, expirado o ya usado |

---

### POST `/auth/change-password`
Cambia la contraseña del usuario autenticado.

**Acceso:** 🔒 Autenticado

**Body:**
```json
{ "currentPassword": "contraseñaActual", "newPassword": "nuevaContraseña8" }
```

**Respuesta `200`:**
```json
{ "message": "Password changed successfully" }
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| `AUTH_WRONG_PASSWORD` | Contraseña actual incorrecta |

---

## 📖 Libros

### GET `/books/by-category`
Retorna todos los libros activos agrupados por categoría.

**Acceso:** 🔒 Autenticado

**Respuesta `200`:**
```json
[
  {
    "category": "Ficción",
    "books": [
      {
        "id": "uuid",
        "title": "El nombre del viento",
        "author": "Patrick Rothfuss",
        "coverUrl": "/api/v1/books/uuid/cover",
        "categories": ["Ficción", "Fantasía"],
        "year": 2007,
        "status": "active"
      }
    ]
  }
]
```

---

### GET `/books`
Retorna todos los libros con filtros opcionales.

**Acceso:** 🔒 Autenticado

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `category` | string | Filtrar por categoría |
| `year` | number | Filtrar por año de publicación |

**Respuesta `200`:** Array de libros.

---

### GET `/books/:id`
Retorna el detalle completo de un libro.

**Acceso:** 🔒 Autenticado

**Respuesta `200`:**
```json
{
  "id": "uuid",
  "title": "El nombre del viento",
  "author": "Patrick Rothfuss",
  "coverUrl": "/api/v1/books/uuid/cover",
  "categories": ["Ficción"],
  "year": 2007,
  "status": "active",
  "pages": 662,
  "language": "Español",
  "isbn": "9788401337208",
  "publisher": "Plaza & Janés",
  "synopsis": "...",
  "rating": 4.8,
  "isFavorite": false,
  "hasPdf": true,
  "comments": [
    {
      "id": "uuid",
      "userId": "uuid",
      "authorName": "Juan Pérez",
      "avatarUrl": null,
      "text": "Excelente libro",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| `NOT_FOUND` | Libro no encontrado |

---

### POST `/books`
Crea un nuevo libro.

**Acceso:** 🛡️ Admin

**Body:**
```json
{
  "title": "El nombre del viento",
  "author": "Patrick Rothfuss",
  "isbn": "9788401337208",
  "year": 2007,
  "pages": 662,
  "language": "Español",
  "publisher": "Plaza & Janés",
  "synopsis": "...",
  "categories": ["Ficción", "Fantasía"],
  "status": "active"
}
```

**Respuesta `200`:** Objeto libro creado.

**Errores:**
| Código | Descripción |
|--------|-------------|
| `BOOK_DUPLICATE_ISBN` | El ISBN ya está registrado |

---

### PUT `/books/:id`
Actualiza un libro existente. Todos los campos son opcionales.

**Acceso:** 🛡️ Admin

**Body:** Mismos campos que `POST /books`, todos opcionales.

**Respuesta `200`:** Objeto libro actualizado.

---

### DELETE `/books/:id`
Elimina un libro permanentemente.

**Acceso:** 🛡️ Admin

**Respuesta `200`:** `{}`

---

### POST `/books/:bookId/comments`
Agrega un comentario a un libro.

**Acceso:** 🔒 Autenticado

**Body:**
```json
{ "text": "Excelente libro, muy recomendado." }
```

**Respuesta `200`:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "authorName": "Juan Pérez",
  "avatarUrl": null,
  "text": "Excelente libro, muy recomendado.",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### POST `/books/:bookId/favorite`
Alterna el estado de favorito de un libro para el usuario autenticado.

**Acceso:** 🔒 Autenticado

**Respuesta `200`:**
```json
{ "isFavorite": true }
```

---

### GET `/books/:id/cover`
Descarga la imagen de portada del libro.

**Acceso:** 🌐 Público

**Respuesta `200`:** Binario de imagen (`image/jpeg` o `image/png`).

---

### POST `/books/:id/cover`
Sube la imagen de portada de un libro.

**Acceso:** 🛡️ Admin

**Body:** `multipart/form-data` — campo `cover` (PNG o JPG).

**Respuesta `200`:**
```json
{ "coverUrl": "/api/v1/books/uuid/cover" }
```

---

### GET `/books/:id/pdf`
Descarga el PDF del libro.

**Acceso:** 🔒 Autenticado

**Respuesta `200`:** Binario PDF (`application/pdf`).

**Errores:**
| Código | Descripción |
|--------|-------------|
| `NOT_FOUND` | El libro no tiene PDF disponible |

---

### POST `/books/:id/pdf`
Sube el PDF de un libro.

**Acceso:** 🛡️ Admin

**Body:** `multipart/form-data` — campo `pdf` (PDF, máx. 50 MB).

**Respuesta `200`:**
```json
{ "hasPdf": true }
```

---

## 👥 Usuarios

### GET `/users/me`
Retorna el perfil del usuario autenticado.

**Acceso:** 🔒 Autenticado

**Respuesta `200`:**
```json
{
  "id": "uuid",
  "name": "Juan Pérez",
  "document": "12345678",
  "email": "juan@email.com",
  "phone": "3001234567",
  "role": "reader",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "hasAvatar": true,
  "avatarBase64": "data:image/jpeg;base64,..."
}
```

---

### POST `/users/me/avatar`
Sube o actualiza el avatar del usuario autenticado.

**Acceso:** 🔒 Autenticado

**Body:** `multipart/form-data` — campo `avatar` (PNG o JPG).

**Respuesta `200`:** Objeto usuario actualizado.

---

### GET `/users/:id/avatar`
Retorna el avatar de un usuario como imagen binaria.

**Acceso:** 🔒 Autenticado

**Respuesta `200`:** Binario de imagen.

---

### GET `/users/:id/avatar/base64`
Retorna el avatar de un usuario en formato base64.

**Acceso:** 🔒 Autenticado

**Respuesta `200`:**
```json
{ "base64": "data:image/jpeg;base64,..." }
```

---

### GET `/users`
Retorna la lista de todos los usuarios.

**Acceso:** 🛡️ Admin

**Respuesta `200`:** Array de objetos usuario.

---

### POST `/users`
Crea un nuevo usuario.

**Acceso:** 🛡️ Admin

**Body:**
```json
{
  "name": "Ana García",
  "document": "87654321",
  "email": "ana@email.com",
  "phone": "3109876543",
  "password": "contraseña8",
  "role": "reader"
}
```

**Respuesta `200`:** Objeto usuario creado.

**Errores:**
| Código | Descripción |
|--------|-------------|
| `USER_DUPLICATE_EMAIL` | El correo ya está registrado |

---

### PUT `/users/:id`
Actualiza un usuario. Todos los campos son opcionales.

**Acceso:** 🛡️ Admin

**Body:** Mismos campos que `POST /users`, todos opcionales.

**Respuesta `200`:** Objeto usuario actualizado.

---

### DELETE `/users/:id`
Elimina un usuario y todos sus comentarios y favoritos asociados.

**Acceso:** 🛡️ Admin

**Respuesta `200`:** `{}`

---

## 📊 Dashboard

### GET `/dashboard/stats`
Retorna estadísticas generales de la plataforma.

**Acceso:** 🛡️ Admin

**Respuesta `200`:**
```json
{
  "users": { "active": 42, "inactive": 3 },
  "books": { "active": 18, "inactive": 5 }
}
```

---

## ⚠️ Códigos de error

| Código | HTTP | Descripción |
|--------|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Usuario o contraseña incorrectos |
| `AUTH_CODE_INVALID` | 400 | Código de verificación incorrecto o expirado |
| `AUTH_WRONG_PASSWORD` | 401 | Contraseña actual incorrecta |
| `USER_DUPLICATE_EMAIL` | 409 | El correo ya está registrado |
| `USER_DUPLICATE_DOCUMENT` | 409 | El documento ya está registrado |
| `BOOK_DUPLICATE_ISBN` | 409 | El ISBN ya está registrado |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `UNAUTHORIZED` | 401 | Token faltante o inválido |
| `FORBIDDEN` | 403 | Sin permisos para esta acción |
| `VALIDATION_ERROR` | 422 | Datos de entrada inválidos |
| `SERVER_ERROR` | 500 | Error interno del servidor |
