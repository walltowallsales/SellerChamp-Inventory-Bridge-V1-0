# SellerChamp Inventory Bridge v1.2.0

Read-only combined inventory lookup plus Batch API Diagnostic.

## v1.2 changes
- Adds a read-only diagnostic for a known SKU.
- Probes master-product-batch and legacy batch-related API routes.
- Shows HTTP success/failure and any matching SKU fields returned.
- Does not receive, submit, edit, or change SellerChamp inventory.

Use SKU 2609-44234 as the first diagnostic test. In the SellerChamp web UI it is known to be in batch #338 with Qty 6 at location C0221.
