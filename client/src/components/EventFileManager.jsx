import React, { useState, useEffect } from 'react';
import './EventFileManager.css';

const EventFileManager = ({ event, onClose, showNotification, userRole }) => {
  const [planFile, setPlanFile] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [expenseFiles, setExpenseFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('');

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'manager' ||
    userRole === 'sales' ||
    userRole === 'marketing';

  useEffect(() => {
    if (event) {
      setPlanFile(event.plan_file_path);
      setInvoiceFiles(event.invoice_files || []);
      setExpenseFiles(event.expense_files || []);
    }
  }, [event]);

  const refreshEventData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${event.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const updatedEvent = await response.json();
        setPlanFile(updatedEvent.plan_file_path);
        setInvoiceFiles(updatedEvent.invoice_files || []);
        setExpenseFiles(updatedEvent.expense_files || []);
      }
    } catch (error) {
      console.error('ივენთის მონაცემების განახლების შეცდომა:', error);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    setUploading(true);
    setUploadType(type);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      if (type === 'plan') {
        formData.append('plan_file', file);
      } else if (type === 'invoice') {
        formData.append('invoice_file', file);
        formData.append('file_name', file.name);
      } else if (type === 'expense') {
        formData.append('expense_file', file);
        formData.append('file_name', file.name);
      }

      const response = await fetch(`/api/events/${event.id}/upload-${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        await refreshEventData();
      } else {
        const error = await response.json();
        showNotification(error.message, 'error');
      }
    } catch (error) {
      showNotification('ფაილის ატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setUploading(false);
      setUploadType('');
    }
  };

  const handleFileDelete = async (type, fileName = null) => {
    const confirmMessage = type === 'plan'
      ? 'ნამდვილად გსურთ გეგმის ფაილის წაშლა?'
      : `ნამდვილად გსურთ ფაილის "${fileName}" წაშლა?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('token');
      let url;

      if (type === 'plan') {
        url = `/api/events/${event.id}/delete-plan`;
      } else if (type === 'invoice') {
        url = `/api/events/${event.id}/delete-invoice/${encodeURIComponent(fileName)}`;
      } else if (type === 'expense') {
        url = `/api/events/${event.id}/delete-expense/${encodeURIComponent(fileName)}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        await refreshEventData();
      } else {
        const error = await response.json();
        showNotification(error.message, 'error');
      }
    } catch (error) {
      showNotification('ფაილის წაშლა ვერ მოხერხდა', 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content file-manager-modal">
        <div className="modal-header">
          <h3>ფაილების მართვა - {event.service_name}</h3>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Plan File Section */}
          <div className="file-section">
            <h4>გეგმის ფაილი (PDF)</h4>
            <div className="file-content">
              {planFile ? (
                <div className="file-item">
                  <div className="file-info">
                    <span className="file-name">გეგმა.pdf</span>
                    {event.plan_uploaded_by && (
                      <span className="file-author">ატვირთა: {event.plan_uploaded_by}</span>
                    )}
                    <div className="file-actions">
                      <a
                        href={`/api/download/${planFile.replace('/uploads/', '')}`}
                        download="გეგმა.pdf"
                        className="btn-download"
                      >
                        ჩამოტვირთვა
                      </a>
                      {isAuthorizedForManagement && (
                        <button
                          className="btn-delete"
                          onClick={() => handleFileDelete('plan')}
                        >
                          წაშლა
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="no-file">გეგმის ფაილი არ არის ატვირთული</p>
              )}

              {isAuthorizedForManagement && (
                <div className="upload-section">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleFileUpload(e.target.files[0], 'plan');
                        e.target.value = '';
                      }
                    }}
                    disabled={uploading && uploadType === 'plan'}
                  />
                  {uploading && uploadType === 'plan' && <span>ატვირთვა...</span>}
                </div>
              )}
            </div>
          </div>

          {/* Attached Files Section */}
          <div className="file-section">
            <h4>მიმაგრებული ფაილები</h4>
            <div className="file-content">
              {[...invoiceFiles, ...expenseFiles].length > 0 ? (
                <div className="files-list">
                  {[...invoiceFiles, ...expenseFiles].map((file, index) => {
                    const isInvoice = invoiceFiles.includes(file);
                    return (
                      <div key={index} className="file-item">
                        <div className="file-info">
                          <span className="file-name">
                            {file.name}
                            <span className="file-type-badge">
                              {isInvoice ? 'ინვოისი' : 'ხარჯი'}
                            </span>
                          </span>
                          <span className="file-meta">
                            {formatFileSize(file.size)} • {formatDate(file.uploaded_at)}
                            {file.uploaded_by && ` • ${file.uploaded_by}`}
                          </span>
                          <div className="file-actions">
                            <a
                              href={`/api/download/${file.path.replace('/uploads/', '')}`}
                              download={file.name}
                              className="btn-download"
                            >
                              ჩამოტვირთვა
                            </a>
                            {isAuthorizedForManagement && (
                              <button
                                className="btn-delete"
                                onClick={() => handleFileDelete(isInvoice ? 'invoice' : 'expense', file.name)}
                              >
                                წაშლა
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-file">მიმაგრებული ფაილები არ არის ატვირთული</p>
              )}

              {isAuthorizedForManagement && (
                <div className="upload-section">
                  <div className="upload-type-selection">
                    <label>
                      <input
                        type="radio"
                        name="file-type"
                        value="invoice"
                        defaultChecked
                      />
                      ინვოისი
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="file-type"
                        value="expense"
                      />
                      ხარჯი
                    </label>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        const fileType = document.querySelector('input[name="file-type"]:checked').value;
                        handleFileUpload(e.target.files[0], fileType);
                        e.target.value = '';
                      }
                    }}
                    disabled={uploading && (uploadType === 'invoice' || uploadType === 'expense')}
                  />
                  {uploading && (uploadType === 'invoice' || uploadType === 'expense') && <span>ატვირთვა...</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventFileManager;