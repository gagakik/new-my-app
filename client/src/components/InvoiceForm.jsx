import React, { useState, useEffect } from 'react';

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
      name: 'Expo Georgia Management 1958 LLC',
      address: 'Georgia, Tbilisi, Tsereteli Ave. № 118; 0119',
      phone: '+995 322 341 100',
      email: 'finance@expogeorgia.ge',
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

    // participant.payment_amount უკვე შეიცავს დღგ-ს, ამიტომ უკუდათვლით გამოვითვლოთ ღირებულება დღგ-ის გარეშე
    const totalWithVAT = parseFloat(participant.payment_amount) || 0;
    const subtotalWithoutVAT = totalWithVAT / 1.18; // დღგ-ის გარეშე ღირებულება
    const vatAmount = totalWithVAT - subtotalWithoutVAT; // 18% დღგ

    // შევამოწმოთ არის თუ არა პაკეტი
    const isPackageRegistration = participant.package_name || participant.selected_package_id;

    // თუ პაკეტია - პაკეტის ღირებულება დღგ-ის გარეშე
    if (isPackageRegistration && participant.package_name) {
      items.push({
        id: 'package',
        description: `პაკეტი "${participant.package_name}"`,
        details: `მონაწილეობა ღონისძიებაში "${eventData?.service_name || eventData?.exhibition_name || 'ღონისძიება'}" (${participant.booth_size || 'N/A'}მ²)`,
        quantity: 1,
        unitPrice: subtotalWithoutVAT,
        total: subtotalWithoutVAT
      });
    } else {
      // ინდივიდუალური რეგისტრაციისთვის - ფასები დღგ-ის გარეშე
      if (participant.booth_size) {
        // სტენდის ღირებულება (მთლიანი თანხის ნაწილი)
        const boothPortion = 0.8; // დავაფრიქსიროთ რომ სტენდი არის 80% მთლიანი თანხის
        const boothSubtotal = subtotalWithoutVAT * boothPortion;

        items.push({
          id: 'booth',
          description: `მონაწილეობა ღონისძიებაში "${eventData?.service_name || eventData?.exhibition_name || 'ღონისძიება'}"`,
          details: `სტენდი #${participant.booth_number || 'TBD'} (${participant.booth_size}მ²)`,
          quantity: parseFloat(participant.booth_size),
          unitPrice: boothSubtotal / parseFloat(participant.booth_size),
          total: boothSubtotal
        });

        // აღჭურვილობის ღირებულება (თუ არსებობს)
        if (participant.equipment_total && participant.equipment_total > 0) {
          const equipmentPortion = 0.2; // დარჩენილი 20%
          const equipmentSubtotal = subtotalWithoutVAT * equipmentPortion;

          items.push({
            id: 'equipment',
            description: 'დამატებითი აღჭურვილობა',
            details: 'მითითებული აღჭურვილობის ნაკრები',
            quantity: 1,
            unitPrice: equipmentSubtotal,
            total: equipmentSubtotal
          });
        }
      }
    }

    // თუ ერთეულები არ შეიქმნა, შევქმნათ ზოგადი ერთეული
    if (items.length === 0) {
      items.push({
        id: 'general',
        description: `მონაწილეობა ღონისძიებაში "${eventData?.service_name || eventData?.exhibition_name || 'ღონისძიება'}"`,
        details: participant.notes || 'ღონისძიებაში მონაწილეობის გადასახადი',
        quantity: 1,
        unitPrice: subtotalWithoutVAT,
        total: subtotalWithoutVAT
      });
    }

    const subtotal = subtotalWithoutVAT;
    const tax = vatAmount;
    const total = totalWithVAT;

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

    // ინვოისის ერთეულები შეყვანილია დღგ-ის გარეშე, ამიტომ:
    const subtotalWithoutVAT = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = subtotalWithoutVAT * 0.18; // 18% დღგ
    const totalWithVAT = subtotalWithoutVAT + vatAmount;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subtotal: subtotalWithoutVAT,
      tax: vatAmount,
      total: totalWithVAT
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
    const subtotalWithoutVAT = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = subtotalWithoutVAT * 0.18;
    const totalWithVAT = subtotalWithoutVAT + vatAmount;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subtotal: subtotalWithoutVAT,
      tax: vatAmount,
      total: totalWithVAT
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
    return new Intl.NumberFormat('en-US', {
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
        <div className="invoice-document print-version">
          {/* Company Header */}
          <div className="invoice-company-header print-header">
            <div className="company-info">
              <h2>{invoiceData.companyInfo.name}</h2>
              <p>{invoiceData.companyInfo.address}</p>
              <p>ტელ: {invoiceData.companyInfo.phone}</p>
              <p>მეილი: {invoiceData.companyInfo.email}</p>
              <p>ს/კ: {invoiceData.companyInfo.taxNumber}</p>
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
                <label>მომზადების თარიღი:</label>
                <input
                  type="date"
                  value={invoiceData.issueDate}
                  onChange={(e) => setInvoiceData(prev => ({...prev, issueDate: e.target.value}))}
                  className="date-input"
                />
              </div>
              <div className="date-group">
                <label>ვალიდურია:</label>
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({...prev, dueDate: e.target.value}))}
                  className="date-input"
                />
              </div>
            </div>

            <div className="customer-info">
              <h4>მონაწილე:</h4>
              <div className="customer-details">
                <p><strong>{participant.company_name}</strong></p>
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
                    <td className="total-cell print-currency">
                      <span className="print-only">€{item.total.toFixed(2)}</span>
                      <span className="no-print">{formatCurrency(item.total)}</span>
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
                <span>ჯამი:</span>
                <span>
                  <span className="print-only">€{invoiceData.subtotal.toFixed(2)}</span>
                  <span className="no-print">{formatCurrency(invoiceData.subtotal)}</span>
                </span>
              </div>
              <div className="total-row">
                <span>დღგ (18%):</span>
                <span>
                  <span className="print-only">€{invoiceData.tax.toFixed(2)}</span>
                  <span className="no-print">{formatCurrency(invoiceData.tax)}</span>
                </span>
              </div>
              <div className="total-row final-total">
                <span><strong>გადასახდელი:</strong></span>
                <span><strong>
                  <span className="print-only">€{invoiceData.total.toFixed(2)}</span>
                  <span className="no-print">{formatCurrency(invoiceData.total)}</span>
                </strong></span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="payment-info">
            <h4>საგადახდო ინფორმაცია:</h4>
            <p>ბანკი: JSC "TBC Bank"</p>
            <p>ანგარიშის ნომერი: GE12TB7373336020100002</p>
            <p>სწიფტ კოდი: TBCBGE22</p>
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