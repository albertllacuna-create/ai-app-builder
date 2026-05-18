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
        <div className="p-8 max-w-6xl mx-auto flex gap-8">
            {/* Sidebar de Colecciones */}
            <div className="w-64 flex-shrink-0">
                <div className="flex items-center gap-2 font-bold text-[15px] mb-4 text-[var(--text-primary)] uppercase tracking-wider">
                    <Database className="text-primary" size={16} /> Colecciones
                </div>
                <div className="space-y-1">
                    {loading && collections.length === 0 ? (
                        <p className="text-[var(--text-muted)] text-[12px] px-2">Buscando datos...</p>
                    ) : collections.length === 0 ? (
                        <p className="text-[var(--text-muted)] text-[12px] px-2">No hay datos guardados aún.</p>
                    ) : (
                        collections.map((col: string) => (
                            <button
                                key={col}
                                onClick={() => setSelectedCollection(col)}
                                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 transition-all text-[13px] ${selectedCollection === col
                                    ? 'bg-primary/5 text-primary font-medium shadow-[inset_2px_0_0_0_var(--primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <Layers size={14} className={selectedCollection === col ? 'text-primary' : 'text-[var(--text-muted)]'} />
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
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)] tracking-tight">
                            <TableIcon className="text-primary" size={24} />
                            {selectedCollection || 'Visor de Datos'}
                        </h1>
                        <p className="text-[13px] text-[var(--text-muted)] mt-1">Explora y gestiona los registros de la base de datos.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedCollection && columns.length > 0 && (
                            <button
                                onClick={initNewRecord}
                                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-md text-[13px] font-medium transition-all shadow-sm"
                            >
                                <Plus size={14} />
                                Nuevo registro
                            </button>
                        )}
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-[13px] font-medium text-[var(--text-secondary)] shadow-sm"
                            disabled={loading}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0c] rounded-xl border border-gray-200 dark:border-white/5 overflow-x-auto shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
                    {!selectedCollection ? (
                        <div className="p-12 text-center text-[var(--text-muted)]">
                            <Database size={48} className="mx-auto text-[var(--text-muted)] opacity-20 mb-4" />
                            <p className="text-[14px]">Selecciona una colección en el menú lateral para ver sus datos.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                                <tr className="bg-[#fcfcfc] dark:bg-[#111111] border-b border-gray-200 dark:border-white/5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                    <th className="p-4 w-16">ID</th>
                                    {columns.map((col: string) => (
                                        <th key={col} className="p-4 capitalize">{col}</th>
                                    ))}
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13px]">
                                {/* New record row */}
                                {showNewForm && (
                                    <tr className="border-b border-primary/20 bg-primary/5">
                                        <td className="p-4 text-[11px] font-mono text-[var(--text-muted)]">nuevo</td>
                                        {columns.map((col: string) => (
                                            <td key={col} className="p-2">
                                                <input
                                                    type="text"
                                                    value={newRecord[col] || ''}
                                                    onChange={(e) => setNewRecord({ ...newRecord, [col]: e.target.value })}
                                                    placeholder={col}
                                                    className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-md px-2 py-1.5 text-[13px] text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)]"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-4 text-right flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={handleCreateRecord}
                                                className="p-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                                                title="Guardar"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setShowNewForm(false); setNewRecord({}); }}
                                                className="p-1.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors shadow-sm"
                                                title="Cancelar"
                                            >
                                                <X size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                )}

                                {loading && records.length === 0 ? (
                                    <tr><td colSpan={columns.length + 2} className="p-8 text-center text-[var(--text-muted)]">Cargando registros...</td></tr>
                                ) : records.length === 0 ? (
                                    <tr><td colSpan={columns.length + 2} className="p-8 text-center text-[var(--text-muted)]">Colección vacía.</td></tr>
                                ) : (
                                    records.map((record: any) => (
                                        <tr key={record.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-4 text-[11px] font-mono text-[var(--text-muted)] truncate max-w-[80px]" title={record.id}>
                                                ...{record.id.substring(0, 5)}
                                            </td>
                                            {columns.map((col: string) => {
                                                const isEditing = editingId === record.id;
                                                const val = record.data ? record.data[col] : null;
                                                const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');

                                                return (
                                                    <td key={col} className="p-2">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editData[col] ?? ''}
                                                                onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
                                                                className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-md px-2 py-1.5 text-[13px] text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)]"
                                                            />
                                                        ) : (
                                                            <span className="text-[13px] text-[var(--text-secondary)] truncate block max-w-xs px-2" title={displayVal}>
                                                                {displayVal || '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {editingId === record.id ? (
                                                        <>
                                                            <button
                                                                onClick={handleSaveEdit}
                                                                className="p-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                                                                title="Guardar"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-1.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors shadow-sm"
                                                                title="Cancelar"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleStartEdit(record)}
                                                                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-gray-100 dark:hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRecord(record.id)}
                                                                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
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
                    )}
                </div>
            </div>
        </div>
    );
}
