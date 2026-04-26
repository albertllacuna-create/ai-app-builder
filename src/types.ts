// types.ts

export type AIModel = 'gemini-1.5-flash' | 'claude-3-5-sonnet' | 'gpt-4o-mini';

export type bulbiaPlan = 'Free' | 'Starter' | 'Builder' | 'Expert';

export interface User {
    id: string;
    email: string;
    plan: bulbiaPlan;
    tokens: number;
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

export interface Project {
    id: string;
    userId: string;
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
}
