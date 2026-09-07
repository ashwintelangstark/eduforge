import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Underline as UnderlineIcon, Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon, List, ListOrdered, Sigma, Sparkles,
  RotateCcw, RotateCw, Eye, EyeOff, Image as ImageIcon, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Trash2, Move, Check, Crop, Wand2
} from 'lucide-react';
import { api } from '../services/api.js';
import { MathTextRenderer } from '../equation/MathTextRenderer.js';
import { MathTypeModal } from './MathTypeModal.js';
import { ImageLibraryModal } from './ImageLibraryModal.js';
import { ImageStudioModal } from './ImageStudioModal.js';

// Custom TipTap Global Extension for Text Alignment (Left, Center, Right, Justify)
export const CustomTextAlign = Extension.create({
  name: 'customTextAlign',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          textAlign: {
            default: 'left',
            parseHTML: element => element.style.textAlign || element.getAttribute('data-align') || 'left',
            renderHTML: attributes => {
              if (!attributes.textAlign || attributes.textAlign === 'left') return {};
              return {
                style: `text-align: ${attributes.textAlign};`,
                'data-align': attributes.textAlign
              };
            }
          }
        }
      }
    ];
  }
});

// Custom TipTap Image Node Extension supporting Width & Alignment
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '50%',
        renderHTML: attributes => {
          let marginStyle = 'margin-left: auto; margin-right: auto;';
          if (attributes.alignment === 'left') marginStyle = 'margin-right: auto; margin-left: 0;';
          if (attributes.alignment === 'right') marginStyle = 'margin-left: auto; margin-right: 0;';
          return {
            width: attributes.width,
            style: `width: ${attributes.width}; max-width: 100%; height: auto; display: block; ${marginStyle}`
          };
        },
        parseHTML: element => element.style.width || element.getAttribute('width') || '50%'
      },
      alignment: {
        default: 'center',
        renderHTML: attributes => {
          let marginStyle = 'margin-left: auto; margin-right: auto;';
          if (attributes.alignment === 'left') marginStyle = 'margin-right: auto; margin-left: 0;';
          if (attributes.alignment === 'right') marginStyle = 'margin-left: auto; margin-right: 0;';
          return {
            'data-alignment': attributes.alignment,
            style: `display: block; ${marginStyle}`
          };
        },
        parseHTML: element => element.getAttribute('data-alignment') || 'center'
      }
    };
  }
});

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  minHeight?: string;
  autoFocus?: boolean;
  className?: string;
  showPreview?: boolean;
  smartAssistantEnabled?: boolean; // kept optional for backwards compat
  onImagePasted?: (url: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const COMMON_MATH_SYMBOLS = [
  { label: 'Ω', latex: '\\Omega' },
  { label: 'α', latex: '\\alpha' },
  { label: 'β', latex: '\\beta' },
  { label: 'θ', latex: '\\theta' },
  { label: 'λ', latex: '\\lambda' },
  { label: 'μ', latex: '\\mu' },
  { label: 'π', latex: '\\pi' },
  { label: 'σ', latex: '\\sigma' },
  { label: 'Δ', latex: '\\Delta' },
  { label: '∞', latex: '\\infty' },
  { label: 'a/b', latex: '\\frac{a}{b}' },
  { label: '√x', latex: '\\sqrt{x}' },
  { label: '±', latex: '\\pm' },
  { label: '≈', latex: '\\approx' },
  { label: '→', latex: '\\rightarrow' },
  { label: '⇌', latex: '\\rightleftharpoons' },
  { label: '°', latex: '^\\circ' },
  { label: '∫', latex: '\\int' },
  { label: '∑', latex: '\\sum' }
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type here or paste images directly...',
  compact = false,
  minHeight,
  autoFocus = false,
  className = '',
  showPreview = false,
  onImagePasted,
  onBlur,
  onKeyDown
}) => {
  const [showMathMenu, setShowMathMenu] = useState(false);
  const [isMathTypeOpen, setIsMathTypeOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [studioImageSrc, setStudioImageSrc] = useState('');
  const [previewOpen, setPreviewOpen] = useState(showPreview);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  const mathMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TipTap Editor instance configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: compact ? false : { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {}
      }),
      Underline,
      Subscript,
      Superscript,
      CustomTextAlign,
      Placeholder.configure({
        placeholder
      }),
      ResizableImage.configure({
        inline: false
      })
    ],
    content: value || '',
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'outline-none focus:outline-none prose prose-sm max-w-none text-black font-sans text-sm',
        spellcheck: 'false',
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    onBlur: () => {
      if (onBlur) onBlur();
    }
  });

  // Keep editor content in sync with incoming `value` prop
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== editor.getText()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  // Close math dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mathMenuRef.current && !mathMenuRef.current.contains(e.target as Node)) {
        setShowMathMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const isImageSelected = editor.isActive('image') || selectedImageSrc !== null;
  const currentImageAttrs = editor.getAttributes('image');

  // Insert Math Symbol
  const insertSymbol = (latex: string) => {
    editor.chain().focus().insertContent(` ${latex} `).run();
    setShowMathMenu(false);
  };

  const handleInsertFormula = (latex: string, isBlock: boolean = false) => {
    if (!editor) return;
    const formatted = isBlock ? `\n\\[ ${latex} \\]\n` : ` \\( ${latex} \\) `;
    editor.chain().focus().insertContent(formatted).run();
  };

  // Helper to read File as Base64 Data URL immediately for instant UI response, plus background sync
  const processAndInsertImageFile = async (file: File) => {
    try {
      // 1. Instantly read local data URL so insertion is immediate (0ms delay)
      const localDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (localDataUrl && editor) {
        editor
          .chain()
          .focus()
          .setImage({
            src: localDataUrl,
            width: '50%',
            alignment: 'center'
          } as any)
          .run();

        setSelectedImageSrc(localDataUrl);

        if (onImagePasted) {
          onImagePasted(localDataUrl);
        }
      }

      // 2. Asynchronously upload to backend/Supabase in background without blocking UI
      api.uploadImage(file).then(res => {
        if (res?.url && editor) {
          // If remote upload succeeded, upgrade the image src in the document
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.src === localDataUrl) {
              editor.chain().setNodeSelection(pos).updateAttributes('image', { src: res.url }).run();
              setSelectedImageSrc(res.url);
              onChange(editor.getHTML());
              return false;
            }
          });
          if (onImagePasted) {
            onImagePasted(res.url);
          }
        }
      }).catch(err => {
        console.warn('Background image upload to cloud deferred, using local data URL:', err);
      });
    } catch (err) {
      console.error('Error processing image:', err);
    }
  };

  const insertImageUrl = (url: string) => {
    if (url && editor) {
      editor
        .chain()
        .focus()
        .setImage({
          src: url,
          width: '50%',
          alignment: 'center'
        } as any)
        .run();

      setSelectedImageSrc(url);

      if (onImagePasted) {
        onImagePasted(url);
      }
    }
  };

  // Handle Drag & Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        await processAndInsertImageFile(file);
      }
      return;
    }

    try {
      const text = e.dataTransfer.getData('text/plain') || '';
      if (text && editor) {
        editor.chain().focus().insertContent(` ${text} `).run();
      }
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  // CRITICAL: Handle Ctrl+C / Ctrl+V System Clipboard Image Pasting
  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      e.stopPropagation();

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          await processAndInsertImageFile(file);
        }
      }
    }
  };

  // Manual File Upload Button Handler
  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      for (const file of files) {
        await processAndInsertImageFile(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Alignment Commands for Paragraphs, Headings & Images
  const setNodeTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    if (editor) {
      editor.chain().focus().updateAttributes('paragraph', { textAlign: align }).run();
      editor.chain().focus().updateAttributes('heading', { textAlign: align }).run();
      if (isImageSelected) {
        setImageAlignment(align === 'justify' ? 'center' : align);
      }
    }
  };

  const getIsTextAlignActive = (align: string) => {
    if (!editor) return false;
    const pAttrs = editor.getAttributes('paragraph');
    const hAttrs = editor.getAttributes('heading');
    return pAttrs.textAlign === align || hAttrs.textAlign === align;
  };

  // Image Alignment & Width Actions
  const setImageAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (editor) {
      editor.chain().focus().updateAttributes('image', { alignment }).run();
    }
  };

  const setImageWidth = (width: string) => {
    if (editor) {
      editor.chain().focus().updateAttributes('image', { width }).run();
    }
  };

  const deleteSelectedImage = () => {
    if (editor) {
      editor.chain().focus().deleteSelection().run();
      setSelectedImageSrc(null);
    }
  };

  // Editor content click handler for image selection
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const imgEl = (target.tagName === 'IMG' ? target : target.closest('img')) as HTMLImageElement | null;

    if (imgEl) {
      document.querySelectorAll('.ProseMirror img').forEach(img => {
        img.classList.remove('selected-img');
        img.removeAttribute('data-selected');
      });
      setSelectedImageSrc(imgEl.src);
      imgEl.classList.add('selected-img');
      imgEl.setAttribute('data-selected', 'true');
    } else {
      // If clicking inside toolbar or controls, do not deselect
      if (!target.closest('.image-toolbar-container') && !target.closest('button')) {
        setSelectedImageSrc(null);
        document.querySelectorAll('.ProseMirror img').forEach(img => {
          img.classList.remove('selected-img');
          img.removeAttribute('data-selected');
        });
      }
    }
  };

  const handleEditorDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const imgEl = (target.tagName === 'IMG' ? target : target.closest('img')) as HTMLImageElement | null;
    if (imgEl && imgEl.src) {
      setSelectedImageSrc(imgEl.src);
      setStudioImageSrc(imgEl.src);
      setIsImageStudioOpen(true);
    }
  };

  const openImageStudio = () => {
    let src = selectedImageSrc || currentImageAttrs?.src;
    if (!src && editor) {
      const { selection } = editor.state;
      const selectedNode = (selection as any)?.node;
      if (selectedNode?.type?.name === 'image') {
        src = selectedNode.attrs?.src;
      }
    }
    if (!src) {
      const selectedImgEl = document.querySelector('.ProseMirror img.selected-img, .ProseMirror img[data-selected="true"], .ProseMirror img') as HTMLImageElement;
      if (selectedImgEl) src = selectedImgEl.src;
    }
    if (src) {
      setStudioImageSrc(src);
      setIsImageStudioOpen(true);
    }
  };

  const handleStudioSave = async (newBase64: string) => {
    if (!newBase64 || newBase64.length < 50 || !editor) return;

    let finalUrl = newBase64;
    try {
      if (newBase64.startsWith('data:image/')) {
        const res = await api.uploadBase64Image(newBase64, undefined, `rte_img_${Date.now()}`);
        if (res?.url) {
          finalUrl = res.url;
        }
      }
    } catch (err) {
      console.warn('RTE studio upload fallback:', err);
    }

    // 1. Update matching image nodes across TipTap document
    const { state } = editor;
    let updated = false;

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const width = node.attrs.width || '50%';
        const alignment = node.attrs.alignment || 'center';
        editor.chain().focus().setNodeSelection(pos).setImage({ src: finalUrl, width, alignment } as any).run();
        updated = true;
        return false;
      }
    });

    if (!updated) {
      const currentHtml = editor.getHTML();
      if (/<img/i.test(currentHtml)) {
        const replacedHtml = currentHtml.replace(/<img[^>]*src=["'][^"']*["'][^>]*>/i, `<img src="${finalUrl}" />`);
        editor.commands.setContent(replacedHtml, { emitUpdate: true });
        onChange(replacedHtml);
      } else {
        editor.chain().focus().setImage({ src: finalUrl, width: '50%', alignment: 'center' } as any).run();
      }
    }

    // 2. Direct DOM image src update for instant UI feedback
    const activeImgs = document.querySelectorAll('img.selected-img, img[data-selected="true"], .ProseMirror img');
    activeImgs.forEach(img => {
      (img as HTMLImageElement).src = finalUrl;
    });

    setSelectedImageSrc(finalUrl);

    if (onImagePasted) {
      onImagePasted(finalUrl);
    }

    // 3. Immediately emit onChange with updated HTML content to parent component
    const updatedHtml = editor.getHTML();
    onChange(updatedHtml);
  };

  const activeMinHeight = minHeight || (compact ? 'min-h-[44px]' : 'min-h-[220px]');

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onClick={handleEditorClick}
      onDoubleClick={handleEditorDoubleClick}
      className={`rounded-lg border border-slate-300 bg-white transition-all focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-500/20 overflow-hidden shadow-2xs relative ${className}`}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUploadChange}
        className="hidden"
      />

      {/* SPECIAL FLOATING CONTEXT TOOLBAR WHEN AN IMAGE IS SELECTED */}
      {isImageSelected && (
        <div className="image-toolbar-container flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200 bg-indigo-50/90 px-3 py-1.5 text-xs text-indigo-900 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1 font-bold text-[11px]">
            <Move className="w-3.5 h-3.5 text-indigo-600" />
            <span>Selected Image Controls:</span>
          </div>

          {/* Align Options */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Align:</span>
            <button
              type="button"
              onClick={() => setImageAlignment('left')}
              className={`p-1 rounded hover:bg-indigo-100 transition-colors ${
                currentImageAttrs?.alignment === 'left' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 bg-white border border-slate-200'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setImageAlignment('center')}
              className={`p-1 rounded hover:bg-indigo-100 transition-colors ${
                currentImageAttrs?.alignment === 'center' || !currentImageAttrs?.alignment
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-700 bg-white border border-slate-200'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setImageAlignment('right')}
              className={`p-1 rounded hover:bg-indigo-100 transition-colors ${
                currentImageAttrs?.alignment === 'right' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 bg-white border border-slate-200'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-indigo-200" />

          {/* Size Presets */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Size:</span>
            {['25%', '50%', '75%', '100%'].map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => setImageWidth(sz)}
                className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                  currentImageAttrs?.width === sz
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-indigo-200" />

          {/* Custom Width Slider */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Custom Width:</span>
            <input
              type="range"
              min="10"
              max="100"
              value={parseInt(currentImageAttrs?.width || '50', 10) || 50}
              onChange={e => setImageWidth(`${e.target.value}%`)}
              className="w-20 accent-indigo-600 cursor-pointer h-1.5"
              title="Adjust Image Width %"
            />
          </div>

          <div className="h-4 w-px bg-indigo-200" />

          {/* Launch Image Studio (Crop, Un-skew & Filters) */}
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              openImageStudio();
            }}
            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Open Image Studio for Perspective Smart Crop, Normal Crop & Document Scanner Filters"
          >
            <Wand2 className="w-3 h-3" />
            <span>Crop, Filter & Enhance</span>
          </button>

          <div className="h-4 w-px bg-indigo-200" />

          {/* Delete Image */}
          <button
            type="button"
            onClick={deleteSelectedImage}
            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors cursor-pointer"
            title="Delete Image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Top Formatting Ribbon / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1 select-none">
        <div className="flex flex-wrap items-center gap-0.5 text-slate-700">
          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700 font-black' : ''
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700 font-black' : ''
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              editor.isActive('underline') ? 'bg-indigo-100 text-indigo-700 font-black' : ''
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

          {/* Superscript */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              editor.isActive('superscript') ? 'bg-indigo-100 text-indigo-700 font-black' : ''
            }`}
            title="Superscript (e.g. x²)"
          >
            <SuperscriptIcon className="w-3.5 h-3.5" />
          </button>

          {/* Subscript */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              editor.isActive('subscript') ? 'bg-indigo-100 text-indigo-700 font-black' : ''
            }`}
            title="Subscript (e.g. H₂O)"
          >
            <SubscriptIcon className="w-3.5 h-3.5" />
          </button>

          {/* Add Image Button */}
          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="p-1 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Select Image from Library or Upload (or paste via Ctrl+V)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
          </button>

          <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

          {/* TEXT & BLOCK ALIGNMENT BUTTONS */}
          <button
            type="button"
            onClick={() => setNodeTextAlign('left')}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              getIsTextAlignActive('left') ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setNodeTextAlign('center')}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              getIsTextAlignActive('center') ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setNodeTextAlign('right')}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              getIsTextAlignActive('right') ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`}
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setNodeTextAlign('justify')}
            className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
              getIsTextAlignActive('justify') ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`}
            title="Align Justify"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          {!compact && (
            <>
              <div className="h-3.5 w-px bg-slate-300 mx-0.5" />
              {/* Bullet List */}
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
                  editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : ''
                }`}
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              {/* Numbered List */}
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
                  editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : ''
                }`}
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

          {/* MathType Formula Editor Button */}
          <button
            type="button"
            onClick={() => setIsMathTypeOpen(true)}
            className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded flex items-center gap-1 text-[11px] font-extrabold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            title="Open MathType Visual Formula Editor Studio"
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>MathType</span>
          </button>

          {/* Quick Symbols Dropdown */}
          <div className="relative" ref={mathMenuRef}>
            <button
              type="button"
              onClick={() => setShowMathMenu(!showMathMenu)}
              className={`p-1 rounded flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                showMathMenu ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-50'
              }`}
              title="Quick Greek & Math Symbols"
            >
              <span className="text-[10px] font-mono font-black">αβγ</span>
            </button>

            {/* Quick Symbols Grid */}
            {showMathMenu && (
              <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white border border-slate-300 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                {COMMON_MATH_SYMBOLS.map((sym, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => insertSymbol(sym.latex)}
                    className="p-1.5 text-center font-mono font-bold hover:bg-indigo-50 hover:text-indigo-700 rounded border border-slate-200 transition-all text-slate-800 cursor-pointer"
                    title={sym.latex}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right tools (Undo / Redo / KaTeX Preview) */}
        <div className="flex items-center gap-1 text-slate-500">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          {!compact && (
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className={`p-1 rounded transition-colors text-[10px] flex items-center gap-1 font-bold cursor-pointer ${
                previewOpen ? 'bg-sky-100 text-sky-800' : 'hover:bg-slate-200'
              }`}
              title="Toggle Live Formula & Layout Preview"
            >
              {previewOpen ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* TipTap Editable Content Area with Generous Height */}
      <div className={`p-4 text-slate-900 leading-relaxed font-medium ${activeMinHeight}`}>
        <EditorContent
          editor={editor}
          onKeyDown={onKeyDown}
          className="outline-hidden focus:outline-hidden prose prose-sm max-w-none text-black font-sans text-sm"
        />
      </div>

      {/* Live KaTeX Formula & Layout Preview */}
      {previewOpen && value && (
        <div className="border-t border-slate-200 bg-sky-50/50 p-3 text-xs">
          <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Live Equation & Formatting Preview:
          </div>
          <div className="text-slate-900 font-semibold">
            <MathTextRenderer text={value} />
          </div>
        </div>
      )}

      {/* MathType Visual Formula Editor Studio Modal */}
      <MathTypeModal
        isOpen={isMathTypeOpen}
        onClose={() => setIsMathTypeOpen(false)}
        onInsertFormula={handleInsertFormula}
      />

      {/* Image Library & Upload Picker Modal */}
      <ImageLibraryModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={url => insertImageUrl(url)}
      />

      {/* Image Studio (Smart Perspective Crop, Normal Crop & Scanner Filters) */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        imageSrc={studioImageSrc}
        onClose={() => setIsImageStudioOpen(false)}
        onSave={handleStudioSave}
      />
    </div>
  );
};
