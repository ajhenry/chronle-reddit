/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../../shared/supabase-server';

export interface Season {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Converter function
const convertSeason = (season: any): Season => ({
  id: season.id,
  name: season.name,
  isActive: season.isActive,
  startDate: season.start_date,
  endDate: season.end_date,
  createdAt: season.created_at,
  updatedAt: season.updated_at,
});

// Season database operations
export async function getCurrentActiveSeason(): Promise<Season> {
  const { data: season, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error) {
    throw new Error(`Failed to get current season: ${error.message}`);
  }

  return convertSeason(season);
}

export async function getSeasonById(seasonId: string): Promise<Season> {
  const { data: season, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single();

  if (error) {
    throw new Error(`Failed to get season: ${error.message}`);
  }

  return convertSeason(season);
}

export async function getAllSeasons(): Promise<Season[]> {
  const { data: seasons, error } = await supabase
    .from('seasons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get seasons: ${error.message}`);
  }

  return seasons.map(convertSeason);
}

export async function createSeason(
  seasonData: Pick<Season, 'name' | 'startDate' | 'endDate'>
): Promise<Season> {
  const { data: season, error } = await supabase
    .from('seasons')
    .insert({
      name: seasonData.name,
      start_date: seasonData.startDate,
      end_date: seasonData.endDate || '',
      is_active: false, // New seasons start inactive
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create season: ${error.message}`);
  }

  return convertSeason(season);
}

export async function updateSeason(
  seasonId: string,
  updates: Partial<Pick<Season, 'name' | 'isActive' | 'startDate' | 'endDate'>>
): Promise<Season> {
  const updateData: any = {};

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.isActive !== undefined) {
    updateData.isActive = updates.isActive;
  }
  if (updates.startDate !== undefined) {
    updateData.start_date = updates.startDate;
  }
  if (updates.endDate !== undefined) {
    updateData.end_date = updates.endDate;
  }

  const { data: season, error } = await supabase
    .from('seasons')
    .update(updateData)
    .eq('id', seasonId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update season: ${error.message}`);
  }

  return convertSeason(season);
}

export async function setActiveSeason(seasonId: string): Promise<Season> {
  // First, deactivate all seasons
  const { error: deactivateError } = await supabase
    .from('seasons')
    .update({ is_active: false })
    .neq('id', ''); // Update all records

  if (deactivateError) {
    throw new Error(`Failed to deactivate seasons: ${deactivateError.message}`);
  }

  // Then activate the specified season
  return updateSeason(seasonId, { isActive: true });
}
