import { useState } from "react";
import UploadPanel from "../components/UploadPanel";
import ResumeTable from "../components/ResumeTable";
import ResumeDetails from "../components/ResumeDetails";
import JDPanel from "../components/JDPanel";
import API from "../api/api";

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [selected, setSelected] = useState(null);
  <JDPanel />

  const handleUpload = (results) => {
    setResumes((prev) => [...prev, ...results]);
  };

  const handleSelect = async (resumeId) => {
    const res = await API.get(`/resumes/status/${resumeId}`);
    setSelected(resumeId);

    setResumes((prev) =>
      prev.map((r) =>
        r.resume_id === resumeId ? { ...r, ...res.data } : r
      )
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AI Resume Screening Dashboard</h1>

      <UploadPanel onUpload={handleUpload} />

      <ResumeTable resumes={resumes} onSelect={handleSelect} />

      <ResumeDetails resumeId={selected} />
    </div>
  );
}
