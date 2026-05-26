import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Trash2, Database, Table as TableIcon, RefreshCw, Layers, Plus, Pencil, Check, X } from 'lucide-react';

export function HubData() {
    const { projectId } = useParams<{ projectId: string }>();
    const [collections, setCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Create new record state
    const [showNewForm, setShowNewForm] = useState(false);
    const [newRecord, setNewRecord] = useState<Record<string, string>>({});

    // Edit record state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Record<string, string>>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_collections')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const allData = data || [];

            const uniqueCollections = Array.from(new Set(allData.map((item: any) => item.collection_name))).filter((c: string) => c !== 'users');
            setCollections(uniqueCollections);

            const currentSelected = selectedCollection && uniqueCollections.includes(selectedCollection)
                ? selectedCollection
                : uniqueCollections[0] || null;

            setSelectedCollection(currentSelected);

            if (currentSelected) {
                setRecords(allData.filter((item: any) => item.collection_name === currentSelected));
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) loadData();
    }, [projectId, selectedCollection]);

    const handleDeleteRecord = async (id: string) => {
        if (!confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            await supabase.from('app_collections').delete().eq('id', id);
            loadData();
        } catch (error) {
            console.error('Error deleting record:', error);
        }
    };

    const handleCreateRecord = async () => {
        if (!selectedCollection || Object.keys(newRecord).length === 0) return;
        try {
            await supabase.from('app_collections').insert([{
                project_id: projectId,
                collection_name: selectedCollection,
                data: newRecord
            }]);
            setNewRecord({});
            setShowNewForm(false);
            loadData();
        } catch (error) {
            console.error('Error creating record:', error);
        }
    };

    const handleStartEdit = (record: any) => {
        setEditingId(record.id);
        setEditData(record.data || {});
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            await supabase.from('app_collections')
                .update({ data: editData })
                .eq('id', editingId);
            setEditingId(null);
            setEditData({});
            loadData();
        } catch (error) {
            console.error('Error updating record:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    // Extract dynamic columns from the stored JSON
    const getColumns = () => {
        if (records.length === 0) return [];
        const keys = new Set<string>();
        records.forEach((r: any) => {
            if (r.data) Object.keys(r.data).forEach((k: string) => keys.add(k));
        });
        return Array.from(keys);
    };

    const columns = getColumns();

    const initNewRecord = () => {
        const empty: Record<string, string> = {};
        columns.forEach((col: string) => { empty[col] = ''; });
        setNewRecord(empty);
        setShowNewForm(true);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto flex gap-8 relative z-10">
            {/* Sidebar de Colecciones */}
            <div className="w-64 flex-shrink-0">
                <div className="flex items-center gap-2 font-bold text-[15px] mb-6 text-[var(--text-primary)] uppercase tracking-wider">
                    <Database className="text-primary" size={18} /> Colecciones
                </div>
                <div className="space-y-2">
                    {loading && collections.length === 0 ? (
                        <p className="text-[var(--text-muted)] text-[12px] px-2 font-medium">Buscando datos...</p>
                    ) : collections.length === 0 ? (
                        <p className="text-[var(--text-muted)] text-[12px] px-2 font-medium">No hay datos guardados aún.</p>
                    ) : (
                        collections.map((col: string) => (
                            <button
                                key={col}
                                onClick={() => setSelectedCollection(col)}
                                className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all text-[13px] font-medium ${selectedCollection === col
                                    ? 'bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10 font-bold'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                <Layers size={16} className={selectedCollection === col ? 'text-primary' : 'text-[var(--text-muted)]'} />
                                <span className="truncate">{col}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Vista Principal (Tabla) */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500">
                            <TableIcon className="text-primary" size={28} />
                            {selectedCollection || 'Visor de Datos'}
                        </h1>
                        <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">Explora y gestiona los registros de la base de datos.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedCollection && columns.length > 0 && (
                            <button
                                onClick={initNewRecord}
                                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-[13px] font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:-translate-y-0.5"
                            >
                                <Plus size={16} />
                                Nuevo registro
                            </button>
                        )}
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-white/10 backdrop-blur-sm transition-all text-[13px] font-bold text-[var(--text-secondary)] shadow-inner"
                            disabled={loading}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} />
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-black/5 overflow-hidden relative z-10">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                    {!selectedCollection ? (
                        <div className="p-16 text-center text-[var(--text-muted)]">
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <Database size={40} className="text-primary opacity-50" />
                            </div>
                            <p className="text-[15px] font-medium">Selecciona una colección en el menú lateral para ver sus datos.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                    <tr className="bg-black/5 dark:bg-white/5 border-b border-white/20 dark:border-white/10 text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">
                                        <th className="p-5 w-20">ID</th>
                                        {columns.map((col: string) => (
                                            <th key={col} className="p-5 capitalize">{col}</th>
                                        ))}
                                        <th className="p-5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[14px]">
                                    {/* New record row */}
                                    {showNewForm && (
                                        <tr className="border-b border-primary/20 bg-primary/10">
                                            <td className="p-5 text-[12px] font-mono font-bold text-primary">nuevo</td>
                                            {columns.map((col: string) => (
                                                <td key={col} className="p-3">
                                                    <input
                                                        type="text"
                                                        value={newRecord[col] || ''}
                                                        onChange={(e) => setNewRecord({ ...newRecord, [col]: e.target.value })}
                                                        placeholder={col}
                                                        className="w-full bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner placeholder:text-[var(--text-muted)]"
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-5 text-right flex items-center justify-end gap-2">
                                                <button
                                                    onClick={handleCreateRecord}
                                                    className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                                                    title="Guardar"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setShowNewForm(false); setNewRecord({}); }}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shadow-inner"
                                                    title="Cancelar"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )}

                                    {loading && records.length === 0 ? (
                                        <tr><td colSpan={columns.length + 2} className="p-10 text-center text-[var(--text-muted)] font-medium">Cargando registros...</td></tr>
                                    ) : records.length === 0 ? (
                                        <tr><td colSpan={columns.length + 2} className="p-10 text-center text-[var(--text-muted)] font-medium">Colección vacía.</td></tr>
                                    ) : (
                                        records.map((record: any) => (
                                            <tr key={record.id} className="border-b border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-5 text-[12px] font-mono text-[var(--text-muted)] truncate max-w-[80px]" title={record.id}>
                                                    ...{record.id.substring(0, 5)}
                                                </td>
                                            {columns.map((col: string) => {
                                                const isEditing = editingId === record.id;
                                                const val = record.data ? record.data[col] : null;
                                                const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');

                                                return (
                                                    <td key={col} className="p-3">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editData[col] ?? ''}
                                                                onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
                                                                className="w-full bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner placeholder:text-[var(--text-muted)]"
                                                            />
                                                        ) : (
                                                            <span className="text-[14px] font-medium text-[var(--text-secondary)] truncate block max-w-xs px-2" title={displayVal}>
                                                                {displayVal || '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {editingId === record.id ? (
                                                        <>
                                                            <button
                                                                onClick={handleSaveEdit}
                                                                className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                                                                title="Guardar"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shadow-inner"
                                                                title="Cancelar"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleStartEdit(record)}
                                                                className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-white/50 dark:hover:bg-white/10 hover:text-primary transition-all backdrop-blur-sm"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRecord(record.id)}
                                                                className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all backdrop-blur-sm"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
