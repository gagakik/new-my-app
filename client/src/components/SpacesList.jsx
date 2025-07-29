import React, { useState, useEffect, useCallback } from 'react';
import './SpacesList.css';
import SpaceForm from './SpaceForm'; // სივრცის ფორმის იმპორტი

const SpacesList = ({ showNotification, userRole }) => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // განსაზღვრეთ, აქვს თუ არა მომხმარებელს სივრცეების მართვის უფლება
  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'manager';

  const fetchSpaces = useCallback(async () => {
    try {
      const response = await fetch('/api/spaces'); // API მოთხოვნა სივრცეებისთვის
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'სივრცეების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setSpaces(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა სივრცეების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ სივრცის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }
      const response = await fetch(`/api/spaces/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('სივრცე წარმატებით წაიშალა!', 'success');
        fetchSpaces(); // სიის განახლება
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'წაშლა ვერ მოხერხდა.');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification(`დაფიქსირდა შეცდომა წაშლისას: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (space) => {
    setEditingId(space.id);
  };

  const handleSpaceUpdated = () => {
    setEditingId(null); // რედაქტირების რეჟიმიდან გასვლა
    fetchSpaces(); // სიის განახლება
  };

  if (loading) {
    return <div>იტვირთება...</div>;
  }

  if (error) {
    return <div>შეცდომა: {error}</div>;
  }

  return (
    <div className="spaces-container">
      <h2>სივრცეების სია</h2>
      {isAuthorizedForManagement && (
        <button className="add-new" onClick={() => setEditingId(0)}>ახალი სივრცის დამატება</button>
      )}

      {editingId !== null && isAuthorizedForManagement && (
        <SpaceForm 
          spaceToEdit={spaces.find(space => space.id === editingId)} 
          onSpaceUpdated={handleSpaceUpdated} 
          showNotification={showNotification} 
          userRole={userRole}
        />
      )}

      {spaces.length === 0 ? (
        <p className="no-spaces">სივრცეები არ მოიძებნა.</p>
      ) : (
        <table className="spaces-table">
          <thead>
            <tr>
              <th>კატეგორია</th>
              <th>შენობის დასახელება</th>
              <th>აღწერილობა</th>
              <th>ფართობი (კვ.მ)</th>
              <th>მოქმედებები</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((space) => (
              <tr key={space.id}>
                <td>{space.category}</td>
                <td>{space.building_name}</td>
                <td>{space.description}</td>
                <td>{space.area_sqm || 'არ არის მითითებული'}</td>
                <td>
                  {isAuthorizedForManagement && (
                    <div className="actions">
                      <button className="edit" onClick={() => handleEditClick(space)}>რედაქტირება</button>
                      <button 
                        className="delete" 
                        onClick={() => handleDelete(space.id)}>
                        წაშლა
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SpacesList;
