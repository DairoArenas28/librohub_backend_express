LibroHub nace de la necesidad para aquellos amantes de los libros que necesitan una base de datos confiable, sencilla y abierta al público. Su objetivo principal es facilitar el acceso a información detallada sobre diferentes libros, permitiendo a los usuarios consultar títulos, autores, categorías y descripciones de manera rápida y organizada.
El sistema está diseñado para ofrecer una experiencia intuitiva, donde los lectores pueden explorar el catálogo sin complicaciones, mientras que los administradores cuentan con herramientas para gestionar, actualizar y mantener la información de los libros de forma eficiente.
De esta manera, LibroHub se convierte en una solución práctica que promueve el acceso a la información literaria, apoyando tanto a usuarios que buscan nuevas lecturas como a quienes desean administrar contenido de manera estructurada.
A continuación, se establece la estructura de la API Rest:


# 📦 Módulo `auth`

Este módulo gestiona toda la autenticación y autorización de la aplicación.
Sigue una arquitectura modular separando responsabilidades (rutas, controladores, lógica de negocio, validación, etc.).

---

## 📁 Estructura de archivos

```
auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.middleware.ts
├── auth.routes.ts
├── auth.types.ts        // (opcional)
├── auth.schema.ts
├── auth.constants.ts    // (opcional)
├── auth.utils.ts        // (opcional)
```

---

## 🧩 Descripción de cada archivo

### `auth.routes.ts`

Define los endpoints HTTP del módulo.

* Usa el router de Express
* Conecta rutas con controladores
* Puede aplicar middlewares

**Responsabilidad:** Enrutamiento (NO lógica de negocio)

---

### `auth.controller.ts`

Maneja las peticiones y respuestas HTTP.

* Recibe `req` y `res`
* Valida inputs (directamente o vía middleware)
* Llama al service
* Devuelve la respuesta al cliente

**Responsabilidad:** Orquestación de la request

---

### `auth.service.ts`

Contiene la lógica de negocio.

* Autenticación (login, register, etc.)
* Generación de tokens
* Interacción con base de datos

**Responsabilidad:** Lógica pura (sin dependencias de HTTP)

---

### `auth.middleware.ts`

Middlewares específicos del módulo.

* Validación de tokens (JWT)
* Protección de rutas (auth guard)
* Validaciones previas

**Responsabilidad:** Interceptar y procesar requests antes del controller

---

### `auth.schema.ts`

Define los esquemas de validación usando Zod.

* Validación de inputs (login, register, etc.)
* Fuente de verdad para datos de entrada
* Permite inferir tipos automáticamente

```ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

**Responsabilidad:** Validación + tipado derivado

---

### `auth.types.ts` (opcional)

Define tipos de TypeScript que no provienen de Zod.

Ejemplos:

* Payload de JWT
* Tipos internos del sistema

**Responsabilidad:** Tipado estático puro

---

### `auth.constants.ts` (opcional)

Constantes del módulo.

Ejemplos:

* Mensajes de error
* Roles
* Configuración específica

```ts
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid credentials",
};
```

**Responsabilidad:** Centralizar valores reutilizables

---

### `auth.utils.ts` (opcional)

Funciones auxiliares reutilizables.

Ejemplos:

* Hash de contraseñas
* Comparación de passwords
* Helpers de tokens

**Responsabilidad:** Utilidades puras sin lógica de negocio compleja

---

## 🔄 Flujo de ejecución

```
Request → Route → Middleware → Controller → Service → Response
```

1. El cliente hace una petición HTTP
2. La ruta la recibe (`routes`)
3. Se ejecutan middlewares (auth, validación, etc.)
4. El controller procesa la request
5. El service ejecuta la lógica de negocio
6. Se devuelve la respuesta

---

## 🧠 Convenciones clave

* No mezclar lógica de negocio en controllers
* No usar HTTP (`req`, `res`) dentro de services
* Usar Zod como fuente única de validación
* Evitar duplicar tipos (preferir `z.infer`)
* Mantener cada archivo con una sola responsabilidad

---

## ✅ Buenas prácticas

* Usar nombres consistentes (`auth.*`)
* Mantener funciones pequeñas y reutilizables
* Separar validación de lógica
* Escalar agregando más módulos (user, product, etc.) con la misma estructura

---

## 🚀 Escalabilidad

Este patrón es compatible con arquitecturas usadas en frameworks como:

* Express.js
* NestJS

Facilita testing, mantenimiento y crecimiento del proyecto.

