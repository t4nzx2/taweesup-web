import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { toBE } from '../utils';

export default function Announcements() {
  const { user } = useAuth();
  const isHR = user.role === 'HR Admin';
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', pinned: false });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/announcements').then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/announcements', form);
      setForm({ title: '', body: '', pinned: false });
      setShowModal(false);
      load();
    } finally { setSaving(false); }
  };

  const handlePin = async (id) => {
    await api.put(`/announcements/${id}/pin`);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>📢 Announcements</h1>
        {isHR && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Announcement
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty" style={{ paddingTop: 60 }}>
          <div className="empty-icon">📭</div>
          No announcements yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(a => (
            <div key={a.announcement_id} className="card" style={{
              borderLeft: `4px solid ${a.pinned ? 'var(--primary)' : 'var(--border)'}`,
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {a.pinned ? <span title="Pinned" style={{ fontSize: 14 }}>📌</span> : null}
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{a.title}</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {a.body}
                  </p>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    Posted by {a.author_name || 'HR'} · {toBE(a.created_at?.slice(0, 10))}
                  </div>
                </div>
                {isHR && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      title={a.pinned ? 'Unpin' : 'Pin to top'}
                      onClick={() => handlePin(a.announcement_id)}
                    >
                      {a.pinned ? '📌 Unpin' : '📌 Pin'}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
                      onClick={() => handleDelete(a.announcement_id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>New Announcement</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="e.g. Office closed on Monday"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  required
                  placeholder="Write your announcement here..."
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="pinned"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                />
                <label htmlFor="pinned" style={{ fontSize: 14, cursor: 'pointer' }}>
                  📌 Pin to top
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
