# TheRatio - Calculadora de ratio elevación/distancia para Strava

TheRatio es una aplicación web que se integra con Strava para calcular automáticamente la proporción entre el desnivel positivo y la distancia (metros de elevación por kilómetro) para actividades de tipo TrailRun.

## Características

- Autenticación con OAuth de Strava
- Visualización de actividades del usuario
- Cálculo automático del ratio elevación/distancia para actividades de TrailRun
- Webhook para procesar nuevas actividades automáticamente
- Añade comentarios automáticos a actividades que superen un umbral de ratio

## Configuración

### Prerrequisitos

- Node.js 18+ y npm/yarn
- Una cuenta de Strava
- Una aplicación creada en la [API de Strava](https://www.strava.com/settings/api)

### Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```
STRAVA_CLIENT_ID=tu_client_id
STRAVA_CLIENT_SECRET=tu_client_secret
STRAVA_VERIFY_TOKEN=token_aleatorio_para_verificar_webhook
STRAVA_ACCESS_TOKEN=token_de_acceso_para_desarrollo
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tuusuario/theratio.git
cd theratio
```

2. Instala las dependencias:
```bash
npm install
# o
yarn install
```

3. Ejecuta el servidor de desarrollo:
```bash
npm run dev
# o
yarn dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Configuración del Webhook de Strava

Para recibir notificaciones automáticas cuando se creen nuevas actividades, necesitas configurar un webhook de Strava:

1. Tu aplicación debe ser accesible desde Internet (usa ngrok u otro servicio similar para desarrollo)
2. Registra el webhook en Strava:
```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=TU_CLIENT_ID \
  -F client_secret=TU_CLIENT_SECRET \
  -F callback_url=https://tu-dominio.com/api/strava/webhook \
  -F verify_token=TU_TOKEN_DE_VERIFICACION
```

## Despliegue en producción

Para un despliegue en producción, recomendamos usar Vercel:

```bash
npm install -g vercel
vercel
```

No olvides configurar las variables de entorno en tu proveedor de hosting.

## Consideraciones de seguridad

En un entorno de producción, debes implementar:

- Almacenamiento seguro de tokens de usuario en una base de datos
- Renovación automática de tokens de acceso caducados
- HTTPS para todas las comunicaciones
- Validación de la firma de los webhooks

## Licencia

Este proyecto está bajo la licencia MIT.
