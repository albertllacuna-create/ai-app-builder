// types.ts

export type AIModel =
    | 'gemini-1.5-flash'
    | 'gemini-1.5-pro'
    | 'gemini-2.5-flash'
    | 'gemini-2.5-pro'
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'claude-3-5-sonnet-latest'
    | 'claude-3-haiku-20240307';

export type MaysonPlan = 'Free' | 'Pro' | 'Expert' | 'Enterprise';

export interface User {
    id: string;
    email: string;
    plan: MaysonPlan;
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
