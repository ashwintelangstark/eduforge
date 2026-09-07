import React, { useState, useRef, useEffect } from 'react';
import { Upload, Edit3, Trash2, Image as ImageIcon, Check, Search, X, RotateCw, ZoomIn, Eye, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';
import { apiCache } from '../services/apiCache.js';
import { resolveImageUrl } from '../equation/MathTextRenderer.js';

interface MediaAsset {
  id: string;
  name: string;
  label: string;
  url: string;
  storagePath?: string;
  usesCount: number;
}

export const MediaLibraryPage: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [lightboxAsset, setLightboxAsset] = useState<MediaAsset | null>(null);

  // Selected file state for upload modal
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async (force = false) => {
    if (force) {
      setIsRefreshing(true);
      apiCache.invalidate('media');
    } else {
      setIsLoading(true);
    }
    try {
      const mediaItems = await api.getMedia(undefined, force);
      setAssets(mediaItems || []);
    } catch (err) {
      console.error('Failed to load media assets:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleOpenEdit = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditLabel(asset.label);
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this media asset?')) {
      setAssets(prev => prev.filter(a => a.id !== id));
      await api.deleteMedia(id);
      loadData(true);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !editName.trim()) return;

    setAssets(prev =>
      prev.map(a =>
        a.id === editingAsset.id
          ? { ...a, name: editName.trim(), label: editLabel.trim().toUpperCase() || 'FIGURE' }
          : a
      )
    );

    setEditingAsset(null);
    setIsEditOpen(false);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: { file: File; url: string }[] = [];
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      newItems.push({ file, url });
    });
    setSelectedFiles(prev => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Perform upload to Supabase bucket
  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one image file to upload.');
      return;
    }

    setIsUploading(true);
    try {
      for (const item of selectedFiles) {
        await api.uploadAsset(item.file, 'general');
      }
      setSelectedFiles([]);
      setIsUploadOpen(false);
      await loadData(true);
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Filter assets by search query
  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchesSearch = (a.name || '').toLowerCase().includes(q) ||
                            (a.label || '').toLowerCase().includes(q) ||
                            (a.storagePath || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 font-sans animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
            Media & Asset Library
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage diagrams, question illustrations, and figure images ({filteredAssets.length} image assets accessible).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh Image Library"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedFiles([]);
              setIsUploadOpen(true);
            }}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Images
          </button>
        </div>
      </div>

      {/* Search Bar Row */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search images, formulas, or diagrams..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 pr-2">
          {filteredAssets.length} Image{filteredAssets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid of Images */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
          <span>Loading Media Library...</span>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No media assets found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload images and diagrams to store them in the image library and easily attach them to questions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map(asset => {
            const resolved = resolveImageUrl(asset.url);
            return (
              <div
                key={asset.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Image Preview */}
                <div
                  onClick={() => setLightboxAsset(asset)}
                  className="h-40 bg-slate-50 relative overflow-hidden flex items-center justify-center p-2 cursor-pointer"
                >
                  <img
                    src={resolved}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = 'true';
                        const cur = target.src;
                        if (cur.includes('/uploads/') && !cur.includes('/api/uploads/')) {
                          target.src = cur.replace('/uploads/', '/api/uploads/');
                          return;
                        }
                      }
                      target.style.opacity = '0.5';
                    }}
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/75 backdrop-blur-xs text-white text-[9px] font-extrabold uppercase rounded-md">
                    {asset.label}
                  </span>
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>

                {/* Asset Meta & Actions */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-white">
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate" title={asset.name}>
                      {asset.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {asset.storagePath || 'bucket/question-assets'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(asset)}
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Name"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(asset.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxAsset && (
        <div
          onClick={() => setLightboxAsset(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col items-center gap-3"
          >
            <button
              type="button"
              onClick={() => setLightboxAsset(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-slate-800 self-start pr-8">{lightboxAsset.name}</h3>
            <img
              src={resolveImageUrl(lightboxAsset.url)}
              alt={lightboxAsset.name}
              className="max-h-[70vh] max-w-full object-contain rounded-lg border border-slate-200"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.triedFallback) {
                  target.dataset.triedFallback = 'true';
                  const cur = target.src;
                  if (cur.includes('/uploads/') && !cur.includes('/api/uploads/')) {
                    target.src = cur.replace('/uploads/', '/api/uploads/');
                  }
                }
              }}
            />
            <div className="flex items-center justify-between w-full text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-semibold uppercase text-[10px] px-2 py-0.5 bg-slate-100 rounded">{lightboxAsset.label}</span>
              <button
                type="button"
                onClick={() => setLightboxAsset(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-bold text-sm text-slate-900">
              <span>Upload Images & Diagrams</span>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drag & Drop Area */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => handleFileSelect(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-teal-600 bg-slate-50/50 hover:bg-teal-50/20 rounded-2xl p-6 text-center space-y-2 cursor-pointer transition-all flex flex-col items-center justify-center"
            >
              <Upload className="w-8 h-8 text-teal-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                  DRAG & DROP IMAGE HERE
                </span>
                <span className="text-[11px] text-teal-700 font-bold underline mt-1 block">
                  or click to Browse Files from device
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Supports PNG, JPG, WEBP, SVG
              </span>
            </div>

            {/* Selected File Previews */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-slate-600 uppercase">
                  Selected ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}):
                </div>
                {selectedFiles.map((sf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold text-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img src={sf.url} alt="" className="w-6 h-6 object-cover rounded shrink-0" />
                      <span className="truncate">{sf.file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedFiles.length === 0 || isUploading}
                onClick={handleUploadSubmit}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                {isUploading ? (
                  <span>Uploading...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Upload Images
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Media Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-bold text-sm text-slate-900">
              <span>Edit Asset Details</span>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Asset Label / Caption</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
