// Application coordinator - manages state and connects components
import { todayISO } from './data.js';
import { renderSidebar } from './sidebar.js';
import { renderTaskList } from './tasks.js';
import { renderDetails } from './details.js';
import { PRIORITY_COLOR } from './sidebar.js';

// Activity persistence helpers
const ACTIVITY_STORAGE_PREFIX = 'taskmaster-activity-';
function getStoredActivity(taskId) {
  try {
    const json = localStorage.getItem(ACTIVITY_STORAGE_PREFIX + taskId);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.warn('Failed to read activity from storage', e);
    return null;
  }
}
function setStoredActivity(taskId, activityArray) {
  try {
    localStorage.setItem(ACTIVITY_STORAGE_PREFIX + taskId, JSON.stringify(activityArray));
  } catch (e) {
    console.warn('Failed to store activity', e);
  }
}
function removeStoredActivity(taskId) {
  try {
    localStorage.removeItem(ACTIVITY_STORAGE_PREFIX + taskId);
  } catch (e) {}
}

// Application state
let state = {
  // Views configuration
  views: {
    inbox: { name: 'Inbox', icon: null }, // Icon will be imported if needed
    today: { name: 'Today', icon: null },
    important: { name: 'Important', icon: null },
    work: { name: 'Work', icon: null },
    personal: { name: 'Personal', icon: null },
    reading: { name: 'Reading List', icon: null },
    // List views will be dynamically added based on data.lists
  },
  activeView: 'inbox', // Currently active view
  tasks: [], // Will be populated after auth check - from API when logged in
  lists: [], // Will be populated from API when logged in
  selectedTaskId: null, // Currently selected task for details panel
  user: null, // Logged-in user data
  editingTaskId: null, // ID of task currently being edited (for description)
};

// DOM elements
const sidebarEl = document.getElementById('sidebar');
const taskListEl = document.getElementById('task-list-panel');
const detailsEl = document.getElementById('task-details-panel');
const newTaskDialog = document.getElementById('new-task-dialog');
const cancelNewTaskBtn = document.getElementById('cancel-new-task');
const newTaskForm = document.getElementById('new-task-form');

// Helper functions
function getFilteredTasks() {
  const { activeView, tasks } = state;

  if (activeView === 'inbox') {
    return tasks;
  }

  if (activeView === 'today') {
    const today = todayISO();
    return tasks.filter(task => task.dueDate === today);
  }

  if (activeView === 'important') {
    return tasks.filter(task => task.is_important);
  }

  // Handle priority-based filter views
  if (activeView === 'work') {
    return tasks.filter(task => task.priority === 'high');
  }

  if (activeView === 'personal') {
    return tasks.filter(task => task.priority === 'medium');
  }

  if (activeView === 'reading') {
    return tasks.filter(task => task.priority === 'low');
  }

  // Handle list views (e.g., 'list-work', 'list-personal', etc.)
  if (activeView.startsWith('list-')) {
    const listId = activeView.substring(5); // Remove 'list-' prefix
    return tasks.filter(task => task.listId === listId);
  }

  // Default fallback
  return tasks;
}

function getViewName() {
  // Return the display name for the active view
  if (state.views[state.activeView]) {
    return state.views[state.activeView].name;
  }

  // For list views, extract the list name
  if (state.activeView.startsWith('list-')) {
    const listId = state.activeView.substring(5);
    const list = state.lists.find(l => l.id === listId);
    return list ? list.name : 'Unknown List';
  }

  // Handle priority-based filter views
  switch (state.activeView) {
    case 'work':
      return 'Work';
    case 'personal':
      return 'Personal';
    case 'reading':
      return 'Reading List';
    default:
      return state.activeView; // Fallback
  }
}

function getRemainingCount() {
  return getFilteredTasks().filter(task => !task.completed).length;
}

function getOpenTasks() {
  return getFilteredTasks().filter(task => !task.completed);
}

function getCompletedTasks() {
  return getFilteredTasks().filter(task => task.completed);
}

// Event handlers
function handleNavigate(view) {
  state.activeView = view;
  state.selectedTaskId = null; // Clear selected task when changing views
  render();
}

