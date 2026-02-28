const SUPABASE_URL = 'https://iknjbvzjmsjpygaydaxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_chD1haXweyg1UwDwtSgOSw_XcXuyFZy'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// CHARGEMENT PROFIL
async function loadUserProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        document.getElementById('user-name').innerText = user.user_metadata.full_name || user.email.split('@')[0];
        if (user.user_metadata.avatar_url) {
            const img = document.getElementById('user-avatar');
            img.src = user.user_metadata.avatar_url;
            img.style.display = "block";
        }
    }
}

// FETCH & DISPLAY
async function fetchTasks() {
    const { data, error } = await supabaseClient.from('tasks').select('*').order('created_at', { ascending: true });
    if (!error) {
        taskList.innerHTML = '';
        const parents = data.filter(t => !t.parent_id);
        const children = data.filter(t => t.parent_id);
        parents.forEach(p => {
            displayTask(p);
            children.filter(c => c.parent_id === p.id).forEach(s => displayTask(s, true));
        });
    }
}

function displayTask(task, isSubTask = false) {
    const li = document.createElement('li');
    li.className = `task-item ${task.is_completed ? 'completed' : ''}`;
    if (isSubTask) li.style.marginLeft = "40px";

    li.innerHTML = `
        <input type="checkbox" ${task.is_completed ? 'checked' : ''} onchange="toggleTask(${task.id}, this.checked)">
        <span>${task.title}</span>
        <div class="actions">
            ${!isSubTask ? `<button onclick="addSubTask(${task.id})">➕</button>` : ''}
            <button onclick="editTask(${task.id}, '${task.title.replace(/'/g, "\\'")}')">✏️</button>
            <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️</button>
        </div>
    `;
    taskList.appendChild(li);
}

// ACTIONS
async function addTask() {
    const title = taskInput.value.trim();
    if (!title) {
        taskInput.classList.add('error-shake');
        setTimeout(() => taskInput.classList.remove('error-shake'), 400);
        return;
    }
    const { data: { user } } = await supabaseClient.auth.getUser();
    await supabaseClient.from('tasks').insert([{ title, user_id: user.id, is_completed: false }]);
    taskInput.value = '';
    fetchTasks();
}

async function addSubTask(parentId) {
    const title = prompt("Sous-tâche :");
    if (title) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        await supabaseClient.from('tasks').insert([{ title, parent_id: parentId, user_id: user.id, is_completed: false }]);
        fetchTasks();
    }
}

async function toggleTask(id, isCompleted) {
    await supabaseClient.from('tasks').update({ is_completed: isCompleted }).eq('id', id);
    fetchTasks();
}

async function deleteTask(id) {
    if(confirm("Supprimer cette tâche ?")) {
        await supabaseClient.from('tasks').delete().eq('id', id);
        fetchTasks();
    }
}

async function editTask(id, oldTitle) {
    const newTitle = prompt("Modifier :", oldTitle);
    if (newTitle) {
        await supabaseClient.from('tasks').update({ title: newTitle }).eq('id', id);
        fetchTasks();
    }
}

// INITIALISATION
if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);
loadUserProfile();
fetchTasks();
