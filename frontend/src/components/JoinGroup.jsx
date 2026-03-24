import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, LogIn, CheckCircle, AlertCircle, Loader } from "lucide-react";
import "./Dashboard.css";

function JoinGroup({ user, onLogin }) {
  const { token } = useParams();
  const navigate = useNavigate();

  const [groupInfo, setGroupInfo] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | joining | success | error | invalid
  const [message, setMessage] = useState("");

  // Fetch group info from public endpoint (no auth needed)
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/split/invite/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          setMessage(data.message || "Invalid or expired invite link.");
          return;
        }
        setGroupInfo(data);
        setStatus("ready");
      } catch {
        setStatus("invalid");
        setMessage("Could not reach the server. Please try again.");
      }
    };
    fetchInfo();
  }, [token]);

  const handleJoin = async () => {
    // If not logged in, redirect to login then back here
    if (!user) {
      navigate(`/login?redirect=/join/${token}`);
      return;
    }

    setStatus("joining");
    const authToken = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/api/split/invite/${token}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message || "Could not join group.");
        return;
      }
      setStatus("success");
      setTimeout(() => navigate("/splitwise"), 2000);
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        padding: "20px",
      }}
    >
      <div
        className="card-glass"
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "40px 32px",
          borderRadius: "20px",
          textAlign: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Users size={28} color="#fff" />
        </div>

        {status === "loading" && (
          <>
            <Loader size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ opacity: 0.7 }}>Loading invite details…</p>
          </>
        )}

        {status === "invalid" && (
          <>
            <AlertCircle size={32} color="#f43f5e" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ marginBottom: "8px" }}>Invalid Link</h2>
            <p style={{ opacity: 0.7 }}>{message}</p>
          </>
        )}

        {(status === "ready" || status === "joining") && groupInfo && (
          <>
            <h2 style={{ marginBottom: "8px", fontSize: "22px" }}>You're invited!</h2>
            <p style={{ opacity: 0.7, marginBottom: "24px" }}>
              Join the group <strong style={{ color: "#a78bfa" }}>{groupInfo.group_name}</strong>
              {user ? ` as ${user.name}` : " — log in first to continue"}.
            </p>

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", fontSize: "15px" }}
              disabled={status === "joining"}
              onClick={handleJoin}
            >
              {status === "joining" ? (
                "Joining…"
              ) : user ? (
                <>
                  <CheckCircle size={16} /> Join Group
                </>
              ) : (
                <>
                  <LogIn size={16} /> Log in & Join
                </>
              )}
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle size={32} color="#f43f5e" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ marginBottom: "8px" }}>Error</h2>
            <p style={{ opacity: 0.7, marginBottom: "20px" }}>{message}</p>
            <button className="btn btn-secondary" onClick={() => setStatus("ready")}>
              Try Again
            </button>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={40} color="#22c55e" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ marginBottom: "8px" }}>Joined! 🎉</h2>
            <p style={{ opacity: 0.7 }}>
              You've joined <strong>{groupInfo?.group_name}</strong>. Redirecting to Splitwise…
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default JoinGroup;
