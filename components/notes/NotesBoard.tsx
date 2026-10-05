"use client";

import { useState, useEffect } from "react";
import { Plus, Folder as FolderIcon, X, Maximize2, MoreVertical, Check, Trash2, Edit2, Bold, Italic, Heading2, List, Table as TableIcon, Columns, Rows, Combine, SplitSquareHorizontal, Trash, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  { id: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'green', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' },
  { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-200 dark:border-pink-800' },
  { id: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' },
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

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Folders Sidebar */}
      <div className="w-64 border-r pr-4 mr-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Folders</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsNewFolderOpen(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {isNewFolderOpen && (
          <div className="flex gap-2 mb-2">
            <Input 
              autoFocus
              placeholder="Folder name" 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
            />
            <Button size="icon" onClick={createFolder}><Check className="w-4 h-4"/></Button>
          </div>
        )}

        <div className="flex flex-col gap-1 overflow-y-auto">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              selectedFolderId === null ? 'bg-secondary font-medium' : 'hover:bg-secondary/50 text-muted-foreground'
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            All Notes
          </button>
          
          {folders.map(folder => (
            <div key={folder.id} className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
              selectedFolderId === folder.id ? 'bg-secondary font-medium' : 'hover:bg-secondary/50 text-muted-foreground'
            }`}>
              <button
                onClick={() => setSelectedFolderId(folder.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <FolderIcon className="w-4 h-4" />
                {folder.name}
              </button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100" 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm('Delete folder and all its notes?')) {
                    await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
                    setFolders(folders.filter(f => f.id !== folder.id));
                    if (selectedFolderId === folder.id) setSelectedFolderId(null);
                    setNotes(notes.filter(n => n.folderId !== folder.id));
                  }
                }}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'All Notes'}
          </h1>
          <Button onClick={createNote}>
            <Plus className="w-4 h-4 mr-2" />
            New Sticky Note
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-8 pr-2 content-start">
          {filteredNotes.map(note => {
            const colorClass = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
            return (
              <div 
                key={note.id}
                onClick={() => openNote(note)}
                className={`group relative p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all h-64 flex flex-col ${colorClass.bg} ${colorClass.border}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-lg truncate pr-6">{note.title}</h3>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 flex gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/50 hover:bg-background/80" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openNote(note); }}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => deleteNote(note.id, e)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div 
                  className="text-sm text-foreground/80 flex-1 overflow-hidden mask-bottom prose dark:prose-invert prose-sm max-w-none tiptap-preview-wrapper"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                <div className="text-xs text-muted-foreground mt-4 pt-2 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  <Maximize2 className="w-3 h-3 opacity-50" />
                </div>
              </div>
            );
          })}
          {filteredNotes.length === 0 && (
            <div className="col-span-full h-40 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
              No notes found. Create a new sticky note to get started!
            </div>
          )}
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => {
        if (!open) saveNote();
        setIsEditorOpen(open);
      }}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
          <DialogTitle className="sr-only">Edit Note</DialogTitle>
          <DialogHeader className="flex flex-col gap-2 border-b pb-4">
            <div className="flex flex-row items-center justify-between">
              <Input 
                value={activeNote?.title || ''} 
                onChange={e => activeNote && setActiveNote({...activeNote, title: e.target.value})}
                className="text-xl font-bold border-none focus-visible:ring-0 shadow-none px-0"
                placeholder="Note Title"
              />
              <Button onClick={() => { saveNote(); setIsEditorOpen(false); }}>Done</Button>
            </div>
            <div className="flex gap-4">
              <select 
                className="text-sm bg-background text-foreground border rounded p-1 outline-none focus:ring-1 focus:ring-primary"
                value={activeNote?.folderId || ''}
                onChange={e => activeNote && setActiveNote({...activeNote, folderId: e.target.value || null})}
              >
                <option value="">No Folder</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              
              <div className="flex items-center gap-1 ml-2">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => activeNote && setActiveNote({...activeNote, color: c.id})}
                    className={`w-6 h-6 rounded-full border ${c.bg} ${c.border} ${activeNote?.color === c.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                    title={c.id}
                  />
                ))}
              </div>
            </div>
          </DialogHeader>
          
          {/* Tiptap Toolbar */}
          <div className="flex gap-2 p-2 border-b bg-muted/30 flex-wrap">
            <Button variant="outline" size="icon" title="Bold" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? 'bg-secondary' : ''}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" title="Italic" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? 'bg-secondary' : ''}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" title="Heading 2" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={editor?.isActive('heading', { level: 2 }) ? 'bg-secondary' : ''}>
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" title="Bullet List" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? 'bg-secondary' : ''}>
              <List className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-2 self-center" />
            
            <Button variant="outline" size="sm" className="h-8 gap-1 px-2" title="Insert Table" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <TableIcon className="w-4 h-4" /> <span className="text-xs">Table</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 px-2" title="Add Column" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().addColumnBefore().run()} disabled={!editor?.can().addColumnBefore()}>
              <Plus className="w-3 h-3" /> <span className="text-xs">Col</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 px-2 text-destructive" title="Delete Column" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().deleteColumn().run()} disabled={!editor?.can().deleteColumn()}>
              <Minus className="w-3 h-3" /> <span className="text-xs">Col</span>
            </Button>
            <div className="w-px h-6 bg-border mx-1 self-center" />
            <Button variant="outline" size="sm" className="h-8 gap-1 px-2" title="Add Row" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().addRowAfter().run()} disabled={!editor?.can().addRowAfter()}>
              <Plus className="w-3 h-3" /> <span className="text-xs">Row</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 px-2 text-destructive" title="Delete Row" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().deleteRow().run()} disabled={!editor?.can().deleteRow()}>
              <Minus className="w-3 h-3" /> <span className="text-xs">Row</span>
            </Button>
            <div className="w-px h-6 bg-border mx-1 self-center" />
            <Button variant="outline" size="sm" className="h-8 gap-1 px-2" title="Merge Cells" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().mergeCells().run()} disabled={!editor?.can().mergeCells()}>
              <Combine className="w-4 h-4" /> <span className="text-xs">Merge</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 px-2" title="Split Cell" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().splitCell().run()} disabled={!editor?.can().splitCell()}>
              <SplitSquareHorizontal className="w-4 h-4" /> <span className="text-xs">Split</span>
            </Button>
            <Button variant="outline" size="icon" title="Delete Table" className="text-destructive ml-auto" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().deleteTable().run()} disabled={!editor?.can().deleteTable()}>
              <Trash className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 tiptap-editor-wrapper">
            <EditorContent editor={editor} className="min-h-full outline-none prose dark:prose-invert max-w-none" />
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
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}} />
    </div>
  );
}
