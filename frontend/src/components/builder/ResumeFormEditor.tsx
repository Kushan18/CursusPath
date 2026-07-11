import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ResumeFormEditorProps {
  resumeData: any;
  setResumeData: (data: any) => void;
}

export default function ResumeFormEditor({ resumeData, setResumeData }: ResumeFormEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contact: true,
    summary: true,
    experience: true,
    education: false,
    skills: false,
    projects: false,
    certifications: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateContact = (field: string, value: string) => {
    setResumeData({
      ...resumeData,
      contact: {
        ...(resumeData.contact || {}),
        [field]: value
      }
    });
  };

  const updateSummary = (value: string) => {
    setResumeData({ ...resumeData, summary: value });
  };

  const updateArrayField = (section: string, index: number, field: string, value: any) => {
    const newArray = [...(resumeData[section] || [])];
    newArray[index] = { ...newArray[index], [field]: value };
    setResumeData({ ...resumeData, [section]: newArray });
  };

  const updateBullets = (section: string, index: number, bulletsText: string) => {
    const bulletsArray = bulletsText.split('\n').filter(b => b.trim() !== '');
    updateArrayField(section, index, 'bullets', bulletsArray);
  };

  const addArrayItem = (section: string, defaultItem: any) => {
    const newArray = [...(resumeData[section] || []), defaultItem];
    setResumeData({ ...resumeData, [section]: newArray });
  };

  const removeArrayItem = (section: string, index: number) => {
    const newArray = [...(resumeData[section] || [])];
    newArray.splice(index, 1);
    setResumeData({ ...resumeData, [section]: newArray });
  };

  const updateSkills = (categoryIndex: number, field: 'category' | 'items', value: string) => {
    let currentSkills = resumeData.skills || [];
    
    // Backwards compatibility for old flat array
    if (currentSkills.length > 0 && typeof currentSkills[0] === 'string') {
      currentSkills = [{ category: 'Core Skills', items: currentSkills }];
    }
    
    const newSkills = [...currentSkills];
    
    if (field === 'items') {
      newSkills[categoryIndex].items = value.split(',').map(s => s.trim()).filter(s => s !== '');
    } else {
      newSkills[categoryIndex].category = value;
    }
    
    setResumeData({ ...resumeData, skills: newSkills });
  };

  const addSkillCategory = () => {
    let currentSkills = resumeData.skills || [];
    if (currentSkills.length > 0 && typeof currentSkills[0] === 'string') {
      currentSkills = [{ category: 'Core Skills', items: currentSkills }];
    }
    setResumeData({ ...resumeData, skills: [...currentSkills, { category: '', items: [] }] });
  };

  const removeSkillCategory = (index: number) => {
    let currentSkills = resumeData.skills || [];
    if (currentSkills.length > 0 && typeof currentSkills[0] === 'string') {
      currentSkills = [{ category: 'Core Skills', items: currentSkills }];
    }
    const newSkills = [...currentSkills];
    newSkills.splice(index, 1);
    setResumeData({ ...resumeData, skills: newSkills });
  };

  // Removed updateCertifications string parser since certifications are now structured

  if (!resumeData) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#1b222c] border-r border-border custom-scrollbar">
      <div className="p-5 space-y-4">
        
        {/* Contact Section */}
        <div className="bg-[#1b222c] rounded overflow-hidden">
          <div 
            className="px-4 py-3 bg-[#11161d] flex justify-between items-center cursor-pointer hover:bg-[#161c24]"
            onClick={() => toggleSection('contact')}
          >
            <h3 className="font-semibold text-xs tracking-wider uppercase text-gray-300">Personal Info</h3>
            {expandedSections.contact ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
          {expandedSections.contact && (
            <div className="p-4 grid grid-cols-2 gap-3 border border-t-0 border-[#2a3441] bg-[#11161d]/50">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Full Name</label>
                <input value={resumeData.contact?.fullName || ''} onChange={e => updateContact('fullName', e.target.value)} className="w-full bg-[#1b222c] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200 focus:border-teal outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Email</label>
                <input value={resumeData.contact?.email || ''} onChange={e => updateContact('email', e.target.value)} className="w-full bg-[#1b222c] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200 focus:border-teal outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Phone</label>
                <input value={resumeData.contact?.phone || ''} onChange={e => updateContact('phone', e.target.value)} className="w-full bg-[#1b222c] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200 focus:border-teal outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Location</label>
                <input value={resumeData.contact?.location || ''} onChange={e => updateContact('location', e.target.value)} className="w-full bg-[#1b222c] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200 focus:border-teal outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">LinkedIn</label>
                <input value={resumeData.contact?.linkedin || ''} onChange={e => updateContact('linkedin', e.target.value)} className="w-full bg-[#1b222c] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200 focus:border-teal outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">GitHub</label>
                <input value={resumeData.contact?.github || ''} onChange={e => updateContact('github', e.target.value)} className="w-full bg-[#1b222c] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200 focus:border-teal outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="bg-[#1b222c] rounded overflow-hidden">
          <div 
            className="px-4 py-3 bg-[#11161d] flex justify-between items-center cursor-pointer hover:bg-[#161c24]"
            onClick={() => toggleSection('summary')}
          >
            <h3 className="font-semibold text-xs tracking-wider uppercase text-gray-300">Profile Summary</h3>
            {expandedSections.summary ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
          {expandedSections.summary && (
            <div className="p-4 border border-t-0 border-[#2a3441] bg-[#11161d]/50">
              <textarea 
                value={resumeData.summary || ''} 
                onChange={e => updateSummary(e.target.value)} 
                className="w-full h-32 bg-[#1b222c] border border-[#2a3441] rounded p-3 text-xs text-gray-200 focus:border-teal outline-none resize-none leading-relaxed" 
              />
            </div>
          )}
        </div>

        {/* Experience Section */}
        <div className="bg-[#1b222c] rounded overflow-hidden">
          <div 
            className="px-4 py-3 bg-[#11161d] flex justify-between items-center cursor-pointer hover:bg-[#161c24]"
            onClick={() => toggleSection('experience')}
          >
            <h3 className="font-semibold text-xs tracking-wider uppercase text-gray-300">Experience</h3>
            {expandedSections.experience ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
          {expandedSections.experience && (
            <div className="p-4 space-y-4 border border-t-0 border-[#2a3441] bg-[#11161d]/50">
              {resumeData.experience?.map((exp: any, i: number) => (
                <div key={i} className="border border-[#2a3441] bg-[#1b222c] rounded p-3 relative group">
                  <button onClick={() => removeArrayItem('experience', i)} className="absolute top-2 right-2 text-gray-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                  <div className="grid grid-cols-2 gap-2 mb-3 pr-6">
                    <input placeholder="Job Title" value={exp.title || ''} onChange={e => updateArrayField('experience', i, 'title', e.target.value)} className="col-span-2 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs font-semibold text-gray-200" />
                    <input placeholder="Company" value={exp.company || ''} onChange={e => updateArrayField('experience', i, 'company', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                    <input placeholder="Dates (e.g. 2021 - Present)" value={exp.dates || ''} onChange={e => updateArrayField('experience', i, 'dates', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                  </div>
                  <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Bullets (One per line)</label>
                  <textarea 
                    value={(exp.bullets || []).join('\n')} 
                    onChange={e => updateBullets('experience', i, e.target.value)} 
                    className="w-full h-24 bg-[#11161d] border border-[#2a3441] rounded p-3 text-xs text-gray-200 focus:border-teal outline-none resize-none leading-relaxed" 
                  />
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('experience', { title: '', company: '', dates: '', location: '', bullets: [] })}
                className="w-full py-2 border border-dashed border-[#2a3441] rounded text-xs text-teal font-medium hover:bg-teal/5 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Experience
              </button>
            </div>
          )}
        </div>

        {/* Education Section */}
        <div className="bg-[#1b222c] rounded overflow-hidden">
          <div 
            className="px-4 py-3 bg-[#11161d] flex justify-between items-center cursor-pointer hover:bg-[#161c24]"
            onClick={() => toggleSection('education')}
          >
            <h3 className="font-semibold text-xs tracking-wider uppercase text-gray-300">Education</h3>
            {expandedSections.education ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
          {expandedSections.education && (
            <div className="p-4 space-y-4 border border-t-0 border-[#2a3441] bg-[#11161d]/50">
              {resumeData.education?.map((edu: any, i: number) => (
                <div key={i} className="border border-[#2a3441] bg-[#1b222c] rounded p-3 relative group">
                  <button onClick={() => removeArrayItem('education', i)} className="absolute top-2 right-2 text-gray-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                  <div className="grid grid-cols-2 gap-2 pr-6">
                    <input placeholder="Degree / Certification" value={edu.degree || ''} onChange={e => updateArrayField('education', i, 'degree', e.target.value)} className="col-span-2 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs font-semibold text-gray-200" />
                    <input placeholder="School / University" value={edu.school || ''} onChange={e => updateArrayField('education', i, 'school', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                    <input placeholder="Dates (e.g. 2023 - 2027)" value={edu.dates || ''} onChange={e => updateArrayField('education', i, 'dates', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                    <input placeholder="GPA / Percentage (e.g. 8.28 CGPA)" value={edu.gpa || ''} onChange={e => updateArrayField('education', i, 'gpa', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                    <input placeholder="Location (Optional)" value={edu.location || ''} onChange={e => updateArrayField('education', i, 'location', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                  </div>
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('education', { degree: '', school: '', dates: '', gpa: '', location: '' })}
                className="w-full py-2 border border-dashed border-[#2a3441] rounded text-xs text-teal font-medium hover:bg-teal/5 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Education
              </button>
            </div>
          )}
        </div>

        {/* Skills Section */}
        <div className="bg-[#1b222c] rounded overflow-hidden">
          <div 
            className="px-4 py-3 bg-[#11161d] flex justify-between items-center cursor-pointer hover:bg-[#161c24]"
            onClick={() => toggleSection('skills')}
          >
            <h3 className="font-semibold text-xs tracking-wider uppercase text-gray-300">Skills</h3>
            {expandedSections.skills ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
          {expandedSections.skills && (
            <div className="p-4 space-y-3 border border-t-0 border-[#2a3441] bg-[#11161d]/50">
              {(() => {
                let currentSkills = resumeData.skills || [];
                if (currentSkills.length > 0 && typeof currentSkills[0] === 'string') {
                  currentSkills = [{ category: 'Core Skills', items: currentSkills }];
                }
                
                return currentSkills.map((skillCat: any, i: number) => (
                  <div key={i} className="border border-[#2a3441] bg-[#1b222c] rounded p-3 relative group">
                    <button onClick={() => removeSkillCategory(i)} className="absolute top-2 right-2 text-gray-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                    <div className="pr-6 mb-2">
                      <input 
                        placeholder="Category (e.g. Languages)" 
                        value={skillCat.category || ''} 
                        onChange={e => updateSkills(i, 'category', e.target.value)} 
                        className="w-full bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs font-semibold text-teal focus:border-teal outline-none mb-2" 
                      />
                      <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Comma Separated Items</label>
                      <textarea 
                        value={(skillCat.items || []).join(', ')} 
                        onChange={e => updateSkills(i, 'items', e.target.value)} 
                        className="w-full h-16 bg-[#11161d] border border-[#2a3441] rounded p-2 text-xs text-gray-200 focus:border-teal outline-none resize-none leading-relaxed" 
                      />
                    </div>
                  </div>
                ));
              })()}
              <button 
                onClick={addSkillCategory}
                className="w-full py-2 border border-dashed border-[#2a3441] rounded text-xs text-teal font-medium hover:bg-teal/5 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Skill Category
              </button>
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div className="bg-[#1b222c] rounded overflow-hidden">
          <div 
            className="px-4 py-3 bg-[#11161d] flex justify-between items-center cursor-pointer hover:bg-[#161c24]"
            onClick={() => toggleSection('projects')}
          >
            <h3 className="font-semibold text-xs tracking-wider uppercase text-gray-300">Projects</h3>
            {expandedSections.projects ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
          {expandedSections.projects && (
            <div className="p-4 space-y-4 border border-t-0 border-[#2a3441] bg-[#11161d]/50">
              {resumeData.projects?.map((proj: any, i: number) => (
                <div key={i} className="border border-[#2a3441] bg-[#1b222c] rounded p-3 relative group">
                  <button onClick={() => removeArrayItem('projects', i)} className="absolute top-2 right-2 text-gray-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                  <div className="grid grid-cols-2 gap-2 mb-3 pr-6">
                    <input placeholder="Project Name" value={proj.title || ''} onChange={e => updateArrayField('projects', i, 'title', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs font-semibold text-gray-200" />
                    <input placeholder="Project Link (GitHub/URL)" value={proj.link || ''} onChange={e => updateArrayField('projects', i, 'link', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-teal hover:border-teal" />
                    <input placeholder="Dates" value={proj.dates || ''} onChange={e => updateArrayField('projects', i, 'dates', e.target.value)} className="col-span-2 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                  </div>
                  <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Bullets (One per line)</label>
                  <textarea 
                    value={(proj.bullets || []).join('\n')} 
                    onChange={e => updateBullets('projects', i, e.target.value)} 
                    className="w-full h-24 bg-[#11161d] border border-[#2a3441] rounded p-3 text-xs text-gray-200 focus:border-teal outline-none resize-none leading-relaxed" 
                  />
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('projects', { title: '', link: '', dates: '', bullets: [] })}
                className="w-full py-2 border border-dashed border-[#2a3441] rounded text-xs text-teal font-medium hover:bg-teal/5 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Project
              </button>
            </div>
          )}
        </div>

        {/* Certifications Section */}
        <div className="bg-[#1b222c] rounded overflow-hidden">
          <div 
            className="px-4 py-3 bg-[#11161d] flex justify-between items-center cursor-pointer hover:bg-[#161c24]"
            onClick={() => toggleSection('certifications')}
          >
            <h3 className="font-semibold text-xs tracking-wider uppercase text-gray-300">Certifications</h3>
            {expandedSections.certifications ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
          {expandedSections.certifications && (
            <div className="p-4 space-y-4 border border-t-0 border-[#2a3441] bg-[#11161d]/50">
              {(() => {
                let currentCerts = resumeData.certifications || [];
                // Backwards compatibility for old flat string array
                if (currentCerts.length > 0 && typeof currentCerts[0] === 'string') {
                  currentCerts = currentCerts.map((c: string) => {
                    const parts = c.split('-');
                    return {
                      name: parts[0]?.trim() || c,
                      issuer: parts[1]?.trim() || '',
                      date: '',
                      summary: ''
                    };
                  });
                  // Mutate seamlessly so it uses the new format in UI state
                  if (JSON.stringify(currentCerts) !== JSON.stringify(resumeData.certifications)) {
                    // Update state quietly on next tick or rely on parent change
                    setTimeout(() => setResumeData({...resumeData, certifications: currentCerts}), 0);
                  }
                }
                
                return currentCerts.map((cert: any, i: number) => (
                  <div key={i} className="border border-[#2a3441] bg-[#1b222c] rounded p-3 relative group">
                    <button onClick={() => removeArrayItem('certifications', i)} className="absolute top-2 right-2 text-gray-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                    <div className="grid grid-cols-2 gap-2 mb-3 pr-6">
                      <input placeholder="Certification Name" value={cert.name || ''} onChange={e => updateArrayField('certifications', i, 'name', e.target.value)} className="col-span-2 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs font-semibold text-gray-200" />
                      <input placeholder="Issuer (e.g. Salesforce)" value={cert.issuer || ''} onChange={e => updateArrayField('certifications', i, 'issuer', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                      <input placeholder="Date (e.g. April 2025)" value={cert.date || ''} onChange={e => updateArrayField('certifications', i, 'date', e.target.value)} className="col-span-1 bg-[#11161d] border border-[#2a3441] rounded px-3 py-2 text-xs text-gray-200" />
                    </div>
                    <label className="block text-[9px] text-gray-500 uppercase font-semibold mb-1">Summary / Description</label>
                    <textarea 
                      value={cert.summary || ''} 
                      onChange={e => updateArrayField('certifications', i, 'summary', e.target.value)} 
                      className="w-full h-16 bg-[#11161d] border border-[#2a3441] rounded p-3 text-xs text-gray-200 focus:border-teal outline-none resize-none leading-relaxed" 
                    />
                  </div>
                ));
              })()}
              <button 
                onClick={() => addArrayItem('certifications', { name: '', issuer: '', date: '', summary: '' })}
                className="w-full py-2 border border-dashed border-[#2a3441] rounded text-xs text-teal font-medium hover:bg-teal/5 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Certification
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
