import { User, Project, AppState, Message } from '../types';
import { supabase } from './supabase';

const DB_KEY = 'mayson_db';

class SupabaseDB {
    private state: AppState;
    private profileId: string | null = null;

    constructor() {
        // Load from localStorage as fast cache
        const saved = localStorage.getItem(DB_KEY);
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch {
                this.state = { user: null, projects: [] };
            }
        } else {
            this.state = { user: null, projects: [] };
        }
    }

    private saveLocal() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.state));
    }

    // =====================================================
    // SUPABASE SYNC (background, non-blocking)
    // =====================================================

    /**
     * Initialize the DB from Supabase. Called after auth is confirmed.
     * Loads user profile and projects from the cloud.
     */
    async initFromSupabase(authUser: { id: string; email: string }): Promise<void> {


        try {
            // 1. Get or create user profile
            let { data: profile } = await supabase
                .from('users_profile')
                .select('*')
                .eq('auth_id', authUser.id)
                .maybeSingle();

            if (!profile) {
                // First login: create profile
                const { data: newProfile, error } = await supabase
                    .from('users_profile')
                    .insert({
                        auth_id: authUser.id,
                        email: authUser.email,
                        plan: 'Free',
                        tokens: 5000
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Error creating profile:', error);
                    // Fall back to local
                    this.loginLocal(authUser.email);
                    return;
                }
                profile = newProfile;
            }

            this.profileId = profile.id;

            // Conservar el plan simulado localmente si Supabase todavía dice "Free" 
            // Esto evita que RLS bloquee la simulación antes de tener Webhooks reales
            const localUser = this.state.user;
            const hasSimulatedUpgrade = localUser && localUser.plan !== 'Free' && profile.plan === 'Free';

            this.state.user = {
                id: profile.id,
                email: profile.email,
                plan: hasSimulatedUpgrade ? localUser.plan : (profile.plan || 'Free'),
                tokens: hasSimulatedUpgrade ? localUser.tokens : (profile.tokens ?? 5000)
            };

            // 2. Load projects
            const { data: projects, error: projError } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', profile.id)
                .order('updated_at', { ascending: false });

            if (projError) {
                console.error('Error loading projects:', projError);
            } else if (projects) {
                this.state.projects = projects.map((p: any) => ({
                    id: p.id,
                    userId: p.user_id,
                    name: p.name,
                    description: p.description || undefined,
                    logoUrl: p.logo_url || undefined,
                    visibility: p.visibility || 'private',
                    requireLogin: p.require_login || false,
                    publishedUrl: p.published_url || undefined,
                    customDomain: p.custom_domain || undefined,
                    stripeConnected: p.stripe_connected || false,
                    stripePlans: p.stripe_plans || [],
                    type: p.type || 'Web App',
                    updatedAt: p.updated_at,
                    files: p.files || {},
                    messages: p.messages || [],
                    history: p.history || []
                }));
            }


            this.saveLocal();
        } catch (err) {
            console.error('Supabase init error, using local fallback:', err);
            this.loginLocal(authUser.email);
        }
    }

    /** Fallback: create local-only user */
    private loginLocal(email: string) {
        if (!this.state.user || this.state.user.email !== email) {
            this.state.user = {
                id: crypto.randomUUID(),
                email,
                plan: 'Free',
                tokens: 5000
            };
        }
        this.saveLocal();
    }

    /** Sync a single project to Supabase (fire and forget) */
    private syncProject(project: Project) {
        if (!this.profileId) return;

        supabase.from('projects').upsert({
            id: project.id,
            user_id: this.profileId,
            name: project.name,
            description: project.description || null,
            type: project.type,
            logo_url: project.logoUrl || null,
            visibility: project.visibility || 'private',
            require_login: project.requireLogin || false,
            published_url: project.publishedUrl || null,
            custom_domain: project.customDomain || null,
            stripe_connected: project.stripeConnected || false,
            stripe_plans: project.stripePlans || [],
            files: project.files,
            messages: project.messages,
            history: project.history || [],
            updated_at: project.updatedAt
        }).then(({ error }) => {
            if (error) console.error('Sync project error:', error);
        });
    }

    private async syncUser() {
        if (!this.profileId || !this.state.user) return;

        const { error } = await supabase.from('users_profile').update({
            plan: this.state.user.plan,
            tokens: this.state.user.tokens
        }).eq('id', this.profileId);
        
        if (error) console.error('Sync user error:', error);
    }

    // =====================================================
    // AUTH & USER (synchronous reads, async sync)
    // =====================================================

    /**
     * Called by ProjectDashboard after Supabase auth confirms session.
     * Triggers async Supabase load. Returns cached user immediately.
     */
    login(email: string): User {
        // Ensure we have a local user immediately for sync reads
        if (!this.state.user || this.state.user.email !== email) {
            this.state.user = {
                id: crypto.randomUUID(),
                email,
                plan: 'Free',
                tokens: 5000
            };
            this.saveLocal();
        }
        return this.state.user;
    }

    logout() {
        this.state.user = null;
        this.state.projects = [];
        this.profileId = null;

        this.saveLocal();
    }

    getUser(): User | null {
        return this.state.user;
    }

    async updateUser(updates: Partial<User>) {
        if (this.state.user) {
            this.state.user = { ...this.state.user, ...updates };
            this.saveLocal();
            await this.syncUser();
        }
    }

    consumeTokens(amount: number): boolean {
        if (!this.state.user) return false;
        if (this.state.user.tokens >= amount) {
            this.state.user.tokens -= amount;
            this.saveLocal();
            this.syncUser();
            return true;
        }
        return false;
    }

    // =====================================================
    // PROJECTS (synchronous reads, write-through cache)
    // =====================================================

    getProjects(): Project[] {
        if (!this.state.user) return [];
        return this.state.projects.filter(p => p.userId === this.state.user!.id);
    }

    getProject(id: string): Project | undefined {
        return this.state.projects.find(p => p.id === id);
    }

    createProject(name: string, type: string = 'Web App'): Project {
        if (!this.state.user) throw new Error('Not logged in');

        const project: Project = {
            id: crypto.randomUUID(),
            userId: this.state.user.id,
            name,
            type,
            updatedAt: new Date().toISOString(),
            files: {
                '/public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mayson App</title>
    <!-- Tailwind CSS CDN inyectado automáticamente -->
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
</body>
</html>`,
                '/src/index.tsx': `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
                '/src/styles.css': `/* Tailwind CSS ya maneja el reset base. Añade aquí css específico si Mayson lo necesita. */`,
                '/src/App.tsx': `export default function App() {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-8 text-neutral-100">
      <div className="bg-neutral-800/50 border border-neutral-700/50 p-10 rounded-3xl shadow-2xl max-w-xl text-center backdrop-blur-sm transform transition-all duration-500 hover:scale-[1.02]">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
          Asistente Mayson
        </h1>
        <p className="text-lg text-neutral-400 leading-relaxed max-w-md mx-auto">
          Dime qué te gustaría construir y empezaré a escribir el código para diseñar tu aplicación.
        </p>
      </div>
      <div className="absolute bottom-8 text-sm text-neutral-500 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Entorno de desarrollo listo
      </div>
    </div>
  );
}`
            },
            messages: [
                { role: 'ai', content: '¡Hola! Soy Mayson, tu asistente de desarrollo. Antes de empezar a construir, vamos a planificar tu aplicación.\n\n**¿Qué tipo de aplicación te gustaría crear?**\n\n<plan_options>\nSistema de Facturación\nCRM / Gestión de Clientes\nPortal o Dashboard\nE-commerce / Tienda Online\nGestión de Proyectos\nOtra (escríbela tú)\n</plan_options>' }
            ]
        };

        this.state.projects.push(project);
        this.saveLocal();
        this.syncProject(project);
        return project;
    }

    updateProjectFiles(id: string, files: Record<string, string>) {
        const project = this.getProject(id);
        if (project) {
            project.files = { ...project.files, ...files };
            project.updatedAt = new Date().toISOString();
            this.saveLocal();
            this.syncProject(project);
        }
    }

    updateProjectMessages(id: string, messages: Message[]) {
        const project = this.getProject(id);
        if (project) {
            project.messages = messages;
            project.updatedAt = new Date().toISOString();
            this.saveLocal();
            this.syncProject(project);
        }
    }

    updateProjectMetadata(id: string, metadata: Partial<Project>) {
        const project = this.getProject(id);
        if (project) {
            if (metadata.name !== undefined) project.name = metadata.name;
            if (metadata.description !== undefined) project.description = metadata.description;
            if (metadata.logoUrl !== undefined) project.logoUrl = metadata.logoUrl;
            if (metadata.visibility !== undefined) project.visibility = metadata.visibility;
            if (metadata.requireLogin !== undefined) project.requireLogin = metadata.requireLogin;
            if (metadata.publishedUrl !== undefined) project.publishedUrl = metadata.publishedUrl;
            if (metadata.customDomain !== undefined) project.customDomain = metadata.customDomain;
            if (metadata.stripeConnected !== undefined) project.stripeConnected = metadata.stripeConnected;
            if (metadata.stripePlans !== undefined) project.stripePlans = metadata.stripePlans;

            project.updatedAt = new Date().toISOString();
            this.saveLocal();
            this.syncProject(project);
        }
    }

    saveSnapshot(id: string) {
        const project = this.getProject(id);
        if (project) {
            if (!project.history) project.history = [];

            project.history.unshift({
                files: JSON.parse(JSON.stringify(project.files)),
                messages: JSON.parse(JSON.stringify(project.messages))
            });

            if (project.history.length > 3) {
                project.history = project.history.slice(0, 3);
            }

            this.saveLocal();
            this.syncProject(project);
        }
    }

    restoreSnapshot(id: string, steps: number = 1): boolean {
        const project = this.getProject(id);
        if (project && project.history && project.history.length >= steps) {
            for (let i = 0; i < steps - 1; i++) {
                project.history.shift();
            }

            const snapshot = project.history.shift();
            if (snapshot) {
                project.files = snapshot.files;
                project.messages = snapshot.messages;
                project.updatedAt = new Date().toISOString();
                this.saveLocal();
                this.syncProject(project);
                return true;
            }
        }
        return false;
    }

    deleteProject(id: string): boolean {
        const index = this.state.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.state.projects.splice(index, 1);
            this.saveLocal();

            // Delete from Supabase
            if (this.profileId) {
                supabase.from('projects').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('Delete project error:', error);
                });
            }

            return true;
        }
        return false;
    }

    cloneProject(id: string): Project | null {
        if (!this.state.user) return null;
        const project = this.getProject(id);
        if (!project) return null;

        const newProject: Project = {
            ...project,
            id: crypto.randomUUID(),
            name: `${project.name} (Copia)`,
            updatedAt: new Date().toISOString()
        };
        newProject.files = JSON.parse(JSON.stringify(project.files));
        newProject.messages = JSON.parse(JSON.stringify(project.messages));

        this.state.projects.push(newProject);
        this.saveLocal();
        this.syncProject(newProject);
        return newProject;
    }
}

export const db = new SupabaseDB();
