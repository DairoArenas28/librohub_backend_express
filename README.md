# 📚 LibroHub — Backend

API REST construida con **Node.js + Express + TypeScript + TypeORM + PostgreSQL**.

---

## 🧩 Tecnologías

| Tecnología | Uso |
|------------|-----|
| Node.js + Express | Servidor HTTP |
| TypeScript | Tipado estático |
| TypeORM | ORM para base de datos |
| PostgreSQL | Base de datos relacional |
| JWT | Autenticación |
| bcrypt | Hash de contraseñas |
| Nodemailer | Envío de correos |
| express-validator | Validación de inputs |

---

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/DairoArenas28/librohub_backend_express.git
cd librohub_backend_express
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (default: 3000) |
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |
| `JWT_EXPIRY` | Tiempo de expiración del token (ej: `7d`) |
| `CORS_ORIGIN` | Origen permitido para CORS (ej: `*`) |
| `SMTP_HOST` | Host del servidor SMTP |
| `SMTP_PORT` | Puerto SMTP |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_FROM` | Correo remitente |

### 4. Compilar y ejecutar

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm run build
npm start
```

### 5. Crear usuario administrador

```bash
npm run seed:admin
```

---

## 📁 Estructura del proyecto

```
src/
├── database/
│   └── data-source.ts        # Configuración TypeORM
├── modules/
│   ├── auth/                 # Autenticación y autorización
│   ├── books/                # Gestión de libros
│   ├── users/                # Gestión de usuarios
│   └── dashboard/            # Estadísticas
├── shared/
│   ├── auth.middleware.ts    # Middleware JWT
│   ├── error.handler.ts      # Manejador global de errores
│   ├── errors.ts             # Clases de error personalizadas
│   └── validation.middleware.ts
├── app.ts                    # Configuración Express
└── index.ts                  # Punto de entrada
```

---

## 🔐 Autenticación

El sistema usa **JWT Bearer Token**. Incluir en cada request protegida:

```
Authorization: Bearer <token>
```

Roles disponibles:
- `reader` — usuario lector
- `admin` — administrador con acceso total

---

## 📖 Documentación de la API

Ver [`docs/api-rest.md`](./docs/api-rest.md) para la documentación completa de todos los endpoints.

**Base URL producción:** `https://librohub-backend-express-1.onrender.com/api/v1`

---

## 🧪 Tests

```bash
npm test
```

---

## 🏗️ Arquitectura de módulos

Cada módulo sigue el patrón:

```
Request → Route → Middleware → Controller → Service → Response
```

```
módulo/
├── módulo.routes.ts      # Definición de rutas
├── módulo.controller.ts  # Manejo de request/response
├── módulo.service.ts     # Lógica de negocio
├── módulo.schema.ts      # Validación de inputs
├── módulo.entity.ts      # Entidad TypeORM
└── módulo.types.ts       # Tipos TypeScript
```
