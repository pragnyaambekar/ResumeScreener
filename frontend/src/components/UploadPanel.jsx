import { useState } from "react";
import API from "../api/api";

export default function UploadPanel({ onUpload }) {
  const [files, setFiles] = useState([]);

  const handleUpload = async () => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const res = await API.post("/resumes/upload", formData);
    onUpload(res.data.results);
  };

  return (
    <div>
      <h2>Upload Resumes</h2>
      <input
        type="file"
        multiple
        onChange={(e) => setFiles([...e.target.files])}
      />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}
