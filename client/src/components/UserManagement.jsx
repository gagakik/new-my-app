import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const UserManagement = ({ showNotification }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/users');
            if (!response.ok) {
                throw new Error('მომხმარებლების მიღება ვერ მოხერხდა.');
            }
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
            showNotification('შეცდომა მომხმარებლების ჩატვირთვისას!', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        const isConfirmed = window.confirm(`ნამდვილად გსურთ მომხმარებლის როლის შეცვლა?`);
        if (!isConfirmed) return;

        try {
            const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            });
            
            if (response.ok) {
                showNotification('როლი წარმატებით განახლდა!', 'success');
                fetchUsers();
            } else {
                const errorData = await response.json();
                showNotification(`როლის განახლება ვერ მოხერხდა: ${errorData.message}`, 'error');
            }
        } catch (error) {
            console.error('შეცდომა როლის განახლებისას:', error);
            showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    if (loading) {
        return <div>მომხმარებლები იტვირთება...</div>;
    }

    if (error) {
        return <div>შეცდომა: {error}</div>;
    }

    return (
        <div className="user-management-container">
            <h2>მომხმარებლების მართვა</h2>
            {users.length === 0 ? (
                <p>მომხმარებლები არ მოიძებნა.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>სახელი</th>
                            <th>როლი</th>
                            <th>მოქმედებები</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td>
                                    <button onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}>
                                      როლის შეცვლა
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UserManagement;