async function handleTaskSelect(id) {
  // If we already have the task in state and it has tags, use it
  const existingTask = state.tasks.find(t => t.id === id);
  if (existingTask && Array.isArray(existingTask.tags) && existingTask.tags.length > 0) {
    state.selectedTaskId = id;
    render();
    return;
  }

  // Otherwise, fetch the full task details to ensure we have tags
  if (!state.user) {
    state.selectedTaskId = id;
    render();
    return;
  }

  try {
    const response = await fetch(`/tasks/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.status}`);
    }

    const taskData = await response.json();

    // Preserve existing activity if we already have this task in state
    const existingTask = state.tasks.find(t => t.id === id);
    const existingActivity = existingTask ? existingTask.activity : [];

    // Use activity from backend if provided (try common field names), otherwise keep existing activity, else default, else stored
    let activityFromBackend = [];
    if (taskData.activity && Array.isArray(taskData.activity)) {
      activityFromBackend = taskData.activity;
    } else if (taskData.activity_log && Array.isArray(taskData.activity_log)) {
      activityFromBackend = taskData.activity_log;
    } else if (taskData.activities && Array.isArray(taskData.activities)) {
      activityFromBackend = taskData.activities;
    }
    const storedActivity = getStoredActivity(id);
    const activityToUse = activityFromBackend.length > 0 ? activityFromBackend
      : (storedActivity && storedActivity.length > 0 ? storedActivity
        : (existingActivity.length > 0 ? existingActivity
          : [{
            at: new Date().toISOString().slice(0, 16).replace('T', ' '),
            text: 'Task loaded from database'
          }]));

    // Convert backend task to frontend task object
    const frontendTask = {
      id: taskData.id,
      title: taskData.title,
      description: taskData.description || '',
      dueDate: taskData.due_date ? new Date(taskData.due_date).toISOString().slice(0, 10) : null,
      tags: taskData.tags || [], // Extract tags from API response
      priority: taskData.priority,
      listId: String(taskData.list_id),
      completed: taskData.status === 'completed',
      is_important: taskData.is_important,
      notes: '',
      activity: activityToUse
    };

    // Update the task in state.tasks
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      state.tasks[taskIndex] = frontendTask;
    }

    state.selectedTaskId = id;
    render();
  } catch (error) {
    console.error('Error fetching task details:', error);
    // Fallback to existing task data if fetch fails
    state.selectedTaskId = id;
    render();
  }
}

function handleTaskToggle(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    // Update activity log
    const actionText = task.completed ? 'You completed this task' : 'You marked this task as incomplete';
    task.activity.push({
      at: new Date().toISOString().slice(0, 16).replace('T', ' '), // Format: YYYY-MM-DD HH:MM
      text: actionText
    });
    // Persist activity
    setStoredActivity(id, task.activity);
  }
  render();
}

