import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';
import { db } from '../services/db';
import { Project } from '../types';
import { getInjectedProjectFiles } from '../services/systemFiles';

export function Preview() {
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);

    useEffect(() => {
        if (!projectId) return;
        const p = db.getProject(projectId);
        if (p) {
            setProject(p);
        }
    }, [projectId]);

    if (!projectId) {
        return <Navigate to="/dashboard" replace />;
    }

    if (!project) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>Cargando previsualización...</div>;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Resilient supabase template: uses closure for projectId, localStorage fallback if Supabase fails
    const supabaseContent = `import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = '${project.id}';

let supabase: any = null;
try {
    const supabaseUrl = '${supabaseUrl || ''}';
    const supabaseAnonKey = '${supabaseAnonKey || ''}';
    if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseUrl !== '') {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
} catch (e) {
    console.warn('Supabase no disponible, usando almacenamiento local.');
}

// --- localStorage fallback ---
function localGet(collection: string) {
    try {
        const key = 'mayson_' + PROJECT_ID + '_' + collection;
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
}
function localSave(collection: string, data: any) {
    const key = 'mayson_' + PROJECT_ID + '_' + collection;
    const existing = localGet(collection);
    const newItem = { ...data, _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) };
    existing.push(newItem);
    localStorage.setItem(key, JSON.stringify(existing));
    return newItem;
}
function localDelete(collection: string, id: string) {
    const key = 'mayson_' + PROJECT_ID + '_' + collection;
    const existing = localGet(collection);
    const filtered = existing.filter((item: any) => item._id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
}

// --- Local Auth system ---
function localAuthLogin(email: string, pass: string) {
    const users = localGet('__local_users');
    const user = users.find((u: any) => u.email === email && u.pass === pass);
    if (!user) return { data: null, error: { message: 'Usuario o contraseña incorrectos' } };
    localStorage.setItem('mayson_session_' + PROJECT_ID, JSON.stringify({ user }));
    return { data: { user }, error: null };
}
function localAuthSignUp(email: string, pass: string) {
    const users = localGet('__local_users');
    if (users.find((u: any) => u.email === email)) return { data: null, error: { message: 'El usuario ya existe' } };
    const newUser = { email, pass, id: 'user_' + Date.now() };
    const list = [...users, newUser];
    localStorage.setItem('mayson_' + PROJECT_ID + '___local_users', JSON.stringify(list));
    localStorage.setItem('mayson_session_' + PROJECT_ID, JSON.stringify({ user: newUser }));
    return { data: { user: newUser }, error: null };
}

export { supabase };

export const dbHelper = {
    auth: {
        async signUp(email: string, password: string) {
            if (!supabase) return localAuthSignUp(email, password);
            return await supabase.auth.signUp({
                email, password,
                options: { data: { project_id: PROJECT_ID } }
            });
        },
        async signIn(email: string, password: string) {
            if (!supabase) return localAuthLogin(email, password);
            return await supabase.auth.signInWithPassword({ email, password });
        },
        async signOut() {
            if (!supabase) {
                localStorage.removeItem('mayson_session_' + PROJECT_ID);
                window.location.reload();
                return {};
            }
            return await supabase.auth.signOut();
        },
        async getUser() {
            if (!supabase) {
                try {
                    const session = JSON.parse(localStorage.getItem('mayson_session_' + PROJECT_ID) || 'null');
                    return { data: { user: session?.user || null } };
                } catch { return { data: { user: null } }; }
            }
            return await supabase.auth.getUser();
        },
        onAuthStateChange(callback: (event: any, session: any) => void) {
            if (!supabase) {
                // Return a dummy subscription
                return { data: { subscription: { unsubscribe: () => {} } } };
            }
            return supabase.auth.onAuthStateChange(callback);
        }
    },
    async save(collectionName: string, data: any) {
        if (!supabase) return localSave(collectionName, data);
        return await supabase.from('app_collections').insert([{
            project_id: PROJECT_ID,
            collection_name: collectionName,
            data
        }]);
    },
    async get(collectionName: string) {
        if (!supabase) return localGet(collectionName);
        const { data, error } = await supabase
            .from('app_collections')
            .select('*')
            .eq('project_id', PROJECT_ID)
            .eq('collection_name', collectionName);
        if (error) throw error;
        return data.map((item: any) => ({ _id: item.id, ...item.data }));
    },
    async delete(id: string) {
        if (!supabase) {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('mayson_' + PROJECT_ID + '_'));
            keys.forEach(key => {
                const collection = key.replace('mayson_' + PROJECT_ID + '_', '');
                localDelete(collection, id);
            });
            return;
        }
        return await supabase.from('app_collections').delete().eq('id', id).eq('project_id', PROJECT_ID);
    }
};`;

    const rawSandpackFiles = getInjectedProjectFiles(project, supabaseContent);

    // Dynamic Navigation Sync: Inject initialEntries into MemoryRouter
    const urlParams = new URLSearchParams(window.location.search);
    const targetRoute = urlParams.get('route') || '/';

    if (rawSandpackFiles['/src/App.tsx']) {
        let appCode = rawSandpackFiles['/src/App.tsx'];
        // Strip any existing initialEntries prop first
        appCode = appCode.replace(/\s*initialEntries=\{[^}]*\}/g, '');
        // Inject initialEntries - handles <MemoryRouter> and <MemoryRouter ...props>
        appCode = appCode.replace(
            /<MemoryRouter([^>]*?)>/g,
            `<MemoryRouter initialEntries={['${targetRoute}']}$1>`
        );
        rawSandpackFiles['/src/App.tsx'] = appCode;
    }

    // Hide system injected files from the user's Sandbox tree view
    const sandpackFiles: Record<string, any> = {};
    for (const [path, content] of Object.entries(rawSandpackFiles)) {
        sandpackFiles[path] = {
            code: content,
            hidden: path.includes('supabase.ts') || path.includes('_mayson_auth')
        };
    }

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <SandpackProvider
                template="react-ts"
                files={sandpackFiles}
                customSetup={{
                    entry: "/src/index.tsx",
                    dependencies: {
                        "lucide-react": "latest",
                        "@supabase/supabase-js": "^2.39.0",
                        "react-router-dom": "latest"
                    }
                }}
                theme="dark"
                options={{
                    activeFile: "/src/App.tsx",
                    visibleFiles: ["/src/App.tsx"],
                    externalResources: ["https://cdn.tailwindcss.com"]
                }}
            >
                <SandpackLayout style={{ width: '100%', height: '100%' }}>
                    <SandpackPreview
                        showNavigator={false}
                        showOpenInCodeSandbox={false}
                    />
                </SandpackLayout>
            </SandpackProvider>
        </div>
    );
}
