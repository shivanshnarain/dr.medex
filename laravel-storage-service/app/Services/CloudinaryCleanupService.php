<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Cloudinary\Api\ApiResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class CloudinaryCleanupService
{
    protected Cloudinary $cloudinary;

    public function __construct()
    {
        $this->cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key'    => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => [
                'secure' => true,
            ],
        ]);
    }

    /**
     * Check if a public ID is shared with any other product or order in MongoDB
     */
    public function isAssetShared(string $publicId, ?string $excludeProductId = null): array
    {
        // 1. Check approved_products
        $query = DB::connection('mongodb')->collection('approved_products')->where(function ($q) use ($publicId) {
            $q->where('primaryImage', 'regex', $publicId)
              ->orWhere('images', 'all', [$publicId])
              ->orWhere('galleryImages.url', 'regex', $publicId)
              ->orWhere('managedCloudinaryImages.publicId', $publicId);
        });

        if ($excludeProductId) {
            $query->where('id', '!=', $excludeProductId);
        }

        $otherProduct = $query->first(['id', 'title', 'productName']);
        if ($otherProduct) {
            return [
                'shared' => true,
                'reason' => 'Asset shared with product: ' . ($otherProduct['title'] ?? $otherProduct['productName'] ?? $otherProduct['id']),
            ];
        }

        // 2. Check orders
        $order = DB::connection('mongodb')->collection('orders')->where(function ($q) use ($publicId) {
            $q->where('items.image', 'regex', $publicId)
              ->orWhere('items.publicId', $publicId);
        })->first(['orderNumber']);

        if ($order) {
            return [
                'shared' => true,
                'reason' => 'Asset preserved: referenced in customer order #' . ($order['orderNumber'] ?? 'Unknown'),
            ];
        }

        return ['shared' => false];
    }

    /**
     * Permanently destroy an exclusively owned Cloudinary asset with CDN invalidation
     */
    public function destroyAsset(string $publicId): array
    {
        try {
            $result = $this->cloudinary->uploadApi()->destroy($publicId, [
                'invalidate' => true,
            ]);

            return [
                'success' => in_array($result['result'] ?? '', ['ok', 'not found']),
                'result' => $result['result'] ?? 'unknown',
            ];
        } catch (\Exception $e) {
            Log::error("[CloudinaryCleanupService] Failed to destroy asset {$publicId}: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Scan Cloudinary for orphaned assets having zero active MongoDB references
     */
    public function scanOrphanedAssets(): array
    {
        try {
            // Retrieve referenced assets from MongoDB
            $products = DB::connection('mongodb')->collection('approved_products')->get(['primaryImage', 'images', 'galleryImages']);
            $referencedIds = collect();

            foreach ($products as $p) {
                if (!empty($p['primaryImage'])) $referencedIds->push($p['primaryImage']);
                if (!empty($p['images'])) {
                    foreach ($p['images'] as $img) $referencedIds->push($img);
                }
            }

            // List recent Cloudinary resources
            $resources = $this->cloudinary->adminApi()->assets([
                'type' => 'upload',
                'prefix' => 'drmedex',
                'max_results' => 100,
            ]);

            $orphaned = [];
            foreach ($resources['resources'] ?? [] as $res) {
                $pid = $res['public_id'];
                $isReferenced = $referencedIds->contains(function ($val) use ($pid) {
                    return str_contains($val, $pid);
                });

                if (!$isReferenced) {
                    $orphaned[] = [
                        'public_id' => $pid,
                        'format' => $res['format'] ?? '',
                        'bytes' => $res['bytes'] ?? 0,
                        'secure_url' => $res['secure_url'] ?? '',
                        'created_at' => $res['created_at'] ?? '',
                    ];
                }
            }

            return [
                'success' => true,
                'orphanedCount' => count($orphaned),
                'orphanedAssets' => $orphaned,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'orphanedCount' => 0,
                'orphanedAssets' => [],
            ];
        }
    }
}
