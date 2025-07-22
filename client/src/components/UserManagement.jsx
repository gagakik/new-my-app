import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const UserManagement = ({ showNotification, userRole }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        try {
<<<<<<< HEAD
            const token = localStorage.getItem('token'); // ტოკენის აღება
            const response = await fetch('/api/users', { // შედარებითი მისამართი
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
=======
            const response = await fetch('http://localhost:5000/api/users');
>>>>>>> 8cc3b0cf900c6fdde851ceac41da26e92406183f
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
<<<<<<< HEAD
            const token = localStorage.getItem('token'); // ტოკენის აღება
            const response = await fetch(`/api/users/${userId}/role`, { // შედარებითი მისამართი
=======
            const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
>>>>>>> 8cc3b0cf900c6fdde851ceac41da26e92406183f
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            const response = await fetch(`/api/users/${userId}`, { // შედარებითი მისამართი
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
                                        <option value="sales">Sales</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="operation">Operation</option>
                                        <option value="guest">Guest</option>
                                        <option value="finance">Finance</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </td>
                                <td>
                                    {userRole === 'admin' && (
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="delete-user-btn">
                                            წაშლა
                                        </button>
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

export default UserManagement;
