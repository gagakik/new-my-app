
import React, { useState } from 'react';
import api from '../services/api';
import './DocumentGenerator.css';

const DocumentGenerator = ({ participantId, participantName, onClose, showNotification }) => {
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState('invoice');
  const [documentData, setDocumentData] = useState(null);

  const generateDocument = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/documents/${documentType}/${participantId}`);
      setDocumentData(response.data);
      showNotification(`${documentType === 'invoice' ? 'ინვოისი' : 'ხელშეკრულება'} წარმატებით გენერირდა`, 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'დოკუმენტის გენერაცია ვერ მოხერხდა';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const printDocument = () => {
    window.print();
  };

  const downloadDocument = () => {
    const element = document.createElement('a');
    const content = generateDocumentHTML();
    const file = new Blob([content], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentType}-${participantId}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generateDocumentHTML = () => {
    if (!documentData) return '';

    if (documentType === 'invoice') {
      return generateInvoiceHTML();
    } else {
      return generateContractHTML();
    }
  };

  const generateInvoiceHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="ka">
      <head>
        <meta charset="UTF-8">
        <title>ინვოისი ${documentData.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 30px; }
          .company-info { margin-bottom: 20px; }
          .services-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .services-table th, .services-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .services-table th { background-color: #f5f5f5; }
          .total { text-align: right; font-weight: bold; font-size: 1.2em; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ინვოისი</h1>
          <h2>${documentData.invoiceNumber}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>გაცემის თარიღი:</strong> ${documentData.issueDate}</p>
          ${documentData.dueDate ? `<p><strong>გადახდის ვადა:</strong> ${documentData.dueDate}</p>` : ''}
        </div>

        <div class="company-info">
          <h3>მიმღები:</h3>
          <p><strong>${documentData.company.name}</strong></p>
          <p>საიდ. კოდი: ${documentData.company.identificationCode}</p>
          <p>მისამართი: ${documentData.company.address}</p>
        </div>

        <table class="services-table">
          <thead>
            <tr>
              <th>სერვისი</th>
              <th>სტენდის ნომერი</th>
              <th>ზომა (მ²)</th>
              <th>თანხა (₾)</th>
            </tr>
          </thead>
          <tbody>
            ${documentData.services.map(service => `
              <tr>
                <td>${service.description}</td>
                <td>${service.boothNumber || '-'}</td>
                <td>${service.boothSize || '-'}</td>
                <td>${service.amount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <p>ჯამური თანხა: ${documentData.totalAmount}₾</p>
          <p>სტატუსი: ${documentData.paymentStatus}</p>
        </div>

        ${documentData.notes ? `<div><strong>შენიშვნები:</strong> ${documentData.notes}</div>` : ''}
      </body>
      </html>
    `;
  };

  const generateContractHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="ka">
      <head>
        <meta charset="UTF-8">
        <title>ხელშეკრულება ${documentData.contractNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .contract-details { margin-bottom: 30px; }
          .terms { margin: 20px 0; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>მონაწილეობის ხელშეკრულება</h1>
          <h2>${documentData.contractNumber}</h2>
        </div>
        
        <div class="contract-details">
          <p><strong>თარიღი:</strong> ${documentData.date}</p>
        </div>

        <div class="company-info">
          <h3>კომპანია:</h3>
          <p><strong>${documentData.company.name}</strong></p>
          <p>საიდ. კოდი: ${documentData.company.identificationCode}</p>
          <p>მისამართი: ${documentData.company.address}</p>
        </div>

        <div class="event-info">
          <h3>ივენთი:</h3>
          <p><strong>${documentData.event.name}</strong></p>
          <p>${documentData.event.description}</p>
          <p>თარიღები: ${documentData.event.startDate} - ${documentData.event.endDate}</p>
        </div>

        <div class="terms">
          <h3>პირობები:</h3>
          <ul>
            ${documentData.terms.boothNumber ? `<li>სტენდის ნომერი: ${documentData.terms.boothNumber}</li>` : ''}
            ${documentData.terms.boothSize ? `<li>სტენდის ზომა: ${documentData.terms.boothSize} მ²</li>` : ''}
            ${documentData.terms.paymentAmount ? `<li>გადასახადი: ${documentData.terms.paymentAmount}₾</li>` : ''}
            ${documentData.terms.paymentDueDate ? `<li>გადახდის ვადა: ${documentData.terms.paymentDueDate}</li>` : ''}
            ${documentData.terms.paymentMethod ? `<li>გადახდის მეთოდი: ${documentData.terms.paymentMethod}</li>` : ''}
          </ul>
        </div>

        ${documentData.notes ? `<div><strong>შენიშვნები:</strong> ${documentData.notes}</div>` : ''}

        <div class="signature-section">
          <div>
            <p>კომპანიის წარმომადგენელი:</p>
            <p>____________________</p>
          </div>
          <div>
            <p>ორგანიზატორი:</p>
            <p>____________________</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="document-generator-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>დოკუმენტის გენერაცია - {participantName}</h3>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="document-type-selector">
            <label>
              <input
                type="radio"
                value="invoice"
                checked={documentType === 'invoice'}
                onChange={(e) => setDocumentType(e.target.value)}
              />
              ინვოისი
            </label>
            <label>
              <input
                type="radio"
                value="contract"
                checked={documentType === 'contract'}
                onChange={(e) => setDocumentType(e.target.value)}
              />
              ხელშეკრულება
            </label>
          </div>

          <div className="generate-actions">
            <button 
              className="generate-btn"
              onClick={generateDocument}
              disabled={loading}
            >
              {loading ? 'იქმნება...' : 'დოკუმენტის გენერაცია'}
            </button>
          </div>

          {documentData && (
            <div className="document-preview">
              <div className="preview-actions">
                <button className="print-btn" onClick={printDocument}>
                  📄 დაბეჭდვა
                </button>
                <button className="download-btn" onClick={downloadDocument}>
                  💾 ჩამოტვირთვა
                </button>
              </div>

              <div className="document-content" dangerouslySetInnerHTML={{
                __html: generateDocumentHTML()
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentGenerator;
