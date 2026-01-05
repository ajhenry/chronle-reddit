// Image upload handler for converting external URLs to Reddit URLs
// This uploads images from external sources to Reddit's media service

import { Router } from 'express';
import { media } from '@devvit/web/server';
import { getRedisClient } from '../lib/redis-provider';
import { sourceImageUrls } from '../../shared/data/events';

const router = Router();

// Redis key for storing uploaded image URLs
const UPLOADED_IMAGES_KEY = 'chronle:uploaded_images';

interface UploadedImage {
  eventId: string;
  sourceUrl: string;
  redditUrl: string;
  uploadedAt: string;
}

// Get image type from URL
function getImageType(url: string): 'image' | 'gif' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.gif')) {
    return 'gif';
  }
  return 'image';
}

// Upload a single image to Reddit
async function uploadImageToReddit(
  eventId: string,
  sourceUrl: string
): Promise<UploadedImage | null> {
  try {
    console.log(`[UPLOAD] Uploading image for ${eventId}: ${sourceUrl}`);

    const response = await media.upload({
      url: sourceUrl,
      type: getImageType(sourceUrl),
    });

    const uploaded: UploadedImage = {
      eventId,
      sourceUrl,
      redditUrl: response.mediaUrl,
      uploadedAt: new Date().toISOString(),
    };

    console.log(`[UPLOAD] Success: ${eventId} -> ${response.mediaUrl}`);
    return uploaded;
  } catch (error) {
    console.error(`[UPLOAD] Failed to upload ${eventId}:`, error);
    return null;
  }
}

// POST /api/admin/upload-images - Upload all event images to Reddit
router.post('/api/admin/upload-images', async (_req, res): Promise<void> => {
  try {
    const redis = await getRedisClient();
    const results: { success: UploadedImage[]; failed: string[] } = {
      success: [],
      failed: [],
    };

    // Get already uploaded images
    const existingData = await redis.get(UPLOADED_IMAGES_KEY);
    const existingImages: Record<string, UploadedImage> = existingData
      ? JSON.parse(existingData)
      : {};

    // Upload each image
    for (const [eventId, sourceUrl] of Object.entries(sourceImageUrls)) {
      // Skip if already uploaded
      if (existingImages[eventId]) {
        console.log(`[UPLOAD] Skipping ${eventId} - already uploaded`);
        results.success.push(existingImages[eventId]);
        continue;
      }

      const uploaded = await uploadImageToReddit(eventId, sourceUrl);

      if (uploaded) {
        existingImages[eventId] = uploaded;
        results.success.push(uploaded);
      } else {
        results.failed.push(eventId);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Save all uploaded images to Redis
    await redis.set(UPLOADED_IMAGES_KEY, JSON.stringify(existingImages));

    res.json({
      status: 'success',
      uploaded: results.success.length,
      failed: results.failed.length,
      results,
    });
  } catch (error) {
    console.error('[UPLOAD] Error uploading images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload images',
    });
  }
});

// GET /api/admin/uploaded-images - Get list of uploaded images
router.get('/api/admin/uploaded-images', async (_req, res): Promise<void> => {
  try {
    const redis = await getRedisClient();
    const data = await redis.get(UPLOADED_IMAGES_KEY);
    const images: Record<string, UploadedImage> = data ? JSON.parse(data) : {};

    res.json({
      status: 'success',
      count: Object.keys(images).length,
      images,
    });
  } catch (error) {
    console.error('[UPLOAD] Error getting uploaded images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get uploaded images',
    });
  }
});

// Helper function to get Reddit URL for an event
export async function getRedditImageUrl(eventId: string): Promise<string | null> {
  try {
    const redis = await getRedisClient();
    const data = await redis.get(UPLOADED_IMAGES_KEY);
    const images: Record<string, UploadedImage> = data ? JSON.parse(data) : {};

    return images[eventId]?.redditUrl ?? null;
  } catch (error) {
    console.error('[UPLOAD] Error getting image URL:', error);
    return null;
  }
}

// Helper function to get all Reddit URLs
export async function getAllRedditImageUrls(): Promise<Record<string, string>> {
  try {
    const redis = await getRedisClient();
    const data = await redis.get(UPLOADED_IMAGES_KEY);
    const images: Record<string, UploadedImage> = data ? JSON.parse(data) : {};

    return Object.fromEntries(
      Object.entries(images).map(([eventId, img]) => [eventId, img.redditUrl])
    );
  } catch (error) {
    console.error('[UPLOAD] Error getting all image URLs:', error);
    return {};
  }
}

export default router;

