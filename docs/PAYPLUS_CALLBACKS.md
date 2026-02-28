# PayPlus integration – callback URLs

Configure these URLs in your **PayPlus dashboard** (Payment Page / Redirect URLs).

**App domain:** `https://csreturns.vercel.app`

---

## Success URL (after successful payment)

```
https://csreturns.vercel.app/api/payplus/success
```

PayPlus will append `?return_id=RR-xxx` when redirecting the customer.

---

## Failure URL (after failed or cancelled payment)

```
https://csreturns.vercel.app/api/payplus/failure
```

---

## Authorization

PayPlus expects a single **Authorization** header with a JSON string:

```json
{"api_key":"YOUR_API_KEY","secret_key":"YOUR_SECRET_KEY"}
```

Set `PAYPLUS_API_KEY` and `PAYPLUS_SECRET_KEY` in your environment; the app sends them in this format.

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `PAYPLUS_API_KEY` | Your PayPlus API key |
| `PAYPLUS_SECRET_KEY` | Your PayPlus secret key |
| `PAYPLUS_PAYMENT_PAGE_UID` | (Optional) Payment page UID from PayPlus. If omitted, a default UID is used – replace with your own. |
| `NEXT_PUBLIC_APP_URL` | (Optional) Override app URL for redirects. Default: `https://csreturns.vercel.app` |

---

## Flow summary

- **Refund only (no amount to pay):** Summary → submit → return request created, webhook fired → success page.
- **Amount to pay:** Summary → submit → return request created with status `awaiting_payment` → redirect to PayPlus → customer pays → PayPlus redirects to **Success URL** → we confirm request, fire webhook → redirect to success page. If payment fails, PayPlus redirects to **Failure URL** → payment-failed page.
