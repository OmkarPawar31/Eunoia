import type { Monaco } from '@monaco-editor/react';
import {
  buildSuggestions,
  collectDefinedIdentifiers,
  D2_BOOLEANS,
  D2_DIRECTIONS,
  D2_KEYWORDS,
  D2_SHAPES,
  getCompletionContext,
  type D2Suggestion,
} from './d2Completion';

/**
 * Registers the D2 language with Monaco Editor.
 * Includes Monarch tokenizer for syntax highlighting and a custom dark theme.
 *
 * Each piece (language, theme, completions) is guarded independently: on a
 * fresh Monaco instance where one piece already exists (HMR, tests, mocks),
 * the others must still be defined.
 */
const registeredProviders = new WeakMap<object, Set<string>>();

function alreadyDone(monaco: Monaco, key: string): boolean {
  let done = registeredProviders.get(monaco);
  if (!done) {
    done = new Set();
    registeredProviders.set(monaco, done);
  }
  if (done.has(key)) return true;
  done.add(key);
  return false;
}

export function registerD2Language(monaco: Monaco) {
  // Only register the language once per Monaco instance.
  if (
    !alreadyDone(monaco, 'language') &&
    !monaco.languages
      .getLanguages()
      .some((lang: { id: string }) => lang.id === 'd2')
  ) {
    monaco.languages.register({ id: 'd2' });
  }

  // Hyphenated keys (stroke-width, font-color) complete as a single word
  // instead of replacing only the fragment after the hyphen.
  monaco.languages.setLanguageConfiguration('d2', {
    wordPattern: /(-?\d*\.\d\w*)|([a-zA-Z_][\w\-.]*)|([a-zA-Z_]\w*)/,
  });

  // Monarch tokenizer for D2 syntax. Word lists are shared with the
  // completion model (`d2Completion.ts`) so highlighting and suggestions
  // can never drift apart.
  monaco.languages.setMonarchTokensProvider('d2', {
    defaultToken: '',
    tokenPostfix: '.d2',

    keywords: [...D2_KEYWORDS],

    shapes: [...D2_SHAPES],

    directions: [...D2_DIRECTIONS],

    booleans: [...D2_BOOLEANS],

    tokenizer: {
      root: [
        // Block comments (not standard D2, but useful)
        [/"""/, 'comment', '@blockComment'],

        // Line comments
        [/#.*$/, 'comment'],

        // Pipe-delimited text blocks
        [/\|/, 'string.delimiter', '@pipeString'],

        // Connectors — must be before identifier rules
        [/<->/, 'operator.connector'],
        [/->/, 'operator.connector'],
        [/<-/, 'operator.connector'],
        [/--/, 'operator.connector'],

        // Colon separator
        [/:/, 'delimiter'],

        // Semicolon
        [/;/, 'delimiter'],

        // Dot accessor
        [/\./, 'delimiter.dot'],

        // Strings (double-quoted)
        [/"/, 'string', '@string'],

        // Strings (single-quoted)
        [/'/, 'string', '@stringSingle'],

        // Numbers
        [/\d+/, 'number'],

        // Identifiers and keyword matching
        [
          /[a-zA-Z_][\w-]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@shapes': 'type.shape',
              '@directions': 'constant.direction',
              '@booleans': 'constant.boolean',
              '@default': 'identifier',
            },
          },
        ],

        // Brackets
        [/[{}]/, '@brackets'],
        [/[[\]]/, '@brackets'],
        [/[()]/, '@brackets'],

        // Whitespace
        [/\s+/, 'white'],
      ],

      string: [
        [/[^"\\]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],

      stringSingle: [
        [/[^'\\]+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop'],
      ],

      pipeString: [
        [/[^|]+/, 'string'],
        [/\|/, 'string.delimiter', '@pop'],
      ],

      blockComment: [
        [/"""/, 'comment', '@pop'],
        [/./, 'comment'],
      ],
    },
  });

  // D2 dark theme — matches Eunoia's dark aesthetic
  monaco.editor.defineTheme('eunoia-d2-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C678DD', fontStyle: 'bold' },
      { token: 'type.shape', foreground: '56B6C2' },
      { token: 'constant.direction', foreground: 'D19A66' },
      { token: 'constant.boolean', foreground: 'D19A66' },
      { token: 'identifier', foreground: 'ABB2BF' },
      { token: 'operator.connector', foreground: '61AFEF', fontStyle: 'bold' },
      { token: 'delimiter', foreground: '636D83' },
      { token: 'delimiter.dot', foreground: '636D83' },
      { token: 'string', foreground: '98C379' },
      { token: 'string.escape', foreground: '56B6C2' },
      { token: 'string.delimiter', foreground: '98C379' },
      { token: 'number', foreground: 'D19A66' },
      { token: '@brackets', foreground: 'ABB2BF' },
    ],
    colors: {
      'editor.background': '#0D0D0D',
      'editor.foreground': '#ABB2BF',
      'editorLineNumber.foreground': '#3B3F4A',
      'editorLineNumber.activeForeground': '#636D83',
      'editor.lineHighlightBackground': '#1A1A1A',
      'editor.selectionBackground': '#3E4451',
      'editorCursor.foreground': '#61AFEF',
      'editorIndentGuide.background': '#1A1A1A',
      'editorIndentGuide.activeBackground': '#3B3F4A',
      'editorWidget.background': '#141414',
      'editorWidget.border': '#2A2A2A',
      'editorSuggestWidget.background': '#141414',
      'editorSuggestWidget.border': '#2A2A2A',
      'editorSuggestWidget.foreground': '#ABB2BF',
      'editorSuggestWidget.selectedForeground': '#FFFFFF',
      'editorSuggestWidget.selectedBackground': '#2A3350',
      'editorSuggestWidget.highlightForeground': '#61AFEF',
      'editorSuggestWidget.focusHighlightForeground': '#7C8CFF',
      'list.hoverBackground': '#1E1E1E',
      'list.hoverForeground': '#FFFFFF',
      'list.activeSelectionBackground': '#2A3350',
      'list.activeSelectionForeground': '#FFFFFF',
      'list.inactiveSelectionBackground': '#1E1E1E',
      'list.inactiveSelectionForeground': '#ABB2BF',
      'list.highlightForeground': '#61AFEF',
      'scrollbarSlider.background': '#2A2A2A80',
      'scrollbarSlider.hoverBackground': '#3B3F4A80',
      'scrollbarSlider.activeBackground': '#3B3F4AA0',
    },
  });

  // Context-aware D2 completions (registered once — duplicates would
  // suggest everything twice). The suggestion model lives in
  // `d2Completion.ts`; this is only the Monaco adapter.
  if (alreadyDone(monaco, 'completions')) {
    return;
  }
  const kindFor = (
    suggestion: D2Suggestion,
  ): (typeof monaco.languages.CompletionItemKind)[keyof typeof monaco.languages.CompletionItemKind] => {
    switch (suggestion.kind) {
      case 'shape':
        return monaco.languages.CompletionItemKind.Enum;
      case 'keyword':
        return monaco.languages.CompletionItemKind.Keyword;
      case 'property':
        return monaco.languages.CompletionItemKind.Property;
      case 'value':
        return monaco.languages.CompletionItemKind.Value;
      case 'identifier':
        return monaco.languages.CompletionItemKind.Variable;
      case 'snippet':
        return monaco.languages.CompletionItemKind.Snippet;
    }
  };
  monaco.languages.registerCompletionItemProvider('d2', {
    // Re-trigger suggestions right after `.` (`style.|`) and `:` (`shape: |`).
    triggerCharacters: ['.', ':'],
    provideCompletionItems: (
      model: Parameters<
        Parameters<
          typeof monaco.languages.registerCompletionItemProvider
        >[1]['provideCompletionItems']
      >[0],
      position: Parameters<
        Parameters<
          typeof monaco.languages.registerCompletionItemProvider
        >[1]['provideCompletionItems']
      >[1],
    ) => {
      const lines: string[] = [];
      for (let i = 1; i < position.lineNumber; i++) {
        lines.push(model.getLineContent(i));
      }
      lines.push(model.getLineContent(position.lineNumber));
      const context = getCompletionContext(
        lines,
        position.lineNumber - 1,
        position.column,
      );
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const suggestions = buildSuggestions(
        context,
        collectDefinedIdentifiers(model.getValue()),
      );
      return {
        suggestions: suggestions.map((suggestion) => ({
          label: suggestion.label,
          kind: kindFor(suggestion),
          insertText: suggestion.insertText,
          insertTextRules: suggestion.isSnippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          // No `detail`: in this narrow pane the detail column squeezes
          // labels down to a character or two. Kind is still visible via
          // the icon; docs remain in the details panel.
          documentation: suggestion.documentation,
          sortText: suggestion.sortText,
          range,
        })),
      };
    },
  });
}