function handleToggleImportant(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  const newImportant = !task.is_important;

  // Optimistically update the UI
  task.is_important = newImportant;
  // Update activity log
  const actionText = newImportant ? 'You marked this task as important' : 'You removed this task from important';
  task.activity.push({
    at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    text: actionText
  });

  render();

  // Send update to server
  if (state.user) {
    fetch(`/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ is_important: newImportant })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update task importance');
      }
      // Persist activity on success
      setStoredActivity(id, task.activity);
      // Optionally, we could update the task with the server's response, but we are optimistic
    })
    .catch(error => {
      console.error('Error updating task importance:', error);
      // Revert the optimistic update
      task.is_important = !newImportant;
      // Remove the last activity we added (the optimistic one)
      task.activity.pop();
      // Optionally add an error activity
      task.activity.push({
        at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        text: 'Failed to update importance. Please try again.'
      });
      // Persist after rollback
      setStoredActivity(id, task.activity);
      render();
    });
  }
}

function handleNewTask() {
  newTaskDialog.showModal();
  // Focus on the title input when dialog opens
  newTaskForm.title.focus();
}

function handleCancelNewTask() {
  newTaskDialog.close();
  newTaskForm.reset();
}

async function handleSubmitNewTask(e) {
  e.preventDefault();

  // Get form data
  const formData = new FormData(newTaskForm);
  const title = formData.get('title').trim();
  const description = formData.get('description').trim();
  const dueDate = formData.get('dueDate') || null;
  const priority = formData.get('priority') || 'medium';
  const tagsInput = formData.get('tags').trim();
  const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  // Validate
  if (!title) {
    alert('Please enter a task title');
    return;
  }

  // Validate due date is not before today
  if (dueDate && dueDate < todayISO()) {
    alert('Due date cannot be before today. Please select a valid date.');
    return;
  }

  // Check if user is logged in
  if (!state.user) {
    alert('Please log in to create a task');
    handleLogin(); // This redirects to login page
    return;
  }

  try {
    // Fetch user's lists to get a valid list_id
    const listsResponse = await fetch(`/users/${state.user.id}/lists/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!listsResponse.ok) {
      throw new Error('Failed to fetch user lists');
    }
    const lists = await listsResponse.json();

    // If user has no lists, create a default "Inbox" list
    let listId;
    if (lists.length === 0) {
      // Create a default list
      const createListResponse = await fetch(`/users/${state.user.id}/lists/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ name: 'Inbox' })
      });

      if (!createListResponse.ok) {
        throw new Error('Failed to create default list');
      }

      const createdList = await createListResponse.json();
      listId = createdList.id;

      // Add the new list to our local lists array for consistency
      lists.push(createdList);
    } else {
      // Use the first list's id
      listId = lists[0].id;
    }

    // Prepare task data for API
    const dueDateForAPI = dueDate || null;

    const taskData = {
      title: title,
      description: description,
      priority: priority, // already lowercase, matches enum
      status: 'pending', // default status
      due_date: dueDateForAPI, // Convert to ISO string in UTC to avoid timezone issues
      list_id: listId
    };

    const response = await fetch(`/users/${state.user.id}/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.status}`);
    }

    let createdTask = await response.json();

    // Handle tags if any were provided
    if (tags && tags.length > 0) {
      // For each tag, either find existing or create new, then attach to task
      for (const tagName of tags) {
        try {
          // First, try to find if this tag already exists for the user
          const tagsResponse = await fetch(`/users/${state.user.id}/tags/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });

          if (tagsResponse.ok) {
            const existingTags = await tagsResponse.json();
            let tag = existingTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

            if (!tag) {
              // Tag doesn't exist, create it
              const createTagResponse = await fetch(`/users/${state.user.id}/tags/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ name: tagName })
              });

              if (createTagResponse.ok) {
                tag = await createTagResponse.json();
              } else {
                console.warn(`Failed to create tag: ${tagName}`);
                continue;
              }
            }

            // Now attach the tag to the task
            await fetch(`/tasks/${createdTask.id}/tags/${tag.id}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
            });
          }
        } catch (tagError) {
          console.warn(`Error processing tag ${tagName}:`, tagError);
          // Continue with other tags even if one fails
        }
      }

      // After adding all tags, fetch the updated task to get the tags
      const updatedTaskResponse = await fetch(`/tasks/${createdTask.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (updatedTaskResponse.ok) {
        const updatedTask = await updatedTaskResponse.json();
        // Use the updated task which now includes the tags
        createdTask = updatedTask;
      }
    }

    // Convert backend task to frontend task object
    const frontendTask = {
      id: createdTask.id,
      title: createdTask.title,
      description: createdTask.description || '',
      dueDate: createdTask.due_date ? new Date(createdTask.due_date).toISOString().slice(0, 10) : null,
      tags: createdTask.tags || [], // Extract tags from API response
      priority: createdTask.priority,
      listId: String(createdTask.list_id), // Convert to string for consistency
      completed: createdTask.status === 'completed',
      is_important: createdTask.is_important,
      notes: '',
      activity: [{
        at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        text: 'You created this task'
      }]
    };

    // Add the converted task to state.tasks
    state.tasks.push(frontendTask);
    // Persist initial activity
    setStoredActivity(frontendTask.id, frontendTask.activity);

    // Close dialog and reset form
    newTaskDialog.close();
    newTaskForm.reset();

    // Re-render to show new task
    render();
  } catch (error) {
    console.error('Error creating task:', error);
    alert('Failed to create task. Please try again.');
  }
}

// Authentication handlers
async function checkAuthStatus() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    state.user = null;
    return false;
  }

  try {
    const response = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Unauthorized');
    }

    const userData = await response.json();
    state.user = {
      id: userData.id,
      full_name: userData.full_name,
      email: userData.email,
      is_active: userData.is_active
    };
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('access_token');
    state.user = null;
    return false;
  }
}

function handleLogin() {
  window.location.href = '/login';
}

async function handleLogout() {
  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Logout request failed:', error);
    // Continue to clear state and redirect even if request fails
  }

  try {
    // Clear localStorage
    localStorage.removeItem('access_token');
    // Update state
    state.user = null;
    // Redirect to home page
    window.location.href = '/';
  } catch (error) {
    console.error('Logout cleanup failed, attempting redirect anyway:', error);
    // Even if cleanup fails, try to redirect
    try {
      window.location.href = '/';
    } catch (e) {
      console.error('Logout redirect failed:', e);
      // Last resort - try to reload the page which might redirect based on state
      try {
        location.reload();
      } catch (e2) {
        console.error('Logout reload also failed:', e2);
      }
    }
  }
}

// Initialization
function init() {
  // Set up event listeners from components
  // Note: Components will call these functions directly as callbacks

  // Set up modal events
  cancelNewTaskBtn.addEventListener('click', handleCancelNewTask);
  newTaskForm.addEventListener('submit', handleSubmitNewTask);

  // Close dialog when clicking outside (optional, but good UX)
  newTaskDialog.addEventListener('click', e => {
    if (e.target === newTaskDialog) {
      handleCancelNewTask();
    }
  });

  // Check auth status and set user state
  checkAuthStatus().then(async () => {
    // Fetch user data if logged in
    if (state.user) {
      try {
        // Fetch user's lists
        const listsResponse = await fetch(`/users/${state.user.id}/lists/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (listsResponse.ok) {
          state.lists = await listsResponse.json();
        } else {
          console.warn('Failed to fetch lists');
          state.lists = [];
        }

        // Fetch user tasks
        const tasksResponse = await fetch(`/users/${state.user.id}/tasks/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (tasksResponse.ok) {
          const fetchedTasks = await tasksResponse.json();
          // Convert backend tasks to frontend format
          state.tasks = fetchedTasks.map(task => {
            const stored = getStoredActivity(task.id);
            const backendActivity = task.activity || task.activity_log || task.activities || [];
            const activityToUse = stored && stored.length > 0 ? stored
              : (Array.isArray(backendActivity) && backendActivity.length > 0 ? backendActivity
                : [{
                  at: new Date().toISOString().slice(0, 16).replace('T', ' '),
                  text: 'Task loaded from database'
                }]);
            return {
              id: task.id,
              title: task.title,
              description: task.description || '',
              dueDate: task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : null,
              tags: task.tags || [], // Extract tags from API response
              priority: task.priority,
              listId: String(task.list_id),
              completed: task.status === 'completed',
              is_important: task.is_important,
              notes: '',
              activity: activityToUse
            };
          });
        } else {
          console.warn('Failed to fetch tasks');
          state.tasks = []; // No fallback to mock data
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        state.tasks = []; // No fallback to mock data
        state.lists = [];
      }
    } else {
      // Not logged in, no data to show
      state.tasks = [];
      state.lists = [];
    }

    // Initialize list views in state (needs to happen after lists are set)
    state.lists.forEach(list => {
      state.views[`list-${list.id}`] = {
        name: list.name,
        icon: null // We could import icons if needed, but sidebar renders them internally
      };
    });

    // Initial render
    render();
  });
}

// Render function - updates all components based on current state
function render() {
  const filteredTasks = getFilteredTasks();

  // Get counts for sidebar
  const counts = {
    inbox: state.tasks.length,
    today: state.tasks.filter(task => task.dueDate === todayISO()).length,
    important: state.tasks.filter(task => task.is_important).length,
    lists: Object.fromEntries(
      state.lists.map(list => [
        list.id,
        state.tasks.filter(task => task.listId === list.id).length
      ])
    ),
    priority: {
      high: state.tasks.filter(task => task.priority === 'high').length,
      medium: state.tasks.filter(task => task.priority === 'medium').length,
      low: state.tasks.filter(task => task.priority === 'low').length
    }
  };

  // Render sidebar
  renderSidebar(sidebarEl, {
    counts,
    activeView: state.activeView,
    onNavigate: handleNavigate,
    user: state.user,
    onLogin: handleLogin,
    onLogout: handleLogout,
    lists: state.lists
  });

  // Render task list panel
  renderTaskList(taskListEl, {
    viewName: getViewName(),
    remainingCount: getRemainingCount(),
    openTasks: getOpenTasks(),
    completedTasks: getCompletedTasks(),
    selectedTaskId: state.selectedTaskId,
    onSelect: handleTaskSelect,
    onToggleComplete: handleTaskToggle,
    onToggleImportant: handleToggleImportant,
    onNewTask: handleNewTask
  });

  // Render details panel
  const selectedTask = state.tasks.find(task => task.id === state.selectedTaskId);
  const taskForDetails = selectedTask
    ? {
        ...selectedTask,
        isEditing: selectedTask && state.editingTaskId === selectedTask.id
      }
    : null;
  renderDetails(detailsEl, { task: taskForDetails });
}

// Start the application when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export state for debugging purposes (optional)
window.__TASKMASTER_STATE__ = state;

// Event listeners for description editing
detailsEl.addEventListener('taskEditRequested', (e) => {
  state.editingTaskId = e.detail.taskId;
  render();
});

detailsEl.addEventListener('taskEditCancelled', (e) => {
  state.editingTaskId = null;
  render();
});

detailsEl.addEventListener('taskDescriptionUpdated', (e) => {
  const { taskId, description, updatedTask } = e.detail;

  // Update the task in state.tasks
  const taskIndex = state.tasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    state.tasks[taskIndex] = {
      ...state.tasks[taskIndex],
      description: description
    };
  }

  // Clear editing state
  state.editingTaskId = null;

  // Re-render to show updated task
  render();
});

// New event listeners for task selection and deletion
detailsEl.addEventListener('taskUnselected', (e) => {
  state.selectedTaskId = null;
  render();
});

detailsEl.addEventListener('taskDeleteRequested', (e) => {
  const taskId = e.detail.taskId;
  // Remove task from state.tasks
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  if (state.selectedTaskId === taskId) {
    state.selectedTaskId = null;
  }
  // Remove stored activity
  removeStoredActivity(taskId);
  render();
});

// New: toggle completion via checkbox in details header
detailsEl.addEventListener('taskToggleRequested', (e) => {
  const taskId = e.detail.taskId;
  handleTaskToggle(taskId);
});