// types.ts

export type AIModel = 'gemini-1.5-flash' | 'claude-3-5-sonnet' | 'gpt-4o-mini';

export type bulbiaPlan = 'Free' | 'Starter' | 'Builder' | 'Expert';

export interface User {
    id: string;
    email: string;
    fullName?: string;
    plan: bulbiaPlan;
    tokens: number;
    nextResetDate?: string;
}

export interface Message {
    role: 'ai' | 'user';
    content: string;
}

export interface StripePlan {
    id: string;
    name: string;
    description: string;
    price: number;
    interval: 'month' | 'year' | 'one-time';
    features: string[];
}

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export interface Workspace {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    memberCount?: number;
    userRole?: WorkspaceRole;
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    profileId: string;
    role: WorkspaceRole;
    email?: string;
    fullName?: string;
    joinedAt: string;
}

export interface WorkspaceInvitation {
    id: string;
    workspaceId: string;
    role: WorkspaceRole;
    createdBy: string;
    expiresAt: string;
    token: string;
}

export interface Project {
    id: string;
    userId: string;
    workspaceId?: string; // New field for workspace association
    name: string;
    description?: string;
    logoUrl?: string;
    visibility?: 'public' | 'private';
    requireLogin?: boolean;
    publishedUrl?: string;
    customDomain?: string;
    stripePlans?: StripePlan[];
    stripeConnected?: boolean;
    type: string;
    updatedAt: string;
    favorite?: boolean;
    files: Record<string, string>; // path -> content
    messages: Message[];
    history?: {
        files: Record<string, string>;
        messages: Message[];
    }[];
}

export interface AppState {
    user: User | null;
    projects: Project[];
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
}
