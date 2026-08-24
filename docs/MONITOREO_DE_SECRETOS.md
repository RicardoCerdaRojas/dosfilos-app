# Monitoreo de secretos — qué existe y qué falta

> Escrito el 2026-08-24, a raíz de descubrir que el stack de correo llevaba
> varios deploys sin `RESEND_API_KEY` en producción.

## El caso que originó esto

Los logs decían `⚠️ RESEND_API_KEY is not set. Emails will not send.` en función
tras función, cada pocos minutos. La cadena:

1. Ninguna función declaraba `secrets: ['RESEND_API_KEY']`.
2. La clave dependía de `packages/functions/.env`, que Cloud Functions v2
   hornea **en el deploy**.
3. CI despliega sin ese archivo — está en `.gitignore`.

Cada despliegue automático dejaba producción sin clave. Y `leadMagnetMailer` no
avisa: lanza excepción.

### Por qué pasó desapercibido tanto tiempo

`resendClient.ts` emitía el aviso **al cargar el módulo**, y decenas de
funciones lo importan de forma transitiva sin enviar correo. Para ellas la
ausencia de clave es lo esperado.

El log gritaba en todas partes, así que **no señalaba en ninguna**. La alarma
falsa enterró el caso real. Es el modo de fallo a vencer, no un detalle.

## Lo que YA está construido

### Chequeo estático en CI (`scripts/check-functions-secrets.sh`)

Verifica el invariante calculable:

> Si un módulo lee `process.env.X` y X es un secreto que el proyecto gestiona,
> toda función cuyo grafo de imports lo alcance debería declarar X.

- **Qué cuenta como secreto gestionado**: la unión de todos los nombres que
  aparecen en algún `secrets: [...]`. Auto-mantenido: un secreto nuevo entra al
  radar sin tocar el script.
- **Trinquete, no cero**: hay lecturas legítimas que no exigen declaración —
  `config/stripe.ts` hace `new Stripe(KEY || 'dummy_key')` a nivel de módulo y
  lo importan funciones que no cobran. Esos 13 pares están congelados en
  `scripts/functions-secrets-baseline.txt`; uno nuevo bloquea.
- **Bloquea ANTES del deploy**, que es la diferencia entre un aviso y una
  baranda.

Verificado mordiendo: quitando `secrets: ['RESEND_API_KEY']` de `captureLead`,
el chequeo lo marca y sale con código 1.

## Lo que NO está construido, y por qué se decidió esperar

### El health-check en runtime NO resuelve este problema

Es lo primero que uno construye y **no habría atrapado este bug**: una función
que verifica `process.env.X` declara los secretos que revisa, así que siempre
los tiene. Reportaría verde mientras otras trece funciones están sin clave.

Mismo error que el aviso de `resendClient`, un nivel más arriba.

### Lo que sí aportaría un panel `/admin/system-health`

Cubre lo que lo estático no puede saber: un secreto puede estar declarado y aun
así faltar en Secret Manager, o tener el valor equivocado.

Dos fuentes, ninguna trivial:

1. **Inventario real** — qué secretos existen y qué servicios los montan. Se
   obtiene con `gcloud run services describe`, y habría que guardarlo en un doc
   de Firestore mediante un job diario. Requiere que las functions tengan
   permiso para consultar Cloud Run, que hoy no tienen.
2. **Reporte de uso fallido** — cuando una función intenta USAR una clave y no
   está, registrar el evento (con throttle) en vez de sólo escribir a consola.
   Eso es señal, no ruido: nace del intento real de uso, no del import.

La segunda es la más valiosa y la más barata. La primera necesita permisos
nuevos y conviene evaluarla aparte.

### Criterio para retomarlo

Cuando haya un segundo incidente de esta familia que el chequeo estático NO
detecte. Hasta entonces, el panel mostraría "todo bien" — y un panel que
siempre dice lo mismo se deja de mirar, que es exactamente cómo empezó esto.

## Comandos útiles

```bash
npm run compliance:secrets                        # el chequeo (corre en CI)
./scripts/check-functions-secrets.sh --list       # todos los pares detectados
./scripts/check-functions-secrets.sh --update     # regraba el baseline

# Inventario manual, mientras no exista el panel:
gcloud run services describe <servicio> --region us-central1 \
  --project dosfilosapp --format=json | python3 -c "..."
```

## Gotcha de deploy que costó un ciclo

Cloud Run rechaza que la misma clave exista como variable **plana** y como
**secreto** a la vez:

```
Secret environment variable overlaps non secret environment variable: RESEND_API_KEY
```

Si un servicio arrastra la versión plana de un deploy local antiguo, hay que
quitarla antes:

```bash
gcloud run services update <servicio> --region us-central1 \
  --project dosfilosapp --remove-env-vars RESEND_API_KEY
```

Y sacar la clave de `packages/functions/.env`, o el próximo deploy local la
vuelve a crear.
