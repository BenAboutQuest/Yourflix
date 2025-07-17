import { useState } from "react";

export default function DebugLoginPage() {
  const [message, setMessage] = useState("JavaScript is working!");

  const handleClick = () => {
    alert("Button clicked! JavaScript is definitely working.");
    setMessage("Button was clicked at " + new Date().toLocaleTimeString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Form submitted!");
    console.log("Form submitted");
  };

  return (
    <div style={{ 
      padding: "20px", 
      maxWidth: "400px", 
      margin: "50px auto",
      border: "1px solid #ccc",
      borderRadius: "8px",
      backgroundColor: "white",
      color: "black"
    }}>
      <h1>Debug Login Page</h1>
      <p>{message}</p>
      
      <button 
        onClick={handleClick}
        style={{
          padding: "10px 20px",
          margin: "10px 0",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          display: "block",
          width: "100%"
        }}
      >
        Test Button
      </button>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Username:</label>
          <input 
            type="text" 
            name="username"
            defaultValue="admin"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px"
            }}
          />
        </div>
        
        <div style={{ marginBottom: "10px" }}>
          <label>Password:</label>
          <input 
            type="password" 
            name="password"
            defaultValue="defaultpassword123"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px"
            }}
          />
        </div>
        
        <button 
          type="submit"
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%"
          }}
        >
          Simple Login
        </button>
      </form>
    </div>
  );
}