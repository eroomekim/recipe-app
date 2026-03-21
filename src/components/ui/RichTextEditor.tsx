"use client";

import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "",
  minHeight = 200,
}: RichTextEditorProps) {
  const editor = useRef(null);

  const config = useMemo(
    () => ({
      readonly: false,
      placeholder,
      height: minHeight,
      toolbarButtonSize: "small" as const,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "|",
        "paragraph",
        "|",
        "link",
        "|",
        "undo",
        "redo",
      ],
      buttonsMD: [
        "bold",
        "italic",
        "underline",
        "|",
        "ul",
        "ol",
        "|",
        "link",
        "|",
        "undo",
        "redo",
      ],
      buttonsSM: [
        "bold",
        "italic",
        "|",
        "ul",
        "ol",
        "|",
        "undo",
        "redo",
      ],
      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      disablePlugins: [
        "add-new-line",
        "about",
        "class-span",
        "powered-by-jodit",
        "stat",
      ].join(","),
      style: {
        fontFamily: '"Libre Baskerville", Georgia, serif',
        fontSize: "16px",
      },
    }),
    [placeholder, minHeight]
  );

  return (
    <div>
      {label && (
        <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
          {label}
        </label>
      )}
      <JoditEditor
        ref={editor}
        value={value}
        config={config}
        onBlur={(newContent: string) => onChange(newContent)}
      />
    </div>
  );
}
