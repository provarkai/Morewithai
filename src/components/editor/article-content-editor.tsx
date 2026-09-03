"use client";

import { useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table as TableExtension } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Minus,
  Undo,
  Redo,
  Table as TableIcon,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ArticleContentEditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  readOnly?: boolean;
}

interface ContentStats {
  words: number;
  characters: number;
  paragraphs: number;
  headings: number;
  images: number;
  internalLinks: number;
  externalLinks: number;
  readingTime: number;
}

function computeStats(html: string): ContentStats {
  if (!html)
    return {
      words: 0,
      characters: 0,
      paragraphs: 0,
      headings: 0,
      images: 0,
      internalLinks: 0,
      externalLinks: 0,
      readingTime: 0,
    };
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  const paragraphs =
    (html.match(/<p[\s>]/gi) || []).length || (text.length > 0 ? 1 : 0);
  const headings = (html.match(/<h[2-6][\s>]/gi) || []).length;
  const images = (html.match(/<img[\s>]/gi) || []).length;
  const links = html.match(/<a[^>]+href=["']([^"']+)["']/gi) || [];
  let internalLinks = 0;
  let externalLinks = 0;
  links.forEach((l) => {
    const match = l.match(/href=["']([^"']+)["']/);
    if (match && !match[1].startsWith("#") && !match[1].startsWith("mailto:")) {
      externalLinks++;
    }
  });
  const readingTime = Math.max(1, Math.ceil(words / 200));
  return {
    words,
    characters: text.length,
    paragraphs,
    headings,
    images,
    internalLinks,
    externalLinks,
    readingTime,
  };
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      size="icon"
      className={cn("size-7 shrink-0", isActive && "bg-muted")}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      {children}
    </Button>
  );
}

export function ArticleContentEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  readOnly = false,
}: ArticleContentEditorProps) {
  const stats = useMemo(() => computeStats(content), [content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Placeholder.configure({ placeholder: "Start writing your article..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: content || "",
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      onContentChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Title Input */}
      <div className="px-4 pt-4">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Article title..."
          readOnly={readOnly}
          className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>

      <Separator className="mx-4 mt-2" />

      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-b overflow-x-auto flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Inline Code"
          >
            <Code className="size-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            title="Task List"
          >
            <CheckSquare className="size-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Insert Link">
            <LinkIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} title="Insert Image">
            <ImageIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={addTable} title="Insert Table">
            <TableIcon className="size-3.5" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="size-3.5" />
          </ToolbarButton>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 bg-muted/50 text-[11px] text-muted-foreground border-b overflow-x-auto">
        <span>
          <strong>{stats.words}</strong> words
        </span>
        <span>
          <strong>{stats.characters}</strong> chars
        </span>
        <span>
          <strong>{stats.paragraphs}</strong> paragraphs
        </span>
        <span>
          <strong>{stats.headings}</strong> headings
        </span>
        {stats.images > 0 && (
          <span>
            <strong>{stats.images}</strong> images
          </span>
        )}
        <span>
          <strong>{stats.externalLinks}</strong> links
        </span>
        <span>
          <strong>{stats.readingTime}</strong> min read
        </span>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

export { computeStats };
export type { ContentStats };
