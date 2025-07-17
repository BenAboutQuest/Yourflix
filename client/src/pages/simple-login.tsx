import { useState } from "react";
import { useLocation } from "wouter";
import logoPath from "@assets/file_0000000039f0622fa7d959c52f7065fc_1752346582129.png";

export default function SimpleLoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const usernameOrEmail = formData.get("usernameOrEmail") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usernameOrEmail, password }),
        credentials: "include",
      });

      if (response.ok) {
        setMessage("Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = "/"; // Force full page reload
        }, 1000);
      } else {
        const errorText = await response.text();
        setMessage(`Login failed: ${errorText}`);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#1f1f1f",
        borderRadius: "8px",
        padding: "40px",
        minWidth: "400px",
        textAlign: "center",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
        border: "1px solid #333"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img 
            src={logoPath} 
            alt="YourFlix" 
            style={{
              height: "64px",
              width: "auto",
              marginBottom: "8px",
              display: "block",
              margin: "0 auto 8px auto"
            }}
          />
          <p style={{
            color: "#ff6b35",
            fontSize: "14px",
            fontStyle: "italic",
            marginBottom: "0"
          }}>
            making physical media cool again
          </p>
        </div>
        
        <h1 style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "white"
        }}>
          Welcome Back
        </h1>
        
        <p style={{
          color: "#ccc",
          marginBottom: "24px"
        }}>
          Sign in to your YourFlix account
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px", textAlign: "left" }}>
            <label style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "500",
              color: "white"
            }}>
              Username or Email
            </label>
            <input
              name="usernameOrEmail"
              type="text"
              defaultValue="admin"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #555",
                borderRadius: "4px",
                fontSize: "16px",
                boxSizing: "border-box",
                backgroundColor: "#2a2a2a",
                color: "white"
              }}
            />
          </div>

          <div style={{ marginBottom: "24px", textAlign: "left" }}>
            <label style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "500",
              color: "white"
            }}>
              Password
            </label>
            <input
              name="password"
              type="password"
              defaultValue="defaultpassword123"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #555",
                borderRadius: "4px",
                fontSize: "16px",
                boxSizing: "border-box",
                backgroundColor: "#2a2a2a",
                color: "white"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: isLoading ? "#ccc" : "#ff6b35",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: "16px",
            padding: "8px",
            backgroundColor: message.includes("successful") ? "#d4edda" : "#f8d7da",
            color: message.includes("successful") ? "#155724" : "#721c24",
            borderRadius: "4px",
            fontSize: "14px"
          }}>
            {message}
          </div>
        )}

        <p style={{
          marginTop: "24px",
          fontSize: "14px",
          color: "#ccc"
        }}>
          YourFlix is currently invite-only.
        </p>
      </div>
    </div>
  );
}