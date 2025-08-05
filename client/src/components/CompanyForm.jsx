import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './CompanyForm.css';

const CompanyForm = ({ companyToEdit, onCompanyUpdated, showNotification /* userRole ამოღებულია */ }) => {
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [companyProfile, setCompanyProfile] = useState('');
  const [identificationCode, setIdentificationCode] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  
  const [website, setWebsite] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('აქტიური'); // დეფაულტად აქტიური
  const [selectedExhibitions, setSelectedExhibitions] = useState([]); // ახალი სტეიტი გამოფენებისთვის
  const [exhibitions, setExhibitions] = useState([]); // ყველა გამოფენის სია
  const [contactPersons, setContactPersons] = useState([
    { name: '', position: '', phone: '', email: '' }
  ]); // საკონტაქტო პირების სტეიტი
  const isEditing = !!companyToEdit;

  // გამოფენების ჩატვირთვა
  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/exhibitions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setExhibitions(data);
        }
      } catch (error) {
        console.error('გამოფენების ჩატვირთვის შეცდომა:', error);
      }
    };

    fetchExhibitions();
  }, []);

  // განახლდეს selected exhibitions როდესაც კომპანია იცვლება
  useEffect(() => {
    if (isEditing && companyToEdit && exhibitions.length > 0) {
      if (companyToEdit.selected_exhibitions && Array.isArray(companyToEdit.selected_exhibitions)) {
        const exhibitionIds = companyToEdit.selected_exhibitions.map(id => Number(id));
        setSelectedExhibitions(exhibitionIds);
      } else {
        setSelectedExhibitions([]);
      }
    }
  }, [companyToEdit, isEditing, exhibitions]);

  useEffect(() => {
    if (isEditing && companyToEdit) {
      setCompanyName(companyToEdit.company_name || '');
      setCountry(companyToEdit.country || '');
      setCompanyProfile(companyToEdit.company_profile || '');
      setIdentificationCode(companyToEdit.identification_code || '');
      setLegalAddress(companyToEdit.legal_address || '');
      setWebsite(companyToEdit.website || '');
      setComment(companyToEdit.comment || '');
      setStatus(companyToEdit.status || 'აქტიური');
      
      // საკონტაქტო პირების დატვირთვა
      if (companyToEdit.contact_persons && Array.isArray(companyToEdit.contact_persons) && companyToEdit.contact_persons.length > 0) {
        setContactPersons(companyToEdit.contact_persons);
      } else {
        setContactPersons([{ name: '', position: '', phone: '', email: '' }]);
      }
      
    } else if (!isEditing) {
      setCompanyName('');
      setCountry('');
      setCompanyProfile('');
      setIdentificationCode('');
      setLegalAddress('');
      setWebsite('');
      setComment('');
      setStatus('აქტიური');
      setSelectedExhibitions([]);
      setContactPersons([{ name: '', position: '', phone: '', email: '' }]);
    }
  }, [companyToEdit, isEditing]);

  

  const handleExhibitionToggle = useCallback((exhibitionId, isChecked) => {
    const numericId = Number(exhibitionId);
    
    setSelectedExhibitions(prev => {
      if (isChecked) {
        // თუ checkbox მონიშნულია და ჯერ არ არის სიაში - დავამატოთ
        return prev.includes(numericId) ? prev : [...prev, numericId];
      } else {
        // თუ checkbox გაუქმებულია - ამოვიღოთ სიიდან
        return prev.filter(id => id !== numericId);
      }
    });
  }, []);

  // საკონტაქტო პირების მართვის ფუნქციები
  const addContactPerson = () => {
    setContactPersons([...contactPersons, { name: '', position: '', phone: '', email: '' }]);
  };

  const removeContactPerson = (index) => {
    if (contactPersons.length > 1) {
      const updatedContacts = contactPersons.filter((_, i) => i !== index);
      setContactPersons(updatedContacts);
    }
  };

  const updateContactPerson = (index, field, value) => {
    const updatedContacts = [...contactPersons];
    updatedContacts[index][field] = value;
    setContactPersons(updatedContacts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const companyData = {
      company_name: companyName,
      country,
      company_profile: companyProfile,
      identification_code: identificationCode,
      legal_address: legalAddress,
      
      website,
      comment,
      status,
      selected_exhibitions: selectedExhibitions, // გამოფენების IDs
      contact_persons: contactPersons.filter(person => 
        person.name.trim() !== '' || person.position.trim() !== '' || 
        person.phone.trim() !== '' || person.email.trim() !== ''
      ), // მხოლოდ შევსებული ველებით
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
            <option value="იტალია">იტალია</option>
            <option value="ესპანეთი">ესპანეთი</option>
            <option value="კანადა">კანადა</option>
            <option value="ავსტრალია">ავსტრალია</option>
            <option value="იაპონია">იაპონია</option>
            <option value="ჩინეთი">ჩინეთი</option>
            <option value="ბრაზილია">ბრაზილია</option>
            <option value="მექსიკო">მექსიკო</option>
            <option value="არგენტინა">არგენტინა</option>
            <option value="ჩილე">ჩილე</option>
            <option value="ინდოეთი">ინდოეთი</option>
            <option value="თურქეთი">თურქეთი</option>
            <option value="რუსეთი">რუსეთი</option>
            <option value="უკრაინა">უკრაინა</option>
            <option value="პოლონეთი">პოლონეთი</option>
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

        <div className="form-group">
          <label>მონაწილეობა გამოფენებში</label>
          <div className="exhibitions-selection">
            {exhibitions.map(exhibition => {
              const exhibitionId = Number(exhibition.id);
              const isChecked = selectedExhibitions.includes(exhibitionId);
              
              return (
                <div key={`exhibition-wrapper-${exhibition.id}`} className="exhibition-checkbox-wrapper">
                  <label className="exhibition-checkbox">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      value={exhibitionId}
                      onChange={(e) => handleExhibitionToggle(exhibitionId, e.target.checked)}
                    />
                    {exhibition.exhibition_name}
                  </label>
                </div>
              );
            })}
          </div>
          
        </div>

        {/* საკონტაქტო პირების სექცია */}
        <div className="form-group">
          <label>საკონტაქტო პირები</label>
          {contactPersons.map((person, index) => (
            <div key={index} className="contact-person-group">
              <h5>საკონტაქტო პირი {index + 1}</h5>
              <div className="form-group">
                <label>სახელი გვარი</label>
                <input
                  type="text"
                  value={person.name}
                  onChange={(e) => updateContactPerson(index, 'name', e.target.value)}
                  placeholder="მაგ: ნინო გელაშვილი"
                />
              </div>
              <div className="form-group">
                <label>პოზიცია</label>
                <input
                  type="text"
                  value={person.position}
                  onChange={(e) => updateContactPerson(index, 'position', e.target.value)}
                  placeholder="მაგ: გაყიდვების მენეჯერი"
                />
              </div>
              <div className="form-group">
                <label>ტელეფონის ნომერი</label>
                <input
                  type="tel"
                  value={person.phone}
                  onChange={(e) => updateContactPerson(index, 'phone', e.target.value)}
                  placeholder="მაგ: +995 555 123 456"
                />
              </div>
              <div className="form-group">
                <label>ელ-ფოსტა</label>
                <input
                  type="email"
                  value={person.email}
                  onChange={(e) => updateContactPerson(index, 'email', e.target.value)}
                  placeholder="მაგ: nino@company.ge"
                />
              </div>
              {contactPersons.length > 1 && (
                <button
                  type="button"
                  className="remove-contact-btn"
                  onClick={() => removeContactPerson(index)}
                >
                  ამ კონტაქტის წაშლა
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="add-contact-btn"
            onClick={addContactPerson}
          >
            ახალი საკონტაქტო პირის დამატება
          </button>
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
