// Task list panel renderer. Renders the panel header, the active (open)
// tasks, and a collapsible Completed accordion at the bottom.

import { PRIORITY_COLOR } from './sidebar.js';

const PRIORITY_CLASS = {
  high:   'bg-prioHigh',
  medium: 'bg-prioMed',
  low:    'bg-prioLow',
};

// Formats "2026-06-24" → "24 Jun". Uses Intl so it respects locale.
function formatDueDate(iso) {
  if (!iso) return '';
  // Parse the YYYY-MM-DD string as a local date so we don't get timezone drift.
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function priorityDot(priority) {
  return `<span class="priority-dot ${PRIORITY_CLASS[priority] ?? 'bg-muted'}"
                 title="${priority} priority" aria-label="${priority} priority"></span>`;
}

// Single card. Roles: "button" so SR users hear it as interactive; we
// handle Enter/Space in the keyboard listener below.
function cardHtml(task, isSelected) {
  const selectedClasses = isSelected
    ? 'bg-white border-l-4 border-ink shadow-sm'
    : 'bg-white border-l-4 border-transparent hover:bg-sidebar';
  const checkedAttrs = task.completed ? 'checked' : '';

  return `
    <article
      role="button"
      tabindex="0"
      data-task-id="${task.id}"
      class="task-card group relative ${selectedClasses} border border-border
             rounded-xl p-4 transition-all duration-200 cursor-pointer"
      aria-pressed="${isSelected}"
    >
      <div class="flex items-start gap-3">
        <input
          type="checkbox"
          class="task-checkbox mt-1 w-4 h-4 rounded border-border text-ink
                 focus:ring-2 focus:ring-ink/30 cursor-pointer accent-ink"
          ${checkedAttrs}
          aria-label="Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            ${priorityDot(task.priority)}
            <h3 class="text-sm font-semibold leading-tight truncate
                       ${task.completed ? 'line-through text-muted' : 'text-ink'}">
              ${task.title}
            </h3>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            ${task.dueDate
              ? `<span class="text-xs text-muted">${formatDueDate(task.dueDate)}</span>`
              : ''}
            ${task.tags.map(t => `
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-sidebar
                           text-ink border border-border">${t}</span>
            `).join('')}
          </div>
        </div>
      </div>
    </article>
  `;
}

export function renderTaskList(root, {
  viewName,
  remainingCount,
  openTasks,
  completedTasks,
  selectedTaskId,
  onSelect,
  onToggleComplete,
  onNewTask,
}) {
  root.innerHTML = `
    <!-- Header -->
    <header class="flex items-center justify-between mb-6">
      <div>
        <h2 class="font-display text-3xl font-semibold">${viewName}</h2>
        <p class="text-sm text-muted mt-1">${remainingCount} tasks remaining</p>
      </div>
      <button
        type="button"
        id="new-task-btn"
        class="px-4 py-2 rounded-lg bg-ink text-white text-sm font-medium
               hover:bg-ink/85 transition-colors duration-200
               focus-visible:ring-2 focus-visible:ring-ink/30"
      >
        + New
      </button>
    </header>

    <!-- Open tasks -->
    <section aria-label="Open tasks" class="flex flex-col gap-3">
      ${openTasks.length === 0
        ? `<p class="text-sm text-muted italic">No tasks here. Enjoy the quiet.</p>`
        : openTasks.map(t => cardHtml(t, t.id === selectedTaskId)).join('')}
    </section>

    <!-- Completed accordion -->
    ${completedTasks.length > 0 ? `
      <details class="mt-8 group">
        <summary class="flex items-center justify-between py-2 text-sm font-medium
                        text-muted hover:text-ink transition-colors duration-200">
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
                 stroke-linejoin="round" aria-hidden="true"
                 class="w-4 h-4 transition-transform duration-200 group-open:rotate-90">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Completed (${completedTasks.length})
          </span>
        </summary>
        <div class="flex flex-col gap-3 mt-2 opacity-70">
          ${completedTasks.map(t => cardHtml(t, t.id === selectedTaskId)).join('')}
        </div>
      </details>
    ` : ''}
  `;

  // Event wiring
  root.querySelector('#new-task-btn').addEventListener('click', onNewTask);

  root.querySelectorAll('.task-card').forEach(card => {
    const id = Number(card.dataset.taskId);

    // Selecting a task — but only if the user didn't click the checkbox.
    card.addEventListener('click', (e) => {
      if (e.target.closest('.task-checkbox')) return;
      onSelect(id);
    });

    // Keyboard activation for accessibility.
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(id);
      }
    });

    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => onToggleComplete(id));
  });
}
