  <div className="api-section">
    <h2>API Information</h2>
    <div className="api-details">
      <div className="api-key-container">
        <label>Your API Key:</label>
        <div className="api-key-display">
          <input 
            type="password" 
            value={user.apiKey || 'Loading...'} 
            readOnly 
            id="apiKey"
          />
          <button 
            onClick={() => {
              const apiKeyInput = document.getElementById('apiKey');
              apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
            }}
            className="toggle-visibility"
          >
            <FaEye />
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(user.apiKey);
              // You might want to add a toast notification here
            }}
            className="copy-button"
          >
            <FaCopy />
          </button>
        </div>
      </div>
      
      <div className="api-usage">
        <div className="usage-header">
          <h3>API Usage</h3>
          <span className={`plan-badge ${user.apiPlan}`}>
            {user.apiPlan?.toUpperCase()} PLAN
          </span>
        </div>
        <div className="usage-bar">
          <div 
            className="usage-progress" 
            style={{ 
              width: `${(user.apiRequestsUsed / user.apiRequestsLimit) * 100}%`,
              backgroundColor: user.apiPlan === 'pro' ? '#4CAF50' : 
                             user.apiPlan === 'business' ? '#2196F3' : 
                             '#9C27B0'
            }}
          />
        </div>
        <div className="usage-stats">
          <span>{user.apiRequestsUsed} / {user.apiRequestsLimit} requests used</span>
          <span className="reset-note">Resets monthly</span>
        </div>
      </div>
    </div>
  </div>
  
  <style jsx>{`
    .api-section {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .api-details {
      margin-top: 20px;
    }
    
    .api-key-container {
      margin-bottom: 20px;
    }
    
    .api-key-display {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }
    
    .api-key-display input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: monospace;
      background: #f5f5f5;
    }
    
    .toggle-visibility,
    .copy-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      color: #666;
      transition: color 0.2s;
    }
    
    .toggle-visibility:hover,
    .copy-button:hover {
      color: #000;
    }
    
    .usage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .plan-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .plan-badge.pro {
      background: #E8F5E9;
      color: #2E7D32;
    }
    
    .plan-badge.business {
      background: #E3F2FD;
      color: #1565C0;
    }
    
    .plan-badge.enterprise {
      background: #F3E5F5;
      color: #6A1B9A;
    }
    
    .usage-bar {
      height: 8px;
      background: #eee;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .usage-progress {
      height: 100%;
      transition: width 0.3s ease;
    }
    
    .usage-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 14px;
      color: #666;
    }
    
    .reset-note {
      font-style: italic;
    }
  `}</style> 