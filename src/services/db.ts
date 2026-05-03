import { User, Project, AppState, Message } from '../types';
import { supabase } from './supabase';

const DB_KEY = 'bulbia_db';

class SupabaseDB {
    private state: AppState;
    private profileId: string | null = null;
    private initialized = false;

    constructor() {
        // Load from localStorage ONLY as a temporary fast-render cache
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

    private saveCache() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.state));
    }

    // =====================================================
    // SUPABASE CORE (The Source of Truth)
    // =====================================================

    async initFromSupabase(authUser: { id: string; email: string }): Promise<void> {
        try {
            // 1. Get user profile
            const { data: profile, error: profileErr } = await supabase
                .from('users_profile')
                .select('*')
                .eq('auth_id', authUser.id)
                .maybeSingle();

            if (profileErr) throw profileErr;

            if (!profile) {
                const { data: newProfile, error: createErr } = await supabase
                    .from('users_profile')
                    .insert({
                        auth_id: authUser.id,
                        email: authUser.email,
                        plan: 'Free',
                        tokens: 100
                    })
                    .select()
                    .single();

                if (createErr) throw createErr;
                this.profileId = newProfile.id;
                this.state.user = {
                    id: newProfile.id,
                    email: newProfile.email,
                    fullName: newProfile.full_name || '',
                    plan: newProfile.plan || 'Free',
                    tokens: newProfile.tokens ?? 100,
                    nextResetDate: newProfile.next_reset_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                };
            } else {
                this.profileId = profile.id;
                this.state.user = {
                    id: profile.id,
                    email: profile.email,
                    fullName: profile.full_name || '',
                    plan: profile.plan || 'Free',
                    tokens: profile.tokens ?? 100,
                    nextResetDate: profile.next_reset_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
                };
            }

            // 2. Load projects
            const { data: projects, error: projError } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', this.profileId)
                .order('updated_at', { ascending: false });

            if (projError) throw projError;

            if (projects) {
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
                    favorite: p.favorite || false,
                    files: p.files || {},
                    messages: p.messages || [],
                    history: p.history || []
                }));
            }

            this.initialized = true;
            this.saveCache();
        } catch (error) {
            console.error('[DB] Critical sync error:', error);
            // We don't fall back to local anymore. If cloud fails, app is effectively read-only/offline.
            throw error;
        }
    }

    private async syncProject(project: Project) {
        if (!this.profileId) throw new Error("No session found");

        const { error } = await supabase.from('projects').upsert({
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
            favorite: project.favorite || false,
            updated_at: project.updatedAt
        });

        if (error) {
            console.error('[DB] Error syncing project to cloud:', error);
            throw error;
        }
    }

    private async syncUser() {
        if (!this.profileId || !this.state.user) return;

        const { error } = await supabase.from('users_profile').update({
            plan: this.state.user.plan,
            tokens: this.state.user.tokens
        }).eq('id', this.profileId);
        
        if (error) {
            console.error('[DB] Error syncing user to cloud:', error);
            throw error;
        }
    }

    // =====================================================
    // AUTH & USER
    // =====================================================

    login(email: string): User {
        // Return cached user if exists, otherwise a placeholder until initFromSupabase finishes
        if (this.state.user && this.state.user.email === email) {
            return this.state.user;
        }
        return { id: 'pending', email, plan: 'Free', tokens: 0 };
    }

    logout() {
        this.state.user = null;
        this.state.projects = [];
        this.profileId = null;
        this.initialized = false;
        localStorage.removeItem(DB_KEY);
    }

    getUser(): User | null {
        return this.state.user;
    }

    async updateUser(updates: Partial<User>) {
        if (this.state.user) {
            this.state.user = { ...this.state.user, ...updates };
            await this.syncUser();
            this.saveCache();
        }
    }

    async consumeTokens(amount: number) {
        if (!this.state.user) return false;
        this.state.user.tokens = parseFloat((this.state.user.tokens - amount).toFixed(4));
        await this.syncUser();
        this.saveCache();
        return true;
    }

    async updateUserProfile(updates: Partial<User>): Promise<void> {
        if (!this.state.user || !this.profileId) return;

        // Map UI names to DB names if necessary
        const dbUpdates: any = {};
        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
        if (updates.tokens !== undefined) dbUpdates.tokens = updates.tokens;

        const { error } = await supabase
            .from('users_profile')
            .update(dbUpdates)
            .eq('id', this.profileId);

        if (error) throw error;

        this.state.user = { ...this.state.user, ...updates };
        this.saveCache();
    }

    async deleteAccount(): Promise<void> {
        if (!this.state.user || !this.profileId) return;
        
        // This is a simplified version - in a real app you'd want to use a server-side function
        // to handle complete deletion of all user data across all tables.
        const { error } = await supabase
            .from('users_profile')
            .delete()
            .eq('id', this.profileId);

        if (error) throw error;
        
        this.state.user = null;
        this.state.projects = [];
        this.saveCache();
    }

    // =====================================================
    // PROJECTS (Async write through)
    // =====================================================

    getProjects(): Project[] {
        if (!this.state.user) return [];
        return this.state.projects;
    }

    getProject(id: string): Project | undefined {
        return this.state.projects.find(p => p.id === id);
    }

    async createProject(name: string, type: string = 'Web App'): Promise<Project> {
        if (!this.state.user || !this.profileId) throw new Error('Debes iniciar sesión para crear proyectos en la nube.');

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
    <title>Bulbia App</title>
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
                '/src/styles.css': `/* Tailwind CSS base */`,
                '/src/App.tsx': `export default function App() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* Tu aplicación aparecerá aquí */}
    </div>
  );
}`
            },
            messages: []
        };

        // UI Optimistic update
        this.state.projects.unshift(project);
        
        // Cloud persistent update
        await this.syncProject(project);
        
        // Physical schema isolation
        const schemaName = 'schema_' + project.id.replace(/-/g, '_');
        await supabase.rpc('create_project_schema', { new_schema_name: schemaName });

        this.saveCache();
        return project;
    }

    async updateProjectFiles(id: string, files: Record<string, string>) {
        const project = this.getProject(id);
        if (project) {
            const RESTRICTED_FILES = ['/src/supabase.ts', '/src/_bulbia_auth.tsx'];
            const filteredFiles = Object.fromEntries(
                Object.entries(files).filter(([path]) => !RESTRICTED_FILES.includes(path))
            );

            project.files = { ...project.files, ...filteredFiles };
            project.updatedAt = new Date().toISOString();
            
            await this.syncProject(project);
            this.saveCache();
        }
    }

    async updateProjectMessages(id: string, messages: Message[]) {
        const project = this.getProject(id);
        if (project) {
            project.messages = messages;
            project.updatedAt = new Date().toISOString();
            await this.syncProject(project);
            this.saveCache();
        }
    }

    async updateProjectMetadata(id: string, metadata: Partial<Project>) {
        const project = this.getProject(id);
        if (project) {
            Object.assign(project, metadata);
            project.updatedAt = new Date().toISOString();
            await this.syncProject(project);
            this.saveCache();
        }
    }

    async saveSnapshot(id: string) {
        const project = this.getProject(id);
        if (project) {
            if (!project.history) project.history = [];
            project.history.unshift({
                files: JSON.parse(JSON.stringify(project.files)),
                messages: JSON.parse(JSON.stringify(project.messages))
            });
            if (project.history.length > 5) project.history = project.history.slice(0, 5);
            
            await this.syncProject(project);
            this.saveCache();
        }
    }

    async restoreSnapshot(id: string, steps: number = 1): Promise<boolean> {
        const project = this.getProject(id);
        if (project && project.history && project.history.length >= steps) {
            for (let i = 0; i < steps - 1; i++) project.history.shift();
            const snapshot = project.history.shift();
            if (snapshot) {
                project.files = snapshot.files;
                project.messages = snapshot.messages;
                project.updatedAt = new Date().toISOString();
                await this.syncProject(project);
                this.saveCache();
                return true;
            }
        }
        return false;
    }

    async deleteProject(id: string): Promise<boolean> {
        const index = this.state.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.state.projects.splice(index, 1);
            if (this.profileId) {
                await supabase.from('projects').delete().eq('id', id);
            }
            this.saveCache();
            return true;
        }
        return false;
    }

    async cloneProject(id: string): Promise<Project | null> {
        const project = this.getProject(id);
        if (!project || !this.state.user) return null;

        const newProject: Project = {
            ...project,
            id: crypto.randomUUID(),
            name: `${project.name} (Copia Cloud)`,
            updatedAt: new Date().toISOString(),
            files: JSON.parse(JSON.stringify(project.files)),
            messages: JSON.parse(JSON.stringify(project.messages)),
            history: []
        };

        this.state.projects.unshift(newProject);
        await this.syncProject(newProject);
        this.saveCache();
        return newProject;
    }
}

export const db = new SupabaseDB();
