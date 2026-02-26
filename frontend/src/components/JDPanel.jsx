import { useState } from "react";
import API from "../api/api";

export default function JDPanel() {
  const [jd, setJd] = useState("");

  const saveJD = async () => {
    await API.post("/jd/set", { jd_text: jd });
    alert("JD Saved");
  };

  return (
    <div>
      <h2>Job Description</h2>
      <textarea
        rows="6"
        cols="60"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <br />
      <button onClick={saveJD}>Save JD</button>
    </div>
  );
}
