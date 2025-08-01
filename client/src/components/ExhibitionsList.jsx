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
        <table className="exhibitions-table"> {/* შეცვლილია ul-დან table-ზე */}
          <thead>
            <tr>
              <th>გამოფენის სახელი</th>
              <th>კომენტარი</th>
              <th>მენეჯერი</th>
              {isAuthorizedForManagement && <th>მოქმედებები</th>} {/* მოქმედებები მხოლოდ უფლებამოსილი როლებისთვის */}
            </tr>
          </thead>
          <tbody>
            {exhibitions.map((exhibition) => (
              <tr key={exhibition.id}>
                <td>{exhibition.exhibition_name}</td>
                <td>{exhibition.comment}</td>
                <td>{exhibition.manager}</td>
                {isAuthorizedForManagement && (
                  <td>
                    <div className="actions">
                      <button className="edit" onClick={() => handleEditClick(exhibition)}>რედაქტირება</button>
                      <button 
                        className="delete" 
                        onClick={() => handleDelete(exhibition.id)}>
                        წაშლა
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