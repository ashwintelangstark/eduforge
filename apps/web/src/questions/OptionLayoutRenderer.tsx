import React, { useState, useEffect, useRef } from 'react';
import { QuestionOption, OptionLayoutType } from '@eduforge/shared';
import { MathTextRenderer, resolveImageUrl } from '../equation/MathTextRenderer.js';
import { RichTextEditor } from '../components/RichTextEditor.js';
import { api } from '../services/api.js';
import { Edit3, Check, Sparkles, Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';

interface OptionLayoutRendererProps {
  options: QuestionOption[];
  layoutType: OptionLayoutType;
  showAnswers?: boolean;
  onSelectOption?: (optionId: string) => void;
  onUpdateOptionText?: (optionId: string, newText: string) => void;
  onUpdateOptionImage?: (optionId: string, imageUrl?: string) => void;
  onToggleCorrectOption?: (optionId: string) => void;
  onRemoveOption?: (optionId: string) => void;
  className?: string;
  textColorClass?: string;
  isEditable?: boolean;
}

const EditableOptionItem: React.FC<{
  opt: QuestionOption;
  label: string;
  isCorrect: boolean;
  showAnswers: boolean;
  isEditable: boolean;
  onSelectOption?: (optionId: string) => void;
  onUpdateOptionText?: (optionId: string, newText: string) => void;
  onUpdateOptionImage?: (optionId: string, imageUrl?: string) => void;
  onToggleCorrectOption?: (optionId: string) => void;
  onRemoveOption?: (optionId: string) => void;
  textColorClass: string;
}> = ({
  opt,
  label,
  isCorrect,
  showAnswers,
  isEditable,
  onSelectOption,
  onUpdateOptionText,
  onUpdateOptionImage,
  onToggleCorrectOption,
  onRemoveOption,
  textColorClass
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [optText, setOptText] = useState(opt.rawText || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOptText(opt.rawText || '');
  }, [opt.rawText]);

  // Drop handler: drop science formulas/constants directly into this option
  const handleDropOnOption = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const eduData = e.dataTransfer.getData('application/eduforge-item');
      let inserted = '';
      if (eduData) {
        const item = JSON.parse(eduData);
        inserted = item.latex || item.symbol || item.value || item.formula || '';
      } else {
        inserted = e.dataTransfer.getData('text/plain') || '';
      }

      if (inserted && onUpdateOptionText) {
        const current = opt.rawText || '';
        const updated = current ? `${current} ${inserted}` : inserted;
        setOptText(updated);
        onUpdateOptionText(opt.id, updated);
      }
    } catch (err) {
      console.error('Error dropping on option:', err);
    }
  };

  const handleCommitText = () => {
    setIsEditing(false);
    if (onUpdateOptionText && optText !== opt.rawText) {
      onUpdateOptionText(opt.id, optText);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateOptionImage) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const localDataUrl = reader.result as string;
        onUpdateOptionImage(opt.id, localDataUrl);
      };
      reader.readAsDataURL(file);

      api.uploadImage(file).then(res => {
        if (res?.url) onUpdateOptionImage(opt.id, res.url);
      }).catch(err => console.warn('Background option image upload deferred:', err));
    } catch (err) {
      console.error('Option image upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Copy-paste handler for images on option item
  const handlePasteOnOption = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    if (imageItems.length > 0 && onUpdateOptionImage) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const file = imageItems[0].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const localDataUrl = reader.result as string;
            onUpdateOptionImage(opt.id, localDataUrl);
          };
          reader.readAsDataURL(file);

          api.uploadImage(file).then(res => {
            if (res?.url) onUpdateOptionImage(opt.id, res.url);
          }).catch(err => console.warn('Background option image upload deferred:', err));
        }
      } catch (err) {
        console.error('Error pasting image to option:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getOptionTextContent = (option: QuestionOption): string => {
    if (option.rawText && option.rawText.trim()) return option.rawText.trim();
    if (typeof option.content === 'string') return option.content;
    if (Array.isArray(option.content)) {
      return JSON.stringify(option.content);
    }
    if (option.content && typeof option.content === 'object') {
      return JSON.stringify(option.content);
    }
    return '';
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={handleDropOnOption}
      onPaste={handlePasteOnOption}
      className={`flex items-start gap-1.5 text-sm leading-snug p-1 rounded-md transition-all group/opt ${
        isCorrect && showAnswers ? 'bg-emerald-50 text-emerald-950 font-bold' : ''
      } ${textColorClass}`}
    >
      {/* Option Key Label (a), (b) etc. */}
      <span
        onClick={() => onToggleCorrectOption && onToggleCorrectOption(opt.id)}
        className={`font-black min-w-[24px] select-none text-slate-800 shrink-0 ${
          isEditable ? 'cursor-pointer hover:text-emerald-700' : ''
        }`}
        title={isEditable ? 'Click to toggle correct answer' : undefined}
      >
        {label}
      </span>

      <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-2.5 min-w-0">
        {/* Option Image Rendering (Rendered side-by-side with statement text) */}
        {(opt.imageUrl || (opt as any).image_url) && (() => {
          const rawUrl = opt.imageUrl || (opt as any).image_url;
          const imgSrc = resolveImageUrl(rawUrl);
          return (
            <div className="relative group/optimg shrink-0 my-0.5">
              <img
                src={imgSrc}
                alt={`Option ${label}`}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    const cur = target.src;
                    if (cur.includes('/uploads/') && !cur.includes('/api/uploads/')) {
                      target.src = cur.replace('/uploads/', '/api/uploads/');
                      return;
                    }
                    if (cur.includes('/api/assets/') && !cur.includes('/raw/')) {
                      target.src = cur.replace('/api/assets/', '/api/assets/raw/');
                      return;
                    }
                  }
                }}
                className="max-h-48 max-w-[240px] h-auto rounded border border-slate-200 bg-white p-1 object-contain shadow-2xs"
              />
              {isEditable && onUpdateOptionImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateOptionImage(opt.id, undefined);
                  }}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 opacity-0 group-hover/optimg:opacity-100 transition-opacity text-[10px] cursor-pointer shadow-xs no-print"
                  title="Remove option image"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })()}

        {/* Option SVG Diagram Rendering */}
        {opt.diagramSvg && (
          <div className="shrink-0 my-0.5 max-h-20 max-w-[140px] rounded border border-slate-200 bg-white p-0.5 overflow-hidden flex items-center justify-center shadow-2xs">
            <div className="w-full h-full scale-90" dangerouslySetInnerHTML={{ __html: opt.diagramSvg }} />
          </div>
        )}

        {/* Option Body (Editable & Formatted as Equation with TipTap) */}
        {isEditing && isEditable ? (
          <div className="flex-1 w-full my-0.5">
            <RichTextEditor
              compact
              autoFocus
              value={optText}
              onChange={val => {
                setOptText(val);
                if (onUpdateOptionText) onUpdateOptionText(opt.id, val);
              }}
              onImagePasted={url => {
                if (onUpdateOptionImage) onUpdateOptionImage(opt.id, url);
              }}
              onBlur={handleCommitText}
              className="w-full"
            />
            <button
              type="button"
              onClick={handleCommitText}
              className="mt-1 px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div
            onClick={(e) => {
              if (isEditable && onUpdateOptionText) {
                e.stopPropagation();
                setIsEditing(true);
              } else if (onSelectOption) {
                onSelectOption(opt.id);
              }
            }}
            className={`font-semibold flex-1 ${
              isEditable
                ? 'cursor-pointer hover:bg-sky-50/70 hover:border-sky-300 border border-transparent rounded px-1 transition-all'
                : ''
            }`}
            title={isEditable ? 'Click to edit option text or drop science formula' : undefined}
          >
            {(() => {
              const textVal = getOptionTextContent(opt);
              if (textVal) {
                return <MathTextRenderer text={textVal} />;
              }
              if (!opt.imageUrl && !opt.diagramSvg) {
                return <span className="text-slate-400 italic text-xs">Empty option...</span>;
              }
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Correct answer indicator */}
      {showAnswers && isCorrect && (
        <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
          Ans
        </span>
      )}

      {/* Quick Actions (Add image / Remove option) */}
      {isEditable && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/opt:opacity-100 transition-opacity no-print shrink-0">
          {onUpdateOptionImage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
                className="p-0.5 text-slate-400 hover:text-amber-600 rounded transition-colors cursor-pointer"
                title="Attach image from local system to this option"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              </button>
            </>
          )}

          {onRemoveOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveOption(opt.id);
              }}
              className="p-0.5 text-slate-400 hover:text-red-600 rounded transition-opacity cursor-pointer"
              title="Remove option"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const OptionLayoutRenderer: React.FC<OptionLayoutRendererProps> = ({
  options,
  layoutType,
  showAnswers = false,
  onSelectOption,
  onUpdateOptionText,
  onUpdateOptionImage,
  onToggleCorrectOption,
  onRemoveOption,
  className = '',
  textColorClass = 'text-current',
  isEditable = false
}) => {
  if (!options || options.length === 0) return null;

  const getOptionKeyLabel = (opt: QuestionOption, index: number) => {
    if (layoutType === 'grid_2x2_upper') {
      return `${String.fromCharCode(65 + index)}.`;
    }
    const key = opt.key || String.fromCharCode(97 + index);
    return `(${key})`;
  };

  // 2x2 Grid Layout (default for 4 options)
  if ((layoutType === 'grid_2x2' || layoutType === 'grid_2x2_upper' || layoutType === 'auto') && options.length === 4) {
    return (
      <div className={`grid grid-cols-2 gap-x-6 gap-y-1.5 my-1.5 pl-4 ${className}`}>
        {options.map((opt, idx) => (
          <EditableOptionItem
            key={opt.id || idx}
            opt={opt}
            label={getOptionKeyLabel(opt, idx)}
            isCorrect={Boolean(opt.isCorrect)}
            showAnswers={showAnswers}
            isEditable={isEditable}
            onSelectOption={onSelectOption}
            onUpdateOptionText={onUpdateOptionText}
            onUpdateOptionImage={onUpdateOptionImage}
            onToggleCorrectOption={onToggleCorrectOption}
            onRemoveOption={onRemoveOption}
            textColorClass={textColorClass}
          />
        ))}
      </div>
    );
  }

  // Horizontal Inline Layout
  if (layoutType === 'horizontal') {
    return (
      <div className={`flex flex-wrap items-center gap-x-6 gap-y-1.5 my-1.5 pl-4 ${className}`}>
        {options.map((opt, idx) => (
          <EditableOptionItem
            key={opt.id || idx}
            opt={opt}
            label={getOptionKeyLabel(opt, idx)}
            isCorrect={Boolean(opt.isCorrect)}
            showAnswers={showAnswers}
            isEditable={isEditable}
            onSelectOption={onSelectOption}
            onUpdateOptionText={onUpdateOptionText}
            onUpdateOptionImage={onUpdateOptionImage}
            onToggleCorrectOption={onToggleCorrectOption}
            onRemoveOption={onRemoveOption}
            textColorClass={textColorClass}
          />
        ))}
      </div>
    );
  }

  // Vertical Stack Layout (Default fallback)
  return (
    <div className={`flex flex-col gap-y-1.5 my-1.5 pl-4 ${className}`}>
      {options.map((opt, idx) => (
        <EditableOptionItem
          key={opt.id || idx}
          opt={opt}
          label={getOptionKeyLabel(opt, idx)}
          isCorrect={Boolean(opt.isCorrect)}
          showAnswers={showAnswers}
          isEditable={isEditable}
          onSelectOption={onSelectOption}
          onUpdateOptionText={onUpdateOptionText}
          onUpdateOptionImage={onUpdateOptionImage}
          onToggleCorrectOption={onToggleCorrectOption}
          onRemoveOption={onRemoveOption}
          textColorClass={textColorClass}
        />
      ))}
    </div>
  );
};
