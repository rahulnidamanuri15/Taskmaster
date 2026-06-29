// Details panel renderer. Two states: default empty state and selected
// task view.

import { PRIORITY_COLOR } from './sidebar.js';

// Inline SVG icons
const ICON_DELETE = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true" class="w-5 h-5">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>`;

const ICON_CLOSE = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true" class="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;

function formatDueDate(iso) {
  if (!iso) return 'No due date';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d); // local time at midnight for the given date

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (
    date.getFullYear() === todayMidnight.getFullYear() &&
    date.getMonth() === todayMidnight.getMonth() &&
    date.getDate() === todayMidnight.getDate()
  ) {
    return 'Today';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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
        Click any task to view details, set priority, manage due dates.
      </p>
    </div>
  `;
}

function selectedState(task) {
  // Handle case where task.priority might be falsy
  const priorityValue = task.priority || 'none';
  const priorityLabel = priorityValue.charAt(0).toUpperCase() + priorityValue.slice(1);
  const priorityColor = PRIORITY_COLOR[priorityValue] || '#ccc'; // Default to gray if priority not found

  return `
    <header class="flex items-center justify-between px-6 pt-4 pb-2 border-b">
      <div class="flex items-center gap-2">
        <input type="checkbox" id="complete-checkbox" ${task.completed ? 'checked' : ''} />
        <span class="text-sm">Completed</span>
      </div>
      <div class="flex items-center gap-2">
        <button id="delete-btn" class="p-2 rounded-hover hover:bg-sidebar/80" aria-label="Delete task">
          ${ICON_DELETE}
        </button>
        <button id="close-btn" class="p-2 rounded-hover hover:bg-sidebar/80" aria-label="Close">
          ${ICON_CLOSE}
        </button>
      </div>
    </header>
    <article class="max-w-2xl mx-auto">
      <!-- Title -->
      <div class="border-b">
      <header class="mb-6 mt-5">
        <h2 class="font-display text-4xl font-semibold leading-tight">${task.title}</h2>
      </header>

      <!-- Meta grid: priority, due date -->
      <dl class="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
        <div>
          <dt class="text-xs uppercase tracking-widest text-muted mb-1">Priority</dt>
          <dd class="flex items-center gap-2 text-sm">
            <span class="priority-dot"
                  style="background-color: ${priorityColor}"></span>
            ${priorityLabel}
          </dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-widest text-muted mb-1">Due date</dt>
          <dd class="text-sm">${formatDueDate(task.dueDate)}</dd>
        </div>
      </dl>
      </div>

      <!-- Description -->
      <section class="mb-7 mt-7 border-b" >
        <h3 class="text-xs uppercase tracking-widest text-muted mb-2">Description</h3>
        <div class="description-container relative">
          <div class="description-text text-sm leading-relaxed text-ink min-h-[8rem] ${task.isEditing ? 'hidden' : ''}"
               contenteditable="false">
            ${task.description || 'No description yet.'}
          </div>
          <textarea class="description-edit textarea w-full min-h-[3rem] text-sm leading-relaxed text-ink border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/30 ${!task.isEditing ? 'hidden' : ''}"
                    placeholder="Add a description...">${task.description || ''}</textarea>
          <button class="description-btn mt-2 px-4 py-1 bg-ink text-white text-sm font-medium rounded hover:bg-ink/85 transition-colors duration-200 ${!task.isEditing ? 'hidden' : ''}"
                  id="save-description-btn">
            Save
          </button>
          <button class="description-btn mt-2 px-4 py-1 bg-sidebar text-medium text-sm font-medium rounded hover:bg-sidebar/80 transition-colors duration-200 ${!task.isEditing ? 'hidden' : ''}"
                  id="cancel-description-btn">
            Cancel
          </button>
        </div>
      </section>
      <!-- Tags Section -->
            <div class="mt-5 pb-4 mb-6 border-b">
              <h4 class="text-xs uppercase tracking-widest text-muted mb-3">Tags</h4>
              <div class="tag-container">
                ${task.tags && task.tags.length > 0 ? `
                  <div class="flex flex-wrap gap-2">
                    ${task.tags.map(tag => `
                      <span class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-sidebar/50 text-ink/80 border border-border/50">
                        ${tag.name}
                      </span>
                    `).join('')}
                  </div>
                ` : `
                  <p class="text-sm text-muted italic">None</p>
                `}
              </div>
            </div>

      <!-- Activity -->
      <section>
        <h3 class="text-xs uppercase tracking-widest text-muted mb-3">Activity</h3>
        <ol class="relative border-l border-border pl-5 space-y-4">
          ${task && task.activity ? task.activity.map(a => `
            <li class="relative">
              <span class="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full
                           bg-white border-2 border-ink"></span>
              <p class="text-sm">${a.text}</p>
              <p class="text-xs text-muted mt-0.5">${a.at}</p>
            </li>
          `).join('') : `
            <p class="text-sm text-muted italic">No activity recorded</p>
          `}
        </ol>
      </section>
    </article>
  `;
}

export function renderDetails(root, { task, onEditRequested, onEditCancelled, onDescriptionUpdated, onToggleRequested, onDeleteRequested, onTaskUnselected }) {
  root.innerHTML = task ? selectedState(task) : defaultState();

  // If we have a task and it's in editing mode, set up event listeners
  if (task && task.isEditing) {
    const descText = root.querySelector('.description-text');
    const descEdit = root.querySelector('.description-edit');
    const saveBtn = root.querySelector('#save-description-btn');
    const cancelBtn = root.querySelector('#cancel-description-btn');

    // Focus the textarea when entering edit mode
    descEdit.focus();
    // Select all text for easy replacement
    descEdit.select();

    // Save button handler
    saveBtn.addEventListener('click', async () => {
      const newDescription = descEdit.value.trim();

      try {
        // Call API to update task description
        const response = await fetch(`/tasks/${task.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ description: newDescription })
        });

        if (!response.ok) {
          throw new Error(`Failed to update description: ${response.status}`);
        }

        const updatedTask = await response.json();

        // Call the provided callback to update the task description
        if (onDescriptionUpdated) {
          onDescriptionUpdated({
            taskId: task.id,
            description: newDescription,
            updatedTask: {
              ...updatedTask,
              description: updatedTask.description || '',
              dueDate: updatedTask.due_date,
              priority: updatedTask.priority,
              listId: String(updatedTask.list_id),
              completed: updatedTask.status === 'completed'
            }
          });
        }
      } catch (error) {
        console.error('Error updating description:', error);
        alert('Failed to update description. Please try again.');
      }
    });

    // Cancel button handler
    cancelBtn.addEventListener('click', () => {
      // Call the provided callback to cancel editing
      if (onEditCancelled) {
        onEditCancelled({ taskId: task.id });
      }
    });

    // Handle Enter key (shift+enter for newline, enter alone to submit)
    descEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent newline
        saveBtn.click();
      }
    });

    // Handle Escape key to cancel
    descEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
  } else if (task && !task.isEditing) {
    // Make description clickable to enter edit mode
    const descContainer = root.querySelector('.description-container');
    const descText = root.querySelector('.description-text');

    descContainer.style.cursor = 'pointer';
    descContainer.title = 'Click to edit description';

    descContainer.addEventListener('click', () => {
      // Call the provided callback to request edit
      if (onEditRequested) {
        onEditRequested({ taskId: task.id });
      }
    });
  }

  // Checkbox toggle for completion (should work in both editing and non-editing states)
  if (task) {
    const checkbox = root.querySelector('#complete-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        // Call the provided callback to toggle task completion
        if (onToggleRequested) {
          onToggleRequested({ taskId: task.id });
        }
      });
    }
  }

  // Delete button handler
  const deleteBtn = root.querySelector('#delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
    if (!task) return;

    if (onDeleteRequested) {
        onDeleteRequested(task.id);
    }
});
  }

  // Close button handler (returns to empty state)
  const closeBtn = root.querySelector('#close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Call the provided callback to unselect task
      if (onTaskUnselected) {
        onTaskUnselected();
      }
    });
  }
}