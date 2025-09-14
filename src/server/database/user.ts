import { supabase } from '../../shared/supabase-server';
import type { User } from '../../shared/types/api';
import { Database } from '../../shared/types/supabase';

const convertUser = (data: Database['public']['Tables']['users']['Row']): User => {
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

export const getUserByRedditHandle = async (redditHandle: string): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('handle', redditHandle)
    .single();
  if (error) {
    console.error('Failed to get user by reddit handle:', { error });
    throw error;
  }
  return convertUser(data);
};

export const createUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'admin'>
): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      reddit_id: userData.redditId,
      handle: userData.handle,
      image_url: userData.imageUrl,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create user:', { error });
    throw error;
  }

  return convertUser(data);
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
  const { data, error } = await supabase
    .from('users')
    .update({
      handle: userData.handle,
      image_url: userData.imageUrl,
    })
    .eq('reddit_id', userData.redditId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update user:', { error });
    throw error;
  }
  return convertUser(data);
};

export const createOrUpdateUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'admin'>
): Promise<User> => {
  const user = await getUserByRedditHandle(userData.redditId);
  if (user) {
    return updateUser(userData);
  }
  return createUser(userData);
};
