export const INITIAL_STATS = {
  accepted: 1248,
  rejected: 56,
  currentBatch: 12,
};

export const INITIAL_HISTORY = [
  { id: 1, time: 'May 18, 2024 10:24:36 AM', fruit: 'Apple', prediction: 'Fresh', confidence: '98.45%', action: 'Accepted', response: 'Placed in Accept Bin' },
  { id: 2, time: 'May 18, 2024 10:24:26 AM', fruit: 'Banana', prediction: 'Fresh', confidence: '97.12%', action: 'Accepted', response: 'Placed in Accept Bin' },
  { id: 3, time: 'May 18, 2024 10:24:21 AM', fruit: 'Orange', prediction: 'Rotten', confidence: '93.67%', action: 'Rejected', response: 'Placed in Reject Bin' },
  { id: 4, time: 'May 18, 2024 10:24:15 AM', fruit: 'Apple', prediction: 'Fresh', confidence: '98.91%', action: 'Accepted', response: 'Placed in Accept Bin' },
  { id: 5, time: 'May 18, 2024 10:24:08 AM', fruit: 'Guava', prediction: 'Rotten', confidence: '92.34%', action: 'Rejected', response: 'Placed in Reject Bin' },
  { id: 6, time: 'May 18, 2024 10:24:01 AM', fruit: 'Apple', prediction: 'Fresh', confidence: '97.88%', action: 'Accepted', response: 'Placed in Accept Bin' },
  { id: 7, time: 'May 18, 2024 10:23:56 AM', fruit: 'Banana', prediction: 'Fresh', confidence: '96.75%', action: 'Accepted', response: 'Placed in Accept Bin' },
  { id: 8, time: 'May 18, 2024 10:23:48 AM', fruit: 'Orange', prediction: 'Fresh', confidence: '95.43%', action: 'Accepted', response: 'Placed in Accept Bin' },
];

export const readStoredJson = (key, fallback, validator = () => true) => {
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) return fallback;
    const value = JSON.parse(rawValue);
    return validator(value) ? value : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

export const writeStoredJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The UI must keep working if storage is unavailable or full.
  }
};

export const readStoredString = (key, fallback = null) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeStoredString = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The UI must keep working if storage is unavailable or full.
  }
};

export const isStats = (value) => value &&
  ['accepted', 'rejected', 'currentBatch'].every((key) => Number.isFinite(value[key]));

export const isHistory = (value) => Array.isArray(value);
