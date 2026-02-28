// 1. Configuration
const SUPABASE_URL = 'https://iknjbvzjmsjpygaydaxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_chD1haXweyg1UwDwtSgOSw_XcXuyFZy'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const logoutBtn = document.getElementById('logout-btn');

// --- PROFIL ---
async function loadUserProfile() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (taskList && (error || !user)) {
        window.location.href = 'index.html';
        return;
    }
    if (user) {
        const nameElement = document.getElementById('user-name');
        const avatarElement = document.getElementById('user-avatar');
        if (nameElement) nameElement.innerText = user.user_metadata.full_name || user.email.split('@')[0];
        if (avatarElement && user.user_metadata.avatar_url) {
            avatarElement.src = user.user_metadata.avatar_url;
            avatarElement.style.display = "block";
        }
    }
}

// --- AUTHENTIFICATION ---
async function signInWithGoogle() {
    await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard.html' } });
}

async function signInWithFacebook() {
    await supabaseClient.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: window.location.origin + '/dashboard.html' } });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
}

// --- GESTION DES TÂCHES & SOUS-TÂCHES ---

async function fetchTasks() {
    if (!taskList) return;

    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true }); // Ascending pour garder l'ordre logique

    if (error) {
        console.error("Erreur:", error.message);
    } else {
        taskList.innerHTML = ''; 
        
        // On filtre les tâches principales (celles qui n'ont pas de parent)
        const parents = data.filter(t => !t.parent_id);
        const children = data.filter(t => t.parent_id);

        parents.forEach(parent => {
            displayTask(parent); // Affiche la tâche principale
            
            // Affiche ses enfants juste en dessous
            const subtasks = children.filter(child => child.parent_id === parent.id);
            subtasks.forEach(sub => displayTask(sub, true));
        });
    }
}

function displayTask(task, isSubTask = false) {
    if (!taskList) return;
    const li = document.createElement('li');
    li.classList.add('task-item');
    
    // Style visuel pour différencier les sous-tâches
    if (isSubTask) {
        li.style.marginLeft = "40px";
        li.style.borderLeft = "2px solid #4CAF50";
        li.style.backgroundColor = "#f9f9f9";
    }

    li.innerHTML = `
        <input type="checkbox" ${task.is_completed ? 'checked' : ''} onchange="toggleTask(${task.id}, this.checked)">
        <span style="${task.is_completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</span>
        <div class="actions">
            ${!isSubTask ? `<button onclick="addSubTask(${task.id})" style="background:none; border:none; cursor:pointer;">➕</button>` : ''}
            <button class="edit-btn" onclick="editTask(${task.id}, '${task.title.replace(/'/g, "\\'")}')">✏️</button>
            <button class="delete-btn" onclick="deleteTask(${task.id}, this)">🗑️</button>
        </div>
    `;
    taskList.appendChild(li);
}

async function addTask(event) {
    if (event) event.preventDefault(); 
    const title = taskInput.value.trim();
    if (!title) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
        .from('tasks')
        .insert([{ title: title, is_completed: false, user_id: user.id }])
        .select();

    if (error) alert("Erreur : " + error.message);
    else {
        taskInput.value = '';
        fetchTasks(); // On recharge pour bien placer la tâche
    }
}

async function addSubTask(parentId) {
    const title = prompt("Nom de la sous-tâche :");
    if (!title) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
        .from('tasks')
        .insert([{ 
            title: title, 
            is_completed: false, 
            user_id: user.id, 
            parent_id: parentId 
        }]);

    if (error) alert("Erreur : " + error.message);
    else fetchTasks();
}

async function deleteTask(id, button) {
    const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks(); // On recharge au cas où c'était un parent (pour supprimer les enfants visuellement)
}

async function toggleTask(id, isCompleted) {
    await supabaseClient.from('tasks').update({ is_completed: isCompleted }).eq('id', id);
    fetchTasks(); 
}

async function editTask(id, oldTitle) {
    const newTitle = prompt("Modifier :", oldTitle);
    if (newTitle && newTitle.trim() !== "") {
        await supabaseClient.from('tasks').update({ title: newTitle.trim() }).eq('id', id);
        fetchTasks();
    }
}

// --- ÉCOUTEURS ---
if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);

loadUserProfile();
if (taskList) fetchTasks();
