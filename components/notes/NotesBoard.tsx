"use client";

import { useState, useEffect } from "react";
import { Plus, StickyNote, Folder as FolderIcon, X, Maximize2, MoreVertical, Check, Trash2, Edit2, Bold, Italic, Heading2, List, Table as TableIcon, Columns, Rows, Combine, SplitSquareHorizontal, Trash, Minus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, EmptyState } from "@/components/kit";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  folderId: string | null;
  updatedAt: string;
};

type Folder = {
  id: string;
  name: string;
  color: string;
};

const NOTE_COLORS = [
  { id: 'yellow', dot: 'bg-amber-400', tint: 'bg-amber-400/[0.06]', bar: 'bg-amber-400' },
  { id: 'green', dot: 'bg-brand', tint: 'bg-brand/[0.06]', bar: 'bg-brand' },
  { id: 'blue', dot: 'bg-sky-400', tint: 'bg-sky-400/[0.06]', bar: 'bg-sky-400' },
  { id: 'pink', dot: 'bg-pink-400', tint: 'bg-pink-400/[0.06]', bar: 'bg-pink-400' },
  { id: 'purple', dot: 'bg-violet-400', tint: 'bg-violet-400/[0.06]', bar: 'bg-violet-400' },
];

export default function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Start typing your note here...',
      })
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // Autosave logic could go here
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editor && activeNote) {
      if (editor.getHTML() !== activeNote.content) {
        editor.commands.setContent(activeNote.content);
      }
    }
  }, [activeNote, editor]);

  const fetchData = async () => {
    try {
      const [notesRes, foldersRes] = await Promise.all([
        fetch('/api/notes'),
        fetch('/api/folders')
      ]);
      const [n, f] = await Promise.all([notesRes.json(), foldersRes.json()]);
      if (!notesRes.ok || !foldersRes.ok || !Array.isArray(n) || !Array.isArray(f)) throw new Error('load failed');
      setNotes(n);
      setFolders(f);
    } catch (e) {
      toast.error("Failed to load notes");
    }
  };

  const createNote = async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'New Note', 
          content: '',
          color: 'yellow',
          folderId: selectedFolderId
        })
      });
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
      openNote(newNote);
    } catch (e) {
      toast.error("Failed to create note");
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, color: 'gray' })
      });
      const newFolder = await res.json();
      setFolders([newFolder, ...folders]);
      setNewFolderName("");
      setIsNewFolderOpen(false);
      setSelectedFolderId(newFolder.id);
    } catch (e) {
      toast.error("Failed to create folder");
    }
  };

  const saveNote = async () => {
    if (!activeNote || !editor) return;
    try {
      const content = editor.getHTML();
      const res = await fetch(`/api/notes/${activeNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeNote, content })
      });
      if (res.ok) {
        setNotes(notes.map(n => n.id === activeNote.id ? { ...activeNote, content } : n));
        toast.success("Saved");
      }
    } catch (e) {
      toast.error("Failed to save note");
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n.id !== id));
      if (activeNote?.id === id) setIsEditorOpen(false);
      toast.success("Deleted note");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const openNote = (note: Note) => {
    setActiveNote(note);
    setIsEditorOpen(true);
  };

  const filteredNotes = selectedFolderId 
    ? notes.filter(n => n.folderId === selectedFolderId)
    : notes;

  const deleteFolder = async (folder: Folder) => {
    if (!confirm(`Delete the folder "${folder.name}"? Its notes are kept and moved to All notes.`)) return;
    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setFolders(folders.filter(f => f.id !== folder.id));
      if (selectedFolderId === folder.id) setSelectedFolderId(null);
      // The API un-files the notes (folderId -> null); it does not delete them.
      setNotes(notes.map(n => n.folderId === folder.id ? { ...n, folderId: null } : n));
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const folderButton = (id: string | null, name: string, count: number, folder?: Folder) => (
    <div
      key={id ?? 'all'}
      className={cn(
        "group flex h-9 items-center gap-2 rounded-md px-2.5 text-sm transition-colors",
        selectedFolderId === id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <button onClick={() => setSelectedFolderId(id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {id === null ? <StickyNote className="size-4 shrink-0" /> : <FolderIcon className="size-4 shrink-0" />}
        <span className="truncate">{name}</span>
      </button>
      <span className="text-xs tabular text-muted-foreground group-hover:hidden">{count}</span>
      {folder && (
        <button
          className="hidden rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
          title="Delete folder"
          onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Trading ideas, plans and lessons learned"
        actions={
          <Button size="sm" onClick={createNote}>
            <Plus /> New note
          </Button>
        }
      />

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Folders */}
        <Panel className="h-fit shrink-0 p-3 md:w-60">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">Folders</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setIsNewFolderOpen(v => !v)} title="New folder">
              <Plus />
            </Button>
          </div>

          {isNewFolderOpen && (
            <div className="mb-2 flex gap-1.5">
              <Input
                autoFocus
                className="h-8"
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') setIsNewFolderOpen(false);
                }}
              />
              <Button size="icon-sm" onClick={createFolder} title="Create folder"><Check /></Button>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {folderButton(null, 'All notes', notes.length)}
            {folders.map(folder => folderButton(folder.id, folder.name, notes.filter(n => n.folderId === folder.id).length, folder))}
          </div>
        </Panel>

        {/* Notes grid */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'All notes'}
            <span className="ml-2 tabular">{filteredNotes.length}</span>
          </h2>

          {filteredNotes.length === 0 ? (
            <Panel>
              <EmptyState
                icon={StickyNote}
                title="No notes here yet"
                description="Capture a trade idea, a plan for the week, or a lesson you don't want to repeat."
                action={<Button size="sm" variant="outline" onClick={createNote}><Plus /> New note</Button>}
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredNotes.map(note => {
                const color = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
                return (
                  <div
                    key={note.id}
                    onClick={() => openNote(note)}
                    className={cn(
                      "group relative flex h-60 cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20",
                      color.tint
                    )}
                  >
                    <span className={cn("absolute inset-x-0 top-0 h-0.5", color.bar)} />
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium">{note.title || 'Untitled'}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="-mr-1 -mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                            onClick={e => e.stopPropagation()}
                          >
                            <MoreVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openNote(note); }}>
                            <Edit2 className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => deleteNote(note.id, e)}>
                            <Trash2 className="mr-2 size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div
                      className="mask-bottom prose prose-sm dark:prose-invert tiptap-preview-wrapper max-w-none flex-1 overflow-hidden text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", color.dot)} />
                        {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <Maximize2 className="size-3 opacity-50" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => {
        if (!open) saveNote();
        setIsEditorOpen(open);
      }}>
        <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
          <DialogTitle className="sr-only">Edit Note</DialogTitle>
          <DialogHeader className="flex flex-col gap-3 border-b border-border p-5 pr-12">
            <div className="flex flex-row items-center justify-between">
              <Input 
                value={activeNote?.title || ''} 
                onChange={e => activeNote && setActiveNote({...activeNote, title: e.target.value})}
                className="h-auto border-none bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
                placeholder="Note Title"
              />
              <Button size="sm" onClick={() => { saveNote(); setIsEditorOpen(false); }}>Done</Button>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={activeNote?.folderId || 'none'}
                onValueChange={v => activeNote && setActiveNote({ ...activeNote, folderId: v === 'none' ? null : v })}
              >
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-1 ml-2">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => activeNote && setActiveNote({...activeNote, color: c.id})}
                    className={cn("size-5 rounded-full", c.dot, activeNote?.color === c.id ? "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100")}
                    title={c.id}
                    aria-label={`Colour ${c.id}`}
                  />
                ))}
              </div>
            </div>
          </DialogHeader>
          
          {/* Tiptap Toolbar */}
          <div className="flex flex-wrap gap-1.5 border-b border-border bg-secondary/40 px-5 py-2">
            <Button variant="ghost" size="icon-sm" title="Bold" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? 'bg-accent text-foreground' : ''}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Italic" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? 'bg-accent text-foreground' : ''}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Heading 2" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={editor?.isActive('heading', { level: 2 }) ? 'bg-accent text-foreground' : ''}>
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Bullet List" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? 'bg-accent text-foreground' : ''}>
              <List className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-2 self-center" />
            
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" title="Insert Table" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <TableIcon className="w-4 h-4" /> <span className="text-xs">Table</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" title="Add Column" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().addColumnBefore().run()} disabled={!editor?.can().addColumnBefore()}>
              <Plus className="w-3 h-3" /> <span className="text-xs">Col</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-destructive" title="Delete Column" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().deleteColumn().run()} disabled={!editor?.can().deleteColumn()}>
              <Minus className="w-3 h-3" /> <span className="text-xs">Col</span>
            </Button>
            <div className="w-px h-6 bg-border mx-1 self-center" />
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" title="Add Row" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().addRowAfter().run()} disabled={!editor?.can().addRowAfter()}>
              <Plus className="w-3 h-3" /> <span className="text-xs">Row</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-destructive" title="Delete Row" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().deleteRow().run()} disabled={!editor?.can().deleteRow()}>
              <Minus className="w-3 h-3" /> <span className="text-xs">Row</span>
            </Button>
            <div className="w-px h-6 bg-border mx-1 self-center" />
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" title="Merge Cells" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().mergeCells().run()} disabled={!editor?.can().mergeCells()}>
              <Combine className="w-4 h-4" /> <span className="text-xs">Merge</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" title="Split Cell" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().splitCell().run()} disabled={!editor?.can().splitCell()}>
              <SplitSquareHorizontal className="w-4 h-4" /> <span className="text-xs">Split</span>
            </Button>
            <Button variant="ghost" size="icon-sm" title="Delete Table" className="text-destructive ml-auto" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().deleteTable().run()} disabled={!editor?.can().deleteTable()}>
              <Trash className="w-4 h-4" />
            </Button>
          </div>

          <div className="tiptap-editor-wrapper flex-1 overflow-y-auto px-5 py-4">
            <EditorContent editor={editor} className="prose prose-sm dark:prose-invert min-h-full max-w-none outline-none sm:prose-base" />
          </div>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{__html: `
        .mask-bottom {
          mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
        }
        .tiptap-editor-wrapper .ProseMirror {
          min-height: 100%;
          outline: none;
        }
        .tiptap-editor-wrapper table, .tiptap-preview-wrapper table {
          border-collapse: collapse;
          margin: 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }
        .tiptap-editor-wrapper td, .tiptap-editor-wrapper th,
        .tiptap-preview-wrapper td, .tiptap-preview-wrapper th {
          border: 1px solid var(--border);
          box-sizing: border-box;
          min-width: 1em;
          padding: 6px 8px;
          position: relative;
          vertical-align: top;
        }
        .tiptap-editor-wrapper th, .tiptap-preview-wrapper th {
          background-color: var(--secondary);
          font-weight: bold;
          text-align: left;
        }
        
        /* Make preview tables smaller and blend in better */
        .tiptap-preview-wrapper table {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          font-size: 0.75rem;
        }
        .tiptap-preview-wrapper p, 
        .tiptap-preview-wrapper ul, 
        .tiptap-preview-wrapper h2 {
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
        }
        .tiptap-preview-wrapper th {
          background-color: rgba(0,0,0,0.05); /* subtle blend on colored notes */
          padding: 2px 4px;
        }
        .tiptap-preview-wrapper td {
          padding: 2px 4px;
        }
        .dark .tiptap-preview-wrapper th {
          background-color: rgba(255,255,255,0.05);
        }

        .tiptap p.is-editor-empty:first-child::before {
          color: var(--muted-foreground);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}} />
    </div>
  );
}
