
import React, { useState, useEffect } from 'react';
import './PackageComparison.css';

const PackageComparison = ({ exhibitionId, showNotification }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (exhibitionId) {
      fetchPackagesForComparison();
    }
  }, [exhibitionId]);

  const fetchPackagesForComparison = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/compare/${exhibitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('პაკეტების შედარების მონაცემების შეცდომა:', error);
      showNotification('პაკეტების მონაცემები ვერ ჩაიტვირთა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePackageSelection = (packageId) => {
    setSelectedPackages(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId);
      } else if (prev.length < 3) {
        return [...prev, packageId];
      } else {
        showNotification('მაქსიმუმ 3 პაკეტის შედარება შესაძლებელია', 'warning');
        return prev;
      }
    });
  };

  const selectedPackageData = packages.filter(pkg => selectedPackages.includes(pkg.id));

  const getPriceDisplay = (pkg) => {
    if (pkg.price_type === 'early_bird') {
      return (
        <div className="price-display early-bird">
          <span className="current-price">€{pkg.current_price}</span>
          <span className="original-price">€{pkg.fixed_price}</span>
          <span className="price-label">Early Bird</span>
        </div>
      );
    } else if (pkg.price_type === 'last_minute') {
      return (
        <div className="price-display last-minute">
          <span className="current-price">€{pkg.current_price}</span>
          <span className="original-price">€{pkg.fixed_price}</span>
          <span className="price-label">Last Minute</span>
        </div>
      );
    } else {
      return (
        <div className="price-display regular">
          <span className="current-price">€{pkg.current_price}</span>
        </div>
      );
    }
  };

  if (loading) return <div>იტვირთება...</div>;

  return (
    <div className="package-comparison">
      <h3>პაკეტების შედარება</h3>
      
      <div className="package-selection">
        <h4>აირჩიეთ პაკეტები შესადარებლად (მაქსიმუმ 3)</h4>
        <div className="package-cards">
          {packages.map(pkg => (
            <div 
              key={pkg.id} 
              className={`package-card ${selectedPackages.includes(pkg.id) ? 'selected' : ''}`}
              onClick={() => togglePackageSelection(pkg.id)}
            >
              <h5>{pkg.package_name}</h5>
              {getPriceDisplay(pkg)}
              <p>{pkg.fixed_area_sqm} კვმ</p>
            </div>
          ))}
        </div>
      </div>

      {selectedPackageData.length > 1 && (
        <div className="comparison-table">
          <h4>შედარების ცხრილი</h4>
          <table>
            <thead>
              <tr>
                <th>მახასიათებელი</th>
                {selectedPackageData.map(pkg => (
                  <th key={pkg.id}>{pkg.package_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ღირებულება</strong></td>
                {selectedPackageData.map(pkg => (
                  <td key={pkg.id}>{getPriceDisplay(pkg)}</td>
                ))}
              </tr>
              <tr>
                <td><strong>ფართობი</strong></td>
                {selectedPackageData.map(pkg => (
                  <td key={pkg.id}>{pkg.fixed_area_sqm} კვმ</td>
                ))}
              </tr>
              <tr>
                <td><strong>აღწერა</strong></td>
                {selectedPackageData.map(pkg => (
                  <td key={pkg.id}>{pkg.description || 'არ არის მითითებული'}</td>
                ))}
              </tr>
              <tr>
                <td><strong>შემავალი აღჭურვილობა</strong></td>
                {selectedPackageData.map(pkg => (
                  <td key={pkg.id}>
                    {pkg.equipment_list && pkg.equipment_list.length > 0 ? (
                      <ul>
                        {pkg.equipment_list.map((eq, idx) => (
                          <li key={idx}>
                            {eq.code_name} - {eq.quantity} ცალი
                          </li>
                        ))}
                      </ul>
                    ) : (
                      'აღჭურვილობა არ შედის'
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td><strong>აღჭურვილობის ღირებულება</strong></td>
                {selectedPackageData.map(pkg => (
                  <td key={pkg.id}>
                    €{pkg.equipment_list ? 
                      pkg.equipment_list.reduce((sum, eq) => sum + (eq.quantity * eq.price), 0).toFixed(2)
                      : '0.00'
                    }
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PackageComparison;
