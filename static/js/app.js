// Application coordinator - manages state and connects components
import { lists, tasks as initialTasks, todayISO } from './data.js';
import { renderSidebar } from './sidebar.js';
import { renderTaskList } from './tasks.js';
import { renderDetails } from './details.js';
import { PRIORITY_COLOR } from './sidebar.js';

// Application state
let state = {
  // Views configuration
  views: {
    inbox: { name: 'Inbox', icon: null }, // Icon will be imported if needed
    today: { name: 'Today', icon: null },
    important: { name: 'Important', icon: null },
    // List views will be dynamically added based on data.lists
  },
  activeView: 'inbox', // Currently active view
  tasks: [...initialTasks], // Working copy of tasks (will be mutated)
  selectedTaskId: null, // Currently selected task for details panel
  user: null, // Logged-in user data
};

// DOM elements
const sidebarEl = document.getElementById('sidebar');
const taskListEl = document.getElementById('task-list-panel');
const detailsEl = document.getElementById('task-details-panel');
const newTaskDialog = document.getElementById('new-task-dialog');
const cancelNewTaskBtn = document.getElementById('cancel-new-task');
const newTaskForm = document.getElementById('new-task-form');

// Initialize list views in state
lists.forEach(list => {
  state.views[`list-${list.id}`] = {
    name: list.name,
    icon: null // We could import icons if needed, but sidebar renders them internally
  };
});

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
    return tasks.filter(task => task.priority === 'high');
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
    const list = lists.find(l => l.id === listId);
    return list ? list.name : 'Unknown List';
  }

  return state.activeView; // Fallback
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

function handleTaskSelect(id) {
  state.selectedTaskId = id;
  render();
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
  }
  render();
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

function handleSubmitNewTask(e) {
  e.preventDefault();

  // Get form data
  const formData = new FormData(newTaskForm);
  const title = formData.get('title').trim();
  const dueDate = formData.get('dueDate') || null;
  const priority = formData.get('priority') || 'medium';
  const tagsInput = formData.get('tags').trim();
  const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  // Validate
  if (!title) {
    alert('Please enter a task title');
    return;
  }

  // Create new task
  const newTask = {
    id: Date.now(), // Simple ID generation (not ideal but works for demo)
    title,
    dueDate: dueDate || undefined, // Convert empty string to undefined
    tags,
    priority,
    listId: 'work', // Default to work list - could be made configurable
    completed: false,
    description: '', // Could be added to form if needed
    notes: '', // Could be added to form if needed
    activity: [{
      at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      text: 'You created this task'
    }]
  };

  // Add to tasks
  state.tasks.push(newTask);

  // Close dialog and reset form
  newTaskDialog.close();
  newTaskForm.reset();

  // Re-render to show new task
  render();
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
  checkAuthStatus().then(() => {
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
    important: state.tasks.filter(task => task.priority === 'high').length,
    lists: Object.fromEntries(
      lists.map(list => [
        list.id,
        state.tasks.filter(task => task.listId === list.id).length
      ])
    )
  };

  // Render sidebar
  renderSidebar(sidebarEl, {
    counts,
    activeView: state.activeView,
    onNavigate: handleNavigate,
    user: state.user,
    onLogin: handleLogin,
    onLogout: handleLogout
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
    onNewTask: handleNewTask
  });

  // Render details panel
  const selectedTask = state.tasks.find(task => task.id === state.selectedTaskId);
  renderDetails(detailsEl, { task: selectedTask });
}

// Start the application when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export state for debugging purposes (optional)
window.__TASKMASTER_STATE__ = state;