import { db } from './db';

export interface ParsedAIResponse {
  chatMessage: string;
  files: Record<string, string>;
}

/**
 * Parses pure markdown code blocks from AI-generated text, extracting file paths and their content.
 */
export function parseCodeBlocks(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Nuevo formato robusto: Extraemos todos los bloques de código y buscamos la ruta dentro
  const blockRegex = /```[a-zA-Z0-9_\-+]*[^\n]*\n([\s\S]*?(?=```))/g;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(normalized)) !== null) {
    const blockContent = blockMatch[1];
    const pathRegex = /(?:^|\n)\s*(?:\/\/|\/\*|<!--|#)\s*filepath:\s*([^\s\n*]+)[^\n]*\n/i;
    const pathMatch = pathRegex.exec(blockContent);
    
    if (pathMatch) {
      let filePath = pathMatch[1].trim();
      if (!filePath.startsWith('/')) filePath = '/' + filePath;
      
      result[filePath] = blockContent.replace(pathMatch[0], '\n').trim();
    }
  }

  // Soporte de emergencia: Si la IA olvida los backticks pero pone "// filepath:"
  if (Object.keys(result).length === 0) {
    const lines = normalized.split('\n');
    let currentFile: string | null = null;
    let currentContent: string[] = [];
    
    for (const line of lines) {
      const pathMatch = /(?:\/\/|\/\*|<!--|#)\s*filepath:\s*([^\s\n*]+)/i.exec(line);
      if (pathMatch) {
        if (currentFile) result[currentFile] = currentContent.join('\n').trim();
        currentFile = pathMatch[1].trim();
        if (!currentFile.startsWith('/')) currentFile = '/' + currentFile;
        currentContent = [];
      } else if (currentFile) {
        currentContent.push(line);
      }
    }
    if (currentFile) result[currentFile] = currentContent.join('\n').trim();
  }

  return result;
}

/**
 * Parses the full AI response text, extracting the chat message and any generated files.
 * Also persists files to the project in the database.
 */
export function parseAIResponse(responseText: string, projectId: string): ParsedAIResponse {
  let chatMessage = responseText;
  const files = parseCodeBlocks(responseText);

  // Limpiar etiquetas legacy en caso de aparecer
  chatMessage = chatMessage.replace(/<chat>([\s\S]*?)<\/chat>/i, '$1');
  chatMessage = chatMessage.replace(/<code_changes>[\s\S]*?<\/code_changes>/i, '');
  chatMessage = chatMessage.trim();

  if (Object.keys(files).length > 0) {
    db.updateProjectFiles(projectId, files);
  }

  return {
    chatMessage: chatMessage || "He actualizado los archivos solicitados.",
    files
  };
}
