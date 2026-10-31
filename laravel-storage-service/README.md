# DR.MEDEX Global — Laravel Storage Management & Permanent Deletion Microservice

## Architectural Inspection & Runtime Report

Per Part 1 of the architecture inspection requirements:
1. **Host Environment Analysis**:
   - The primary DR.MEDEX production web application is hosted on **Vercel** (`https://dr-medex.vercel.app`) using serverless execution routes (`api/admin/[...path].js`).
   - The Vercel Serverless environment natively provisions **Node.js runtimes** (`Node.js v20.x/v22.x`) and does not natively execute PHP or Laravel Artisan commands without specialized, third-party community runtimes.
   - On the local development environment (`macOS`), executing `which php` returns `php not found`.

2. **Dedicated Laravel Microservice Blueprint**:
   - Rather than pretending Laravel is currently running on the serverless Node instance, this directory (`laravel-storage-service/`) provides the **complete, production-grade Laravel 11 microservice blueprint**.
   - It is designed for isolated containerized deployment (e.g., **Docker**, **AWS ECS/Fargate**, **Laravel Vapor**, or **Laravel Forge / DigitalOcean App Platform**).
   - In production, the Node/Express backend natively handles data-management & permanent deletion via `server/services/deletionService.js`, while this Laravel microservice can be deployed as an independent companion service communicating over internal VPC with MongoDB Atlas and Cloudinary.

---

## Service Architecture

### 1. `PermanentDeletionService.php`
- Orchestrates multi-stage permanent deletion:
  1. Validates admin credentials (`requireAdmin`).
  2. Queries MongoDB Atlas `approved_products` collection.
  3. Detects associated Cloudinary media (`primaryImage`, `images`, `galleryImages`).
  4. Runs shared-asset protection verification: checks if public IDs are shared with any other product or referenced in customer order history.
  5. Permanently destroys exclusively owned Cloudinary assets via authenticated API (`invalidate: true`).
  6. Deletes product documents from MongoDB Atlas.
  7. Inserts minimal operational tombstone marker into `deleted_products` (strictly ID + timestamp to prevent seed file re-import).
  8. Audits action with full metadata.

### 2. `CloudinaryCleanupService.php`
- Authenticated integration with Cloudinary Admin & Upload APIs.
- Shared asset safety checks across collections.
- Scans Cloudinary bucket for orphaned assets with zero active references.

### 3. `StorageAuditService.php`
- Real-time provider inventory aggregation:
  - MongoDB Atlas: Connection status, database, collection counts, ping latency.
  - Cloudinary Media Cloud: Objects usage, storage bytes, credits, bandwidth.
  - Firebase Firestore: Review moderation storage.
  - Supabase Auth: Customer account directory.

---

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/storage/inventory` | Live inventory of all connected databases and storage services |
| `GET` | `/api/v1/storage/orphaned-assets` | Scan Cloudinary for assets with zero database references |
| `POST` | `/api/v1/storage/delete-orphans` | Permanently destroy verified orphaned assets |
| `DELETE` | `/api/v1/products/{id}` | Permanently delete product document and owned Cloudinary media |
| `DELETE` | `/api/v1/products/{id}/images` | Permanently delete individual product image from Cloudinary |

---

## Deployment Instructions

```bash
# 1. Install dependencies
composer install --no-dev --optimize-autoloader

# 2. Configure environment
cp .env.example .env
# Set MONGODB_URI, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

# 3. Serve service
php artisan serve --port=8001
```
