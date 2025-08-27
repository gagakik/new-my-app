import React, { useState, useEffect, useCallback } from 'react';
import './ExhibitionsList.css';
import ExhibitionForm from './ExhibitionForm'; // გამოფენის ფორმის იმპორტი

const ExhibitionsList = ({ showNotification, userRole }) => { // მივიღეთ userRole
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); // ახალი სტეიტი

  // განსაზღვრეთ, აქვს თუ არა მომხმარებელს მართვის უფლება
  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  // fetchExhibitions ფუნქცია მოთავსებულია useCallback-ში
  const fetchExhibitions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token'); 

      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა გამოფენების ნახვისთვის');
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/exhibitions', {
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ ივენთების ნახვის უფლება');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      console.log('მიღებული გამოფენების მონაცემები:', data);
      if (data.length > 0) {
        console.log('პირველი გამოფენის price_per_sqm:', data[0].price_per_sqm);
      }
      setExhibitions(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა გამოფენების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchExhibitions();
  }, [fetchExhibitions]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ გამოფენის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const response = await fetch(`/api/exhibitions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('გამოფენა წარმატებით წაიშალა!', 'success');
        setExhibitions(exhibitions.filter((exhibition) => exhibition.id !== id));
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleEditClick = (exhibition) => {
    setEditingId(exhibition.id);
  };

  const handleExhibitionUpdated = () => {
      setEditingId(null); // რედაქტირების რეჟიმიდან გასვლა
      fetchExhibitions(); // სიის განახლება
  };

  if (loading) {
    return <div>იტვირთება...</div>;
  }

  if (error) {
    return <div>შეცდომა: {error}</div>;
  }

  return (
    <div className="exhibitions-container">
      <h2>გამოფენების სია</h2>
      {isAuthorizedForManagement && ( // ღილაკი მხოლოდ უფლებამოსილი როლებისთვის
        <button className="add-new" onClick={() => setEditingId(0)}>ახალი გამოფენის დამატება</button>
      )}

      {editingId !== null && isAuthorizedForManagement && ( // ფორმაც მხოლოდ უფლებამოსილი როლებისთვის
         <ExhibitionForm 
            exhibitionToEdit={exhibitions.find(e => e.id === editingId)} 
            onExhibitionUpdated={handleExhibitionUpdated} 
            showNotification={showNotification} 
         />
      )}

      {exhibitions.length === 0 ? (
        <p className="no-exhibitions">გამოფენები არ მოიძებნა.</p>
      ) : (
        <table className="exhibitions-table">
          <thead>
            <tr>
              <th>დასახელება</th>
              <th>მენეჯერი</th>
              <th>1 კვმ EUR</th>
              <th>შექმნილია</th>
              <th>განახლებულია</th>
              {isAuthorizedForManagement && <th>მოქმედებები</th>}
            </tr>
          </thead>
          <tbody>
            {exhibitions.map((exhibition) => (
              <tr key={exhibition.id}>
                <td>{exhibition.exhibition_name}</td>
                <td>{exhibition.manager}</td>
                <td>{exhibition.price_per_sqm ? `€${parseFloat(exhibition.price_per_sqm).toFixed(2)}` : '-'}</td>
                <td className="date-info">
                  {exhibition.created_by && (
                    <div>
                      <div className="user">{exhibition.created_by}</div>
                      {exhibition.created_at && (
                        <div className="date">
                          {new Date(exhibition.created_at).toLocaleDateString('ka-GE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="date-info">
                  {exhibition.updated_by && exhibition.updated_at && (
                    <div>
                      <div className="user">{exhibition.updated_by}</div>
                      <div className="date">
                        {new Date(exhibition.updated_at).toLocaleDateString('ka-GE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </td>
                {isAuthorizedForManagement && (
                  <td>
                    <div className="actions">
                      <button
                        className="edit"
                        onClick={() => handleEditClick(exhibition)}
                        title="რედაქტირება"
                      >
                      </button>
                      <button
                        className="delete"
                        onClick={() => handleDelete(exhibition.id)}
                        title="წაშლა"
                      >
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ExhibitionsList;