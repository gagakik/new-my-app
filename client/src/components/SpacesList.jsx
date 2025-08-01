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
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა სივრცეების ნახვისთვის');
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/spaces', { headers }); // API მოთხოვნა სივრცეებისთვის
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ სივრცეების ნახვის უფლება');
        }
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
        <>
          {/* Desktop Table */}
          <table className="spaces-table">
            <thead>
              <tr>
                <th>კატეგორია</th>
                <th>შენობის დასახელება</th>
                <th>აღწერილობა</th>
                <th>ფართობი (კვ.მ)</th>
                <th>შექმნილია</th>
                <th>განახლებულია</th>
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
                  <td className="date-info">
                    {space.created_by && (
                      <div className="date-info">
                        <div className="user">{space.created_by}</div>
                        {space.created_at && (
                          <div className="date">
                            {new Date(space.created_at).toLocaleDateString('ka-GE', {
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
                    {space.updated_by && space.updated_at && (
                      <div className="date-info">
                        <div className="user">{space.updated_by}</div>
                        <div className="date">
                          {new Date(space.updated_at).toLocaleDateString('ka-GE', {
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

          {/* Mobile Cards */}
          <div className="mobile-cards">
            {spaces.map(space => (
              <div key={space.id} className="space-card">
                <h3>{space.building_name}</h3>
                <div className="space-info">
                  <span><strong>კატეგორია:</strong> {space.category}</span>
                  <span><strong>ფართობი:</strong> {space.area_sqm || 'არ არის მითითებული'} კვ.მ</span>
                  <span><strong>აღწერილობა:</strong> {space.description}</span>
                </div>
                {isAuthorizedForManagement && (
                  <div className="space-actions">
                    <button className="edit" onClick={() => handleEditClick(space)}>
                      რედაქტირება
                    </button>
                    <button className="delete" onClick={() => handleDelete(space.id)}>
                      წაშლა
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SpacesList;