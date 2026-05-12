# Lead Magnet — Manual de Predicación

Deployment steps for activating the `/recursos/manual-para-predicadores` funnel.

## One-time setup

### 1. Upload the PDF to Cloud Storage

The signed-URL flow expects the PDF to live at
`gs://dosfilosapp.firebasestorage.app/public-assets/manual-para-predicadores.pdf`.

```bash
gsutil cp docs/manual-para-predicadores.pdf \
  gs://dosfilosapp.firebasestorage.app/public-assets/manual-para-predicadores.pdf
```

Alternatively, upload via Firebase Console → Storage → create folder
`public-assets/` → upload the PDF as `manual-para-predicadores.pdf`.

Keep ACL **private** — the function generates a fresh signed URL per
request. A public ACL would let anyone bypass the email gate.

### 2. Set the Resend secret

```bash
firebase functions:secrets:set RESEND_API_KEY --project dosfilosapp
# When prompted, paste: re_5ThpzZTS_HSr3P8nEJoVqwt2xb85j8Rn5
```

Verify:

```bash
firebase functions:secrets:access RESEND_API_KEY --project dosfilosapp
```

Should print the key. The `captureLead` function declares
`{ secrets: ['RESEND_API_KEY'] }` so Firebase mounts it as an env
var at runtime — no further wiring required.

### 3. Verify the Resend sender domain

The function sends `from: Preach <hola@dosfilos.com>`. The
`dosfilos.com` domain must be **verified** in the Resend dashboard
(SPF + DKIM records on the DNS) or Resend will reject the send.

Check: https://resend.com/domains → `dosfilos.com` row shows
`Verified` and both DKIM + SPF green.

If the domain is not verified yet, either:

- Use the Resend test domain `onboarding@resend.dev` (works for
  development but lands in spam in prod), OR
- Add the DNS records Resend provides and wait for verification
  (~minutes to a few hours).

To switch to the test domain temporarily:

```typescript
// packages/functions/src/leads/captureLead.ts
const FROM_ADDRESS = 'Preach <onboarding@resend.dev>';
```

## Deploy

```bash
yarn build
firebase deploy --only "functions:captureLead,hosting" --project dosfilosapp
```

## Smoke test

After deploy:

1. Visit `/recursos/manual-para-predicadores` on the live site.
2. Submit your own email.
3. Should redirect to `/recursos/manual-para-predicadores/gracias`.
4. Email arrives within ~30 seconds with the download button.
5. Clicking the button opens the PDF.
6. Firestore `leads/manual-para-predicadores__youremail` doc exists
   with `emailDelivered: true`.

If step 4 fails, check Firebase Functions logs:

```bash
firebase functions:log --only captureLead --project dosfilosapp
```

Common failures:

- `Resend error: domain is not verified` → step 3 above
- `Cannot find the file` → step 1 (PDF not uploaded)
- `RESEND_API_KEY environment variable is required` → step 2

## Meta ads UTM convention

For the launch campaign, point Meta ads at the lead magnet with
these UTMs so analytics groups them correctly:

```
https://dosfilosapp.web.app/recursos/manual-para-predicadores
  ?utm_source=meta
  &utm_medium=cpc
  &utm_campaign=manual_pred_launch_es
  &utm_content={{ad.name}}
  &utm_term={{adset.name}}
```

The analytics module captures these on first-touch, persists in
localStorage, and forwards to:

- GA4 (every event tagged with utm_*)
- The Firestore `leads/{id}` doc (`utm` field)
- The Firestore `funnel_events/{id}` docs (`utm_*` props)
- Meta Pixel (when the Pixel ID is filled in — passed as event props)

So every lead row you inspect later carries the campaign that
brought it in.

## What's NOT included yet

- **Nurture sequence** (5 emails over 30 days). The `lead.nurtureStage`
  field is already on every lead doc, waiting for a scheduled function
  + email templates to advance the stage.
- **Email-list export** to a CRM. Easy follow-up: a callable that
  streams `leads/` rows to CSV or pushes to Mailchimp/ConvertKit.
- **Unsubscribe link** in the email. Today the email asks the user
  to reply if they want to opt out. Compliance is borderline OK
  because the user is opting IN to a single magnet, but proper
  unsubscribe is a v2.
