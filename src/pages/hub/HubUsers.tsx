import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Trash2, User, RefreshCw, Mail, Calendar, Shield } from 'lucide-react';

export function HubUsers() {
    const { projectId } = useParams<{ projectId: string }>();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_collections')
                .select('*')
                .eq('project_id', projectId)
                .eq('collection_name', 'users')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) loadUsers();
    }, [projectId]);

    const handleDeleteUser = async (id: string) => {
        if (!confirm('¿Revocar acceso? Esto eliminará el perfil del usuario.')) return;
        try {
            await supabase.from('app_collections').delete().eq('id', id);
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)] tracking-tight">
                        <User className="text-primary" size={24} /> Gestión de Usuarios
                    </h1>
                    <p className="text-[13px] text-[var(--text-muted)] mt-1">Controla quién tiene acceso a los recursos de tu app Bulbia.</p>
                </div>
                <button
                    onClick={loadUsers}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-[13px] font-medium text-[var(--text-secondary)] shadow-sm"
                    disabled={loading}
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    Actualizar
                </button>
            </div>

            <div className="bg-white dark:bg-[#0c0c0c] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#fcfcfc] dark:bg-[#111111] border-b border-gray-200 dark:border-white/5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            <th className="p-4 w-1/3">Usuario</th>
                            <th className="p-4 w-1/6">Rol</th>
                            <th className="p-4 w-1/4">Fecha de Registro</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-[13px]">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">Cargando directorio...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                        <User size={32} className="mb-3 opacity-20" />
                                        <p className="font-medium text-[14px]">Aún no hay usuarios registrados</p>
                                        <span className="text-[12px] mt-1">Cuando los usuarios se registren en la aplicación generada, aparecerán aquí.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                                            {u.data.email?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-[var(--text-primary)]">{u.data.email || 'Email oculto'}</span>
                                            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><Mail size={10} /> Registrado vía Auth</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded-md bg-[#fcfcfc] dark:bg-[#111111] text-[11px] font-medium text-[var(--text-secondary)] border border-gray-200 dark:border-white/10 flex items-center w-fit gap-1.5 shadow-sm">
                                            <Shield size={12} /> {u.data.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-[var(--text-muted)]">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} /> {new Date(u.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar perfil"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
