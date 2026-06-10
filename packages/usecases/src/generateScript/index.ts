export { GenerateScriptUseCase } from './GenerateScriptUseCase';
export {
  SYSTEM_PROMPT,
  buildDirectiveInstructions,
  buildWinningPatternsSection,
  buildUserPrompt,
  estimateCostUsd,
  type BuildUserPromptInput,
} from './prompt';
export {
  injectInfographics,
  type ScriptDoc,
  type ScriptDocChapter,
  type ChapterVisualImage,
  type InjectInfographicsResult,
} from './injectInfographics';
export { narrowDirective, narrowWinningPatterns } from './narrow';
export type {
  LlmClient,
  LlmCompletion,
  Directive,
  DirectiveHypothesis,
  DirectiveTechGeopolitics,
  WinningPatterns,
  KnowledgeRepository,
  InfographicResolver,
  ScriptYamlWriter,
  GenerateScriptDeps,
  GenerateScriptInput,
  GenerateScriptResult,
} from './ports';
