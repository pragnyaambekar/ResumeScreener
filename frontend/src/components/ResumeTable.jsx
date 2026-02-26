export default function ResumeTable({ resumes, onSelect }) {
  return (
    <div>
      <h2>Resumes</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Candidate Name</th>
            <th>Resume ID</th>
            <th>Status</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {resumes.map((r) => (
            <tr key={r.resume_id} onClick={() => onSelect(r.resume_id)}>
              <td>{r.candidate_name || "Unknown"}</td>
              <td>{r.resume_id}</td>
              <td>{r.status}</td>
              <td>{r.final_score ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
