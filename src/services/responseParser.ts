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

  // Soporte Legacy: Antiguos <code_changes>
  const legacyRegex = /(?:^|\n)[^\/\n]*(\/[a-zA-Z0-9_./-]+)[^\n]*\n+```[a-zA-Z0-9]*\n([\s\S]*?)\n```/g;
  const legacyMatchContent = normalized.match(/<code_changes>([\s\S]*?)<\/code_changes>/i);
  if (legacyMatchContent) {
      let lMatch;
      while ((lMatch = legacyRegex.exec(legacyMatchContent[1])) !== null) {
          const filePath = lMatch[1].trim();
          if (!result[filePath]) result[filePath] = lMatch[2].trimEnd();
      }
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
