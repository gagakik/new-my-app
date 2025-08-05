import React, { useState, useEffect } from 'react';
import './InvoiceForm.css';

const InvoiceForm = ({ participant, onClose, showNotification, eventData }) => {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    companyInfo: {
      name: 'თქვენი კომპანია',
      address: 'თბილისი, საქართველო',
      phone: '+995 XXX XXX XXX',
      email: 'info@yourcompany.ge',
      taxNumber: 'XXX-XXX-XXX'
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (participant) {
      initializeInvoiceData();
    }
  }, [participant]);

  const initializeInvoiceData = () => {
    // ინვოისის ნომრის გენერაცია
    const date = new Date();
    let invoiceNumber = participant.invoice_number;
    if (!invoiceNumber) {
      invoiceNumber = `INV-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(participant.id).padStart(4, '0')}`;
    }

    // ინვოისის ერთეულების ჩამოყალიბება
    const items = [];

    // სტენდის ღირებულება
    if (participant.booth_size && eventData?.price_per_sqm) {
      const boothCost = parseFloat(participant.booth_size) * parseFloat(eventData.price_per_sqm);
      items.push({
        id: 'booth',
        description: `მონაწილეობა ღონისძიებაში "${eventData.service_name || eventData.exhibition_name}"`,
        details: `სტენდი #${participant.booth_number || 'TBD'} (${participant.booth_size}მ²)`,
        quantity: parseFloat(participant.booth_size),
        unitPrice: parseFloat(eventData.price_per_sqm),
        total: boothCost
      });
    }

    // აღჭურვილობის ღირებულება (თუ არსებობს)
    if (participant.equipment_total && participant.equipment_total > 0) {
      items.push({
        id: 'equipment',
        description: 'დამატებითი აღჭურვილობა',
        details: 'მითითებული აღჭურვილობის ნაკრები',
        quantity: 1,
        unitPrice: parseFloat(participant.equipment_total),
        total: parseFloat(participant.equipment_total)
      });
    }

    // ზოგადი თანხა (თუ სხვა მეთოდით არის გათვლილი)
    if (items.length === 0 && participant.payment_amount) {
      items.push({
        id: 'general',
        description: `მონაწილეობა ღონისძიებაში "${eventData?.service_name || eventData?.exhibition_name || 'ღონისძიება'}"`,
        details: participant.notes || 'ღონისძიებაში მონაწილეობის გადასახადი',
        quantity: 1,
        unitPrice: parseFloat(participant.payment_amount),
        total: parseFloat(participant.payment_amount)
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18; // 18% დღგ
    const total = subtotal + tax;

    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber,
      dueDate: participant.payment_due_date || '',
      items,
      subtotal,
      tax,
      total,
      notes: participant.notes || ''
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].unitPrice || 0);
    }

    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      tax,
      total
    }));
  };

  const addNewItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      details: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };

    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      tax,
      total
    }));
  };

  const handleSaveInvoice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const updateData = {
        company_id: participant.company_id,
        registration_status: participant.registration_status,
        payment_status: participant.payment_status,
        booth_number: participant.booth_number,
        booth_size: participant.booth_size,
        contact_person: participant.contact_person,
        contact_position: participant.contact_position,
        contact_email: participant.contact_email,
        contact_phone: participant.contact_phone,
        invoice_number: invoiceData.invoiceNumber,
        payment_amount: invoiceData.total.toFixed(2),
        payment_due_date: invoiceData.dueDate,
        payment_method: participant.payment_method || 'ბანკის გადარიცხვა',
        notes: invoiceData.notes
      };

      console.log('Saving invoice with data:', updateData);

      const response = await fetch(`/api/events/${participant.event_id}/participants/${participant.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        showNotification('ინვოისი წარმატებით შეინახა', 'success');
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        showNotification(errorData.message || 'ინვოისის შენახვა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('ინვოისის შენახვის შეცდომა:', error);
      showNotification('ინვოისის შენახვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ka-GE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  if (!participant) {
    return null;
  }

  return (
    <div className="invoice-modal">
      <div className="invoice-modal-content">
        {/* Header */}
        <div className="invoice-header no-print">
          <h3>ინვოისის გენერაცია</h3>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        {/* Invoice Document */}
        <div className="invoice-document">
          {/* Company Header */}
          <div className="invoice-company-header">
            <div className="company-info">
              <h2>{invoiceData.companyInfo.name}</h2>
              <p>{invoiceData.companyInfo.address}</p>
              <p>ტელ: {invoiceData.companyInfo.phone}</p>
              <p>მეილი: {invoiceData.companyInfo.email}</p>
              <p>სს: {invoiceData.companyInfo.taxNumber}</p>
            </div>
            <div className="invoice-title">
              <h1>ინვოისი</h1>
              <p className="invoice-number">#{invoiceData.invoiceNumber}</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="invoice-details">
            <div className="invoice-dates">
              <div className="date-group">
                <label>გამოტანის თარიღი:</label>
                <input
                  type="date"
                  value={invoiceData.issueDate}
                  onChange={(e) => setInvoiceData(prev => ({...prev, issueDate: e.target.value}))}
                  className="date-input"
                />
              </div>
              <div className="date-group">
                <label>გადახდის ვადა:</label>
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({...prev, dueDate: e.target.value}))}
                  className="date-input"
                />
              </div>
            </div>

            <div className="customer-info">
              <h4>მიმღები:</h4>
              <div className="customer-details">
                <p><strong>{participant.company_name}</strong></p>
                <p>ქვეყანა: {participant.country}</p>
                <p>ს/კ: {participant.identification_code}</p>
                {participant.legal_address && <p>მისამართი: {participant.legal_address}</p>}
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="invoice-items">
            <table className="items-table">
              <thead>
                <tr>
                  <th>აღწერა</th>
                  <th>დეტალები</th>
                  <th>რაოდ.</th>
                  <th>ერთ. ფასი</th>
                  <th>ჯამი</th>
                  <th className="no-print">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="item-input"
                        placeholder="სერვისის აღწერა"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.details}
                        onChange={(e) => handleItemChange(index, 'details', e.target.value)}
                        className="item-input"
                        placeholder="დეტალები"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="item-input quantity-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="item-input price-input"
                      />
                    </td>
                    <td className="total-cell">
                      {formatCurrency(item.total)}
                    </td>
                    <td className="no-print">
                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() => removeItem(index)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="add-item-section no-print">
              <button
                type="button"
                className="add-item-btn"
                onClick={addNewItem}
              >
                + ახალი სერვისის დამატება
              </button>
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="invoice-totals">
            <div className="totals-section">
              <div className="total-row">
                <span>ქვეჯამი:</span>
                <span>{formatCurrency(invoiceData.subtotal)}</span>
              </div>
              <div className="total-row">
                <span>დღგ (18%):</span>
                <span>{formatCurrency(invoiceData.tax)}</span>
              </div>
              <div className="total-row final-total">
                <span><strong>სავსო გადახდელი:</strong></span>
                <span><strong>{formatCurrency(invoiceData.total)}</strong></span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="invoice-notes">
            <label>შენიშვნები:</label>
            <textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({...prev, notes: e.target.value}))}
              className="notes-textarea"
              placeholder="დამატებითი ინფორმაცია..."
              rows="3"
            />
          </div>

          {/* Payment Information */}
          <div className="payment-info">
            <h4>გადახდის ინფორმაცია:</h4>
            <p>ბანკი: [თქვენი ბანკის მონაცემები]</p>
            <p>ანგარიშის ნომერი: [IBAN]</p>
            <p>სწიფტ კოდი: [SWIFT]</p>
          </div>
        </div>

        {/* Actions */}
        <div className="invoice-actions no-print">
          <button
            className="save-invoice-btn"
            onClick={handleSaveInvoice}
            disabled={loading}
          >
            {loading ? 'ინახება...' : 'ინვოისის შენახვა'}
          </button>
          <button
            className="print-invoice-btn"
            onClick={handlePrintInvoice}
          >
            ამობეჭდვა
          </button>
          <button
            className="cancel-btn"
            onClick={onClose}
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;