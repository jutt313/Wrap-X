import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import '../styles/ProjectsModal.css';

function ProjectsModal() {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/projects');
      setProjects(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createProject = async () => {
    if (!name.trim()) return;
    await apiClient.post('/api/projects', { name: name.trim() });
    setName(''); setCreating(false);
    await load();
  };

  const deleteProject = async (id) => {
    await apiClient.delete(`/api/projects/${id}`);
    await load();
  };

  return (
    <div className="projects-modal">
      <div className="projects-header">
        <h3>Projects</h3>
        <button className="create-btn" onClick={() => setCreating(true)}>+ Create Project</button>
      </div>

      {creating && (
        <div className="mini-modal">
          <div className="mini-title">Create a new project</div>
          <p className="mini-desc">Projects are shared environments where teams can collaborate and share API resources. You can set custom rate limits and manage access to resources. Learn more.</p>
          <label className="mini-label">Name</label>
          <input className="mini-input" placeholder="Human-friendly label" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="mini-actions">
            <button className="btn-secondary" onClick={() => { setCreating(false); setName(''); }}>Cancel</button>
            <button className="btn-primary" onClick={createProject} disabled={!name.trim()}>Create</button>
          </div>
        </div>
      )}

      <div className="projects-table-wrap">
        {loading ? (
          <div className="empty">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="empty">No projects yet.</div>
        ) : (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Geography</th>
                <th>Members</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="mono id-cell" onClick={() => { navigator.clipboard.writeText(p.id); }} title="Click to copy">
                    {p.id}
                  </td>
                  <td>{p.geography || '-'}</td>
                  <td>{p.members ?? 1}</td>
                  <td>{new Date(p.created).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                  <td><button className="btn-danger" onClick={() => deleteProject(p.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ProjectsModal;


