// components/RichTextEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="rich-text-editor">
      {!readOnly && (
        <div className="toolbar flex gap-1 p-1 mb-2 border border-gray-200 rounded-md bg-gray-50">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor?.isActive("bold")
                ? "bg-gray-200 text-gray-800"
                : "text-gray-600"
            }`}
            title="Bold"
          >
            <Bold size={16} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor?.isActive("italic")
                ? "bg-gray-200 text-gray-800"
                : "text-gray-600"
            }`}
            title="Italic"
          >
            <Italic size={16} />
          </button>

          <div className="w-px h-6 my-auto bg-gray-300"></div>

          <button
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`p-2 rounded hover:bg-gray-200 ${
              editor?.isActive("heading", { level: 2 })
                ? "bg-gray-200 text-gray-800"
                : "text-gray-600"
            }`}
            title="Heading"
          >
            <Heading2 size={16} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor?.isActive("bulletList")
                ? "bg-gray-200 text-gray-800"
                : "text-gray-600"
            }`}
            title="Bullet List"
          >
            <List size={16} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor?.isActive("orderedList")
                ? "bg-gray-200 text-gray-800"
                : "text-gray-600"
            }`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor?.isActive("blockquote")
                ? "bg-gray-200 text-gray-800"
                : "text-gray-600"
            }`}
            title="Quote"
          >
            <Quote size={16} />
          </button>

          <div className="w-px h-6 my-auto bg-gray-300"></div>

          <button
            onClick={() => editor?.chain().focus().undo().run()}
            className="p-2 rounded hover:bg-gray-200 text-gray-600"
            title="Undo"
            disabled={!editor?.can().undo()}
          >
            <Undo size={16} />
          </button>

          <button
            onClick={() => editor?.chain().focus().redo().run()}
            className="p-2 rounded hover:bg-gray-200 text-gray-600"
            title="Redo"
            disabled={!editor?.can().redo()}
          >
            <Redo size={16} />
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
