import { useEffect, useState } from "react";
import API from "../api/api";
import EngineScoreBar from "./EngineScoreBar";

export default function ResumeDetails({ resumeId }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!resumeId) return;

    API.get(`/resumes/results/${resumeId}`).then((res) =>
      setResult(res.data)
    );
  }, [resumeId]);

  if (!result) return <div>Select a resume</div>;

  return (
    <div>
      <h2>Resume Details</h2>

      <h3>Engine Scores</h3>
      {result.engine_scores.map((e, i) => (
        <EngineScoreBar key={i} engine={e.engine} score={e.score} />
      ))}

      <h3>Explanation</h3>
      <ul>
        {result.explanations.map((ex, i) => (
          <li key={i}>{ex}</li>
        ))}
      </ul>
    </div>
  );
}
