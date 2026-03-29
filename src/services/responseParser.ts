import { db } from './db';

export interface ParsedAIResponse {
  chatMessage: string;
  files: Record<string, string>;
}

/**
 * Parses code blocks from AI-generated text, extracting file paths and their content.
 */
export function parseCodeBlocks(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const regex = /(?:^|\n)[^\/\n]*(\/[a-zA-Z0-9_./-]+)[^\n]*\n+```[a-zA-Z0-9]*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const filePath = match[1].trim();
    result[filePath] = match[2].trimEnd();
  }
  return result;
}

/**
 * Parses the full AI response text, extracting the chat message and any generated files.
 * Also persists files to the project in the database.
 */
export function parseAIResponse(responseText: string, projectId: string): ParsedAIResponse {
  let chatMessage = responseText;
  let codeChangesText = "";

  const chatMatch = responseText.match(/<chat>([\s\S]*?)<\/chat>/i);
  if (chatMatch) {
    chatMessage = chatMatch[1].trim();
  }

  const codeMatch = responseText.match(/<code_changes>([\s\S]*?)<\/code_changes>/i);
  if (codeMatch) {
    codeChangesText = codeMatch[1].trim();
  }

  const files: Record<string, string> = {};

  if (codeChangesText) {
    Object.assign(files, parseCodeBlocks(codeChangesText));
  } else {
    const parsedFiles = parseCodeBlocks(responseText);
    Object.assign(files, parsedFiles);
    Object.keys(parsedFiles).forEach(f => {
      chatMessage = chatMessage.replace(f, '');
    });
    chatMessage = chatMessage.replace(/```[\s\S]*?```/g, '').trim();
    chatMessage = chatMessage.replace(/<code_changes>|<\/code_changes>|<chat>|<\/chat>/gi, '').trim();
  }

  if (Object.keys(files).length > 0) {
    db.updateProjectFiles(projectId, files);
    const filesList = Object.keys(files).map(f => `- \`${f}\``).join('\n');
    chatMessage += `\n\n**Archivos generados/modificados:**\n${filesList}`;
  }

  return {
    chatMessage: chatMessage || "He actualizado los archivos tal y como solicitaste.",
    files
  };
}
