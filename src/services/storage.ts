import { TrekProgress, Checkpoint } from '../types';

const PROGRESS_KEY = 'ewtguide_user_progress';

const defaultProgress: TrekProgress = {
  completedSections: [],
  checkpoints: {},
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
    ? current.completedSections.filter((id) => id !== sectionId)
    : [...current.completedSections, sectionId].sort((a, b) => a - b);

  const updatedProgress: TrekProgress = {
    ...current,
    completedSections: updatedSections,
  };
  saveTrekProgress(updatedProgress);
  return updatedProgress;
};

export const addCheckpoint = (
  sectionId: number,
  checkpoint: Omit<Checkpoint, 'id' | 'timestamp'>
): TrekProgress => {
  const current = loadTrekProgress();
  const list = current.checkpoints[sectionId] || [];
  const newCp: Checkpoint = {
    ...checkpoint,
    id: `cp_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const updatedProgress: TrekProgress = {
    ...current,
    checkpoints: {
      ...current.checkpoints,
      [sectionId]: [...list, newCp],
    },
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
      [sectionId]: list.filter((cp) => cp.id !== checkpointId),
    },
  };
  saveTrekProgress(updatedProgress);
  return updatedProgress;
};
