# SellerChamp Inventory Bridge v1.1.0

Read-only combined inventory lookup for Stuff2Sell.

## What changed in v1.1
- Searches Products and active unsubmitted SellerChamp batches for the same SKU.
- Treats unsubmitted batch quantity/location as inventory that is physically present but not yet reflected in Products.
- Shows Effective Quantity = Product Qty + unsubmitted Batch Qty.
- Shows effective locations and the source batch(es).
- Removed receiving/sync controls from the UI so this version cannot accidentally alter SellerChamp inventory.

## Render
Build command: `npm install`
Start command: `npm start`
Environment variables: `SELLERCHAMP_TOKEN`, optional `APP_PIN`.
If the repository contains this project inside a folder, set Render Root Directory to that folder.
