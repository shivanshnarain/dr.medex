<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StorageManagementController;

Route::prefix('v1')->group(function () {
    // Storage inventory & health
    Route::get('/storage/inventory', [StorageManagementController::class, 'getInventory']);
    Route::get('/storage/orphaned-assets', [StorageManagementController::class, 'scanOrphanedAssets']);
    Route::post('/storage/delete-orphans', [StorageManagementController::class, 'deleteOrphanedAssets']);

    // Permanent Deletion
    Route::delete('/products/{id}', [StorageManagementController::class, 'deleteProduct']);
    Route::delete('/products/{id}/images', [StorageManagementController::class, 'deleteProductImage']);
});
