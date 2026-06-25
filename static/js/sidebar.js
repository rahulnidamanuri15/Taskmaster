// Sidebar renderer. Pure function: takes a root element + counts, returns
// nothing. Side effects are confined to the supplied root.

// Maps priority string → the named CSS color used in the priority row of
// the details panel. Centralised so it can be reused without drift.
export const PRIORITY_COLOR = {
  high: '#A9332A',
  medium: '#C17B21',
  low: '#2E7D32',
};

// Default list dot class for lists not in the predefined map
const DEFAULT_LIST_DOT_CLASS = 'bg-prioMed';

// Inline SVG icons. Inlined (not <img>) so they inherit currentColor.
const ICON_INBOX = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true" class="w-5 h-5">
    <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>
  </svg>`;
const ICON_TODAY = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true" class="w-5 h-5">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`;
const ICON_STAR = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true" class="w-5 h-5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>`;

// Pretty current date string like "Sunday 21 June".
function currentDateLabel() {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday} ${day} ${month}`;
}

// Renders a single nav button. Returns an HTML string so callers can swap
// the active class by re-rendering the whole sidebar — cheap for 3 items.
function navItem({ view, label, icon, count, active }) {
  const activeClasses = active
    ? 'bg-white text-ink shadow-sm'
    : 'text-ink hover:bg-white/50';
  return `
    <button
      type="button"
      data-view="${view}"
      class="nav-item w-full flex items-center justify-between px-3 py-2 rounded-lg
             transition-colors duration-200 ${activeClasses}"
      aria-current="${active ? 'page' : 'false'}"
    >
      <span class="flex items-center gap-3">
        ${icon}
        <span class="text-sm font-medium">${label}</span>
      </span>
      <span class="text-xs text-muted">(${count})</span>
    </button>
  `;
}

// Renders a list item button for the Lists section
function listItem({ list, count, active }) {
  const activeClasses = active
    ? 'bg-white text-ink shadow-sm'
    : 'text-ink hover:bg-white/50';
  // Use predefined color for known list types, fallback to medium for custom lists
  const dotClass = {
    work: 'bg-prioHigh',
    personal: 'bg-prioMed',
    reading: 'bg-prioLow'
  }[list.id] || DEFAULT_LIST_DOT_CLASS;

  return `
    <li>
      <button
        type="button"
        data-view="list-${list.id}"
        class="nav-item w-full flex items-center justify-between px-3 py-2 rounded-lg
               hover:bg-white/50 transition-colors duration-200 ${activeClasses}"
        aria-current="${active ? 'page' : 'false'}"
      >
        <span class="flex items-center gap-3">
          <span class="priority-dot ${dotClass}"></span>
          <span class="text-sm font-medium">${list.name}</span>
        </span>
        <span class="text-xs text-muted">(${count})</span>
      </button>
    </li>
  `;
}

export function renderSidebar(root, { counts, activeView, onNavigate, user, onLogin, onLogout, lists = [] }) {
  root.innerHTML = `
    <!-- Logo + date -->
    <div>
      <h1 class="font-display text-2xl font-bold tracking-tight">Taskmaster</h1>
      <p class="text-sm text-muted mt-1">${currentDateLabel()}</p>
    </div>

    <!-- Primary nav -->
    <nav aria-label="Smart lists" class="flex flex-col gap-1">
      ${navItem({ view: 'inbox',     label: 'Inbox',     icon: ICON_INBOX, count: counts.inbox,     active: activeView === 'inbox' })}
      ${navItem({ view: 'today',     label: 'Today',     icon: ICON_TODAY, count: counts.today,     active: activeView === 'today' })}
      ${navItem({ view: 'important', label: 'Important', icon: ICON_STAR,  count: counts.important, active: activeView === 'important' })}
    </nav>

    <!-- Custom lists -->
    <div>
      <h2 class="text-xs font-semibold tracking-widest text-muted mb-3">LISTS</h2>
      <ul class="flex flex-col gap-1">
        ${lists.map(l => listItem({ list: l, count: counts.lists[l.id] ?? 0, active: activeView === `list-${l.id}` })).join('')}
      </ul>
    </div>

    <!-- User profile or login -->
    <div class="mt-auto pt-6 border-t border-border">
      ${user ? `
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center
                  text-sm font-semibold font-display" aria-hidden="true">
            ${user.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div>
            <p class="font-medium text-ink">${user.full_name || 'User'}</p>
            <p class="text-sm text-muted">${user.email || ''}</p>
          </div>
        </div>
        <button id="logout-button" class="mt-4 w-full text-left text-sm text-muted hover:text-ink transition-colors">
          Logout
        </button>
      ` : `
        <button id="login-button" class="w-full bg-ink text-white px-4 py-2 rounded-lg font-medium hover:bg-ink/85 transition-colors">
          Login
        </button>
      `}
    </div>
  `;

  // Wire nav clicks. We delegate via the parent so listeners stay correct
  // after future re-renders.
  root.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => onNavigate(btn.dataset.view));
  });

  // Wire profile/login/logout buttons
  if (user) {
    const logoutButton = root.querySelector('#logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', onLogout);
    }
  } else {
    const loginButton = root.querySelector('#login-button');
    if (loginButton) {
      loginButton.addEventListener('click', onLogin);
    }
  }
}