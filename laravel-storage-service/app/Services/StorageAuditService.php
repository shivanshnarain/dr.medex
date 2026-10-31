<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Cloudinary\Cloudinary;

class StorageAuditService
{
    /**
     * Compile real-time storage inventory across all providers
     */
    public function getInventory(): array
    {
        $inventory = [];

        // 1. MongoDB Atlas
        try {
            $approvedCount = DB::connection('mongodb')->collection('approved_products')->count();
            $ordersCount = DB::connection('mongodb')->collection('orders')->count();
            $addressesCount = DB::connection('mongodb')->collection('customer_addresses')->count();

            $inventory[] = [
                'dataType' => 'Product Specifications & Text',
                'provider' => 'MongoDB Atlas',
                'storageType' => 'NoSQL Database',
                'connectionStatus' => 'Connected',
                'documentCount' => $approvedCount,
                'storageUsed' => '~' . round($approvedCount * 4.5, 1) . ' KB',
                'health' => 'Healthy',
            ];

            $inventory[] = [
                'dataType' => 'Customer Orders & Addresses',
                'provider' => 'MongoDB Atlas',
                'storageType' => 'NoSQL Database',
                'connectionStatus' => 'Connected',
                'documentCount' => $ordersCount + $addressesCount,
                'storageUsed' => "Orders: {$ordersCount} | Addresses: {$addressesCount}",
                'health' => 'Healthy',
            ];
        } catch (\Exception $e) {
            $inventory[] = [
                'dataType' => 'MongoDB Collections',
                'provider' => 'MongoDB Atlas',
                'storageType' => 'NoSQL Database',
                'connectionStatus' => 'Error',
                'documentCount' => 0,
                'storageUsed' => 'N/A',
                'health' => $e->getMessage(),
            ];
        }

        // 2. Cloudinary
        try {
            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
            ]);
            $usage = $cloudinary->adminApi()->usage();

            $inventory[] = [
                'dataType' => 'Product Images & Media Gallery',
                'provider' => 'Cloudinary Media Cloud',
                'storageType' => 'Object Storage',
                'connectionStatus' => 'Connected',
                'documentCount' => $usage['objects']['usage'] ?? 0,
                'storageUsed' => round(($usage['storage']['usage'] ?? 0) / (1024 * 1024), 2) . ' MB',
                'health' => 'Healthy (Plan: ' . ($usage['plan'] ?? 'Standard') . ')',
            ];
        } catch (\Exception $e) {
            $inventory[] = [
                'dataType' => 'Product Images & Media Gallery',
                'provider' => 'Cloudinary Media Cloud',
                'storageType' => 'Object Storage',
                'connectionStatus' => 'Error',
                'documentCount' => 'N/A',
                'storageUsed' => 'N/A',
                'health' => $e->getMessage(),
            ];
        }

        return [
            'success' => true,
            'timestamp' => now()->toISOString(),
            'providers' => $inventory,
        ];
    }
}
