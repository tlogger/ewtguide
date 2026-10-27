import { TrekProgress, POI, Checkpoint } from '../types';

const PROGRESS_KEY = 'ewtguide_user_progress';
const USER_FACILITIES_KEY = 'ewtguide_user_facilities';

const defaultProgress: TrekProgress = {
  completedSections: [],
  checkpoints: {}
};

export const loadTrekProgress = (): TrekProgress => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : defaultProgress;
  } catch (e) {
    console.error('Failed to load trek progress:', e);
    return defaultProgress;
  }
};

export const saveTrekProgress = (progress: TrekProgress): void => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save trek progress:', e);
  }
};

export const toggleSectionCompletion = (sectionId: number): TrekProgress => {
  const current = loadTrekProgress();
  const exists = current.completedSections.includes(sectionId);
  const updatedSections = exists
    ? current.completedSections.filter(id => id !== sectionId)
    : [...current.completedSections, sectionId].sort((a, b) => a - b);

  const updatedProgress: TrekProgress = {
    ...current,
    completedSections: updatedSections
  };
  saveTrekProgress(updatedProgress);
  return updatedProgress;
};

export const addCheckpoint = (sectionId: number, checkpoint: Omit<Checkpoint, 'id' | 'timestamp'>): TrekProgress => {
  const current = loadTrekProgress();
  const list = current.checkpoints[sectionId] || [];
  const newCp: Checkpoint = {
    ...checkpoint,
    id: `cp_${Date.now()}`,
    timestamp: new Date().toISOString()
  };

  const updatedProgress: TrekProgress = {
    ...current,
    checkpoints: {
      ...current.checkpoints,
      [sectionId]: [...list, newCp]
    }
  };
  saveTrekProgress(updatedProgress);
  return updatedProgress;
};

export const removeCheckpoint = (sectionId: number, checkpointId: string): TrekProgress => {
  const current = loadTrekProgress();
  const list = current.checkpoints[sectionId] || [];
  const updatedProgress: TrekProgress = {
    ...current,
    checkpoints: {
      ...current.checkpoints,
      [sectionId]: list.filter(cp => cp.id !== checkpointId)
    }
  };
  saveTrekProgress(updatedProgress);
  return updatedProgress;
};

// User-added Facilities
export const loadUserFacilities = (sectionId: number): POI[] => {
  try {
    const raw = localStorage.getItem(`${USER_FACILITIES_KEY}_${sectionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load user facilities:', e);
    return [];
  }
};

export const addUserFacility = (sectionId: number, facility: POI): POI[] => {
  const current = loadUserFacilities(sectionId);
  const newFacility: POI = {
    ...facility,
    id: `user_fac_${Date.now()}`,
    is_official: false,
    created_at: new Date().toISOString()
  };
  const updated = [newFacility, ...current];
  try {
    localStorage.setItem(`${USER_FACILITIES_KEY}_${sectionId}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save user facility:', e);
  }
  return updated;
};
