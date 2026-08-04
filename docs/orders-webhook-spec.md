# Orders Webhook — Required Response Format

The app **POST**s `{ "phone": "05XXXXXXXX" }` to your Orders webhook URL. You must respond with JSON in this exact shape.

## Required response JSON

```json
{
  "customer": {
    "custid": "string",
    "name": "string",
    "phone": "string",
    "address": "string"
  },
  "orders": [
    {
      "ivdate": "string",
      "ivnum": "string",
      "custid": "string",
      "phone": "string",
      "branch_id": "string",
      "branch_desc": "string",
      "receipt_link": "string",
      "total_price": number,
      "Items": [
        {
          "sku": "string",
          "partname": "string",
          "qty": number,
          "price_amount": number
        }
      ]
    }
  ]
}
```

## Field descriptions

| Location | Field | Type | Description |
|----------|--------|------|-------------|
| **customer** | cust_id / custid | string | Customer ID (either field accepted) |
| | name | string | Full name (used in UI greeting) |
| | phone | string | Phone number |
| | address | string | Default address (optional for display) |
| **orders[]** | ivdate | string | Order/invoice date (ISO or YYYY-MM-DD; used for eligibility) |
| | ivnum | string | Invoice/order number (unique id; used as order_id in app) |
| | cust_id / custid | string | Customer ID |
| | phone | string | Phone |
| | branch_id | string | Branch id if from branch |
| | branch_desc | string | Branch name/description |
| | receipt_link | string | URL to view receipt (opened when user taps "צפה בקבלה") |
| | total_price | number | Order total |
| | Items | array | Line items (see below) |
| **orders[].Items[]** | sku | string | Product SKU |
| | partname | string | Product name (shown in UI) |
| | qty | number | Quantity |
| | price_amount | number | Unit or line price (₪) |

## Example

```json
{
    "customer": {
      "cust_id": "C123",
      "custid": "C123",
      "name": "ישראל ישראלי",
    "phone": "0501234567",
    "address": "רחוב הרצל 1, תל אביב"
  },
  "orders": [
    {
      "ivdate": "2025-02-20",
      "ivnum": "INV-1001",
      "custid": "C123",
      "phone": "0501234567",
      "branch_id": "BR1",
      "branch_desc": "תל אביב",
      "receipt_link": "https://example.com/receipt/INV-1001",
      "total_price": 450,
      "Items": [
        {
          "sku": "RUG-001",
          "partname": "שטיח פירנצה קרם",
          "qty": 1,
          "price_amount": 450
        }
      ]
    }
  ]
}
```

## Array response (alternative)

If your API returns an **array** of `{ customer, orders }` objects (e.g. one element per order), the app accepts that too:

```json
[
  { "customer": { "custid": "...", "name": "...", "phone": "...", "address": "..." }, "orders": [ { "ivdate": "...", "ivnum": "OV255001193", ... } ] },
  { "customer": { ... }, "orders": [ { "ivdate": "...", "ivnum": "OV255001192", ... } ] }
]
```

The app will use the **first** element’s `customer` and **merge all** `orders` from every element into one list. Only orders with **total_price > 0** are shown as “my orders” (credit/return documents with negative totals are excluded).

## Notes

- **customer** can be omitted if you don't have it; the app will still show orders.
- **orders** must be an array (can be empty). **Return all orders** the customer should see, including orders older than the return-eligibility window (e.g. 20 days). The app will show older orders with the replace/return action disabled and the note "חלפה התקופה בה ניתן לבצע החזרה / החלפה". Do not filter out old orders in your API.
- **Items** can be named `Items` or `items`; **partname** can be **product_name**; **price_amount** can be **price**. The app normalizes these for compatibility.
- **Credit notes / returns**: Documents with `total_price <= 0` (e.g. `IK...` credit notes) are filtered out and do not appear in the customer’s order list.
- **n8n / wrappers**: If your webhook returns the payload inside `body`, `data`, `result`, or `output`, the app will unwrap it automatically.
