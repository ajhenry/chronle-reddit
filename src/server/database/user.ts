import { getRedisClient } from '../lib/redis-provider';
import type { User } from '../../shared/types/api';
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

    return convertUser(data);
  } catch (error) {
    console.error('Failed to get user by reddit handle:', { error });
    throw error;
  }
};

export const createUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'admin'>
): Promise<User> => {
  try {
    const redis = await getRedisClient();
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      redditId: userData.redditId,
      handle: userData.handle,
      imageUrl: userData.imageUrl,
      admin: false,
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

    const updatedUser: User = {
      ...existingUser,
      handle: userData.handle,
      imageUrl: userData.imageUrl,
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
