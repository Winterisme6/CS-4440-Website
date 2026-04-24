// database.js
// my part of the messaging app project - handles storing users/messages/groups
// using json files bc sqlite was kind of overkill and the prof said "keep it simple"

// TODO: maybe hash passwords later if we have time?? probably not lol

const fs = require('fs').promises;
const path = require('path');

// folder + files where everything gets saved
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');


// run this once when the server starts up so the files exist
// (otherwise readFile throws and its annoying)
async function init() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const files = [USERS_FILE, MESSAGES_FILE, GROUPS_FILE];
    for (let i = 0; i < files.length; i++) {
        try {
            await fs.access(files[i]);
        } catch (e) {
            // file doesnt exist yet, make an empty array
            await fs.writeFile(files[i], '[]');
        }
    }
}


// just little helpers so I don't repeat myself everywhere
async function readJSON(file) {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
}

async function writeJSON(file, data) {
    // the null, 2 is so the file is readable when i open it to debug
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}


// ===== USERS =====
// user object looks like: { username, password, createdAt }
//
// *** THIS IS CALLED FROM THE WORKER THREAD ***
// the socket server gets a "register" message from a client, then it passes
// the job to the worker thread (db_worker.js), and the worker calls this
async function registerUser(username, password) {
    const users = await readJSON(USERS_FILE);

    // check if username is taken first
    for (let u of users) {
        if (u.username === username) {
            return { success: false, error: 'Username already exists' };
        }
    }

    users.push({
        username: username,
        password: password,
        createdAt: Date.now()
    });
    await writeJSON(USERS_FILE, users);
    return { success: true };
}


// called from the worker thread too (same reason as above)
// checks if the username/password combo is right
async function loginUser(username, password) {
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return { success: false, error: 'Invalid credentials' };
    }
    return { success: true };
}


// list all users but strip the password off first (dont wanna leak it over the socket)
async function getAllUsers() {
    const users = await readJSON(USERS_FILE);
    return users.map(u => {
        return { username: u.username, createdAt: u.createdAt };
    });
}


// ===== MESSAGES (1 on 1) =====
// message object: { from, to, content, timestamp }

// called by the worker thread whenever someone sends a DM through the socket
async function saveMessage(message) {
    const messages = await readJSON(MESSAGES_FILE);
    messages.push(message);
    await writeJSON(MESSAGES_FILE, messages);
    return { success: true };
}


// get every message between 2 people (both directions)
// used when a client opens a chat and wants to see old messages
async function getHistory(user1, user2) {
    const messages = await readJSON(MESSAGES_FILE);

    const results = [];
    for (let m of messages) {
        // either direction counts
        if ((m.from === user1 && m.to === user2) ||
            (m.from === user2 && m.to === user1)) {
            results.push(m);
        }
    }
    return results;
}


// ===== GROUPS =====
// group object: { name, members: [usernames], messages: [...], createdAt }

async function createGroup(name, members) {
    const groups = await readJSON(GROUPS_FILE);

    // dont allow duplicate group names
    if (groups.find(g => g.name === name)) {
        return { success: false, error: 'Group already exists' };
    }

    groups.push({
        name: name,
        members: members,
        messages: [],
        createdAt: Date.now()
    });
    await writeJSON(GROUPS_FILE, groups);
    return { success: true };
}


// save a message to a group and return the member list
//
// *** IMPORTANT FOR THE SOCKET PART ***
// we return the members array so the socket server knows WHO to push
// the new message to (it loops through members and writes to each one's socket)
async function saveGroupMessage(message) {
    const groups = await readJSON(GROUPS_FILE);
    const group = groups.find(g => g.name === message.group);

    if (!group) {
        return { success: false, error: 'Group not found' };
    }

    group.messages.push(message);
    await writeJSON(GROUPS_FILE, groups);

    return { success: true, members: group.members };
}


// get a single group's info (members + message history)
async function getGroup(name) {
    const groups = await readJSON(GROUPS_FILE);
    const g = groups.find(g => g.name === name);
    if (!g) return null;
    return g;
}


// export everything the server and worker need
module.exports = {
    init,
    registerUser,
    loginUser,
    getAllUsers,
    saveMessage,
    getHistory,
    createGroup,
    saveGroupMessage,
    getGroup
};
