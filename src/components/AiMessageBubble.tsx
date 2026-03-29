import { useState } from 'react';
import { Undo2, Code2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiMessageBubbleProps {
    msg: { role: 'ai' | 'user'; content: string };
    isAiAndUndoable: boolean;
    isAiTyping: boolean;
    stepsToUndo: number;
    handleUndo: (steps: number) => void;
    onSelectOption: (text: string) => void;
}

const getFileLabel = (fp: string) => {
    const name = fp.split('/').pop() || fp;
    if (name === 'App.tsx') return { label: 'Enrutador', color: 'bg-sky-400', name };
    if (fp.includes('/pages/')) return { label: 'Página', color: 'bg-emerald-400', name };
    if (fp.includes('/layouts/')) return { label: 'Layout', color: 'bg-amber-400', name };
    if (fp.includes('/lib/') || fp.includes('/services/')) return { label: 'Datos/Servicio', color: 'bg-violet-400', name };
    if (fp.includes('/components/')) return { label: 'Componente', color: 'bg-rose-400', name };
    return { label: 'Archivo', color: 'bg-neutral-400', name };
};

export const AiMessageBubble = ({ msg, isAiAndUndoable, isAiTyping, stepsToUndo, handleUndo, onSelectOption }: AiMessageBubbleProps) => {
    const [showCode, setShowCode] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

    let chatContent = msg.content || '';
    let codeContent = '';
    let hasCode = false;

    chatContent = chatContent.trim();

    const codeMatch = chatContent.match(/<code_changes>([\s\S]*?)(<\/code_changes>|$)/);

    if (codeMatch) {
        hasCode = true;
        chatContent = chatContent.substring(0, codeMatch.index).trim();
        codeContent = codeMatch[1].trim();
    }

    // Extract plan options
    let planOptions: string[] = [];
    const optionsMatch = chatContent.match(/<plan_options>([\s\S]*?)(<\/plan_options>|$)/);
    if (optionsMatch) {
        planOptions = optionsMatch[1]
            .split('\n')
            .map((o: string) => o.replace(/^[-*]\s*/, '').trim())
            .filter((o: string) => o.length > 0);
        chatContent = chatContent.substring(0, optionsMatch.index).trim();
    }

    // Clean up <chat> tags from the visible text
    chatContent = chatContent.replace(/<\/?chat>/g, '').trim();

    // Extract ALL file paths from the code block
    const filePaths: string[] = [];
    const pathRegex = /^\/?src\/[^\s`]+/gm;
    let pathM;
    while ((pathM = pathRegex.exec(codeContent)) !== null) {
        const fp = pathM[0].replace(/^\//, '');
        if (!filePaths.includes(fp)) filePaths.push(fp);
    }

    const toggleOption = (opt: string) => {
        setSelectedOptions(prev =>
            prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
        );
    };

    const handleConfirmOptions = () => {
        if (selectedOptions.length > 0 && onSelectOption) {
            onSelectOption(selectedOptions.join(', '));
            setSelectedOptions([]);
        }
    };

    return (
        <div className="w-full">
            <div className="markdown-body">
                <ReactMarkdown>{chatContent}</ReactMarkdown>
            </div>

            {planOptions.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5">
                        {planOptions.map((opt, i) => {
                            const isSelected = selectedOptions.includes(opt);
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggleOption(opt)}
                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${isSelected
                                        ? 'bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/10'
                                        : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <span className={`inline-block w-2 h-2 rounded-sm mr-1.5 border transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-neutral-500'
                                        }`}></span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                    {selectedOptions.length > 0 && (
                        <button
                            type="button"
                            onClick={handleConfirmOptions}
                            className="self-start px-4 py-1.5 rounded-lg text-[12px] font-medium bg-primary hover:bg-primary-600 text-white transition-colors"
                        >
                            Confirmar selección
                        </button>
                    )}
                </div>
            )}

            {hasCode && (
                <div className="mt-3 bg-black/30 rounded-lg border border-white/5 overflow-hidden">
                    {filePaths.length > 0 && (
                        <div className="divide-y divide-white/5">
                            {filePaths.map((fp, i) => {
                                const info = getFileLabel(fp);
                                return (
                                    <div key={i} className="px-3 py-2 bg-white/5 text-[11px] text-white/80 flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${info.color}`}></span>
                                        <span className="text-neutral-400 uppercase tracking-wider font-medium w-24">{info.label}</span>
                                        <span className="text-primary-light font-semibold">{info.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <button
                        onClick={() => setShowCode(!showCode)}
                        className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-neutral-400 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider font-medium border-t border-white/5"
                    >
                        <span className="flex items-center gap-1.5">
                            <Code2 size={12} />
                            {showCode ? 'Ocultar código técnico' : 'Ver detalle del código'}
                        </span>
                    </button>
                    {showCode && (
                        <div className="p-3 border-t border-white/5 bg-black/50 overflow-x-auto text-[11px] markdown-body">
                            <ReactMarkdown>{`\`\`\`tsx\n${codeContent.replace(/```[a-z]*|```/g, '').trim()}\n\`\`\``}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}

            {isAiAndUndoable && !isAiTyping && (
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={() => handleUndo(stepsToUndo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-md text-xs font-medium transition-colors"
                        title={`Deshacer hasta este punto (${stepsToUndo} paso${stepsToUndo > 1 ? 's' : ''} atrás)`}
                    >
                        <Undo2 size={14} />
                        Deshacer cambios
                    </button>
                </div>
            )}
        </div>
    );
};
