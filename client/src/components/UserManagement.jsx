import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const UserManagement = ({ showNotification, userRole }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token'); // ტოკენის აღება
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}` // ტოკენის გაგზავნა
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'მომხმარებლების მიღება ვერ მოხერხდა.');
            }
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
            showNotification(`შეცდომა მომხმარებლების ჩატვირთვისას: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        const isConfirmed = window.confirm(`ნამდვილად გსურთ მომხმარებლის როლის შეცვლა?`);
        if (!isConfirmed) return;

        try {
            const token = localStorage.getItem('token'); // ტოკენის აღება
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // ტოკენის გაგზავნა
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

    const handleDeleteUser = async (userId) => {
        const isConfirmed = window.confirm('ნამდვილად გსურთ ამ მომხმარებლის წაშლა?');
        if (!isConfirmed) return;

        try {
            const token = localStorage.getItem('token'); // ტოკენის აღება
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                showNotification('მომხმარებელი წარმატებით წაიშალა!', 'success');
                fetchUsers();
            } else {
                const errorData = await response.json();
                showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
            }
        } catch (error) {
            console.error('შეცდომა მომხმარებლის წაშლისას:', error);
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
            {error && <p className="error">{error}</p>}
            {loading ? (
                <p>ჩატვირთვა...</p>
            ) : (
                <>
                    {/* Desktop table */}
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>სახელი</th>
                                <th>ეიმეილი</th>
                                <th>როლი</th>
                                <th>ბოლო კავშირი</th>
                                <th>მოქმედება</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        >
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                            <option value="sales">sales</option>
                                            <option value="marketing">marketing</option>
                                            <option value="operation">operation</option>
                                            <option value="finance">finance</option>
                                            <option value="manager">manager</option>
                                        </select>
                                    </td>
                                    <td>
                                        {user.last_login 
                                            ? new Date(user.last_login).toLocaleString('ka-GE', {
                                                year: 'numeric', 
                                                month: '2-digit', 
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })
                                            : 'არასდროს'
                                        }
                                    </td>
                                    <td>
                                        <button onClick={() => handleRoleChange(user.id, user.role)}>
                                            განახლება
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile cards */}
                    <div className="mobile-cards">
                        {users.map(user => (
                            <div key={user.id} className="user-card">
                                <h3>{user.username}</h3>
                                <div className="user-info">
                                    <span><strong>ID:</strong> {user.id}</span>
                                    <span><strong>ეიმეილი:</strong> {user.email}</span>
                                    <span><strong>შექმნის თარიღი:</strong> {new Date(user.created_at).toLocaleDateString('ka-GE')}</span>
                                    <span><strong>ბოლო კავშირი:</strong> {user.last_login 
                                        ? new Date(user.last_login).toLocaleString('ka-GE', {
                                            year: 'numeric', 
                                            month: '2-digit', 
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : 'არასდროს'
                                    }</span>
                                </div>
                                <select 
                                    className="user-role-select"
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                >
                                    <option value="user">user</option>
                                    <option value="admin">admin</option>
                                    <option value="sales">sales</option>
                                    <option value="marketing">marketing</option>
                                    <option value="operation">operation</option>
                                    <option value="finance">finance</option>
                                    <option value="manager">manager</option>
                                </select>
                                <button 
                                    className="update-role-btn"
                                    onClick={() => handleRoleChange(user.id, user.role)}
                                >
                                    განახლება
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default UserManagement;