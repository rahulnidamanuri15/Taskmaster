// Details panel renderer. Two states: default empty state and selected
// task view.

import { PRIORITY_COLOR } from './sidebar.js';

function formatDueDate(iso) {
  if (!iso) return 'No due date';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function defaultState() {
  return `
    <div class="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
      <div class="w-16 h-16 rounded-full bg-white border border-border flex
                  items-center justify-center mb-6 text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true" class="w-8 h-8">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      </div>
      <h2 class="font-display text-2xl font-semibold mb-2">Select a task</h2>
      <p class="text-sm text-muted leading-relaxed">
        Click any task to view details, add notes, set priority, manage due dates.
      </p>
    </div>
  `;
}

function selectedState(task) {
  const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  return `
    <article class="max-w-2xl mx-auto">
      <!-- Title -->
      <header class="mb-6">
        <h2 class="font-display text-4xl font-semibold leading-tight">${task.title}</h2>
      </header>

      <!-- Meta grid: priority, due date -->
      <dl class="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
        <div>
          <dt class="text-xs uppercase tracking-widest text-muted mb-1">Priority</dt>
          <dd class="flex items-center gap-2 text-sm">
            <span class="priority-dot"
                  style="background-color: ${PRIORITY_COLOR[task.priority]}"></span>
            ${priorityLabel}
          </dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-widest text-muted mb-1">Due date</dt>
          <dd class="text-sm">${formatDueDate(task.dueDate)}</dd>
        </div>
      </dl>

      <!-- Description -->
      <section class="mb-8">
        <h3 class="text-xs uppercase tracking-widest text-muted mb-2">Description</h3>
        <p class="text-sm leading-relaxed text-ink">
          ${task.description || 'No description yet.'}
        </p>
      </section>

      <!-- Tags -->
      ${task.tags.length ? `
        <section class="mb-8">
          <h3 class="text-xs uppercase tracking-widest text-muted mb-2">Tags</h3>
          <div class="flex flex-wrap gap-2">
            ${task.tags.map(t => `
              <span class="text-xs px-3 py-1 rounded-full bg-sidebar
                           text-ink border border-border">${t}</span>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Notes -->
      <section class="mb-8">
        <h3 class="text-xs uppercase tracking-widest text-muted mb-2">Notes</h3>
        <div class="rounded-lg border border-border bg-white p-3 min-h-[5rem]">
          <p class="text-sm leading-relaxed text-ink whitespace-pre-wrap
                    ${task.notes ? '' : 'italic text-muted'}">
            ${task.notes || 'Add a note…'}
          </p>
        </div>
      </section>

      <!-- Activity -->
      <section>
        <h3 class="text-xs uppercase tracking-widest text-muted mb-3">Activity</h3>
        <ol class="relative border-l border-border pl-5 space-y-4">
          ${task.activity.map(a => `
            <li class="relative">
              <span class="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full
                           bg-white border-2 border-ink"></span>
              <p class="text-sm">${a.text}</p>
              <p class="text-xs text-muted mt-0.5">${a.at}</p>
            </li>
          `).join('')}
        </ol>
      </section>
    </article>
  `;
}

export function renderDetails(root, { task }) {
  root.innerHTML = task ? selectedState(task) : defaultState();
}
