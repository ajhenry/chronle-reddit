import { getRedisClient } from '../lib/redis-provider';
import type { User, UserPreferences } from '../../shared/types/api';
import { RedisKeys, serialize, deserialize } from '../../shared/types/redis';

const convertUser = (data: {
  id: string;
  reddit_id: string;
  handle: string;
  image_url: string | null;
  admin: boolean;
  created_at: string;
  updated_at: string;
}): User => {
  return {
    id: data.id,
    redditId: data.reddit_id,
    handle: data.handle,
    imageUrl: data.image_url,
    admin: data.admin,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

const convertToStorage = (user: User) => {
  return {
    id: user.id,
    reddit_id: user.redditId,
    handle: user.handle,
    image_url: user.imageUrl,
    admin: user.admin,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
};

export const getUserByRedditHandle = async (redditHandle: string): Promise<User> => {
  try {
    const redis = await getRedisClient();

    // Get userId from handle index
    const userId = await redis.get(RedisKeys.user.byHandle(redditHandle));
    if (!userId) {
      throw new Error('User not found');
    }

    // Get user data by ID
    const userData = await redis.get(RedisKeys.user.byId(userId));
    if (!userData) {
      throw new Error('User not found');
    }

    const data = deserialize<ReturnType<typeof convertToStorage>>(userData);
    if (!data) {
      throw new Error('Failed to deserialize user data');
    }

    const user = convertUser(data);

    // Always ensure ajhenrydev is an admin
    if (user.handle === 'ajhenrydev' && !user.admin) {
      user.admin = true;
      // Update in Redis to persist the admin status
      const storageData = convertToStorage(user);
      await redis.set(RedisKeys.user.byId(userId), serialize(storageData));
      console.log('Updated ajhenrydev to admin status');
    }

    return user;
  } catch (error) {
    console.error('Failed to get user by reddit handle:', { error });
    throw error;
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const redis = await getRedisClient();

    // Get user data by ID
    const userData = await redis.get(RedisKeys.user.byId(userId));
    if (!userData) {
      return null;
    }

    const data = deserialize<ReturnType<typeof convertToStorage>>(userData);
    if (!data) {
      return null;
    }

    return convertUser(data);
  } catch (error) {
    console.error('Failed to get user by id:', { error });
    return null;
  }
};

export const createUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'admin'>
): Promise<User> => {
  try {
    const redis = await getRedisClient();
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Always set ajhenrydev as admin
    const isAdmin = userData.handle === 'ajhenrydev';

    const user: User = {
      id: userId,
      redditId: userData.redditId,
      handle: userData.handle,
      imageUrl: userData.imageUrl,
      admin: isAdmin,
      createdAt: now,
      updatedAt: now,
    };

    const storageData = convertToStorage(user);

    // Store user data
    await redis.set(RedisKeys.user.byId(userId), serialize(storageData));

    // Store handle index
    await redis.set(RedisKeys.user.byHandle(userData.handle), userId);

    console.log('Created user:', { userId, handle: userData.handle });

    return user;
  } catch (error) {
    console.error('Failed to create user:', { error });
    throw error;
  }
};

export const getOrCreateUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'admin'>
): Promise<User> => {
  console.log('getOrCreateUser', { userData });
  try {
    const user = await getUserByRedditHandle(userData.handle);
    return user;
  } catch (error) {
    console.error('Failed to get user:', { error });
    return createUser(userData);
  }
};

export const updateUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'admin'>
): Promise<User> => {
  try {
    const redis = await getRedisClient();

    // Get existing user to preserve id, createdAt, and admin status
    const existingUser = await getUserByRedditHandle(userData.handle);

    // Always set ajhenrydev as admin
    const isAdmin = userData.handle === 'ajhenrydev' ? true : existingUser.admin;

    const updatedUser: User = {
      ...existingUser,
      handle: userData.handle,
      imageUrl: userData.imageUrl,
      admin: isAdmin,
      updatedAt: new Date().toISOString(),
    };

    const storageData = convertToStorage(updatedUser);

    // Update user data
    await redis.set(RedisKeys.user.byId(existingUser.id), serialize(storageData));

    // Update handle index if handle changed
    if (existingUser.handle !== userData.handle) {
      await redis.del(RedisKeys.user.byHandle(existingUser.handle));
      await redis.set(RedisKeys.user.byHandle(userData.handle), existingUser.id);
    }

    console.log('Updated user:', { userId: existingUser.id, handle: userData.handle });

    return updatedUser;
  } catch (error) {
    console.error('Failed to update user:', { error });
    throw error;
  }
};

export const createOrUpdateUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'admin'>
): Promise<User> => {
  try {
    const user = await getUserByRedditHandle(userData.handle);
    if (user) {
      return updateUser(userData);
    }
    return createUser(userData);
  } catch (error) {
    return createUser(userData);
  }
};

// Default preferences for new users
const DEFAULT_PREFERENCES: UserPreferences = {
  tutorialCompleted: false,
};

/**
 * Get user preferences by user ID
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  try {
    const redis = await getRedisClient();
    const prefsData = await redis.get(RedisKeys.user.preferences(userId));

    if (!prefsData) {
      return DEFAULT_PREFERENCES;
    }

    const prefs = deserialize<UserPreferences>(prefsData);
    if (!prefs) {
      return DEFAULT_PREFERENCES;
    }

    return prefs;
  } catch (error) {
    console.error('Failed to get user preferences:', { error, userId });
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Update user preferences (partial update supported)
 */
export const updateUserPreferences = async (
  userId: string,
  updates: Partial<UserPreferences>
): Promise<UserPreferences> => {
  try {
    const redis = await getRedisClient();

    // Get existing preferences
    const existingPrefs = await getUserPreferences(userId);

    // Merge with updates
    const updatedPrefs: UserPreferences = {
      ...existingPrefs,
      ...updates,
    };

    // Save to Redis
    await redis.set(RedisKeys.user.preferences(userId), serialize(updatedPrefs));

    console.log('Updated user preferences:', { userId, updates });

    return updatedPrefs;
  } catch (error) {
    console.error('Failed to update user preferences:', { error, userId });
    throw error;
  }
};
