import React, { useState, useEffect, useCallback } from 'react';
import './CompaniesList.css';
import CompanyForm from './CompanyForm'; // კომპანიის ფორმის იმპორტი
import CompanyImport from './CompanyImport'; // კომპანიის იმპორტის კომპონენტის კომპონენტის იმპორტი
import './ButtonIcons.css';

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
  const [showImport, setShowImport] = useState(false); // იმპორტის მოდალის საჩვენებლად
  const [exhibitions, setExhibitions] = useState([]); // გამოფენების სია
  const [editingExhibitions, setEditingExhibitions] = useState(null); // რომელი კომპანიის გამოფენებს ვარედაქტირებთ

  // განსაზღვრეთ, აქვს თუ არა მომხმარებელს მართვის უფლება
  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'sales';

  // გამოფენების ჩატვირთვა
  const fetchExhibitions = useCallback(async () => {
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
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა კომპანიების ნახვისთვის');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let url = '/api/companies?';
      if (searchTerm) url += `searchTerm=${searchTerm}&`;
      if (filterCountry) url += `country=${filterCountry}&`;
      if (filterProfile) url += `profile=${filterProfile}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterIdentificationCode) url += `identification_code=${filterIdentificationCode}&`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ კომპანიების ნახვის უფლება');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა კომპანიების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCountry, filterProfile, filterStatus, filterIdentificationCode, showNotification]);

  useEffect(() => {
    fetchCompanies();
    fetchExhibitions();
  }, [fetchCompanies, fetchExhibitions]);

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

  const handleImportComplete = () => {
    setShowImport(false);
    fetchCompanies();
  };

  const handleViewDetails = (company) => {
    setSelectedCompany(company);
  };

  const handleEditExhibitions = (company) => {
    setEditingExhibitions({
      companyId: company.id,
      companyName: company.company_name,
      selectedExhibitions: company.selected_exhibitions || []
    });
  };

  const handleExhibitionToggle = (exhibitionId, isChecked) => {
    const numericId = Number(exhibitionId);

    setEditingExhibitions(prev => {
      const newSelectedExhibitions = isChecked
        ? [...prev.selectedExhibitions, numericId]
        : prev.selectedExhibitions.filter(id => id !== numericId);

      return {
        ...prev,
        selectedExhibitions: newSelectedExhibitions
      };
    });
  };

  const saveExhibitionChanges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/companies/${editingExhibitions.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selected_exhibitions: editingExhibitions.selectedExhibitions
        })
      });

      if (response.ok) {
        showNotification('გამოფენები წარმატებით განახლდა!', 'success');
        setEditingExhibitions(null);
        fetchCompanies();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'განახლება ვერ მოხერხდა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const cancelExhibitionEdit = () => {
    setEditingExhibitions(null);
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
        <p className="meta-info">
          <strong>შექმნის ინფორმაცია:</strong>
          {new Date(selectedCompany.created_at).toLocaleDateString()}
          {selectedCompany.created_by_username && ` - ${selectedCompany.created_by_username}`}
        </p>
        {selectedCompany.updated_at && (
          <p className="meta-info">
            <strong>განახლების ინფორმაცია:</strong>
            {new Date(selectedCompany.updated_at).toLocaleDateString()}
            {selectedCompany.updated_by_username && ` - ${selectedCompany.updated_by_username}`}
          </p>
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
          <option value="იტალია">იტალია</option>
          <option value="ესპანეთი">ესპანეთი</option>
          <option value="კანადა">კანადა</option>
          <option value="ავსტრალია">ავსტრალია</option>
          <option value="იაპონია">იაპონია</option>
          <option value="ჩინეთი">ჩინეთი</option>
          <option value="ბრაზილია">ბრაზილია</option>
          <option value="მექსიკა">მექსიკა</option>
          <option value="არგენტინა">არგენტინა</option>
          <option value="ჩილე">ჩილე</option>
          <option value="ინდოეთი">ინდოეთი</option>
          <option value="თურქეთი">თურქეთი</option>
          <option value="რუსეთი">რუსეთი</option>
          <option value="უკრაინა">უკრაინა</option>
          <option value="პოლონეთი">პოლონეთი</option>
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
        <>
          <button className="add-new" onClick={() => setEditingId(0)}>ახალი კომპანიის დამატება</button>
          <button className="import-excel" onClick={() => setShowImport(true)}>Excel-ით იმპორტი</button>
        </>
      )}

      {editingId !== null && isAuthorizedForManagement && (
        <CompanyForm
          companyToEdit={companies.find(c => c.id === editingId)}
          onCompanyUpdated={handleCompanyUpdated}
          showNotification={showNotification}
          userRole={userRole}
        />
      )}

      {showImport && (
        <CompanyImport
          onImportComplete={handleImportComplete}
          showNotification={showNotification}
        />
      )}

      {editingExhibitions && (
        <div className="modal-overlay">
          <div className="exhibition-edit-modal">
            <h3>გამოფენების რედაქტირება: {editingExhibitions.companyName}</h3>
            <div className="exhibitions-selection">
              {exhibitions.map(exhibition => {
                const isChecked = editingExhibitions.selectedExhibitions.includes(Number(exhibition.id));

                return (
                  <div key={exhibition.id} className="exhibition-checkbox-wrapper">
                    <label className="exhibition-checkbox">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleExhibitionToggle(exhibition.id, e.target.checked)}
                      />
                      {exhibition.exhibition_name}
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="save-btn" onClick={saveExhibitionChanges}>
                შენახვა
              </button>
              <button className="cancel-btn" onClick={cancelExhibitionEdit}>
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}

      {companies.length === 0 ? (
        <p className="no-companies">კომპანიები არ მოიძებნა.</p>
      ) : (
        <>
          {/* Desktop Table View */}
          <table className="companies-table desktop-only">
            <thead>
              <tr>
                <th>კომპანიის სახელი</th>
                <th>ქვეყანა</th>
                <th>პროფილი</th>
                <th>საიდ. კოდი</th>
                <th>სტატუსი</th>
                <th>გამოფენები</th>
                <th>შექმნა</th>
                <th>განახლება</th>
                <th>მოქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company.id}>
                  <td className="company-name">{company.company_name}</td>
                  <td>{company.country}</td>
                  <td className="company-profile">{company.company_profile}</td>
                  <td>{company.identification_code}</td>
                  <td>
                    <span className={`status-badge ${company.status?.toLowerCase()}`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="exhibitions-cell">
                    <div className="exhibitions-display">
                      {company.selected_exhibitions && company.selected_exhibitions.length > 0 ? (
                        <>
                          <span className="exhibitions-count">
                            {company.selected_exhibitions.length} გამოფენა
                          </span>
                          <div className="exhibitions-list">
                            {exhibitions
                              .filter(ex => company.selected_exhibitions.includes(ex.id))
                              .slice(0, 2)
                              .map(ex => (
                                <span key={ex.id} className="exhibition-tag">
                                  {ex.exhibition_name}
                                </span>
                              ))
                            }
                            {company.selected_exhibitions.length > 2 && (
                              <span className="exhibition-tag more">
                                +{company.selected_exhibitions.length - 2}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="no-exhibitions">-</span>
                      )}
                    </div>
                    {isAuthorizedForManagement && (
                      <button
                        className="edit-exhibitions-btn"
                        onClick={() => handleEditExhibitions(company)}
                        title="გამოფენების რედაქტირება"
                      >
                        ✏️
                      </button>
                    )}
                  </td>
                  <td className="date-info">
                    <div className="date">{new Date(company.created_at).toLocaleDateString()}</div>
                    {company.created_by_username && (
                      <div className="user">{company.created_by_username}</div>
                    )}
                  </td>
                  <td className="date-info">
                    {company.updated_at ? (
                      <>
                        <div className="date">{new Date(company.updated_at).toLocaleDateString()}</div>
                        {company.updated_by_username && (
                          <div className="user">{company.updated_by_username}</div>
                        )}
                      </>
                    ) : (
                      <span className="no-update">-</span>
                    )}
                  </td>
                  <td>
                    <div className="actions">
                      <button className="view-details" onClick={() => handleViewDetails(company)}>დეტალები</button>
                      {isAuthorizedForManagement && (
                        <>
                          <button className="edit" onClick={() => handleEditClick(company)}>რედაქტირება</button>
                          <button className="delete" onClick={() => handleDelete(company.id)}>წაშლა</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="mobile-cards mobile-only">
            {companies.map(company => (
              <div key={company.id} className="company-card">
                <h3>{company.company_name}</h3>
                <div className="company-info">
                  <span><strong>ქვეყანა:</strong> {company.country}</span>
                  <span><strong>პროფილი:</strong> {company.company_profile}</span>
                  <span><strong>სტატუსი:</strong> {company.status}</span>
                </div>
                <div className="company-actions">
                  <button className="view-details" onClick={() => handleViewDetails(company)}>დეტალები</button>
                  {isAuthorizedForManagement && (
                    <>
                      <button className="edit" onClick={() => handleEditClick(company)}>რედაქტირება</button>
                      <button className="delete" onClick={() => handleDelete(company.id)}>წაშლა</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CompaniesList;