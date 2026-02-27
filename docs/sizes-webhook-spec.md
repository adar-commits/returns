# Sizes webhook — when we call it and what we need

## When we call it (GetSizes)

We call your **Sizes** webhook at **one** point in the flow:

- **Item selection step** (`/orders/[orderId]/items`): when the customer chooses **"החלפה" (Replace)** for a line item, we need replacement size options. We **POST** to your Sizes URL with the item’s **SKU** when:
  1. The user changes the dropdown to "החלפה" for that item, or  
  2. The user focuses the "גודל / אפשרות" (size) dropdown.

We do **not** call Sizes for "החזרה" (Return) — only for Replace.

---

## Request we send (JSON)

**Method:** `POST`  
**Headers:** `Content-Type: application/json`  
**Body:**

```json
{
  "sku": "06522090-80200"
}
```

- **sku** (string): the product SKU of the line item the customer wants to replace.

---

## Response we need from you (JSON)

Return a JSON object with a **sizes** array. Each element is one replacement option (e.g. another size or variant).

```json
{
  "sizes": [
    {
      "id": "size-140x200",
      "label": "140×200 ס״מ",
      "price": 550,
      "image": "https://example.com/images/rug-140x200.jpg"
    },
    {
      "id": "size-160x230",
      "label": "160×230 ס״מ",
      "price": 720,
      "image": "https://example.com/images/rug-160x230.jpg"
    }
  ]
}
```

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| **sizes** | array | yes      | List of replacement options. |
| **sizes[].id** | string | yes   | Unique id for this option (we store it as `selected_size_id`). |
| **sizes[].label** | string | no  | Display name (e.g. size or variant). Shown in the dropdown. |
| **sizes[].price** | number | no  | Price in ₪. Shown next to the option. |
| **sizes[].image** | string | no  | Full URL of the option image. We show it next to the size selector when present. |

- You can use **Sizes** (capital S) instead of **sizes**; we accept both.
- **image** is optional; if you send it, we display the image next to the size options.

---

## Example response (minimal)

```json
{
  "sizes": [
    { "id": "1", "label": "קטן", "price": 100 },
    { "id": "2", "label": "בינוני", "price": 150, "image": "https://cdn.example.com/mid.jpg" }
  ]
}
```
