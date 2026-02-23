// 1. Configuration
const SUPABASE_URL = 'https://iknjbvzjmsjpygaydaxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_chD1haXweyg1UwDwtSgOSw_XcXuyFZy'; 

// Initialisation du client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Sélection des éléments HTML (avec vérification pour éviter les erreurs)
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const logoutBtn = document.getElementById('logout-btn');

// --- FONCTIONS AUTHENTIFICATION ---

// Inscription classique
async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) alert("Erreur : " + error.message);
    else alert("Inscription réussie !");
}

// Connexion classique
async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Erreur : " + error.message);
    else window.location.href = 'dashboard.html';
}

// --- NOUVEAU : AUTHENTIFICATION SOCIALE ---

async function signInWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard.html' }
    });
    if (error) alert("Erreur Google : " + error.message);
}

async function signInWithFacebook() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: window.location.origin + '/dashboard.html' }
    });
    if (error) alert("Erreur Facebook : " + error.message);
}

// Déconnexion
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
}

// --- GESTION DES TÂCHES ---

async function fetchTasks() {
    // Si on n'est pas sur le dashboard (taskList n'existe pas), on s'arrête
    if (!taskList) return;

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.log("Utilisateur non connecté");
        return;
    }

    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erreur de récupération:", error.message);
    } else {
        taskList.innerHTML = ''; 
        data.forEach(task => displayTask(task));
    }
}

function displayTask(task) {
    if (!taskList) return;
    const li = document.createElement('li');
    li.classList.add('task-item');
    li.innerHTML = `
        <input type="checkbox" ${task.is_completed ? 'checked' : ''} onchange="toggleTask(${task.id}, this.checked)">
        <span style="${task.is_completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</span>
        <div class="actions">
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

    const { data, error } = await supabaseClient
        .from('tasks')
        .insert([{ title: title, is_completed: false }])
        .select();

    if (error) alert("Erreur d'ajout : " + error.message);
    else {
        displayTask(data[0]);
        taskInput.value = '';
    }
}

async function deleteTask(id, button) {
    const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
    if (!error) button.closest('li').remove();
}

async function toggleTask(id, isCompleted) {
    await supabaseClient.from('tasks').update({ is_completed: isCompleted }).eq('id', id);
    fetchTasks(); 
}

async function editTask(id, oldTitle) {
    const newTitle = prompt("Modifier la tâche :", oldTitle);
    if (newTitle && newTitle.trim() !== "" && newTitle !== oldTitle) {
        const { error } = await supabaseClient
            .from('tasks')
            .update({ title: newTitle.trim() })
            .eq('id', id);
        
        if (error) alert("Erreur : " + error.message);
        else fetchTasks();
    }
}

// --- ÉCOUTEURS ---
if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
}

// Lancement automatique si on est sur la page des tâches
if (taskList) {
    fetchTasks();
}
