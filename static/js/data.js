// Data utilities for the Taskmaster dashboard.
// Exports shared data and helper functions used throughout the frontend.

export const lists = [
  { id: 'work',     name: 'Work',         color: '#A9332A' },
  { id: 'personal', name: 'Personal',     color: '#C17B21' },
  { id: 'reading',  name: 'Reading List', color: '#2E7D32' },
];

// Date helpers: dates are stored as 'YYYY-MM-DD' so they sort cleanly.
// `todayISO()` is used to compute the "Today" filter and to give new tasks
// a sensible default.
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}