import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Template, DocumentModel, DocumentSection } from '@eduforge/shared';
import { RichTextEditor } from '../components/RichTextEditor.js';
import { FilePlus, X, Check, ArrowRight, ArrowLeft, Columns, Settings2, BookOpen, Plus, Trash2 } from 'lucide-react';
import { getUserProfile } from '../utils/userProfile.js';

interface PaperWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePaper: (doc: Partial<DocumentModel>) => void;
}

export const PaperWizardModal: React.FC<PaperWizardModalProps> = ({
  isOpen,
  onClose,
  onCreatePaper
}) => {
  const user = getUserProfile();
  const [step, setStep] = useState<number>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const userSubject = user.assigned_subject || 'All';
  const defaultSubjectStr = userSubject !== 'All' ? userSubject : 'Physics & Chemistry';

  // Paper info fields
  const [paperTitle, setPaperTitle] = useState(`${defaultSubjectStr} Assessment Test 2026`);
  const [instituteName, setInstituteName] = useState('APEX INSTITUTE OF SCIENCE & TECHNOLOGY');
  const [examName, setExamName] = useState('ALL INDIA PRE-MEDICAL & ENGINEERING ENTRANCE');
  const [subject, setSubject] = useState(defaultSubjectStr);
  const [timeAllowedMinutes, setTimeAllowedMinutes] = useState(180);
  const [maxMarks, setMaxMarks] = useState(180);
  const [generalInstructions, setGeneralInstructions] = useState<string[]>([
    'Total duration of test is 3 Hours (180 Minutes).',
    'Each correct MCQ response awards +4 marks; incorrect deducts -1 mark.',
    'Calculators and smart devices are strictly prohibited.'
  ]);

  // Sections
  const [sections, setSections] = useState<{ title: string; instructions: string; marks: number }[]>(() => {
    if (userSubject !== 'All') {
      return [{ title: `SECTION A: ${userSubject.toUpperCase()}`, instructions: 'Attempt all questions in this section.', marks: 180 }];
    }
    return [
      { title: 'SECTION A: PHYSICS', instructions: 'Questions 1 to 25 carry 4 marks each.', marks: 100 },
      { title: 'SECTION B: CHEMISTRY', instructions: 'Questions 26 to 45 carry 4 marks each.', marks: 80 }
    ];
  });

  useEffect(() => {
    if (isOpen) {
      api.getTemplates().then(data => {
        setTemplates(data);
        if (data.length > 0) {
          const defaultTpl = data.find(t => t.id === 'a4-single-column') || data[0];
          setSelectedTemplate(defaultTpl);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTemplateSelect = (tpl: Template) => {
    setSelectedTemplate(tpl);
    if (tpl.defaultMetadata) {
      if (tpl.defaultMetadata.instituteName) setInstituteName(tpl.defaultMetadata.instituteName);
      if (tpl.defaultMetadata.examName) setExamName(tpl.defaultMetadata.examName);
      if (tpl.defaultMetadata.subject) setSubject(tpl.defaultMetadata.subject);
      if (tpl.defaultMetadata.timeAllowedMinutes) setTimeAllowedMinutes(tpl.defaultMetadata.timeAllowedMinutes);
      if (tpl.defaultMetadata.maxMarks) setMaxMarks(tpl.defaultMetadata.maxMarks);
      if (tpl.defaultMetadata.generalInstructions) setGeneralInstructions(tpl.defaultMetadata.generalInstructions);
    }
    if (tpl.defaultSections) {
      setSections(
        tpl.defaultSections.map(s => ({
          title: s.defaultTitle,
          instructions: s.defaultInstructions || '',
          marks: s.defaultMarks || 50
        }))
      );
    }
  };

  const handleAddSection = () => {
    setSections(prev => [
      ...prev,
      { title: `SECTION ${String.fromCharCode(65 + prev.length)}`, instructions: 'Attempt all questions.', marks: 40 }
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    const docSections: DocumentSection[] = sections.map((s, idx) => ({
      id: `sec-${Date.now()}-${idx + 1}`,
      title: s.title,
      instructions: s.instructions,
      marks: s.marks,
      blocks: []
    }));

    const newDoc: Partial<DocumentModel> = {
      title: paperTitle,
      templateId: selectedTemplate?.id || 'a4-single-column',
      metadata: {
        instituteName,
        examName,
        subject,
        timeAllowedMinutes,
        maxMarks,
        generalInstructions,
        createdBy: user.name || user.email,
        author: user.name || user.email,
        headerTemplate: selectedTemplate?.defaultMetadata?.headerTemplate || 'boxed'
      },
      settings: selectedTemplate?.settings || {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 15, bottom: 15, left: 15, right: 15 },
        columns: 1,
        columnGap: 0,
        columnDivider: false,
        defaultFont: 'Calibri, sans-serif',
        defaultFontSize: 11,
        questionSpacing: 6,
        optionSpacing: 4,
        lineSpacing: 1.15,
        paragraphSpacing: 4
      },
      sections: docSections
    };

    onCreatePaper(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white text-black rounded-xl shadow-2xl border border-slate-200 w-full md:w-[60vw] max-w-[60vw] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        
        {/* Wizard Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">New Question Paper Wizard</h3>
              <p className="text-xs text-slate-600 font-medium">Step-by-step creation of scientific & MCQ examination papers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-black hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-center border-b border-slate-200 px-6 py-3 bg-slate-50 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step >= 1 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>1</span>
            <span className={step === 1 ? 'font-bold text-black' : 'text-slate-600 font-medium'}>Choose Template</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-300 mx-2" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step >= 2 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>2</span>
            <span className={step === 2 ? 'font-bold text-black' : 'text-slate-600 font-medium'}>Paper Details</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-300 mx-2" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step >= 3 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>3</span>
            <span className={step === 3 ? 'font-bold text-black' : 'text-slate-600 font-medium'}>Sections & Layout</span>
          </div>
        </div>

        {/* Wizard Content */}
        <div className="p-6 overflow-y-auto min-h-[380px]">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-black">Select Exam Paper Template</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {templates.map(tpl => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleTemplateSelect(tpl)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/70 shadow-md ring-2 ring-sky-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h5 className="text-sm font-bold text-black">{tpl.name}</h5>
                        {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed mb-2.5">{tpl.description}</p>
                      <div className="flex gap-1.5 text-[10px] font-bold text-black">
                        <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">{tpl.settings.columns} Column</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">Font: {tpl.settings.defaultFont}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 capitalize">{tpl.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Document / Paper Title
                </label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={e => setPaperTitle(e.target.value)}
                  className="w-full text-base font-bold p-2.5 border border-slate-300 rounded-lg text-black bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Institute / University / School Name
                  </label>
                  <input
                    type="text"
                    value={instituteName}
                    onChange={e => setInstituteName(e.target.value)}
                    className="w-full text-sm font-bold p-2 border border-slate-300 rounded-lg text-black bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Examination Name / Banner
                  </label>
                  <input
                    type="text"
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    className="w-full text-sm font-bold p-2 border border-slate-300 rounded-lg text-black bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full text-sm font-semibold p-2 border border-slate-300 rounded-lg text-black bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={timeAllowedMinutes}
                    onChange={e => setTimeAllowedMinutes(Number(e.target.value))}
                    className="w-full text-sm font-bold p-2 border border-slate-300 rounded-lg text-black bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={e => setMaxMarks(Number(e.target.value))}
                    className="w-full text-sm font-bold p-2 border border-slate-300 rounded-lg text-black bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  General Instructions (Rich Text & Formulas)
                </label>
                <RichTextEditor
                  value={generalInstructions.join('\n')}
                  onChange={val => setGeneralInstructions(val.split('\n').filter(Boolean))}
                  placeholder="Enter general examination instructions (e.g. All questions are compulsory. Use of calculators is not permitted.)..."
                  className="w-full"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-black">Paper Sections</h4>
                  <p className="text-xs text-slate-600 font-medium">Configure subject sections (e.g. Physics, Chemistry, Section A)</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Section
                </button>
              </div>

              <div className="space-y-3">
                {sections.map((sec, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Section Title (e.g. SECTION A: PHYSICS)"
                        value={sec.title}
                        onChange={e => {
                          const updated = [...sections];
                          updated[idx].title = e.target.value;
                          setSections(updated);
                        }}
                        className="flex-1 text-sm font-bold p-1.5 border border-slate-300 rounded bg-white text-black placeholder:text-slate-400"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-black">Marks:</span>
                        <input
                          type="number"
                          value={sec.marks}
                          onChange={e => {
                            const updated = [...sections];
                            updated[idx].marks = Number(e.target.value);
                            setSections(updated);
                          }}
                          className="w-20 text-xs font-bold p-1.5 border border-slate-300 rounded bg-white text-black"
                        />
                      </div>
                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          className="p-1 text-slate-500 hover:text-red-600 rounded"
                          title="Delete section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <RichTextEditor
                      compact
                      value={sec.instructions || ''}
                      onChange={val => {
                        const updated = [...sections];
                        updated[idx].instructions = val;
                        setSections(updated);
                      }}
                      placeholder="Section Instructions (e.g. Questions 1 to 25 carry 4 marks each with -1 negative marking)"
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-black hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-black hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="px-5 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" /> Create & Open Paper
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
