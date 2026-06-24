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
        Click any task to view details, set priority, manage due dates.
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
        <div class="description-container relative">
          <div class="description-text text-sm leading-relaxed text-ink min-h-[3rem] ${task.isEditing ? 'hidden' : ''}"
               contenteditable="false">
            ${task.description || 'No description yet.'}
          </div>
          <textarea class="description-edit textarea w-full min-h-[3rem] text-sm leading-relaxed text-ink border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/30 ${!task.isEditing ? 'hidden' : ''}"
                    placeholder="Add a description...">${task.description || ''}</textarea>
          <button class="description-btn mt-2 px-4 py-1 bg-ink text-white text-sm font-medium text-sm font-medium rounded hover:bg-ink/85 transition-colors duration-200 ${!task.isEditing ? 'hidden' : ''}"
                  id="save-description-btn">
            Save
          </button>
          <button class="description-btn mt-2 px-4 py-1 bg-sidebar text-medium text-sm font-medium rounded hover:bg-sidebar/80 transition-colors duration-200 ${!task.isEditing ? 'hidden' : ''}"
                  id="cancel-description-btn">
            Cancel
          </button>
        </div>
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
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ description: newDescription })
        });

        if (!response.ok) {
          throw new Error(`Failed to update description: ${response.status}`);
        }

        const updatedTask = await response.json();

        // Find the task in state and update it
        // We need to access the app state - this will be done via a callback
        // For now, we'll trigger a custom event that app.js can listen for
        const updateEvent = new CustomEvent('taskDescriptionUpdated', {
          detail: {
            taskId: task.id,
            description: newDescription,
            updatedTask: {
              ...updatedTask,
              description: updatedTask.description || '',
              dueDate: updatedTask.due_date ? new Date(updatedTask.due_date).toISOString().slice(0, 10) : null,
              priority: updatedTask.priority,
              listId: String(updatedTask.list_id),
              completed: updatedTask.status === 'completed'
            }
          }
        });
        root.dispatchEvent(updateEvent);

      } catch (error) {
        console.error('Error updating description:', error);
        alert('Failed to update description. Please try again.');
      }
    });

    // Cancel button handler
    cancelBtn.addEventListener('click', () => {
      // Trigger event to cancel editing
      const cancelEvent = new CustomEvent('taskEditCancelled', {
        detail: { taskId: task.id }
      });
      root.dispatchEvent(cancelEvent);
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
      const editEvent = new CustomEvent('taskEditRequested', {
        detail: { taskId: task.id }
      });
      root.dispatchEvent(editEvent);
    });
  }
}
