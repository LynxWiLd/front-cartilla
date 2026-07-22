# MenuQR — Frontend

Aplicación React para menú digital con QR, pedidos en mesa y gestión de restaurantes.

## Stack

- **React 19** + Vite 8
- **Tailwind CSS 3** — diseño oscuro con colores de marca configurables
- **React Router v7** — enrutamiento SPA
- **Socket.IO Client** — pedidos y estado de mesas en tiempo real
- **Oxlint** — linter

## Estructura

```
src/
├── api.js                  # Cliente HTTP con JWT Bearer
├── App.jsx                 # Router con 5 rutas
├── main.jsx                # Entry point
├── index.css               # Tailwind + animaciones + scrollbar oculto
├── context/
│   ├── AuthContext.jsx      # Estado de autenticación (JWT en localStorage)
│   └── SocketContext.jsx    # Conexión Socket.IO por tenant/slug
├── components/
│   └── Toast.jsx            # Notificación auto-dismiss
├── lib/
│   ├── utils.js             # formatPrice($, locale AR)
│   └── logger.js            # Logger que envía errores al backend
└── pages/
    ├── TenantMenu.jsx       # Menú público del restaurante (slug)
    ├── StaffLogin.jsx       # Login para mozos y dueños
    ├── StaffDashboard.jsx   # Panel de mozos (mesas y pedidos)
    ├── SuperAdmin.jsx       # CRUD de tenants (superadmin)
    └── OwnerPanel.jsx       # CRUD de menú y staff (dueño)
```

## Rutas

| Ruta              | Acceso       | Descripción                            |
| ----------------- | ------------ | -------------------------------------- |
| `/menu/:slug`     | Público      | Menú digital del restaurante           |
| `/staff/login`    | Público      | Login de staff                         |
| `/staff/dashboard`| WAITER       | Pedidos y estado de mesas en vivo     |
| `/app/admin`      | SUPER_ADMIN  | Administración de tenants              |
| `/app/panel`      | OWNER        | Gestión de menú y mozos                |

## Variables de entorno

| Variable            | Default                 | Descripción                     |
| ------------------- | ----------------------- | ------------------------------- |
| `VITE_SERVER_URL`   | `http://localhost:3001`  | URL base del backend            |

## Desarrollo

```bash
# Solo frontend (proxy a localhost:3001)
npm run dev

# Frontend + backend simultáneos
npm run dev:all

# Build para producción
npm run build

# Lint
npm run lint
```

## Producción (Vercel)

El proyecto incluye `vercel.json` con rewrites para SPA. El build command es `npm run build` y el output es `dist/`.

Configurar `VITE_SERVER_URL` como variable de entorno en Vercel apuntando al backend en producción.

## Seguridad

- No se exponen secretos del backend. El token JWT se almacena en `localStorage` y se envía vía `Authorization: Bearer`.
- El logger de frontend envía errores al backend sin exponer datos sensibles a la consola del usuario.
- Los roles (`WAITER`, `OWNER`, `SUPER_ADMIN`) se validan del lado del cliente y deben ser reforzados en el backend.
- `.env.local` y `*.local` están en `.gitignore`.
- `user-scalable=no` evita zoom no deseado en el menú táctil.
- Scrollbar oculto para mantener consistencia visual.
