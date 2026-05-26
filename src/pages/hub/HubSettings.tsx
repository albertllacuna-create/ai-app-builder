export function HubSettings() {
    return (
        <div className="p-8 text-[var(--text-primary)]">
            <h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Ajustes del Proyecto</h1>
            <p className="text-[var(--text-muted)] mb-8">Configuración general de esta aplicación bulbia.</p>
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-black/5 p-10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500 opacity-50"></div>
                <p className="text-[var(--text-muted)] text-center">Ajustes en construcción...</p>
            </div>
        </div>
    );
}
