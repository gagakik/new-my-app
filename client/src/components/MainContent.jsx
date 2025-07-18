import React from 'react';
import './MainContent.css';

const products = [
  { id: 1, name: 'პროდუქტი 1', price: 29.99, description: 'მაღალი ხარისხის პროდუქტი.' },
  { id: 2, name: 'პროდუქტი 2', price: 49.99, description: 'თანამედროვე დიზაინი.' },
  { id: 3, name: 'პროდუქტი 3', price: 19.99, description: 'გამძლე და პრაქტიკული.' },
];

const MainContent = () => {
  return (
    <div className="main-content">
      <h2>ჩვენი პროდუქტები</h2>
      <div className="product-list">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <h3>{product.name}</h3>
            <p className="product-price">${product.price}</p>
            <p>{product.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainContent;