let client = null;

function isRemoteConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function ensureSupabaseLoaded() {
    return new Promise((resolve, reject) => {
        if (window.supabase) return resolve();
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Could not load the Supabase client (check your internet connection)'));
        document.head.appendChild(s);
    });
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

async function fetchRemoteAssignments() {
    const c = await getClient();
    const { data, error } = await c.from('assignments').select('*').order('due', { ascending: true });
    if (error) throw new Error(error.message);
    return data.map(rowToAssignment);
}

async function insertRemoteAssignment(a) {
    const c = await getClient();
    const { error } = await c.from('assignments').insert({
        title: a.title,
        subject: a.subject,
        due: a.due.toISOString(),
        est_hours: a.estHours,
        completed: !!a.completed,
        added_by: a.addedBy || null,
    });
    if (error) throw new Error(error.message);
}

async function updateRemoteAssignment(remoteId, patch) {
    const c = await getClient();
    const { error } = await c.from('assignments').update(patch).eq('id', remoteId);
    if (error) throw new Error(error.message);
}

async function deleteRemoteAssignment(remoteId) {
    const c = await getClient();
    const { error } = await c.from('assignments').delete().eq('id', remoteId);
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
