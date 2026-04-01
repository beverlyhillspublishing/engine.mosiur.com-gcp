'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  HardDrive, FolderIcon, FileIcon, Upload, FolderPlus, Trash2,
  ChevronRight, Home, Download, ImageIcon, FileText, Film,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

function formatBytes(bytes: number | bigint) {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-400" />;
  if (mimeType.startsWith('video/')) return <Film className="w-8 h-8 text-purple-400" />;
  if (mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-red-400" />;
  return <FileIcon className="w-8 h-8 text-slate-400" />;
}

interface DriveFolder { id: string; name: string; color: string; _count?: { files: number; children: number } }
interface DriveFile { id: string; name: string; mimeType: string; size: bigint; createdAt: string }

export default function DrivePage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();

  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [breadcrumb, setBreadcrumb] = useState<{ id?: string; name: string }[]>([{ id: undefined, name: 'Drive' }]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { data: folders = [] } = useQuery({
    queryKey: ['drive-folders', orgId, folderId],
    queryFn: () => api.drive.folders.list(folderId).then((r) => r.data as DriveFolder[]),
    enabled: !!orgId,
  });

  const { data: files = [] } = useQuery({
    queryKey: ['drive-files', orgId, folderId],
    queryFn: () => api.drive.files.list(folderId).then((r) => r.data as DriveFile[]),
    enabled: !!orgId,
  });

  const createFolderMutation = useMutation({
    mutationFn: () => api.drive.folders.create({ name: newFolderName, parentId: folderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive-folders', orgId, folderId] });
      setNewFolderOpen(false);
      setNewFolderName('');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => api.drive.folders.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drive-folders', orgId, folderId] }),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => api.drive.files.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drive-files', orgId, folderId] }),
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        const { data } = await api.drive.files.requestUploadUrl(file.name, file.type, file.size, folderId);
        const { uploadUrl, fileId } = data;

        // Upload directly to GCS
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        await api.drive.files.confirmUpload(fileId);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        qc.invalidateQueries({ queryKey: ['drive-files', orgId, folderId] });
      } catch {
        setUploadProgress((prev) => { const n = { ...prev }; delete n[file.name]; return n; });
      }
    }
  }, [folderId, orgId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const navigateToFolder = (folder: DriveFolder) => {
    setFolderId(folder.id);
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToCrumb = (index: number) => {
    const crumb = breadcrumb[index];
    setFolderId(crumb.id);
    setBreadcrumb(breadcrumb.slice(0, index + 1));
  };

  const handleDownload = async (file: DriveFile) => {
    const { data } = await api.drive.files.getDownloadUrl(file.id);
    window.open(data.url, '_blank');
  };

  return (
    <div className="p-8 h-full flex flex-col" {...getRootProps()}>
      <input {...getInputProps()} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Drive</h1>
          <p className="text-slate-500 mt-1">Your files, organized</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewFolderOpen(true)}><FolderPlus className="w-4 h-4 mr-2" />New Folder</Button>
          <label className="cursor-pointer">
            <Button asChild><span><Upload className="w-4 h-4 mr-2" />Upload</span></Button>
            <input type="file" multiple className="hidden" onChange={(e) => onDrop(Array.from(e.target.files || []))} />
          </label>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-sm text-slate-600">
        {breadcrumb.map((crumb, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
            <button
              className={i === breadcrumb.length - 1 ? 'font-medium text-slate-900' : 'hover:text-primary'}
              onClick={() => navigateToCrumb(i)}
            >
              {i === 0 ? <Home className="w-4 h-4" /> : crumb.name}
            </button>
          </div>
        ))}
      </div>

      {isDragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-4 border-dashed border-primary rounded-xl pointer-events-none">
          <p className="text-2xl font-bold text-primary">Drop files here</p>
        </div>
      )}

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-4 space-y-1">
          {Object.entries(uploadProgress).map(([name, progress]) => (
            <div key={name} className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 p-2 rounded">
              <Upload className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="flex-1 truncate">{name}</span>
              <Badge variant="secondary">{progress === 100 ? 'Done' : 'Uploading...'}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {folders.length === 0 && files.length === 0 && (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
            <HardDrive className="w-16 h-16 text-slate-300" />
            <p className="text-slate-500">Drop files here or click Upload to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                <button
                  className="w-full p-3 rounded-xl border bg-white hover:bg-slate-50 transition-colors text-left"
                  onDoubleClick={() => navigateToFolder(folder)}
                  onClick={() => navigateToFolder(folder)}
                >
                  <FolderIcon className="w-8 h-8 mb-2" style={{ color: folder.color }} />
                  <p className="text-sm font-medium truncate">{folder.name}</p>
                  <p className="text-xs text-slate-400">{folder._count?.files || 0} files</p>
                </button>
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-white shadow text-red-500 hover:text-red-700"
                  onClick={(e) => { e.stopPropagation(); deleteFolderMutation.mutate(folder.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Files</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {files.map((file) => (
              <div key={file.id} className="group relative">
                <div className="w-full p-3 rounded-xl border bg-white">
                  {getFileIcon(file.mimeType)}
                  <p className="text-sm font-medium truncate mt-2">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                  <p className="text-xs text-slate-400">{formatDate(file.createdAt)}</p>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                  <button className="p-1 rounded bg-white shadow text-slate-600 hover:text-primary" onClick={() => handleDownload(file)}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 rounded bg-white shadow text-red-500 hover:text-red-700" onClick={() => deleteFileMutation.mutate(file.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolderMutation.mutate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => createFolderMutation.mutate()} disabled={!newFolderName || createFolderMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
