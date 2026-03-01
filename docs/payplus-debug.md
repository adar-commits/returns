# PayPlus payment link – debug

**"Payment is not configured"** means the app could not read **PAYPLUS_API_KEY** or **PAYPLUS_SECRET_KEY** in the environment where the API runs (e.g. Vercel → Project → Settings → Environment Variables, or local `.env.local`).

Set both and redeploy/restart, then try again.

---

## Sample HTTP request (for your debugging)

The app calls PayPlus **Generate Link** like this. You can replay it with `curl` or Postman.

**Endpoint:** `POST https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink`

**Headers:**
- `Content-Type: application/json`
- `Authorization: <JSON string with api_key and secret_key>`

**Body (JSON):**
```json
{
  "payment_page_uid": "<your payment page UID>",
  "expiry_datetime": "30",
  "payments": "12",
  "amount": 100,
  "currency_code": "ILS",
  "sendEmailApproval": true,
  "sendEmailFailure": false,
  "refURL_success": "https://your-app.com/api/payplus/success?return_id=RET-123",
  "refURL_failure": "https://your-app.com/api/payplus/failure?return_id=RET-123",
  "language_code": "he",
  "customer": {
    "customer_name": "Customer",
    "email": "no-reply@returns.local",
    "phone": "0501234567"
  }
}
```

**Env vars the app uses:** `PAYPLUS_API_KEY`, `PAYPLUS_SECRET_KEY`, `PAYPLUS_PAYMENT_PAGE_UID` (optional), `PAYPLUS_EXPIRY_DATETIME` (optional, default `"30"`), `PAYPLUS_PAYMENTS` (optional, default `"12"`).

Replace:
- `payment_page_uid` – your PayPlus payment page UID (or set `PAYPLUS_PAYMENT_PAGE_UID` in env)
- `expiry_datetime` – link expiry (e.g. minutes); optional, overridable via `PAYPLUS_EXPIRY_DATETIME`
- `payments` – e.g. max installments; optional, overridable via `PAYPLUS_PAYMENTS`
- `amount` – amount in ILS
- `refURL_success` / `refURL_failure` – your app’s success/failure URLs with the real `return_id`
- `customer` – optional; omit the whole object if you don’t send customer details

---

## cURL example

```bash
curl -X POST "https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink" \
  -H "Content-Type: application/json" \
  -H "Authorization: {\"api_key\":\"YOUR_PAYPLUS_API_KEY\",\"secret_key\":\"YOUR_PAYPLUS_SECRET_KEY\"}" \
  -d '{
    "payment_page_uid": "7a0bc4d4-f35f-4301-a945-926378a2416d",
    "amount": 100,
    "currency_code": "ILS",
    "sendEmailApproval": true,
    "sendEmailFailure": false,
    "refURL_success": "https://your-app.com/api/payplus/success?return_id=RET-123",
    "refURL_failure": "https://your-app.com/api/payplus/failure?return_id=RET-123",
    "language_code": "he",
    "customer": {
      "customer_name": "Test Customer",
      "email": "test@example.com",
      "phone": "0501234567"
    }
  }'
```

Replace:
- `YOUR_PAYPLUS_API_KEY` – from PayPlus dashboard
- `YOUR_PAYPLUS_SECRET_KEY` – from PayPlus dashboard
- `payment_page_uid` – your Payment Page UID if different
- `refURL_success` / `refURL_failure` – your real redirect URLs

**Expected success response (200):**
```json
{
  "results": {
    "status": "success",
    "code": 0,
    "description": "payment page link has been generated"
  },
  "data": {
    "page_request_uid": "0e8789bf-9eaf-4a07-9c16-0a348a4fd5d9",
    "payment_page_link": "https://..."
  }
}
```

If you get 401/403, the keys are wrong or not allowed for this action. If you get 4xx/5xx, the response body usually has a `description` or `message` with details.
