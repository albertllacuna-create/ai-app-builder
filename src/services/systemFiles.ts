import { Project } from '../types';

export const BULBIA_AUTH_FILE = `import React, { useState, useEffect } from 'react';
import { dbHelper } from './supabase';
import { Lock, Mail, Key, Loader2, ArrowRight } from 'lucide-react';

export function BulbiaAuth({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLogin, setIsLogin] = useState(true);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        dbHelper.auth.getUser().then(({ data: { user } }) => {
            setSession(user);
            setLoading(false);
        });

        const { data: { subscription } } = dbHelper.auth.onAuthStateChange((_event, session) => {
            setSession(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setError('');

        try {
            if (isLogin) {
                const { error } = await dbHelper.auth.signIn(email, password);
                if (error) throw error;
            } else {
                const { data, error } = await dbHelper.auth.signUp(email, password);
                if (error) throw error;
                // Auto-save user profile to 'users' collection for the Hub to see
                if (data.user) {
                    await dbHelper.save('users', { 
                        email: data.user.email,
                        created_at: new Date().toISOString(),
                        role: 'user'
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error de autenticación');
        } finally {
            setAuthLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (session) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="p-8">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                        <Lock className="text-blue-600" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    </h2>
                    <p className="text-slate-500 mb-8 text-sm">
                        {isLogin ? 'Bienvenido de nuevo a la aplicación.' : 'Regístrate para acceder al contenido privado.'}
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-all disabled:opacity-70 shadow-lg shadow-blue-600/20"
                        >
                            {authLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                            {isLogin ? 'Acceder al Proyecto' : 'Registrar Cuenta'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                        >
                            {isLogin ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}`;

export function getInjectedProjectFiles(project: Project, supabaseContent: string) {
    const files = { ...project.files };

    // 1. Inject the configured Supabase client
    files['/src/supabase.ts'] = supabaseContent;

    // 1b. Inject re-export aliases at common paths the AI might use
    const reExport = `export { dbHelper, supabase } from '../supabase';`;
    if (!files['/src/lib/supabase.ts']) files['/src/lib/supabase.ts'] = reExport;
    if (!files['/src/services/supabase.ts']) files['/src/services/supabase.ts'] = reExport;

    // 2. If the project requires login, automatically inject the runtime Auth Wrapper
    if (project.requireLogin) {
        files['/src/_bulbia_auth.tsx'] = BULBIA_AUTH_FILE;

        let indexContent = files['/src/index.tsx'] || '';

        // Safety check to ensure we don't wrap it twice if re-rendering
        if (indexContent && !indexContent.includes('BulbiaAuth')) {
            indexContent = `import { BulbiaAuth } from './_bulbia_auth';\n` + indexContent;

            // Reemplazamos <App /> con <BulbiaAuth><App /></BulbiaAuth>
            indexContent = indexContent.replace(/<App \/>/g, '<BulbiaAuth><App /></BulbiaAuth>');
            files['/src/index.tsx'] = indexContent;
        }
    }

    return files;
}

/**
 * Generates the supabase runtime content string for a given project.
 * Used by Preview.tsx to pass to the remote bundler.
 */
export function getSupabaseContent(projectId: string): string {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

    return `import { createClient } from '@supabase/supabase-js';
const PROJECT_ID = '${projectId}';
let supabase: any = null;
try {
    const supabaseUrl = '${supabaseUrl}';
    const supabaseAnonKey = '${supabaseAnonKey}';
    if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseUrl !== '') {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
} catch (e) { console.warn('Supabase no disponible, usando almacenamiento local.'); }
function localGet(collection: string) { try { return JSON.parse(localStorage.getItem('bulbia_' + PROJECT_ID + '_' + collection) || '[]'); } catch { return []; } }
function localSave(collection: string, data: any) { const key = 'bulbia_' + PROJECT_ID + '_' + collection; const existing = localGet(collection); const newItem = { ...data, _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) }; existing.push(newItem); localStorage.setItem(key, JSON.stringify(existing)); return newItem; }
function localDelete(collection: string, id: string) { const key = 'bulbia_' + PROJECT_ID + '_' + collection; const existing = localGet(collection); localStorage.setItem(key, JSON.stringify(existing.filter((i: any) => i._id !== id))); }
export { supabase };
export const dbHelper = {
    auth: {
        async signUp(email: string, password: string) { if (!supabase) { const users = localGet('__local_users'); if (users.find((u: any) => u.email === email)) return { data: null, error: { message: 'El usuario ya existe' } }; const newUser = { email, password, id: 'user_' + Date.now() }; localStorage.setItem('bulbia_' + PROJECT_ID + '___local_users', JSON.stringify([...users, newUser])); localStorage.setItem('bulbia_session_' + PROJECT_ID, JSON.stringify({ user: newUser })); return { data: { user: newUser }, error: null }; } return await supabase.auth.signUp({ email, password }); },
        async signIn(email: string, password: string) { if (!supabase) { const users = localGet('__local_users'); const user = users.find((u: any) => u.email === email && u.password === password); if (!user) return { data: null, error: { message: 'Credenciales incorrectas' } }; localStorage.setItem('bulbia_session_' + PROJECT_ID, JSON.stringify({ user })); return { data: { user }, error: null }; } return await supabase.auth.signInWithPassword({ email, password }); },
        async signOut() { if (!supabase) { localStorage.removeItem('bulbia_session_' + PROJECT_ID); window.location.reload(); return {}; } return await supabase.auth.signOut(); },
        async getUser() { if (!supabase) { try { const session = JSON.parse(localStorage.getItem('bulbia_session_' + PROJECT_ID) || 'null'); return { data: { user: session?.user || null } }; } catch { return { data: { user: null } }; } } return await supabase.auth.getUser(); },
        onAuthStateChange(callback: (event: any, session: any) => void) { if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }; return supabase.auth.onAuthStateChange(callback); }
    },
    async save(collectionName: string, data: any) { if (!supabase) return localSave(collectionName, data); return await supabase.from('app_collections').insert([{ project_id: PROJECT_ID, collection_name: collectionName, data }]); },
    async get(collectionName: string) { if (!supabase) return localGet(collectionName); const { data, error } = await supabase.from('app_collections').select('*').eq('project_id', PROJECT_ID).eq('collection_name', collectionName); if (error) throw error; return data.map((item: any) => ({ _id: item.id, ...item.data })); },
    async delete(id: string) { if (!supabase) { const keys = Object.keys(localStorage).filter(k => k.startsWith('bulbia_' + PROJECT_ID + '_')); keys.forEach(key => { const collection = key.replace('bulbia_' + PROJECT_ID + '_', ''); localDelete(collection, id); }); return; } return await supabase.from('app_collections').delete().eq('id', id); }
};`;
}
