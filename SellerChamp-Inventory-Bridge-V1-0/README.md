# SellerChamp Inventory Bridge v1.0.0

Built from the SellerChamp Location Mover framework.

Purpose: compare pending SellerChamp Master Product Batch lines with the corresponding Products inventory, then safely receive batch inventory through SellerChamp's official batch receiving endpoint.

## Render
Build command: `npm install`
Start command: `npm start`
Environment variables:
- `SELLERCHAMP_TOKEN` = your SellerChamp API token
- `APP_PIN` = optional app PIN

## Safety behavior
- `Receive All Safe` only includes pending batch lines with a location, a matching Product record, and no positive inventory already present at that same Product location.
- Existing Product inventory is flagged for review rather than overwritten.
- Receiving uses `PUT /api/master_product_batches/:id/receive`.

## Version
1.0.0
