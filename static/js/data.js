// Mock data for the Taskmaster dashboard. Will be replaced by FastAPI
// fetch() calls in a later phase. Exporting as named exports so other
// modules can import without a bundler.

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

export const tasks = [
  {
    id: 1,
    title: 'Prepare quarterly board presentation',
    dueDate: '2026-06-24',
    tags: ['presentations', 'finance'],
    priority: 'high',
    listId: 'work',
    completed: false,
    description:
      'Draft the Q2 board deck covering revenue, hiring plan, and the new product roadmap. Keep it under 20 slides.',
    notes: 'Pre-read materials due Monday. Sarah owns the hiring slide.',
    activity: [
      { at: '2026-06-19 10:24', text: 'You created this task' },
      { at: '2026-06-20 14:02', text: 'You added a note' },
    ],
  },
  {
    id: 2,
    title: 'Review pull request #482 — auth refactor',
    dueDate: '2026-06-21',
    tags: ['code-review'],
    priority: 'medium',
    listId: 'work',
    completed: false,
    description: 'Look over the new token rotation logic and the migration script.',
    notes: '',
    activity: [{ at: '2026-06-21 09:00', text: 'You created this task' }],
  },
  {
    id: 3,
    title: 'Book flights to Lisbon',
    dueDate: '2026-06-28',
    tags: ['travel', 'admin'],
    priority: 'low',
    listId: 'personal',
    completed: false,
    description: 'Outbound Thursday morning, return Sunday evening. Try to keep it under €350.',
    notes: '',
    activity: [{ at: '2026-06-18 19:11', text: 'You created this task' }],
  },
  {
    id: 4,
    title: 'Read "Designing Data-Intensive Applications" Ch. 9',
    dueDate: '2026-06-22',
    tags: ['reading'],
    priority: 'low',
    listId: 'reading',
    completed: false,
    description: 'Focus on consistency and consensus. Take notes on the parts that map to our event store.',
    notes: '',
    activity: [{ at: '2026-06-15 08:30', text: 'You created this task' }],
  },
  {
    id: 5,
    title: 'Renew car insurance',
    dueDate: '2026-06-23',
    tags: ['admin'],
    priority: 'medium',
    listId: 'personal',
    completed: false,
    description: 'Compare quotes from at least two providers before renewing.',
    notes: 'Existing policy expires June 30.',
    activity: [{ at: '2026-06-17 12:00', text: 'You created this task' }],
  },
  {
    id: 6,
    title: 'Send welcome email to new hire',
    dueDate: '2026-06-21',
    tags: ['admin'],
    priority: 'high',
    listId: 'work',
    completed: true,
    description: 'Include laptop pickup details, the team org chart, and a calendar link for the first-week orientation.',
    notes: '',
    activity: [
      { at: '2026-06-20 09:15', text: 'You created this task' },
      { at: '2026-06-21 08:45', text: 'You completed this task' },
    ],
  },
  {
    id: 7,
    title: 'Order new office chair',
    dueDate: '2026-06-25',
    tags: ['admin', 'personal'],
    priority: 'low',
    listId: 'personal',
    completed: true,
    description: 'The Aeron is on sale this week.',
    notes: '',
    activity: [
      { at: '2026-06-16 18:00', text: 'You created this task' },
      { at: '2026-06-19 21:34', text: 'You completed this task' },
    ],
  },
  {
    id: 8,
    title: 'Finish reading "The Pragmatic Programmer"',
    dueDate: '2026-06-29',
    tags: ['reading'],
    priority: 'medium',
    listId: 'reading',
    completed: false,
    description: 'Chapters 6 and 7. Revisit the section on orthogonality.',
    notes: '',
    activity: [{ at: '2026-06-10 20:00', text: 'You created this task' }],
  },
];
