"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", background: "#ffffff" },
  ".cm-scroller": {
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
    lineHeight: "1.8",
    overflow: "auto",
  },
  ".cm-content": { padding: "22px 0" },
  ".cm-line": { padding: "0 22px 0 14px" },
  ".cm-gutters": {
    background: "#ffffff",
    color: "#777770",
    border: "none",
    paddingLeft: "10px",
  },
  ".cm-activeLine, .cm-activeLineGutter": { background: "#f5f4ef" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor": { borderLeftColor: "#b94c35" },
});

export default function SourceEditor({
  fileId,
  content,
  maxBytes,
  readOnly = false,
  onChange,
  onCompile,
  onLimit,
}: {
  fileId: string;
  content: string;
  maxBytes: number;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onCompile: () => void;
  onLimit: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  const views = useRef(
    new Map<string, { state: EditorState; readOnly: boolean }>(),
  );

  const callbacks = useRef({ onChange, onCompile, onLimit, maxBytes });
  useEffect(() => {
    callbacks.current = { onChange, onCompile, onLimit, maxBytes };
  });
  useEffect(() => {
    if (!host.current) return;
    const cached = views.current.get(fileId);
    const state = cached?.readOnly === readOnly ? cached.state : undefined;

    const editor = new EditorView({
      parent: host.current,
      state:
        state && state.doc.toString() === content
          ? state
          : EditorState.create({
              doc: content,
              extensions: [
                basicSetup,
                StreamLanguage.define(stex),
                theme,
                EditorView.lineWrapping,
                EditorState.readOnly.of(readOnly),
                EditorView.editable.of(!readOnly),
                EditorState.transactionFilter.of((transaction) => {
                  if (
                    transaction.docChanged &&
                    (transaction.newDoc.length > 200_000 ||
                      new TextEncoder().encode(transaction.newDoc.toString())
                        .length > callbacks.current.maxBytes)
                  ) {
                    callbacks.current.onLimit();

                    return [];
                  }

                  return transaction;
                }),
                EditorView.contentAttributes.of({
                  "aria-label": "LaTeX source editor",
                  spellcheck: "false",
                }),
                keymap.of([
                  indentWithTab,
                  {
                    key: "Mod-Enter",
                    run: () => {
                      callbacks.current.onCompile();

                      return true;
                    },
                  },
                ]),
                EditorView.updateListener.of((update) => {
                  if (update.docChanged)
                    callbacks.current.onChange(update.state.doc.toString());
                }),
              ],
            }),
    });

    const states = views.current;

    return () => {
      states.set(fileId, { state: editor.state, readOnly });
      editor.destroy();
    };
    // The editor owns text while mounted; file switches restore its state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, readOnly]);

  return <div ref={host} className="source-editor" />;
}
