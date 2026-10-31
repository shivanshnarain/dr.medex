<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\PermanentDeletionService;
use App\Services\CloudinaryCleanupService;
use App\Services\StorageAuditService;

class StorageManagementController
{
    protected PermanentDeletionService $deletionService;
    protected CloudinaryCleanupService $cloudinaryService;
    protected StorageAuditService $auditService;

    public function __construct(
        PermanentDeletionService $deletionService,
        CloudinaryCleanupService $cloudinaryService,
        StorageAuditService $auditService
    ) {
        $this->deletionService = $deletionService;
        $this->cloudinaryService = $cloudinaryService;
        $this->auditService = $auditService;
    }

    /**
     * Get live storage inventory
     */
    public function getInventory(): JsonResponse
    {
        return response()->json($this->auditService->getInventory());
    }

    /**
     * Scan orphaned assets in Cloudinary
     */
    public function scanOrphanedAssets(): JsonResponse
    {
        return response()->json($this->cloudinaryService->scanOrphanedAssets());
    }

    /**
     * Delete confirmed orphaned assets
     */
    public function deleteOrphanedAssets(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'publicIds' => 'required|array|min:1',
            'confirmed' => 'required|boolean|accepted',
        ]);

        $deleted = [];
        foreach ($validated['publicIds'] as $pid) {
            $res = $this->cloudinaryService->destroyAsset($pid);
            if ($res['success']) {
                $deleted[] = $pid;
            }
        }

        return response()->json([
            'success' => true,
            'deletedCount' => count($deleted),
            'deleted' => $deleted,
        ]);
    }

    /**
     * Delete product permanently
     */
    public function deleteProduct(Request $request, string $id): JsonResponse
    {
        try {
            $adminEmail = $request->header('X-Admin-Email', 'admin@drmedex.com');
            $result = $this->deletionService->deleteProduct($id, $adminEmail);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Delete individual product image
     */
    public function deleteProductImage(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'publicId' => 'required|string',
        ]);

        try {
            $adminEmail = $request->header('X-Admin-Email', 'admin@drmedex.com');
            $result = $this->deletionService->deleteSingleImage($id, $validated['publicId'], $adminEmail);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
