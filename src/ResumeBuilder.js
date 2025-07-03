import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import './ResumeBuilder.css';

const ResumeBuilder = () => {
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  const [fontFamily, setFontFamily] = useState('helvetica');
  const [objective, setObjective] = useState('');
  
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [skills, setSkills] = useState([]);
  const [honors, setHonors] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [references, setReferences] = useState([]);
  
  const previewRef = useRef(null);

  // Initialize with empty arrays for clean start
  useEffect(() => {
    // All fields start empty - users can add their own content
    setEducation([]);
    setExperience([]);
    setSkills([]);
    setHonors([]);
    setLanguages([]);
    setReferences([]);
  }, []);

  const addField = (setter, fields) => {
    setter(prev => [...prev, fields]);
  };

  const removeField = (setter, index) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateField = (setter, index, field, value) => {
    setter(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const generatePreview = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;

    preview.innerHTML = '';

    // Check if there's any content to display
    const hasContent = personalInfo.name || personalInfo.address || personalInfo.phone || personalInfo.email || 
                      objective || education.length > 0 || experience.length > 0 || skills.length > 0 || 
                      honors.length > 0 || languages.length > 0 || references.length > 0;

    if (!hasContent) {
      preview.innerHTML = `
        <div class="text-center" style="color: #9ca3af; font-style: italic; margin-top: 2rem;">
          <p>Start filling out the form to see your resume preview here.</p>
          <p class="text-sm mt-2">Your resume will appear in professional format as you type.</p>
        </div>
      `;
      return;
    }

    const contactInfo = [personalInfo.address, personalInfo.phone, personalInfo.email]
      .filter(Boolean)
      .join(' | ');

    let html = `
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold">${personalInfo.name || "Your Name"}</h1>
        ${contactInfo ? `<p class="text-md text-gray-600 mt-2">${contactInfo}</p>` : ''}
      </div>
    `;

    if (objective) {
      html += `
        <div>
          <h2 class="preview-section-title">Objective</h2>
          <p class="text-gray-700 text-justify">${objective}</p>
        </div>
      `;
    }

    if (education.length > 0) {
      html += '<h2 class="preview-section-title">Education</h2>';
      education.forEach(item => {
        if (item.school || item.degree || item.year) {
          html += `
            <div class="mb-3">
              <div class="preview-grid">
                <p class="font-semibold text-lg">${item.school || ''}</p>
                <p class="text-gray-500 text-sm">${item.year || ''}</p>
              </div>
              <p class="text-gray-700">${item.degree || ''}</p>
            </div>
          `;
        }
      });
    }

    if (experience.length > 0) {
      html += '<h2 class="preview-section-title">Experience</h2>';
      experience.forEach(item => {
        if (item.title || item.company || item.duration || item.description) {
          html += `
            <div class="mb-4">
              <div class="preview-grid">
                <h3 class="font-bold text-xl">${item.title || ''}</h3>
                <p class="text-sm text-gray-500">${item.duration || ''}</p>
              </div>
              <p class="font-semibold text-md text-gray-800">${item.company || ''}</p>
              <p class="text-gray-700 whitespace-pre-line mt-1">${item.description || ''}</p>
            </div>
          `;
        }
      });
    }

    if (skills.length > 0) {
      html += '<h2 class="preview-section-title">Skills</h2>';
      skills.forEach(item => {
        if (item.category || item.skills) {
          html += `
            <div class="mb-2">
              <span class="font-semibold">${item.category || ''}:</span> 
              <span class="text-gray-700">${item.skills || ''}</span>
            </div>
          `;
        }
      });
    }

    if (honors.length > 0) {
      html += '<h2 class="preview-section-title">Honors and Awards</h2>';
      honors.forEach((item, index) => {
        if (item.honor) {
          html += `<p class="text-gray-700 mb-1 pl-4">${index + 1}. ${item.honor}</p>`;
        }
      });
    }

    if (languages.length > 0) {
      html += '<h2 class="preview-section-title">Languages</h2>';
      languages.forEach(item => {
        if (item.language || item.proficiency) {
          html += `
            <div class="mb-2">
              <span class="font-semibold">${item.language || ''}: </span> 
              <span class="text-gray-700">${item.proficiency || ''}</span>
            </div>
          `;
        }
      });
    }

    if (references.length > 0) {
      html += '<h2 class="preview-section-title">References</h2>';
      references.forEach(item => {
        if (item.name || item.title || item.contact) {
          html += `
            <div class="mb-3">
              <p class="font-semibold text-lg">${item.name || ''}</p>
              <p class="text-gray-700">${item.title || ''}</p>
              <p class="text-gray-500 text-sm">${item.contact || ''}</p>
            </div>
          `;
        }
      });
    }

    preview.innerHTML = html;
  }, [personalInfo, objective, education, experience, skills, honors, languages, references]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const downloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      
      let y = 15;
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - (margin * 2);
      const FONT_SCALE = doc.internal.scaleFactor;
      const LINE_HEIGHT_RATIO = 1.25;
      const COLORS = { title: '#1F2937', subtitle: '#4B5563', text: '#374151' };
      const SIZES = { h1: 26, h2: 14, h3: 12, h4: 11, body: 10.5, small: 10 };

      function checkPageBreak(requiredHeight) {
        if (y + requiredHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      }

      function getLinesHeight(lines, size) {
        return lines.length * size * LINE_HEIGHT_RATIO / FONT_SCALE;
      }

      function addParagraph(text, { size, style = 'normal', color = COLORS.text, align = 'left', spacing = 0, x = margin, width = usableWidth }) {
        doc.setFont(fontFamily, style).setFontSize(size).setTextColor(color);
        const splitWidth = align === 'justify' ? (width * 0.98) : width;
        const lines = doc.splitTextToSize(text, splitWidth);
        const height = getLinesHeight(lines, size);
        checkPageBreak(height);
        doc.text(lines, x, y, { align: align, maxWidth: width });
        y += height + spacing;
      }

      function addSectionTitle(title) {
        y += 6;
        checkPageBreak(15);
        addParagraph(title, { size: SIZES.h2, style: 'bold', color: COLORS.title });
        y += 1;
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      }

      function addTwoColumnLine(left, right, leftOptions, rightOptions) {
        doc.setFont(fontFamily, leftOptions.style).setFontSize(leftOptions.size);
        const leftLines = doc.splitTextToSize(left, usableWidth * 0.7);
        const leftHeight = getLinesHeight(leftLines, leftOptions.size);
        doc.setFont(fontFamily, rightOptions.style).setFontSize(rightOptions.size);
        const rightLines = doc.splitTextToSize(right, usableWidth * 0.3);
        const rightHeight = getLinesHeight(rightLines, rightOptions.size);
        const maxHeight = Math.max(leftHeight, rightHeight);
        checkPageBreak(maxHeight);
        doc.setFont(fontFamily, leftOptions.style).setFontSize(leftOptions.size).setTextColor(leftOptions.color);
        doc.text(leftLines, margin, y);
        doc.setFont(fontFamily, rightOptions.style).setFontSize(rightOptions.size).setTextColor(rightOptions.color);
        doc.text(rightLines, pageWidth - margin, y, { align: 'right' });
        y += maxHeight;
      }

      // Header
      const name = personalInfo.name || "Your Name";
      doc.setFont(fontFamily, 'bold').setFontSize(SIZES.h1).setTextColor(COLORS.title);
      doc.text(name, pageWidth / 2, y, { align: 'center' });
      y += 9;
      const contactInfo = [personalInfo.address, personalInfo.phone, personalInfo.email].filter(Boolean).join(' | ');
      doc.setFont(fontFamily, 'normal').setFontSize(SIZES.small).setTextColor(COLORS.subtitle);
      doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Objective
      if (objective) {
        addSectionTitle('Objective');
        addParagraph(objective, { size: SIZES.body, spacing: 3, align: 'justify' });
      }

      // Education
      if (education.length > 0) {
        addSectionTitle('Education');
        education.forEach(item => {
          if (item.school || item.degree || item.year) {
            addTwoColumnLine(item.school, item.year, 
              { size: SIZES.h4, style: 'bold', color: COLORS.title }, 
              { size: SIZES.small, style: 'normal', color: COLORS.subtitle });
            addParagraph(item.degree, { size: SIZES.body, style: 'italic', spacing: 4, color: COLORS.subtitle });
          }
        });
      }

      // Experience
      if (experience.length > 0) {
        addSectionTitle('Experience');
        experience.forEach(item => {
          if (item.title || item.company || item.duration || item.description) {
            addTwoColumnLine(item.title, item.duration, 
              { size: SIZES.h3, style: 'bold', color: COLORS.title }, 
              { size: SIZES.small, style: 'normal', color: COLORS.subtitle });
            addParagraph(item.company, { size: SIZES.h4, style: 'italic', color: COLORS.subtitle, spacing: 2 });
            addParagraph(item.description, { size: SIZES.body, spacing: 5 });
          }
        });
      }

      // Skills
      if (skills.length > 0) {
        addSectionTitle('Skills');
        doc.setFont(fontFamily, 'bold').setFontSize(SIZES.body);
        let maxCategoryWidth = 0;
        skills.forEach(item => {
          const category = item.category ? `${item.category}: ` : '';
          const width = doc.getTextWidth(category);
          if (width > maxCategoryWidth) maxCategoryWidth = width;
        });
        const skillsX = margin + maxCategoryWidth + 2;
        const skillsWidth = pageWidth - skillsX - margin;
        skills.forEach(item => {
          const category = item.category ? `${item.category}: ` : '';
          const skillText = item.skills || '';
          doc.setFont(fontFamily, 'normal').setFontSize(SIZES.body);
          const skillLines = doc.splitTextToSize(skillText, skillsWidth);
          const blockHeight = getLinesHeight(skillLines, SIZES.body);
          checkPageBreak(blockHeight + 3);
          doc.setFont(fontFamily, 'bold').setFontSize(SIZES.body).setTextColor(COLORS.title);
          doc.text(category, margin, y);
          doc.setFont(fontFamily, 'normal').setFontSize(SIZES.body).setTextColor(COLORS.text);
          doc.text(skillLines, skillsX, y);
          y += blockHeight + 3;
        });
      }

      // Honors
      if (honors.length > 0) {
        addSectionTitle('Honors and Awards');
        honors.forEach((item, index) => {
          if (item.honor) {
            addParagraph(`${index + 1}. ${item.honor}`, { size: SIZES.body, spacing: 2, x: margin + 5, width: usableWidth - 5 });
          }
        });
      }

      // Languages
      if (languages.length > 0) {
        addSectionTitle('Languages');
        languages.forEach(item => {
          if (item.language || item.proficiency) {
            y += 2;
            const langText = `${item.language}: `;
            doc.setFont(fontFamily, 'bold').setFontSize(SIZES.body).setTextColor(COLORS.title);
            doc.text(langText, margin, y);
            doc.setFont(fontFamily, 'normal').setFontSize(SIZES.body).setTextColor(COLORS.text);
            doc.text(item.proficiency, margin + doc.getTextWidth(langText) + 2, y);
            y += 5;
          }
        });
      }

      // References
      if (references.length > 0) {
        addSectionTitle('References');
        references.forEach(item => {
          if (item.name || item.title || item.contact) {
            addParagraph(item.name, { size: SIZES.h4, style: 'bold', color: COLORS.title, spacing: 1 });
            addParagraph(item.title, { size: SIZES.body, color: COLORS.text, spacing: 1 });
            addParagraph(item.contact, { size: SIZES.small, style: 'italic', color: COLORS.subtitle, spacing: 4 });
          }
        });
      }

      doc.save(`${(name || 'resume').toLowerCase().replace(/ /g, '_')}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("An error occurred while generating the PDF. Please check the console for details.");
    }
  };

  return (
    <div className="resume-builder">

      <div className="resume-builder-container">
        <div className="resume-builder-grid">
          <div className="resume-form-panel">
            <h1 className="resume-form-title">Resume Builder</h1>

            {/* Personal Information */}
            <div className="form-section">
              <h2 className="form-section-title">Personal Information</h2>
              <input
                type="text"
                placeholder="Full Name"
                className="form-input"
                value={personalInfo.name}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="text"
                placeholder="City, Country"
                className="form-input"
                value={personalInfo.address}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Phone Number"
                className="form-input"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
              />
              <input
                type="email"
                placeholder="Email Address"
                className="form-input"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            {/* Styling */}
            <div className="form-section">
              <h2 className="form-section-title">Styling</h2>
              <label htmlFor="font-select" className="form-label">
                Choose a Font Family:
              </label>
              <select
                id="font-select"
                className="form-select"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                <option value="helvetica">Modern (Sans-Serif)</option>
                <option value="times">Classic (Serif)</option>
                <option value="courier">Typewriter (Monospace)</option>
              </select>
            </div>

            {/* Objective */}
            <div className="form-section">
              <h2 className="form-section-title">Objective</h2>
              <textarea
                placeholder="Your career objective..."
                className="form-textarea"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>

            {/* Education */}
            <div className="form-section">
              <h2 className="form-section-title">Education</h2>
              {education.map((item, index) => (
                <div key={index} className="field-group">
                  <input
                    type="text"
                    placeholder="School Name"
                    className="form-input"
                    value={item.school}
                    onChange={(e) => updateField(setEducation, index, 'school', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Degree/Course"
                    className="form-input"
                    value={item.degree}
                    onChange={(e) => updateField(setEducation, index, 'degree', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Year (e.g., 2022-2025)"
                    className="form-input"
                    value={item.year}
                    onChange={(e) => updateField(setEducation, index, 'year', e.target.value)}
                  />
                  <button
                    className="remove-field-btn"
                    onClick={() => removeField(setEducation, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addField(setEducation, { school: '', degree: '', year: '' })}
                className="add-field-btn"
              >
                Add Education
              </button>
            </div>

            {/* Experience */}
            <div className="form-section">
              <h2 className="form-section-title">Experience</h2>
              {experience.map((item, index) => (
                <div key={index} className="field-group">
                  <input
                    type="text"
                    placeholder="Job Title"
                    className="form-input"
                    value={item.title}
                    onChange={(e) => updateField(setExperience, index, 'title', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    className="form-input"
                    value={item.company}
                    onChange={(e) => updateField(setExperience, index, 'company', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g., Jan 2024 - Present)"
                    className="form-input"
                    value={item.duration}
                    onChange={(e) => updateField(setExperience, index, 'duration', e.target.value)}
                  />
                  <textarea
                    placeholder="Description..."
                    className="form-textarea"
                    rows="3"
                    value={item.description}
                    onChange={(e) => updateField(setExperience, index, 'description', e.target.value)}
                  />
                  <button
                    className="remove-field-btn"
                    onClick={() => removeField(setExperience, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addField(setExperience, { title: '', company: '', duration: '', description: '' })}
                className="add-field-btn"
              >
                Add Experience
              </button>
            </div>

            {/* Skills */}
            <div className="form-section">
              <h2 className="form-section-title">Skills</h2>
              {skills.map((item, index) => (
                <div key={index} className="field-group-simple">
                  <input
                    type="text"
                    placeholder="Skill Category (e.g., Programming)"
                    className="form-input"
                    value={item.category}
                    onChange={(e) => updateField(setSkills, index, 'category', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="List of skills"
                    className="form-input"
                    value={item.skills}
                    onChange={(e) => updateField(setSkills, index, 'skills', e.target.value)}
                  />
                  <button
                    className="remove-field-btn"
                    onClick={() => removeField(setSkills, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addField(setSkills, { category: '', skills: '' })}
                className="add-field-btn"
              >
                Add Skill
              </button>
            </div>

            {/* Honors and Awards */}
            <div className="form-section">
              <h2 className="form-section-title">Honors and Awards</h2>
              {honors.map((item, index) => (
                <div key={index} className="field-group-simple">
                  <input
                    type="text"
                    placeholder="Honor or Award"
                    className="form-input"
                    value={item.honor}
                    onChange={(e) => updateField(setHonors, index, 'honor', e.target.value)}
                  />
                  <button
                    className="remove-field-btn"
                    onClick={() => removeField(setHonors, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addField(setHonors, { honor: '' })}
                className="add-field-btn"
              >
                Add Honor/Award
              </button>
            </div>

            {/* Languages */}
            <div className="form-section">
              <h2 className="form-section-title">Languages</h2>
              {languages.map((item, index) => (
                <div key={index} className="field-group-simple">
                  <input
                    type="text"
                    placeholder="Language"
                    className="form-input"
                    value={item.language}
                    onChange={(e) => updateField(setLanguages, index, 'language', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Proficiency"
                    className="form-input"
                    value={item.proficiency}
                    onChange={(e) => updateField(setLanguages, index, 'proficiency', e.target.value)}
                  />
                  <button
                    className="remove-field-btn"
                    onClick={() => removeField(setLanguages, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addField(setLanguages, { language: '', proficiency: '' })}
                className="add-field-btn"
              >
                Add Language
              </button>
            </div>

            {/* References */}
            <div className="form-section">
              <h2 className="form-section-title">References</h2>
              {references.map((item, index) => (
                <div key={index} className="field-group">
                  <input
                    type="text"
                    placeholder="Reference Name"
                    className="form-input"
                    value={item.name}
                    onChange={(e) => updateField(setReferences, index, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Title & Company"
                    className="form-input"
                    value={item.title}
                    onChange={(e) => updateField(setReferences, index, 'title', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Contact Info"
                    className="form-input"
                    value={item.contact}
                    onChange={(e) => updateField(setReferences, index, 'contact', e.target.value)}
                  />
                  <button
                    className="remove-field-btn"
                    onClick={() => removeField(setReferences, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addField(setReferences, { name: '', title: '', contact: '' })}
                className="add-field-btn"
              >
                Add Reference
              </button>
            </div>

            <div className="button-center">
              <button
                onClick={generatePreview}
                className="preview-update-btn"
              >
                Update Preview
              </button>
            </div>
          </div>

          <div className="preview-panel">
            <h2 className="preview-title">Live Preview</h2>
            <div
              id="resume-preview"
              ref={previewRef}
              className="resume-preview"
            />
            <div className="button-center">
              <button
                onClick={downloadPDF}
                className="pdf-download-btn"
              >
                Download as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
