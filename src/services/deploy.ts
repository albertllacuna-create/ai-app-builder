import { Project } from '../types';
import { getInjectedProjectFiles } from './systemFiles';

const BOLBIA_HOSTING_URL = 'http://localhost:3001';

export const deployService = {
    async deployProject(project: Project): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            console.log('Desplegando proyecto:', project.name);
            
            // Re-inyectamos el cliente completo de Supabase para que viaje compaginado a producción
            // igual que viaja a Sandpack.
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const prodSupabaseContent = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '${supabaseUrl}';
const supabaseAnonKey = '${supabaseAnonKey}';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dbHelper = {
    projectId: '${project.id}',
    auth: {
        async signUp(email: string, password: string) {
            return await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { project_id: this.projectId }
                }
            });
        },
        async signIn(email: string, password: string) {
            return await supabase.auth.signInWithPassword({ email, password });
        },
        async signOut() {
            return await supabase.auth.signOut();
        },
        async getUser() {
            return await supabase.auth.getUser();
        },
        onAuthStateChange(callback: (event: any, session: any) => void) {
            return supabase.auth.onAuthStateChange(callback);
        }
    },
    async save(collectionName: string, data: any) {
        return await supabase.from('app_collections').insert([{ project_id: this.projectId, collection_name: collectionName, data }]);
    },
    async get(collectionName: string) {
        const { data, error } = await supabase.from('app_collections').select('*').eq('project_id', this.projectId).eq('collection_name', collectionName);
        if (error) throw error;
        return data.map((item: any) => ({ _id: item.id, ...item.data }));
    },
    async delete(id: string) {
        return await supabase.from('app_collections').delete().eq('id', id).eq('project_id', this.projectId);
    }
};`;

            const deployedFiles = getInjectedProjectFiles(project, prodSupabaseContent);

            const deploymentPayload = {
                projectId: project.id,
                files: deployedFiles,
                name: project.name,
                customDomain: project.customDomain
            };

            const response = await fetch(`${BOLBIA_HOSTING_URL}/api/deploy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deploymentPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor de despliegue');
            }

            const data = await response.json();
            return {
                success: true,
                url: data.url
            };
        } catch (error: any) {
            console.error('Deploy error:', error);
            return {
                success: false,
                error: error.message || 'Error de conexión con bolbia Hosting'
            };
        }
    }
};
