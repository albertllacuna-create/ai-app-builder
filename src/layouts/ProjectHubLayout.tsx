import { Outlet, useParams, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Database, Globe, Code2, Settings, ChevronLeft, CreditCard } from 'lucide-react';
import { db } from '../services/db';

export function ProjectHubLayout() {
    const { projectId } = useParams<{ projectId: string }>();
    const location = useLocation();

    // Fallback if no project ID (shouldn't happen with correct routing)
    if (!projectId) return <div>Invalid Project ID</div>;

    // In a real app, we'd fetch the project name from DB/Supabase. 
    // For now we get it from local DB if available.
    const project = db.getProject(projectId);
    const projectName = project ? project.name : 'Cargando Proyecto...';

    const navItems = [
        { path: `/project/${projectId}/overview`, name: 'Resumen', icon: LayoutDashboard },
        { path: `/project/${projectId}/users`, name: 'Usuarios', icon: Users },
        { path: `/project/${projectId}/data`, name: 'Base de Datos', icon: Database },
        { path: `/project/${projectId}/domains`, name: 'Dominios', icon: Globe },
        { path: `/project/${projectId}/payments`, name: 'Monetización', icon: CreditCard },
        { path: `/project/${projectId}/editor`, name: 'Código (IA)', icon: Code2 },
        { path: `/project/${projectId}/settings`, name: 'Ajustes', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-neutral-900 text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 flex flex-col border-r border-neutral-800 bg-neutral-950">
                <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
                    <Link to="/dashboard" className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white">
                        <ChevronLeft size={20} />
                    </Link>
                    <div className="truncate font-semibold">{projectName}</div>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                                    ? 'bg-primary text-white'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="text-sm font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative bg-neutral-900 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
