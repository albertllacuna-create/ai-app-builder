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
        <div className="p-8 max-w-6xl mx-auto text-[var(--text-primary)]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <User className="text-primary" /> Gestión de Usuarios
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">Controla quién tiene acceso a los recursos de tu app Bolbia.</p>
                </div>
                <button
                    onClick={loadUsers}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Actualizar
                </button>
            </div>

            <div className="glass-panel rounded-xl border border-[var(--surface-border)] overflow-hidden bg-[var(--surface)] shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--surface-hover)] border-b border-[var(--surface-border)]">
                            <th className="p-4 font-medium text-[var(--text-muted)]">Usuario</th>
                            <th className="p-4 font-medium text-[var(--text-muted)]">Rol</th>
                            <th className="p-4 font-medium text-[var(--text-muted)]">Fecha de Registro</th>
                            <th className="p-4 font-medium text-[var(--text-muted)] text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">Cargando directorio...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                                    Aún no hay usuarios registrados en esta app Bolbia.
                                    <br />
                                    <span className="text-sm mt-2 block">Cuando los usuarios se registren en la aplicación generada, aparecerán aquí.</span>
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.id} className="border-b border-[var(--surface-border)] hover:bg-[var(--surface-hover)]/50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                            {u.data.email?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-[var(--text-primary)]">{u.data.email || 'Email oculto'}</span>
                                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Mail size={10} /> Registrado vía Auth</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] border border-[var(--surface-border)] flex items-center w-fit gap-1">
                                            <Shield size={12} /> {u.data.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-[var(--text-muted)] text-sm">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} /> {new Date(u.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors"
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
