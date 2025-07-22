import React, { useState, useEffect } from 'react'; // შეცვლილია '=>' 'from'-ით
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

  const fetchExhibitions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/exhibitions');
      if (!response.ok) {
        throw new Error('მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setExhibitions(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა გამოფენების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExhibitions();
  }, []);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ გამოფენის წაშლა?');
    if (!isConfirmed) return;

    try {

      const response = await fetch(`http://localhost:5000/api/exhibitions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // ტოკენის გაგზავნა
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
        <div className="exhibitions-grid">
          {exhibitions.map((exhibition) => (
            <div key={exhibition.id} className="exhibition-card">
              <h3>{exhibition.exhibition_name}</h3>
              <p><strong>კომენტარი:</strong> {exhibition.comment}</p>
              <p><strong>მენეჯერი:</strong> {exhibition.manager}</p>
              {isAuthorizedForManagement && ( // ღილაკები მხოლოდ უფლებამოსილი როლებისთვის
                <div className="actions">
                  <button className="edit" onClick={() => handleEditClick(exhibition)}>რედაქტირება</button>
                  <button 
                    className="delete" 
                    onClick={() => handleDelete(exhibition.id)}>
                    წაშლა
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExhibitionsList;
