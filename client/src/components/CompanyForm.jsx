import React, { useState, useEffect } from 'react';
import './CompanyForm.css';

const CompanyForm = ({ companyToEdit, onCompanyUpdated, showNotification /* userRole ამოღებულია */ }) => {
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [companyProfile, setCompanyProfile] = useState('');
  const [identificationCode, setIdentificationCode] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [contactPerson1Name, setContactPerson1Name] = useState('');
  const [contactPerson1Phone, setContactPerson1Phone] = useState('');
  const [contactPerson1Email, setContactPerson1Email] = useState('');
  const [contactPerson2Name, setContactPerson2Name] = useState('');
  const [contactPerson2Phone, setContactPerson2Phone] = useState('');
  const [contactPerson2Email, setContactPerson2Email] = useState('');
  const [website, setWebsite] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('აქტიური'); // დეფაულტად აქტიური
  const isEditing = !!companyToEdit;

  useEffect(() => {
    if (isEditing && companyToEdit) {
      setCompanyName(companyToEdit.company_name || '');
      setCountry(companyToEdit.country || '');
      setCompanyProfile(companyToEdit.company_profile || '');
      setIdentificationCode(companyToEdit.identification_code || '');
      setLegalAddress(companyToEdit.legal_address || '');
      setContactPerson1Name(companyToEdit.contact_person1_name || '');
      setContactPerson1Phone(companyToEdit.contact_person1_phone || '');
      setContactPerson1Email(companyToEdit.contact_person1_email || '');
      setContactPerson2Name(companyToEdit.contact_person2_name || '');
      setContactPerson2Phone(companyToEdit.contact_person2_phone || '');
      setContactPerson2Email(companyToEdit.contact_person2_email || '');
      setWebsite(companyToEdit.website || '');
      setComment(companyToEdit.comment || '');
      setStatus(companyToEdit.status || 'აქტიური');
    } else {
      setCompanyName('');
      setCountry('');
      setCompanyProfile('');
      setIdentificationCode('');
      setLegalAddress('');
      setContactPerson1Name('');
      setContactPerson1Phone('');
      setContactPerson1Email('');
      setContactPerson2Name('');
      setContactPerson2Phone('');
      setContactPerson2Email('');
      setWebsite('');
      setComment('');
      setStatus('აქტიური');
    }
  }, [companyToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const companyData = {
      company_name: companyName,
      country,
      company_profile: companyProfile,
      identification_code: identificationCode,
      legal_address: legalAddress,
      contact_person1_name: contactPerson1Name,
      contact_person1_phone: contactPerson1Phone,
      contact_person1_email: contactPerson1Email,
      contact_person2_name: contactPerson2Name,
      contact_person2_phone: contactPerson2Phone,
      contact_person2_email: contactPerson2Email,
      website,
      comment,
      status,
    };
    
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/companies/${companyToEdit.id}`
      : '/api/companies';

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onCompanyUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  return (
    <div className="form-container">
      <h3>{isEditing ? 'კომპანიის რედაქტირება' : 'ახალი კომპანიის დამატება'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>კომპანიის დასახელება</label>
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>ქვეყანა</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} required>
            <option value="">აირჩიეთ ქვეყანა</option>
            <option value="საქართველო">საქართველო</option>
            <option value="აშშ">აშშ</option>
            <option value="გერმანია">გერმანია</option>
            <option value="საფრანგეთი">საფრანგეთი</option>
            <option value="დიდი ბრიტანეთი">დიდი ბრიტანეთი</option>
            <option value="იაპონია">იაპონია</option>
            <option value="ჩინეთი">ჩინეთი</option>
            <option value="ინდოეთი">ინდოეთი</option>
            <option value="ბრაზილია">ბრაზილია</option>
            <option value="კანადა">კანადა</option>
          </select>
        </div>
        <div className="form-group">
          <label>კომპანიის პროფილი</label>
          <input type="text" value={companyProfile} onChange={(e) => setCompanyProfile(e.target.value)} />
        </div>
        <div className="form-group">
          <label>საიდენტიფიკაციო კოდი</label>
          <input type="text" value={identificationCode} onChange={(e) => setIdentificationCode(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>იურიდიული მისამართი</label>
          <input type="text" value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} />
        </div>
        
        <h4>1. საკონტაქტო პირი</h4>
        <div className="form-group">
          <label>სახელი გვარი</label>
          <input type="text" value={contactPerson1Name} onChange={(e) => setContactPerson1Name(e.target.value)} />
        </div>
        <div className="form-group">
          <label>ტელეფონი</label>
          <input type="text" value={contactPerson1Phone} onChange={(e) => setContactPerson1Phone(e.target.value)} />
        </div>
        <div className="form-group">
          <label>მეილი</label>
          <input type="email" value={contactPerson1Email} onChange={(e) => setContactPerson1Email(e.target.value)} />
        </div>

        <h4>2. საკონტაქტო პირი (სურვილისამებრ)</h4>
        <div className="form-group">
          <label>სახელი გვარი</label>
          <input type="text" value={contactPerson2Name} onChange={(e) => setContactPerson2Name(e.target.value)} />
        </div>
        <div className="form-group">
          <label>ტელეფონი</label>
          <input type="text" value={contactPerson2Phone} onChange={(e) => setContactPerson2Phone(e.target.value)} />
        </div>
        <div className="form-group">
          <label>მეილი</label>
          <input type="email" value={contactPerson2Email} onChange={(e) => setContactPerson2Email(e.target.value)} />
        </div>

        <div className="form-group">
          <label>ვებგვერდი</label>
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="მაგალითად: expogeorgia.ge" />
        </div>
        <div className="form-group">
          <label>კომენტარი</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)}></textarea>
        </div>
        <div className="form-group">
          <label>სტატუსი</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="აქტიური">აქტიური</option>
            <option value="არქივი">არქივი</option>
          </select>
        </div>
        
        <button type="submit" className="submit-btn">
          {isEditing ? 'განახლება' : 'დამატება'}
        </button>
        <button type="button" className="cancel-btn" onClick={onCompanyUpdated}>
          გაუქმება
        </button>
      </form>
    </div>
  );
};

export default CompanyForm;
