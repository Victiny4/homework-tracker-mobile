let client = null;

function isRemoteConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Wraps a promise so a stalled network request (e.g. blocked/filtered wifi that
// drops packets instead of refusing the connection) fails loudly instead of
// hanging forever with no feedback.
function withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        promise.then(
            (v) => { clearTimeout(timer); resolve(v); },
            (e) => { clearTimeout(timer); reject(e); },
        );
    });
}

function ensureSupabaseLoaded() {
    if (window.supabase) return Promise.resolve();
    return withTimeout(new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Could not load the Supabase client (check your internet connection)'));
        document.head.appendChild(s);
    }), 10000, 'Timed out loading the Supabase client — your network may be blocking cdn.jsdelivr.net');
}

async function getClient() {
    if (!isRemoteConfigured()) throw new Error('Add your Supabase URL + anon key to config.js first.');
    if (!client) {
        await ensureSupabaseLoaded();
        client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
}

function rowToAssignment(row) {
    return {
        id: `remote-${row.id}`,
        remoteId: row.id,
        title: row.title,
        subject: row.subject,
        due: new Date(row.due),
        estHours: row.est_hours,
        completed: row.completed,
        addedBy: row.added_by || null,
        source: 'remote',
    };
}

const REQUEST_TIMEOUT_MS = 12000;
const TIMEOUT_MESSAGE = 'Request timed out — check your internet connection';

async function fetchRemoteAssignments() {
    const c = await getClient();
    const { data, error } = await withTimeout(
        c.from('assignments').select('*').order('due', { ascending: true }),
        REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE,
    );
    if (error) throw new Error(error.message);
    return data.map(rowToAssignment);
}

async function insertRemoteAssignment(a) {
    const c = await getClient();
    const { error } = await withTimeout(
        c.from('assignments').insert({
            title: a.title,
            subject: a.subject,
            due: a.due.toISOString(),
            est_hours: a.estHours,
            completed: !!a.completed,
            added_by: a.addedBy || null,
        }),
        REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE,
    );
    if (error) throw new Error(error.message);
}

async function updateRemoteAssignment(remoteId, patch) {
    const c = await getClient();
    const { error } = await withTimeout(
        c.from('assignments').update(patch).eq('id', remoteId),
        REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE,
    );
    if (error) throw new Error(error.message);
}

async function deleteRemoteAssignment(remoteId) {
    const c = await getClient();
    const { error } = await withTimeout(
        c.from('assignments').delete().eq('id', remoteId),
        REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE,
    );
    if (error) throw new Error(error.message);
}

// Calls onChange whenever anyone (including this tab) adds/edits/removes a row.
async function subscribeRemote(onChange) {
    const c = await getClient();
    return c
        .channel('assignments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, onChange)
        .subscribe();
}
