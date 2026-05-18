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
        <div className="p-8 max-w-6xl mx-auto relative z-10">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500">
                        <User className="text-primary" size={28} /> Gestión de Usuarios
                    </h1>
                    <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">Controla quién tiene acceso a los recursos de tu app Bulbia.</p>
                </div>
                <button
                    onClick={loadUsers}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-white/10 backdrop-blur-sm transition-all text-[13px] font-bold text-[var(--text-secondary)] shadow-inner"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
                    Actualizar
                </button>
            </div>

            <div className="premium-glass rounded-2xl border border-white/20 dark:border-white/10 overflow-hidden shadow-lg backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/5 dark:bg-white/5 border-b border-white/20 dark:border-white/10 text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">
                            <th className="p-5 w-1/3">Usuario</th>
                            <th className="p-5 w-1/6">Rol</th>
                            <th className="p-5 w-1/4">Fecha de Registro</th>
                            <th className="p-5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-[14px]">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-10 text-center text-[var(--text-muted)] font-medium">Cargando directorio...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-16 text-center">
                                    <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                            <User size={40} className="text-primary opacity-50" />
                                        </div>
                                        <p className="font-medium text-[15px] text-[var(--text-secondary)]">Aún no hay usuarios registrados</p>
                                        <span className="text-[13px] mt-2 font-medium text-[var(--text-muted)]">Cuando los usuarios se registren en la aplicación generada, aparecerán aquí.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.id} className="border-b border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                                    <td className="p-5 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner text-[15px]">
                                            {u.data.email?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[var(--text-primary)]">{u.data.email || 'Email oculto'}</span>
                                            <span className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-1.5 mt-1"><Mail size={12} /> Registrado vía Auth</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className="px-3 py-1.5 rounded-lg bg-white/50 dark:bg-black/50 text-[12px] font-bold text-[var(--text-secondary)] border border-white/20 dark:border-white/10 flex items-center w-fit gap-2 shadow-inner backdrop-blur-sm">
                                            <Shield size={14} className="text-primary" /> {u.data.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="p-5 font-medium text-[var(--text-muted)]">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} /> {new Date(u.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                            title="Eliminar perfil"
                                        >
                                            <Trash2 size={18} />
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
