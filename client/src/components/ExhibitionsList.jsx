import React, { useState, useEffect } from 'react';
import './ExhibitionsList.css';
import ExhibitionForm from './ExhibitionForm';

const ExhibitionsList = ({ showNotification }) => {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

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
      showNotification('შეცდომა გამოფენების ჩატვირთვისას!', 'error');
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
      setEditingId(null);
      fetchExhibitions();
  };
  
  if (loading) {
    return <div>იტვირთება...</div>;
  }

  if (error) {
    return <div>შეცდომა: {error}</div>;
  }

  return (
    <div className="exhibitions-container">
      <h2>Exebition List</h2>
      <button className="add-new" onClick={() => setEditingId(0)}>Add New Exebition</button>
      {editingId !== null && (
         <ExhibitionForm exhibitionToEdit={exhibitions.find(e => e.id === editingId)} onExhibitionUpdated={handleExhibitionUpdated} showNotification={showNotification} />
      )}
      {exhibitions.length === 0 ? (
        <p>გამოფენები არ მოიძებნა.</p>
      ) : (
        <ul>
          {exhibitions.map((exhibition) => (
            <li key={exhibition.id}>
              <h3>{exhibition.exhibition_name}</h3>
              <p><strong>კომენტარი:</strong> {exhibition.comment}</p>
              <p><strong>მენეჯერი:</strong> {exhibition.manager}</p>
              <div className="actions">
                <button className="edit" onClick={() => handleEditClick(exhibition)}>EDIT</button>
                <button 
                  className="delete" 
                  onClick={() => handleDelete(exhibition.id)}>
                  DEL
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExhibitionsList;