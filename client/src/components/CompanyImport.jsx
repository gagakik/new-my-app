
import React, { useState } from 'react';


const CompanyImport = ({ showNotification, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        showNotification('მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია', 'error');
        e.target.value = '';
      }
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/import/companies/template', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'companies-template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('შაბლონი ჩამოიტვირთა', 'success');
      } else {
        throw new Error('შაბლონის ჩამოტვირთვა ვერ მოხერხდა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const exportCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/import/companies/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `companies-export-${timestamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('კომპანიების ექსპორტი დასრულდა', 'success');
      } else {
        throw new Error('ექსპორტის შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const handleImport = async () => {
    if (!file) {
      showNotification('გთხოვთ აირჩიოთ ფაილი', 'error');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('excelFile', file);

      const response = await fetch('/api/import/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        showNotification(
          `იმპორტი დასრულდა: ${result.imported}/${result.total} კომპანია დამატებულია`,
          'success'
        );
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        throw new Error(result.error || 'იმპორტის შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    document.getElementById('fileInput').value = '';
  };

  return (
    <div className="import-container">
      <div className="import-header">
        <h3>კომპანიების იმპორტი Excel ფაილიდან</h3>
        <p>ატვირთეთ Excel ფაილი კომპანიების მონაცემებით</p>
      </div>

      <div className="import-actions">
        <div className="download-buttons">
          <button 
            className="download-template-btn"
            onClick={downloadTemplate}
            type="button"
          >
            📥 შაბლონის ჩამოტვირთვა
          </button>
          
          <button 
            className="export-btn"
            onClick={exportCompanies}
            type="button"
          >
            📤 კომპანიების ექსპორტი
          </button>
        </div>

        <div className="file-upload-section">
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="file-input"
          />
          <label htmlFor="fileInput" className="file-label">
            📁 ფაილის არჩევა
          </label>
          {file && (
            <span className="file-name">
              არჩეულია: {file.name}
            </span>
          )}
        </div>

        <div className="import-buttons">
          <button
            className="import-btn"
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? '⏳ იმპორტირდება...' : '📤 იმპორტი'}
          </button>
          
          {file && (
            <button
              className="reset-btn"
              onClick={resetImport}
              disabled={importing}
            >
              🔄 გასუფთავება
            </button>
          )}
        </div>
      </div>

      {importResult && (
        <div className="import-result">
          <h4>იმპორტის შედეგები:</h4>
          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-label">სულ:</span>
              <span className="stat-value">{importResult.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">წარმატებული:</span>
              <span className="stat-value success">{importResult.imported}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">შეცდომები:</span>
              <span className="stat-value error">{importResult.errors}</span>
            </div>
          </div>

          {importResult.errorDetails && importResult.errorDetails.length > 0 && (
            <div className="error-details">
              <h5>შეცდომების დეტალები:</h5>
              <ul>
                {importResult.errorDetails.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="import-instructions">
        <h4>ინსტრუქციები:</h4>
        <ol>
          <li>ჩამოტვირთეთ შაბლონი Excel ფაილის სწორი ფორმატის გასაცნობად</li>
          <li>შეავსეთ შაბლონი თქვენი კომპანიების მონაცემებით</li>
          <li>აირჩიეთ შევსებული ფაილი და დააჭირეთ "იმპორტი"</li>
          <li>თუ კომპანია უკვე არსებობს (იგივე საიდენტიფიკაციო კოდით), ის განახლდება</li>
        </ol>
        
        <h4>მნიშვნელოვანი წესები:</h4>
        <ul>
          <li><strong>საჭირო ველები:</strong> კომპანიის დასახელება და საიდენტიფიკაციო კოდი</li>
          <li><strong>სტატუსი:</strong> მხოლოდ "აქტიური" ან "პასიური"</li>
          <li><strong>ვებსაიტი:</strong> მიუთითეთ სრული URL (http:// ან https://)</li>
          <li><strong>ექსპორტი:</strong> არსებული კომპანიების ჩამოტვირთვისთვის</li>
          <li>მაქსიმალური ფაილის ზომა: 5MB</li>
        </ul>
      </div>
    </div>
  );
};

export default CompanyImport;
