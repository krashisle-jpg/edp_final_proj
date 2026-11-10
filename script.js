// 1. DATA STATE & GLOBAL VARIABLES
// Load tasks from browser localStorage or default to empty array
let tasks = JSON.parse(localStorage.getItem('itp10_tasks')) || [];

// Filter & search tracking state variables
let currentFilter = 'all';
let currentSearchQuery = '';
let deleteTargetId = null; // Stores task ID selected for deletion


// 2. DOM ELEMENT REFERENCES

// Dashboard Display Elements
const taskListEl = document.getElementById('taskList');
const statTotalEl = document.getElementById('statTotal');
const statPendingEl = document.getElementById('statPending');
const statCompletedEl = document.getElementById('statCompleted');

// Modal & Form Elements
const taskModal = document.getElementById('taskModal');
const deleteModal = document.getElementById('deleteModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const formError = document.getElementById('formError');

// Input Field References
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitle');
const taskSubjectInput = document.getElementById('taskSubject');
const taskDescInput = document.getElementById('taskDesc');
const taskDeadlineInput = document.getElementById('taskDeadline');
const searchInput = document.getElementById('searchInput');


// 3. EVENT LISTENERS

// Event 1: Document Ready Initial Setup
window.addEventListener('DOMContentLoaded', () => {
    renderApp();
});

// Event 2: Click "Add Task" button (Control 1)
document.getElementById('openAddModalBtn').addEventListener('click', () => {
    openFormModal();
});

// Event 3: Click "Cancel" in Task Modal (Control 10)
document.getElementById('closeTaskModalBtn').addEventListener('click', () => {
    closeFormModal();
});

// Event 4: Submit Task Form (Control 9 - Validation & Save)
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTask();
});

// Event 5: Search Box Input Event (Control 3 - Dynamic search filter)
searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    renderTasks();
});

// Event 6: Filter Tab Clicks (Control 4 - Filter by All/Pending/Completed)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        renderTasks();
    });
});

// Event 7: Cancel Delete Dialog (Control 10)
document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    deleteModal.style.display = 'none';
    deleteTargetId = null;
});

// Event 8: Confirm Delete Dialog (Control 11)
document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (deleteTargetId !== null) {
        deleteTask(deleteTargetId);
    }
});


// 4. CORE APPLICATION FUNCTIONS
/**
 * Main render function that updates tasks list, statistics tiles, and localStorage.
 */

function renderApp() {
    renderTasks();
    updateStats();
    saveData();
}

/**
 * Renders filtered and searched tasks dynamically to the HTML DOM.
 */
function renderTasks() {
    // Filter tasks array according to current search query and active tab
    let filteredTasks = tasks.filter(task => {
        const matchesFilter = (currentFilter === 'all') || (task.status === currentFilter);
        const matchesSearch = task.title.toLowerCase().includes(currentSearchQuery) || 
                              (task.subject && task.subject.toLowerCase().includes(currentSearchQuery));
        return matchesFilter && matchesSearch;
    });

    // Render Empty State if no records match
    if (filteredTasks.length === 0) {
        taskListEl.innerHTML = `
            <div class="empty-state">
                No tasks found. Click "+ Add Task" to begin.
            </div>
        `;
        return;
    }

    // Build task item DOM markup
    taskListEl.innerHTML = filteredTasks.map(task => `
        <div class="task-item">
            <div class="task-info">
                <!-- Control 5: Complete Checkbox -->
                <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                       onchange="toggleTaskStatus(${task.id})">
                <div class="task-details">
                    <h5 style="${task.status === 'completed' ? 'text-decoration: line-through; color: #888;' : ''}">${escapeHtml(task.title)}</h5>
                    <p>${task.subject ? escapeHtml(task.subject) + ' • ' : ''}Due: ${formatDate(task.deadline)}</p>
                </div>
            </div>
            <div class="task-actions">
                <span class="badge ${task.status}">${task.status.toUpperCase()}</span>
                <!-- Control 6: Edit Button -->
                <button class="btn-sm" onclick="openFormModal(${task.id})">Edit</button>
                <!-- Control 7: Delete Button -->
                <button class="btn-sm" style="color: var(--danger-color);" onclick="promptDeleteTask(${task.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Updates Summary Tiles counts (Control 2).
 */
function updateStats() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const completed = tasks.filter(t => t.status === 'completed').length;

    statTotalEl.textContent = String(total).padStart(2, '0');
    statPendingEl.textContent = String(pending).padStart(2, '0');
    statCompletedEl.textContent = String(completed).padStart(2, '0');
}

/**
 * Opens Task Form Modal for Add or Edit mode.
 * @param {number|null} id - ID of the task to edit, or null for new task.
 */
function openFormModal(id = null) {
    formError.style.display = 'none';
    taskForm.reset();

    if (id !== null) {
        // Edit Task Mode
        modalTitle.textContent = "Edit Task";
        const task = tasks.find(t => t.id === id);
        if (task) {
            taskIdInput.value = task.id;
            taskTitleInput.value = task.title;
            taskSubjectInput.value = task.subject || '';
            taskDescInput.value = task.description || '';
            taskDeadlineInput.value = task.deadline;
        }
    } else {
        // Add Task Mode
        modalTitle.textContent = "Add Task";
        taskIdInput.value = '';
    }
    taskModal.style.display = 'flex';
}

/**
 * Closes the Add/Edit Task Form modal dialog.
 */
function closeFormModal() {
    taskModal.style.display = 'none';
}

/**
 * Validates fields and saves task entry (Control 9).
 */
function saveTask() {
    const id = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    const subject = taskSubjectInput.value.trim();
    const description = taskDescInput.value.trim();
    const deadline = taskDeadlineInput.value;

    // Validation: Require both Title and Deadline
    if (!title || !deadline) {
        formError.style.display = 'block';
        return;
    }

    if (id) {
        // Update Existing Task
        tasks = tasks.map(t => t.id == id ? { ...t, title, subject, description, deadline } : t);
    } else {
        // Add New Task Record
        const newTask = {
            id: Date.now(), // Generate unique ID
            title,
            subject,
            description,
            deadline,
            status: 'pending'
        };
        tasks.push(newTask);
    }

    closeFormModal();
    renderApp();
}

/**
 * Toggles status between 'pending' and 'completed' (Control 5).
 * @param {number} id - Task ID to toggle.
 */
function toggleTaskStatus(id) {
    tasks = tasks.map(t => {
        if (t.id === id) {
            t.status = t.status === 'pending' ? 'completed' : 'pending';
        }
        return t;
    });
    renderApp();
}

/**
 * Prompts the confirmation modal before deleting (Control 7).
 * @param {number} id - Task ID to delete.
 */
function promptDeleteTask(id) {
    deleteTargetId = id;
    deleteModal.style.display = 'flex';
}

/**
 * Deletes task record from array permanently (Control 11).
 * @param {number} id - Task ID to remove.
 */
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    deleteModal.style.display = 'none';
    deleteTargetId = null;
    renderApp();
}

/**
 * Persists data array into browser LocalStorage.
 */
function saveData() {
    localStorage.setItem('itp10_tasks', JSON.stringify(tasks));
}

// 5. HELPER UTILITY FUNCTIONS

/**
 * Formats ISO date string to readable format (e.g., MMM DD, YYYY).
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Escapes unsafe string input to prevent XSS vulnerability.
 */
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}