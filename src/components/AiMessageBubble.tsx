import React, { useState } from 'react';
import { Undo2, FileCode2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiMessageBubbleProps {
    msg: { role: 'ai' | 'user'; content: string };
    isAiAndUndoable: boolean;
    isAiTyping: boolean;
    stepsToUndo: number;
    handleUndo: (steps: number) => void;
    onSelectOption: (text: string) => void;
}

export const AiMessageBubble = ({ msg, isAiAndUndoable, isAiTyping, stepsToUndo, handleUndo, onSelectOption }: AiMessageBubbleProps) => {
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

    let chatContent = msg.content || '';
    
    // Process tags cleanly on-the-fly during streaming so Markdown doesn't break
    chatContent = chatContent.replace(/<\/?chat>/gi, '');
    chatContent = chatContent.replace(/<\/?code_changes>/gi, '');

    // Upgrade legacy code_change format (/ruta \n ```tsx) to the new filepath format so pills render correctly
    chatContent = chatContent.replace(/(?:^|\n)\/([a-zA-Z0-9_./-]+)\s*\n+```[a-zA-Z0-9]*\n/g, '\n```tsx\n// filepath: /$1\n');

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
                <ReactMarkdown
                    components={{
                        pre({ children, ...props }: any) {
                            // Detect if this <pre> wraps a custom file creation <code> block
                            const childArray = React.Children.toArray(children);
                            if (childArray.length > 0) {
                                const firstChild = childArray[0] as any;
                                if (firstChild?.props?.className?.includes('language-')) {
                                    const codeStr = String(firstChild.props.children);
                                    if (codeStr.match(/^\/\/\s*filepath:\s*(\/?\S+)/m)) {
                                        // It's a file pill, skip the <pre> block styling completely
                                        return <div className="my-1.5">{children}</div>;
                                    }
                                }
                            }
                            return <pre style={{ background: 'var(--code-bg)', border: '1px solid var(--surface-border)' }} className="p-4 rounded-xl overflow-x-auto shadow-sm my-3" {...props}>{children}</pre>;
                        },
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match) {
                                const codeStr = String(children).replace(/\n$/, '');
                                const fpMatch = codeStr.match(/^\/\/\s*filepath:\s*(\/?\S+)/m);
                                
                                if (fpMatch) {
                                    const fp = fpMatch[1];
                                    const fileName = fp.split('/').pop() || fp;

                                    return (
                                        <div className="flex items-center gap-1.5 py-0.5">
                                            <FileCode2 size={14} style={{ color: 'var(--text-secondary)' }} className="shrink-0" />
                                            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Escrito</span>
                                            <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{fileName}</span>
                                        </div>
                                    );
                                }
                                
                                // Standard code blocks that aren't file creations
                                return (
                                    <div className="relative mt-0 mb-0">
                                        <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg z-10" style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--surface-border)', borderLeft: '1px solid var(--surface-border)' }}>
                                            <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{match[1]}</span>
                                        </div>
                                        <code className={`${className} text-[12px] leading-relaxed block`} {...props}>{children}</code>
                                    </div>
                                );
                            }
                            return <code className="px-1.5 py-0.5 rounded text-[12px]" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }} {...props}>{children}</code>;
                        }
                    }}
                >
                    {chatContent}
                </ReactMarkdown>
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

            {isAiAndUndoable && !isAiTyping && (
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={() => handleUndo(stepsToUndo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800/50 hover:bg-red-500/20 text-neutral-300 hover:text-red-400 border border-neutral-700/50 hover:border-red-500/30 rounded-lg text-[11px] font-medium transition-all shadow-sm"
                        title={`Deshacer hasta este punto`}
                    >
                        <Undo2 size={14} />
                        Deshacer cambios ({stepsToUndo})
                    </button>
                </div>
            )}
        </div>
    );
};
