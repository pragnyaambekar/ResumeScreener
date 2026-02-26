import { useState, useEffect } from "react";
import axios from "axios";
import "./styles.css";
import { jsPDF } from "jspdf";

const DARK_COLORS = {
  bg: "#0f1117",
  card: "#1a1d27",
  border: "#2a2d3a",
  accent: "#4f8ef7",
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  text: "#ffffff",
  muted: "#64748b",
};

const LIGHT_COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  accent: "#3b82f6",
  green: "#16a34a",
  yellow: "#ea580c",
  red: "#dc2626",
  text: "#000000",
  muted: "#64748b",
};

const FINAL_STATUSES = ["PROCESSED", "FAILED", "INVALID_RESUME", "ERROR"];

/* ================= SCORE BAR ================= */
function ScoreBar({ label, score, COLORS }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const barColor =
    pct >= 70 ? COLORS.green : pct >= 50 ? COLORS.yellow : COLORS.red;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: COLORS.muted,
            fontFamily: "monospace",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            color: barColor,
            fontWeight: 700,
            fontFamily: "monospace",
          }}
        >
          {pct.toFixed(1)}
        </span>
      </div>
      <div
        style={{
          background: "#2a2d3a",
          borderRadius: 6,
          height: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            borderRadius: 6,
            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

/* ================= DECISION BADGE ================= */
function DecisionBadge({ decision, COLORS }) {
  const config = {
    SHORTLISTED: {
      color: COLORS.green,
      bg: "#14532d22",
      label: "✓ Shortlisted",
    },
    REVIEW: {
      color: COLORS.yellow,
      bg: "#78350f22",
      label: "~ Review",
    },
    REJECTED: {
      color: COLORS.red,
      bg: "#7f1d1d22",
      label: "✕ Rejected",
    },
  };

  const c =
    config[decision || ""] || {
      color: COLORS.muted,
      bg: "#1a1d27",
      label: decision || "Pending",
    };

  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.color}44`,
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: 1,
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
}

/* ================= RESUME CARD ================= */
function ResumeCard({
  resume,
  onClick,
  selected,
  onDelete,
  compareMode,
  isComparing,
  onToggleCompare,
  COLORS,
  rank,
  totalProcessed,
}) {
  const isProcessed = resume.status === "PROCESSED";
  const isInvalid = resume.status === "INVALID_RESUME";
  const isError = resume.status === "ERROR";
  const isPending = !FINAL_STATUSES.includes(resume.status);
  const hasError = isInvalid || isError;

  // Determine rank badge color
  const getRankColor = () => {
    if (!rank || !totalProcessed) return COLORS.textMuted;
    const percentile = (rank / totalProcessed) * 100;
    if (percentile <= 20) return COLORS.green;  // Top 20%
    if (percentile <= 50) return COLORS.accent; // Top 50%
    return COLORS.textMuted;
  };

  return (
    <div
      className="resume-card"
      style={{
        background: selected ? COLORS.cardHover : isComparing ? COLORS.accent + "10" : COLORS.card,
        border: `1px solid ${isComparing ? COLORS.accent : selected ? COLORS.accent : hasError ? COLORS.red + "40" : COLORS.border}`,
        borderRadius: 8,
        padding: "16px 18px",
        marginBottom: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        cursor: compareMode ? "default" : (isProcessed || hasError) ? "pointer" : "default",
      }}
    >
      {/* Rank Badge */}
      {isProcessed && rank && (
        <div
          style={{
            background: getRankColor() + "20",
            border: `1.5px solid ${getRankColor()}`,
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 700,
            color: getRankColor(),
            fontFamily: "monospace",
            minWidth: 32,
            textAlign: "center",
          }}
        >
          #{rank}
        </div>
      )}
      
      <div 
        style={{ flex: 1 }}
        onClick={() => !compareMode && (isProcessed || hasError) && onClick(resume.resume_id)}
      >
        {/* Candidate Name */}
        {resume.candidate_name && resume.candidate_name !== "Unknown" && (
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.text,
              marginBottom: 3,
            }}
          >
            {resume.candidate_name}
          </div>
        )}
        
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: hasError ? COLORS.red : COLORS.textMuted,
            marginBottom: 4,
          }}
        >
          {resume.resume_id}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>
          {isPending && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="spinner-small" />
              Processing...
            </span>
          )}
          {isInvalid && "⚠️ Invalid Resume"}
          {isError && "❌ Error"}
          {isProcessed && (
            <span>
              Score: <span style={{ fontWeight: 600, color: COLORS.text }}>{resume.final_score}</span>
              {rank && totalProcessed && (
                <span style={{ color: COLORS.textDim, marginLeft: 8 }}>
                  • Rank {rank} of {totalProcessed}
                </span>
              )}
            </span>
          )}
        </div>
        {hasError && resume.error_message && (
          <div
            style={{
              fontSize: 11,
              color: COLORS.red,
              marginTop: 6,
              fontStyle: "italic",
              lineHeight: 1.4,
            }}
          >
            {resume.error_message}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isProcessed && <DecisionBadge decision={resume.decision} COLORS={COLORS} />}
        {isPending && (
          <span
            style={{
              color: COLORS.muted,
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            {resume.status}
          </span>
        )}
        {compareMode && isProcessed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(resume.resume_id);
            }}
            style={{
              background: isComparing ? COLORS.accent : "transparent",
              border: `1px solid ${COLORS.accent}`,
              color: isComparing ? "#fff" : COLORS.accent,
              cursor: "pointer",
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 6,
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            {isComparing ? "✓" : "+"}
          </button>
        )}
        {!compareMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(resume.resume_id);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: COLORS.red,
              cursor: "pointer",
              fontSize: 16,
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="Delete resume"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

/* ================= ADMIN DASHBOARD ================= */
function AdminDashboard({ resumes, onClose, COLORS }) {
  const isDarkMode = COLORS.bg === "#0f1117";
  const processed = resumes.filter(r => r.status === "PROCESSED");
  const shortlisted = resumes.filter(r => r.status === "PROCESSED" && r.final_score >= 60);
  const review = resumes.filter(r => r.status === "PROCESSED" && r.final_score >= 40 && r.final_score < 60);
  const rejected = resumes.filter(r => r.status === "PROCESSED" && r.final_score < 40);
  const invalid = resumes.filter(r => ["INVALID_RESUME", "ERROR"].includes(r.status));
  
  const avgScore = processed.length > 0 
    ? (processed.reduce((sum, r) => sum + r.final_score, 0) / processed.length).toFixed(1)
    : 0;
  
  const acceptanceRate = processed.length > 0
    ? ((shortlisted.length / processed.length) * 100).toFixed(1)
    : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 32,
          maxWidth: 800,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.text,
                marginBottom: 4,
              }}
            >
              📊 Admin Dashboard
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>
              System statistics and insights
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: COLORS.muted,
              fontSize: 24,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Key Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
              {resumes.length}
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>
              Total Resumes
            </div>
          </div>

          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.green }}>
              {avgScore}
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>
              Average Score
            </div>
          </div>

          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.green }}>
              {acceptanceRate}%
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>
              Acceptance Rate
            </div>
          </div>

          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
              ~30s
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>
              Avg Processing Time
            </div>
          </div>
        </div>

        {/* Distribution Chart */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: COLORS.text,
              marginBottom: 16,
            }}
          >
            Resume Distribution
          </div>

          {[
            { label: "Shortlisted", count: shortlisted.length, color: COLORS.green },
            { label: "Review", count: review.length, color: COLORS.yellow },
            { label: "Rejected", count: rejected.length, color: COLORS.red },
            { label: "Invalid/Error", count: invalid.length, color: COLORS.muted },
          ].map((item) => {
            const percentage = resumes.length > 0 ? (item.count / resumes.length) * 100 : 0;
            return (
              <div key={item.label} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: COLORS.text }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 700 }}>
                    {item.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div
                  style={{
                    background: COLORS.border,
                    borderRadius: 4,
                    height: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: "100%",
                      background: item.color,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Score Distribution */}
        {processed.length > 0 && (
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.text,
                marginBottom: 16,
              }}
            >
              Score Distribution
            </div>

            {[
              { range: "90-100", min: 90, max: 100 },
              { range: "80-89", min: 80, max: 89 },
              { range: "70-79", min: 70, max: 79 },
              { range: "60-69", min: 60, max: 69 },
              { range: "50-59", min: 50, max: 59 },
              { range: "0-49", min: 0, max: 49 },
            ].map((bucket) => {
              const count = processed.filter(
                (r) => r.final_score >= bucket.min && r.final_score <= bucket.max
              ).length;
              const percentage = (count / processed.length) * 100;

              return (
                <div key={bucket.range} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: COLORS.muted, fontFamily: "monospace" }}>
                      {bucket.range}
                    </span>
                    <span style={{ color: COLORS.text, fontWeight: 700 }}>
                      {count}
                    </span>
                  </div>
                  <div
                    style={{
                      background: COLORS.border,
                      borderRadius: 3,
                      height: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        background: COLORS.accent,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= COMPARE PANEL ================= */
function ComparePanel({ compareList, resumes, COLORS }) {
  const [compareData, setCompareData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompareData = async () => {
      setLoading(true);
      const data = await Promise.all(
        compareList.map(async (id) => {
          const resume = resumes.find((r) => r.resume_id === id);
          try {
            const res = await axios.get(
              `http://localhost:8000/api/resumes/results/${id}`
            );
            return { ...resume, details: res.data };
          } catch (err) {
            return { ...resume, details: null };
          }
        })
      );
      setCompareData(data);
      setLoading(false);
    };

    if (compareList.length > 0) {
      fetchCompareData();
    }
  }, [compareList, resumes]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 13, color: COLORS.muted }}>Loading...</div>
      </div>
    );
  }

  if (compareData.length === 0) return null;

  const engines = ["Skill Match", "Experience", "Education", "Semantic Match", "Quality Gate"];

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Final Scores */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            color: COLORS.muted,
            marginBottom: 12,
            letterSpacing: 2,
          }}
        >
          FINAL SCORES
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {compareData.map((item) => (
            <div
              key={item.resume_id}
              style={{
                flex: 1,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: 12,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.muted,
                  marginBottom: 8,
                  fontFamily: "monospace",
                }}
              >
                {item.resume_id}
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: COLORS.text,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {item.final_score}
              </div>
              <DecisionBadge decision={item.decision} COLORS={COLORS} />
            </div>
          ))}
        </div>
      </div>

      {/* Engine Scores Comparison */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            color: COLORS.muted,
            marginBottom: 12,
            letterSpacing: 2,
          }}
        >
          SCORE BREAKDOWN
        </div>
        {engines.map((engineName) => {
          const scores = compareData.map((item) => {
            const score =
              item.details?.engine_scores?.find((e) => e.engine === engineName)
                ?.score || 0;
            return score;
          });
          const maxScore = Math.max(...scores);

          return (
            <div key={engineName} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.muted,
                  marginBottom: 6,
                  fontFamily: "monospace",
                }}
              >
                {engineName}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {scores.map((score, idx) => {
                  const isMax = score === maxScore && maxScore > 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        background: isMax ? COLORS.green + "22" : COLORS.card,
                        border: `1px solid ${isMax ? COLORS.green : COLORS.border}`,
                        borderRadius: 6,
                        padding: 8,
                        textAlign: "center",
                        fontSize: 14,
                        color: isMax ? COLORS.green : COLORS.text,
                        fontWeight: isMax ? 700 : 400,
                      }}
                    >
                      {score.toFixed(1)}
                      {isMax && " ★"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= DETAIL PANEL ================= */
function DetailPanel({
  resumeId,
  resumes,
  COLORS,
}) {
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTextView, setShowTextView] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const resume = resumes.find((r) => r.resume_id === resumeId);
  const hasError = resume && (resume.status === "ERROR" || resume.status === "INVALID_RESUME");

  useEffect(() => {
    if (!resumeId) return;
    setScores(null);
    setLoading(true);
    setShowPreview(false);
    setShowWhy(false);
    setShowTips(false);

    // Load both results and status to get extracted_text
    Promise.all([
      axios.get(`http://localhost:8000/api/resumes/results/${resumeId}`),
      axios.get(`http://localhost:8000/api/resumes/status/${resumeId}`)
    ])
      .then(([resultsRes, statusRes]) => {
        setScores({
          ...resultsRes.data,
          extracted_text: statusRes.data.extracted_text
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resumeId]);

  const generateTips = () => {
    if (!resume || !scores) return [];
    
    const tips = [];
    const decision = resume.decision;
    
    if (decision === "REJECTED" || decision === "REVIEW") {
      // Skill-based tips
      if (scores.skill_data?.missing?.length > 0) {
        tips.push(`🎯 Add these skills: ${scores.skill_data.missing.slice(0, 3).join(", ")}`);
      }
      
      // Score-based tips
      const skillScore = scores.engine_scores?.find(e => e.engine === "Skill Match")?.score || 0;
      const expScore = scores.engine_scores?.find(e => e.engine === "Experience")?.score || 0;
      const qualityScore = scores.engine_scores?.find(e => e.engine === "Quality Gate")?.score || 0;
      
      if (skillScore < 50) {
        tips.push("💡 Highlight more relevant technical skills in your resume");
      }
      if (expScore < 50) {
        tips.push("📈 Add more details about your work experience and achievements");
      }
      if (qualityScore < 60) {
        tips.push("✍️ Improve grammar and sentence structure");
        tips.push("📝 Use more action verbs and quantifiable results");
      }
      
      // Generic tips
      if (resume.final_score < 50) {
        tips.push("🔍 Tailor your resume specifically to this job description");
        tips.push("📊 Add metrics and numbers to demonstrate impact");
      }
    }
    
    return tips.length > 0 ? tips : ["✨ Great resume! Keep up the good work."];
  };

  if (!resumeId)
    return (
      <div
        style={{
          color: COLORS.muted,
          textAlign: "center",
          marginTop: 60,
          fontSize: 14,
        }}
      >
        Click a processed resume to see details
      </div>
    );

  if (loading)
    return (
      <div
        style={{
          color: COLORS.muted,
          textAlign: "center",
          marginTop: 40,
        }}
      >
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 13 }}>Loading details...</div>
      </div>
    );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: COLORS.muted,
            marginBottom: 6,
            letterSpacing: 2,
          }}
        >
          RESUME ID
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 15,
            color: hasError ? COLORS.red : COLORS.accent,
            wordBreak: "break-all",
          }}
        >
          {resumeId}
        </div>
      </div>

      {/* Action Buttons */}
      {resume && !hasError && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setShowPreview(!showPreview);
              setShowWhy(false);
              setShowTips(false);
            }}
            style={{
              flex: 1,
              background: showPreview ? COLORS.accent : "transparent",
              border: `1px solid ${COLORS.accent}`,
              color: showPreview ? "#fff" : COLORS.accent,
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            📄 View
          </button>
          <button
            onClick={() => {
              setShowWhy(!showWhy);
              setShowPreview(false);
              setShowTips(false);
            }}
            style={{
              flex: 1,
              background: showWhy ? COLORS.muted : "transparent",
              border: `1px solid ${COLORS.muted}`,
              color: showWhy ? "#fff" : COLORS.text,
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            ❓ Why?
          </button>
          <button
            onClick={() => {
              setShowTips(!showTips);
              setShowPreview(false);
              setShowWhy(false);
            }}
            style={{
              flex: 1,
              background: showTips ? COLORS.green : "transparent",
              border: `1px solid ${COLORS.green}`,
              color: showTips ? "#fff" : COLORS.green,
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            💡 Tips
          </button>
        </div>
      )}

      {/* Resume Preview Modal */}
      {showPreview && scores?.extracted_text && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              width: "90%",
              maxWidth: 1000,
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: `1px solid ${COLORS.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                  Resume Preview
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                  {resumeId}
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.textMuted,
                  fontSize: 24,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Toggle between PDF and Text view */}
              <div
                style={{
                  padding: "12px 24px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "flex",
                  gap: 12,
                }}
              >
                <button
                  onClick={() => setShowTextView(false)}
                  style={{
                    background: !showTextView ? COLORS.accent : "transparent",
                    border: `1px solid ${COLORS.accent}`,
                    color: !showTextView ? "#fff" : COLORS.accent,
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  PDF View
                </button>
                <button
                  onClick={() => setShowTextView(true)}
                  style={{
                    background: showTextView ? COLORS.accent : "transparent",
                    border: `1px solid ${COLORS.accent}`,
                    color: showTextView ? "#fff" : COLORS.accent,
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Text View
                </button>
                <div style={{ fontSize: 11, color: COLORS.textMuted, alignSelf: "center", marginLeft: 8 }}>
                  {showTextView ? "Extracted text (OCR if image-based)" : "Original PDF"}
                </div>
              </div>

              {/* PDF or Text Content */}
              {showTextView ? (
                <div
                  style={{
                    flex: 1,
                    padding: 24,
                    overflow: "auto",
                    background: COLORS.card,
                    margin: 16,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <pre
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: COLORS.text,
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                      margin: 0,
                    }}
                  >
                    {scores.extracted_text}
                  </pre>
                </div>
              ) : (
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <iframe
                    src={`http://localhost:8000/api/resumes/file/${resumeId}#toolbar=0`}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                    title="Resume Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Why Section */}
      {showWhy && scores?.explanations && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: COLORS.muted,
              marginBottom: 12,
              letterSpacing: 2,
            }}
          >
            WHY THIS DECISION?
          </div>
          {scores.explanations.map((exp, i) => (
            <div
              key={i}
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                fontSize: 14,
                color: COLORS.text,
                lineHeight: 1.6,
              }}
            >
              • {exp}
            </div>
          ))}
        </div>
      )}

      {/* Tips Section */}
      {showTips && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: COLORS.muted,
              marginBottom: 12,
              letterSpacing: 2,
            }}
          >
            IMPROVEMENT TIPS
          </div>
          {generateTips().map((tip, i) => (
            <div
              key={i}
              style={{
                background: COLORS.green + "22",
                border: `1px solid ${COLORS.green}`,
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                fontSize: 14,
                color: COLORS.text,
                lineHeight: 1.6,
              }}
            >
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* Error Details */}

      {/* Error Details */}
      {hasError && resume.error_message && (
        <div
          style={{
            background: COLORS.red + "22",
            border: `1px solid ${COLORS.red}44`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: COLORS.red,
              marginBottom: 8,
              letterSpacing: 2,
            }}
          >
            ERROR DETAILS
          </div>
          <div
            style={{
              fontSize: 13,
              color: COLORS.text,
              lineHeight: 1.6,
            }}
          >
            {resume.error_message}
          </div>
        </div>
      )}

      {/* Score Summary - Always visible */}
      {resume && !hasError && !showPreview && !showWhy && !showTips && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: COLORS.muted,
                marginBottom: 8,
                letterSpacing: 2,
              }}
            >
              FINAL SCORE
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 32,
                  color: COLORS.text,
                  fontWeight: 700,
                }}
              >
                {resume.final_score}
              </span>
              <span style={{ color: COLORS.muted, fontSize: 14 }}>/ 100</span>
            </div>
            
            <DecisionBadge decision={resume.decision} COLORS={COLORS} />
          </div>

          {resume && !hasError && scores && (
            <button
              onClick={() => downloadPDF(resume, scores)}
              style={{
                background: COLORS.accent,
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 700,
                width: "100%",
                letterSpacing: 0.5,
                marginBottom: 24,
              }}
            >
              📥 Download PDF Report
            </button>
          )}

          {scores?.engine_scores?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: COLORS.muted,
                  marginBottom: 14,
                  letterSpacing: 2,
                }}
              >
                SCORE BREAKDOWN
              </div>

              {scores.engine_scores.map((e, i) => (
                <ScoreBar key={i} label={e.engine} score={e.score} COLORS={COLORS} />
              ))}
            </div>
          )}

          {scores?.skill_data && (scores.skill_data.matched?.length > 0 || scores.skill_data.missing?.length > 0) && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: COLORS.textMuted,
                  marginBottom: 12,
                  letterSpacing: 2,
                }}
              >
                SKILL GAP ANALYSIS
              </div>
              
              {/* Gap Score Card */}
              {(() => {
                const totalRequired = (scores.skill_data.matched?.length || 0) + (scores.skill_data.missing?.length || 0);
                const matchedCount = scores.skill_data.matched?.length || 0;
                const missingCount = scores.skill_data.missing?.length || 0;
                const gapPercentage = totalRequired > 0 ? Math.round((missingCount / totalRequired) * 100) : 0;
                const coveragePercentage = 100 - gapPercentage;
                
                return (
                  <div
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>
                          Skill Coverage
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                          {matchedCount} of {totalRequired} required skills
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: coveragePercentage >= 70 ? COLORS.green : coveragePercentage >= 50 ? COLORS.yellow : COLORS.red }}>
                          {coveragePercentage}%
                        </div>
                        <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "monospace" }}>
                          {gapPercentage}% GAP
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div
                      style={{
                        background: COLORS.border,
                        borderRadius: 8,
                        height: 8,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${coveragePercentage}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${coveragePercentage >= 70 ? COLORS.green : coveragePercentage >= 50 ? COLORS.yellow : COLORS.red}, ${coveragePercentage >= 70 ? COLORS.green : coveragePercentage >= 50 ? COLORS.yellow : COLORS.red}dd)`,
                          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
              
              {/* Critical Missing Skills */}
              {scores.skill_data.missing?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.red,
                      marginBottom: 10,
                      fontWeight: 600,
                    }}
                  >
                    CRITICAL GAPS ({scores.skill_data.missing.length})
                  </div>
                  <div
                    style={{
                      background: COLORS.red + "10",
                      border: `1px solid ${COLORS.red}40`,
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {scores.skill_data.missing.slice(0, 8).map((skill, i) => (
                        <span
                          key={i}
                          style={{
                            background: COLORS.card,
                            border: `1px solid ${COLORS.red}`,
                            color: COLORS.red,
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                      {scores.skill_data.missing.length > 8 && (
                        <span
                          style={{
                            color: COLORS.textMuted,
                            fontSize: 11,
                            padding: "4px 10px",
                          }}
                        >
                          +{scores.skill_data.missing.length - 8} more
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.textMuted,
                        lineHeight: 1.5,
                      }}
                    >
                      Recommendation: Candidate should develop these skills or provide evidence of equivalent experience
                    </div>
                  </div>
                </div>
              )}
              
              {/* Matched Skills */}
              {scores.skill_data.matched?.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.green,
                      marginBottom: 10,
                      fontWeight: 600,
                    }}
                  >
                    STRENGTHS ({scores.skill_data.matched.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {scores.skill_data.matched.slice(0, 12).map((skill, i) => (
                      <span
                        key={i}
                        style={{
                          background: COLORS.green + "15",
                          border: `1px solid ${COLORS.green}60`,
                          color: COLORS.green,
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontFamily: "monospace",
                          fontWeight: 500,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                    {scores.skill_data.matched.length > 12 && (
                      <span
                        style={{
                          color: COLORS.textMuted,
                          fontSize: 11,
                          padding: "4px 10px",
                        }}
                      >
                        +{scores.skill_data.matched.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ================= MAIN APP ================= */
export default function App() {
  const [jd, setJd] = useState("");
  const [files, setFiles] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [jdHistory, setJdHistory] = useState([]);
  const [showJdHistory, setShowJdHistory] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);

  const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  // Load resumes from database on mount
  useEffect(() => {
    const loadResumes = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/resumes");
        if (response.data.resumes) {
          setResumes(response.data.resumes);
        }
      } catch (error) {
        console.error("Failed to load resumes:", error);
      }
    };
    loadResumes();
  }, []);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  // Load JD history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("jd_history");
    if (saved) {
      try {
        setJdHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load JD history:", e);
      }
    }
  }, []);

  // Save JD to history
  const saveJdToHistory = (jdText) => {
    if (!jdText || jdText.trim().length < 20) return;

    const newEntry = {
      id: Date.now(),
      text: jdText.trim(),
      timestamp: new Date().toISOString(),
      preview: jdText.trim().substring(0, 100) + (jdText.length > 100 ? "..." : ""),
    };

    const updated = [newEntry, ...jdHistory.filter(j => j.text !== jdText.trim())].slice(0, 10); // Keep last 10
    setJdHistory(updated);
    localStorage.setItem("jd_history", JSON.stringify(updated));
  };

  const loadJdFromHistory = (jdText) => {
    setJd(jdText);
    setShowJdHistory(false);
  };

  const deleteJdFromHistory = (id) => {
    const updated = jdHistory.filter(j => j.id !== id);
    setJdHistory(updated);
    localStorage.setItem("jd_history", JSON.stringify(updated));
  };

  const toggleCompare = (resumeId) => {
    const resume = resumes.find(r => r.resume_id === resumeId);
    
    if (compareList.includes(resumeId)) {
      setCompareList(compareList.filter(id => id !== resumeId));
    } else if (compareList.length < 3) {
      // Check if this resume has the same JD as others in compare list
      if (compareList.length > 0) {
        const firstResumeInList = resumes.find(r => r.resume_id === compareList[0]);
        if (firstResumeInList && firstResumeInList.jd_hash !== resume.jd_hash) {
          alert("⚠️ Cannot compare resumes from different job descriptions!\n\nPlease select resumes analyzed with the same JD.");
          return;
        }
      }
      setCompareList([...compareList, resumeId]);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareList([]);
  };

  const downloadPDF = (resume, scores) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(79, 142, 247);
    doc.text("Resume Analysis Report", 20, 20);
    
    // Resume ID
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Resume ID: ${resume.resume_id}`, 20, 35);
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 42);
    
    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 48, 190, 48);
    
    // Final Score
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Final Score", 20, 60);
    doc.setFontSize(32);
    const scoreColor = resume.final_score >= 70 ? [34, 197, 94] : resume.final_score >= 50 ? [245, 158, 11] : [239, 68, 68];
    doc.setTextColor(...scoreColor);
    doc.text(`${resume.final_score}`, 20, 75);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("/ 100", 45, 75);
    
    // Decision
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Decision: ${resume.decision}`, 20, 88);
    
    // Quality Score
    if (resume.quality_score) {
      doc.setFontSize(12);
      doc.text(`Quality Score: ${(resume.quality_score * 100).toFixed(2)}%`, 20, 98);
    }
    
    // Engine Scores
    doc.setFontSize(16);
    doc.text("Score Breakdown", 20, 115);
    
    let yPos = 125;
    if (scores?.engine_scores) {
      scores.engine_scores.forEach((engine) => {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`${engine.engine}:`, 25, yPos);
        doc.setTextColor(79, 142, 247);
        doc.text(`${engine.score.toFixed(1)}`, 100, yPos);
        
        // Progress bar
        const barWidth = 60;
        const barHeight = 4;
        const fillWidth = (engine.score / 100) * barWidth;
        doc.setDrawColor(200, 200, 200);
        doc.rect(110, yPos - 3, barWidth, barHeight);
        doc.setFillColor(...scoreColor);
        doc.rect(110, yPos - 3, fillWidth, barHeight, 'F');
        
        yPos += 10;
      });
    }
    
    // Explanations
    if (scores?.explanations && scores.explanations.length > 0) {
      yPos += 10;
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Insights", 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      scores.explanations.forEach((exp, idx) => {
        const lines = doc.splitTextToSize(`• ${exp}`, 170);
        lines.forEach(line => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 25, yPos);
          yPos += 6;
        });
        yPos += 2;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("AI Resume Screening System", 20, 285);
    
    // Save
    doc.save(`Resume_Report_${resume.resume_id}.pdf`);
  };

  const handleAnalyze = async () => {
    if (!jd || files.length === 0) {
      alert("Please enter a job description and upload at least one resume");
      return;
    }

    // Validate file sizes (10MB max per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      alert(`The following files exceed 10MB limit:\n${oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join('\n')}`);
      return;
    }

    setAnalyzing(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("jd_text", jd);
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await axios.post(
        "http://localhost:8000/api/analyze",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      const newResumes = res.data.resumes;
      setResumes((prev) => [...prev, ...newResumes]);
      newResumes.forEach((r) => pollStatus(r.resume_id));
      
      // Save JD to history
      saveJdToHistory(jd);
      
      // Clear files after successful upload
      setFiles([]);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error("Analyze error:", error);
      alert("Error while analyzing resumes");
    }

    setAnalyzing(false);
    setUploadProgress(0);
  };

  const pollStatus = (resumeId) => {
    let retryCount = 0;
    const maxRetries = 150; // 5 minutes max (150 * 2 seconds)
    
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/resumes/status/${resumeId}`
        );

        const data = res.data;

        if (FINAL_STATUSES.includes(data.status)) {
          clearInterval(interval);
          setResumes((prev) =>
            prev.map((r) =>
              r.resume_id === resumeId ? { ...r, ...data } : r
            )
          );
        }
        
        retryCount++;
        if (retryCount >= maxRetries) {
          console.warn(`Polling timeout for ${resumeId}`);
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error:", err);
        retryCount++;
        if (retryCount >= 3) {
          clearInterval(interval);
        }
      }
    }, 2000);
  };

  const exportToCSV = async () => {
    try {
      // Fetch detailed results for all processed resumes
      const processedResumes = resumes.filter(r => r.status === "PROCESSED");
      
      if (processedResumes.length === 0) {
        alert("No processed resumes to export");
        return;
      }

      const detailedData = await Promise.all(
        processedResumes.map(async (resume) => {
          try {
            const res = await axios.get(
              `http://localhost:8000/api/resumes/results/${resume.resume_id}`
            );
            return { ...resume, details: res.data };
          } catch (err) {
            return { ...resume, details: null };
          }
        })
      );

      // Build CSV content
      let csv = "Resume ID,Status,Final Score,Decision,Quality Score,Skill Match,Experience,Education,Semantic Match,Explanations\n";

      detailedData.forEach((item) => {
        const scores = item.details?.engine_scores || [];
        const skillScore = scores.find(s => s.engine === "Skill Match")?.score || "";
        const expScore = scores.find(s => s.engine === "Experience")?.score || "";
        const eduScore = scores.find(s => s.engine === "Education")?.score || "";
        const semScore = scores.find(s => s.engine === "Semantic Match")?.score || "";
        const explanations = item.details?.explanations?.join("; ") || "";

        csv += `${item.resume_id},${item.status},${item.final_score || ""},${item.decision || ""},${item.quality_score ? (item.quality_score * 100).toFixed(2) : ""},${skillScore},${expScore},${eduScore},${semScore},"${explanations}"\n`;
      });

      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume_results_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export CSV");
    }
  };

  const deleteResume = async (resumeId) => {
    if (!confirm(`Delete resume ${resumeId}?`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/resumes/${resumeId}`);
      setResumes((prev) => prev.filter((r) => r.resume_id !== resumeId));
      if (selected === resumeId) {
        setSelected(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete resume");
    }
  };

  const clearAllResumes = async () => {
    if (!confirm(`Delete all ${resumes.length} resumes? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete("http://localhost:8000/api/resumes");
      setResumes([]);
      setSelected(null);
    } catch (error) {
      console.error("Clear all error:", error);
      alert("Failed to clear resumes");
    }
  };

  const shortlisted = resumes.filter(
    (r) => r.status === "PROCESSED" && r.final_score >= 60
  );
  const review = resumes.filter(
    (r) =>
      r.status === "PROCESSED" &&
      r.final_score >= 40 &&
      r.final_score < 60
  );
  const rejected = resumes.filter(
    (r) => r.status === "PROCESSED" && r.final_score < 40
  );
  const invalid = resumes.filter((r) =>
    ["INVALID_RESUME", "ERROR"].includes(r.status)
  );
  const pending = resumes.filter(
    (r) => !FINAL_STATUSES.includes(r.status)
  );

  // Filter resumes
  let filteredResumes = resumes;
  if (filter === "shortlisted") {
    filteredResumes = shortlisted;
  } else if (filter === "review") {
    filteredResumes = review;
  } else if (filter === "rejected") {
    filteredResumes = rejected;
  } else if (filter === "invalid") {
    filteredResumes = invalid;
  } else if (filter === "pending") {
    filteredResumes = pending;
  }

  // Sort resumes
  const sortedResumes = [...filteredResumes].sort((a, b) => {
    if (sortBy === "score-high") {
      return (b.final_score || 0) - (a.final_score || 0);
    } else if (sortBy === "score-low") {
      return (a.final_score || 0) - (b.final_score || 0);
    }
    // Default: recent first (no sorting needed, already in order)
    return 0;
  });

  // Get all processed resumes for ranking
  const processedResumes = resumes.filter(r => r.status === "PROCESSED");

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        color: COLORS.text,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: COLORS.bg,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: COLORS.accent,
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: COLORS.text,
            }}
          >
            AI RESUME SCREENER
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {resumes.length > 0 && (
            <button
              onClick={() => setShowDashboard(true)}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "monospace",
                fontWeight: 700,
              }}
              title="View Dashboard"
            >
              📊 STATS
            </button>
          )}
          <button
            onClick={toggleTheme}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div className="main-grid">
        {/* LEFT PANEL */}
        <div className="panel">
          <div
            style={{
              fontSize: 11,
              color: COLORS.muted,
              letterSpacing: 2,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>JOB DESCRIPTION</span>
            {jdHistory.length > 0 && (
              <button
                onClick={() => setShowJdHistory(!showJdHistory)}
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.accent,
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              >
                📋 HISTORY ({jdHistory.length})
              </button>
            )}
          </div>

          {/* Processing Queue Status */}
          {pending.length > 0 && (
            <div
              style={{
                background: COLORS.accent + "22",
                border: `1px solid ${COLORS.accent}`,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span className="spinner-small" />
                <span
                  style={{
                    fontSize: 11,
                    color: COLORS.accent,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: 1,
                  }}
                >
                  PROCESSING QUEUE
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: COLORS.text,
                  marginBottom: 6,
                }}
              >
                {pending.length} resume{pending.length !== 1 ? "s" : ""} in queue
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.muted,
                  fontFamily: "monospace",
                }}
              >
                Est. time: ~{Math.ceil(pending.length * 0.5)} min
              </div>
              
              {/* Progress bar */}
              <div
                style={{
                  background: COLORS.border,
                  borderRadius: 4,
                  height: 6,
                  marginTop: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${((resumes.length - pending.length) / resumes.length) * 100}%`,
                    height: "100%",
                    background: COLORS.accent,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.muted,
                  marginTop: 6,
                  textAlign: "right",
                }}
              >
                {resumes.length - pending.length} / {resumes.length} completed
              </div>
            </div>
          )}

          {showJdHistory && jdHistory.length > 0 && (
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.muted,
                  marginBottom: 8,
                  letterSpacing: 1,
                }}
              >
                RECENT JOB DESCRIPTIONS
              </div>
              {jdHistory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    padding: 8,
                    marginBottom: 6,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                  onClick={() => loadJdFromHistory(item.text)}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.text,
                        marginBottom: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.preview}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: COLORS.muted,
                        fontFamily: "monospace",
                      }}
                    >
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteJdFromHistory(item.id);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: COLORS.red,
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            rows={10}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here..."
            style={{
              width: "100%",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              color: COLORS.text,
              padding: 14,
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />

          <div
            style={{
              fontSize: 11,
              color: COLORS.muted,
              letterSpacing: 2,
              margin: "20px 0 12px",
            }}
          >
            UPLOAD RESUMES
          </div>

          <input
            type="file"
            multiple
            accept=".pdf,.docx"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            style={{
              color: COLORS.muted,
              fontSize: 13,
              marginBottom: 8,
              width: "100%",
            }}
          />
          
          {files.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>
              {files.length} file(s) selected
              {files.some(f => f.size > 10 * 1024 * 1024) && (
                <span style={{ color: COLORS.red, marginLeft: 8 }}>
                  ⚠️ Some files exceed 10MB
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing || pending.length > 0}
            style={{
              background: (analyzing || pending.length > 0) ? COLORS.muted : COLORS.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 28px",
              fontSize: 13,
              fontWeight: 700,
              cursor: (analyzing || pending.length > 0) ? "not-allowed" : "pointer",
              letterSpacing: 1,
              width: "100%",
              fontFamily: "inherit",
              marginTop: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {analyzing ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="spinner" />
                {uploadProgress > 0 && uploadProgress < 100 
                  ? `UPLOADING ${uploadProgress}%` 
                  : "ANALYZING..."}
              </span>
            ) : pending.length > 0 ? (
              `PROCESSING ${pending.length} RESUME${pending.length !== 1 ? "S" : ""}...`
            ) : (
              "ANALYZE"
            )}
            {analyzing && uploadProgress > 0 && uploadProgress < 100 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: 3,
                  width: `${uploadProgress}%`,
                  background: COLORS.green,
                  transition: "width 0.3s ease",
                }}
              />
            )}
          </button>
        </div>

        {/* MIDDLE PANEL */}
        <div className="panel">
          <div
            style={{
              fontSize: 11,
              color: COLORS.muted,
              letterSpacing: 2,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>RESULTS ({resumes.length})</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {pending.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                  <span className="spinner-small" />
                  {pending.length} processing
                </span>
              )}
              {resumes.length > 0 && (
                <>
                  {!compareMode && shortlisted.length + review.length >= 2 && (
                    <button
                      onClick={() => setCompareMode(true)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${COLORS.accent}`,
                        color: COLORS.accent,
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 10,
                        cursor: "pointer",
                        letterSpacing: 1,
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      ⚖️ COMPARE
                    </button>
                  )}
                  {compareMode && (
                    <button
                      onClick={exitCompareMode}
                      style={{
                        background: "transparent",
                        border: `1px solid ${COLORS.red}44`,
                        color: COLORS.red,
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 10,
                        cursor: "pointer",
                        letterSpacing: 1,
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      ✕ EXIT COMPARE
                    </button>
                  )}
                  <button
                    onClick={clearAllResumes}
                    style={{
                      background: "transparent",
                      border: `1px solid ${COLORS.red}44`,
                      color: COLORS.red,
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 10,
                      cursor: "pointer",
                      letterSpacing: 1,
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}
                  >
                    🗑️ CLEAR ALL
                  </button>
                  <button
                    onClick={exportToCSV}
                    style={{
                      background: "transparent",
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.accent,
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 10,
                      cursor: "pointer",
                      letterSpacing: 1,
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}
                  >
                    ⬇ EXPORT CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Ranking Summary */}
          {processedResumes.length > 0 && filter === "all" && (
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                📊 RANKING OVERVIEW
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: COLORS.green, fontWeight: 600 }}>Top 20%:</span>{" "}
                  {Math.ceil(processedResumes.length * 0.2)} candidates
                </div>
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: COLORS.accent, fontWeight: 600 }}>Top 50%:</span>{" "}
                  {Math.ceil(processedResumes.length * 0.5)} candidates
                </div>
                {processedResumes.length > 0 && (
                  <div style={{ fontSize: 12, color: COLORS.text }}>
                    <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>Total:</span>{" "}
                    {processedResumes.length} ranked
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          {resumes.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              {[
                { key: "all", label: "All", count: resumes.length },
                { key: "shortlisted", label: "Shortlisted", count: shortlisted.length },
                { key: "review", label: "Review", count: review.length },
                { key: "rejected", label: "Rejected", count: rejected.length },
                { key: "invalid", label: "Invalid", count: invalid.length },
                { key: "pending", label: "Pending", count: pending.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  style={{
                    background: filter === tab.key ? COLORS.accent + "22" : "transparent",
                    border: `1px solid ${filter === tab.key ? COLORS.accent : COLORS.border}`,
                    color: filter === tab.key ? COLORS.accent : COLORS.muted,
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontWeight: filter === tab.key ? 700 : 400,
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          )}

          {/* Sort Dropdown */}
          {resumes.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <option value="recent">Sort: Recent First</option>
                <option value="score-high">Sort: Score (High to Low)</option>
                <option value="score-low">Sort: Score (Low to High)</option>
              </select>
            </div>
          )}

          {resumes.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: COLORS.muted,
                fontSize: 13,
                marginTop: 40,
              }}
            >
              No resumes yet. Upload and analyze to get started.
            </div>
          )}

          {sortedResumes.length === 0 && resumes.length > 0 && (
            <div
              style={{
                textAlign: "center",
                color: COLORS.muted,
                fontSize: 13,
                marginTop: 40,
              }}
            >
              No resumes match the selected filter.
            </div>
          )}

          {sortedResumes.map((r, index) => {
            // Calculate rank for processed resumes based on score
            const allProcessedSorted = [...processedResumes].sort((a, b) => 
              (b.final_score || 0) - (a.final_score || 0)
            );
            const isProcessed = r.status === "PROCESSED";
            const rank = isProcessed 
              ? allProcessedSorted.findIndex(pr => pr.resume_id === r.resume_id) + 1 
              : null;
            
            return (
              <ResumeCard
                key={r.resume_id}
                resume={r}
                onClick={setSelected}
                selected={selected === r.resume_id}
                onDelete={deleteResume}
                compareMode={compareMode}
                isComparing={compareList.includes(r.resume_id)}
                onToggleCompare={toggleCompare}
                COLORS={COLORS}
                rank={rank}
                totalProcessed={processedResumes.length}
              />
            );
          })}
        </div>

        {/* RIGHT PANEL */}
        <div className="panel detail-panel">
          <div
            style={{
              fontSize: 11,
              color: COLORS.muted,
              letterSpacing: 2,
              marginBottom: 20,
            }}
          >
            {compareMode && compareList.length > 0 ? "COMPARISON" : "DETAILS"}
          </div>

          {compareMode && compareList.length > 0 ? (
            <ComparePanel compareList={compareList} resumes={resumes} COLORS={COLORS} />
          ) : compareMode ? (
            <div
              style={{
                color: COLORS.muted,
                textAlign: "center",
                marginTop: 60,
                fontSize: 13,
              }}
            >
              Select 2-3 resumes to compare
            </div>
          ) : (
            <DetailPanel resumeId={selected} resumes={resumes} COLORS={COLORS} />
          )}
        </div>
      </div>

      {/* Admin Dashboard Modal */}
      {showDashboard && (
        <AdminDashboard
          resumes={resumes}
          onClose={() => setShowDashboard(false)}
          COLORS={COLORS}
        />
      )}
    </div>
  );
}