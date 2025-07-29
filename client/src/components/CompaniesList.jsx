import React, { useState, useEffect, useCallback } from 'react';
import './CompaniesList.css';
import CompanyForm from './CompanyForm'; // კომპანიის ფორმის იმპორტი

const CompaniesList = ({ showNotification, userRole }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIdentificationCode, setFilterIdentificationCode] = useState(''); // ახალი სტეიტი საიდენტიფიკაციო კოდისთვის
  const [selectedCompany, setSelectedCompany] = useState(null); // დეტალური ხედვისთვის

  // განსაზღვრეთ, აქვს თუ არა მომხმარებელს მართვის უფლება
  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales';

  const fetchCompanies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      let url = '/api/companies?';
      if (searchTerm) url += `searchTerm=${searchTerm}&`;
      if (filterCountry) url += `country=${filterCountry}&`;
      if (filterProfile) url += `profile=${filterProfile}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterIdentificationCode) url += `identificationCode=${filterIdentificationCode}&`; // დავამატეთ საიდენტიფიკაციო კოდის ფილტრი

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'კომპანიების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა კომპანიების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCountry, filterProfile, filterStatus, filterIdentificationCode, showNotification]); // დავამატეთ filterIdentificationCode დამოკიდებულებებში

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ კომპანიის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('კომპანია წარმატებით წაიშალა!', 'success');
        fetchCompanies();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'წაშლა ვერ მოხერხდა.');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification(`დაფიქსირდა შეცდომა წაშლისას: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (company) => {
    setEditingId(company.id);
  };

  const handleCompanyUpdated = () => {
    setEditingId(null);
    setSelectedCompany(null); // დეტალური ხედვიდან გასვლა
    fetchCompanies();
  };

  const handleViewDetails = (company) => {
    setSelectedCompany(company);
  };

  if (loading) {
    return <div>იტვირთება...</div>;
  }

  if (error) {
    return <div>შეცდომა: {error}</div>;
  }

  if (selectedCompany) {
    return (
      <div className="company-details-container">
        <h2>{selectedCompany.company_name} - დეტალები</h2>
        <p><strong>ქვეყანა:</strong> {selectedCompany.country}</p>
        <p><strong>კომპანიის პროფილი:</strong> {selectedCompany.company_profile}</p>
        <p><strong>საიდენტიფიკაციო კოდი:</strong> {selectedCompany.identification_code}</p>
        <p><strong>იურიდიული მისამართი:</strong> {selectedCompany.legal_address}</p>
        
        {/* საკონტაქტო პირების გამოტანა */}
        {selectedCompany.contact_persons && selectedCompany.contact_persons.length > 0 && (
          <div>
            <h4>საკონტაქტო პირები:</h4>
            {selectedCompany.contact_persons.map((person, index) => (
              <div key={index} className="contact-person-details-card">
                <p><strong>პოზიცია:</strong> {person.position || 'არ არის მითითებული'}</p>
                <p><strong>სახელი გვარი:</strong> {person.name || 'არ არის მითითებული'}</p>
                <p><strong>ტელეფონი:</strong> {person.phone || 'არ არის მითითებული'}</p>
                <p><strong>მეილი:</strong> {person.email || 'არ არის მითითებული'}</p>
              </div>
            ))}
          </div>
        )}

        <p><strong>ვებგვერდი:</strong> <a href={`http://${selectedCompany.website}`} target="_blank" rel="noopener noreferrer">{selectedCompany.website}</a></p>
        <p><strong>კომენტარი:</strong> {selectedCompany.comment}</p>
        <p><strong>სტატუსი:</strong> {selectedCompany.status}</p>
        <p className="meta-info">დამატებულია: {new Date(selectedCompany.created_at).toLocaleDateString()} (ID: {selectedCompany.created_by_user_id})</p>
        {selectedCompany.updated_at && (
          <p className="meta-info">განახლებულია: {new Date(selectedCompany.updated_at).toLocaleDateString()} (ID: {selectedCompany.updated_by_user_id})</p>
        )}
        <button className="back-btn" onClick={() => setSelectedCompany(null)}>უკან დაბრუნება</button>
      </div>
    );
  }

  return (
    <div className="companies-container">
      <h2>კომპანიების სია</h2>
      
      {/* ფილტრები და ძებნა */}
      <div className="filters">
        <input 
          type="text" 
          placeholder="ძებნა დასახელებით..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
          <option value="">ყველა ქვეყანა</option>
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
        <input 
          type="text" 
          placeholder="პროფილი..." 
          value={filterProfile} 
          onChange={(e) => setFilterProfile(e.target.value)} 
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">ყველა სტატუსი</option>
          <option value="აქტიური">აქტიური</option>
          <option value="არქივი">არქივი</option>
        </select>
        <input 
          type="text" 
          placeholder="საიდენტიფიკაციო კოდი..." 
          value={filterIdentificationCode} 
          onChange={(e) => setFilterIdentificationCode(e.target.value)} 
        /> {/* ახალი ველი საიდენტიფიკაციო კოდისთვის */}
        <button onClick={fetchCompanies}>ფილტრი</button> {/* ფილტრის ღილაკი */}
      </div> {/* filters დასასრული */}

      {isAuthorizedForManagement && (
        <button className="add-new" onClick={() => setEditingId(0)}>ახალი კომპანიის დამატება</button>
      )}

      {editingId !== null && isAuthorizedForManagement && (
        <CompanyForm 
          companyToEdit={companies.find(c => c.id === editingId)} 
          onCompanyUpdated={handleCompanyUpdated} 
          showNotification={showNotification} 
          userRole={userRole}
        />
      )}

      {companies.length === 0 ? (
        <p className="no-companies">კომპანიები არ მოიძებნა.</p>
      ) : (
        <div className="companies-grid">
          {companies.map((company) => (
            <div key={company.id} className="company-card">
              <h3>{company.company_name}</h3>
              <p><strong>პროფილი:</strong> {company.company_profile}</p>
              <p><strong>სტატუსი:</strong> {company.status}</p>
              <div className="actions">
                <button className="view-details" onClick={() => handleViewDetails(company)}>დეტალები</button>
                {isAuthorizedForManagement && (
                  <>
                    <button className="edit" onClick={() => handleEditClick(company)}>რედაქტირება</button>
                    <button 
                      className="delete" 
                      onClick={() => handleDelete(company.id)}>
                      წაშლა
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompaniesList;
