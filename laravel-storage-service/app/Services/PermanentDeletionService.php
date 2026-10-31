<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PermanentDeletionService
{
    protected CloudinaryCleanupService $cloudinary;

    public function __construct(CloudinaryCleanupService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    /**
     * Permanently delete a product: text from MongoDB, owned media from Cloudinary
     */
    public function deleteProduct(string $productId, string $adminEmail = 'admin@drmedex.com'): array
    {
        // 1. Fetch product
        $product = DB::connection('mongodb')->collection('approved_products')
            ->where('id', $productId)
            ->orWhere('slug', $productId)
            ->first();

        if (!$product) {
            throw new \Exception("Product '{$productId}' not found in MongoDB.");
        }

        $canonicalId = $product['id'] ?? $productId;

        // 2. Collect Cloudinary public IDs
        $publicIds = [];
        if (!empty($product['primaryImage']) && str_contains($product['primaryImage'], 'res.cloudinary.com')) {
            if (preg_match('/\/upload\/(?:v\d+\/)?([a-zA-Z0-9_\-\/]+?)(?:\.[a-zA-Z0-9]+)?$/', $product['primaryImage'], $m)) {
                $publicIds[] = $m[1];
            }
        }
        if (!empty($product['images']) && is_array($product['images'])) {
            foreach ($product['images'] as $img) {
                if (is_string($img) && preg_match('/\/upload\/(?:v\d+\/)?([a-zA-Z0-9_\-\/]+?)(?:\.[a-zA-Z0-9]+)?$/', $img, $m)) {
                    $publicIds[] = $m[1];
                }
            }
        }

        // 3. Destroy exclusively owned media
        $deletedMedia = [];
        $preservedMedia = [];
        foreach ($publicIds as $pid) {
            $shareCheck = $this->cloudinary->isAssetShared($pid, $canonicalId);
            if ($shareCheck['shared']) {
                $preservedMedia[] = ['publicId' => $pid, 'reason' => $shareCheck['reason']];
                continue;
            }

            $res = $this->cloudinary->destroyAsset($pid);
            if ($res['success']) {
                $deletedMedia[] = $pid;
            }
        }

        // 4. Permanently delete from MongoDB
        $deleteResult = DB::connection('mongodb')->collection('approved_products')
            ->where('id', $canonicalId)
            ->delete();

        // 5. Anti-resurrection minimal operational marker
        DB::connection('mongodb')->collection('deleted_products')->updateOrInsert(
            ['id' => $canonicalId],
            [
                'id' => $canonicalId,
                'deletedAt' => now()->toISOString(),
                'deletedBy' => $adminEmail
            ]
        );

        Log::info("[PermanentDeletionService] Product {$canonicalId} permanently deleted by {$adminEmail}. Media removed: " . count($deletedMedia));

        return [
            'success' => true,
            'productId' => $canonicalId,
            'title' => $product['title'] ?? $product['productName'] ?? $canonicalId,
            'deletedMedia' => $deletedMedia,
            'preservedMedia' => $preservedMedia,
            'mongoDeletedCount' => $deleteResult,
        ];
    }

    /**
     * Delete an individual image from a product
     */
    public function deleteSingleImage(string $productId, string $publicId, string $adminEmail = 'admin@drmedex.com'): array
    {
        $product = DB::connection('mongodb')->collection('approved_products')->where('id', $productId)->first();
        if (!$product) {
            throw new \Exception("Product '{$productId}' not found.");
        }

        $shareCheck = $this->cloudinary->isAssetShared($publicId, $productId);
        $assetDestroyed = false;

        if (!$shareCheck['shared']) {
            $destRes = $this->cloudinary->destroyAsset($publicId);
            $assetDestroyed = $destRes['success'];
        }

        // Update product images in MongoDB
        $remainingImages = array_values(array_filter($product['images'] ?? [], function ($img) use ($publicId) {
            return !str_contains($img, $publicId);
        }));

        DB::connection('mongodb')->collection('approved_products')->where('id', $productId)->update([
            'images' => $remainingImages,
            'updatedAt' => now()->toISOString(),
        ]);

        return [
            'success' => true,
            'productId' => $productId,
            'publicId' => $publicId,
            'assetDestroyed' => $assetDestroyed,
            'sharedAssetPreserved' => $shareCheck['shared'],
            'remainingImagesCount' => count($remainingImages),
        ];
    }
}
