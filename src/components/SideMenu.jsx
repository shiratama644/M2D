import { useState, useRef } from 'react';
import { X, FolderHeart, FileArchive, Import, Upload, Share2, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CONCURRENCY_LIMIT, asyncPool } from '../utils/helpers';
import { API } from '../utils/api';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function SideMenu() {
  const {
    menuOpen, setMenuOpen,
    profiles, saveProfiles,
    selectedMods, replaceSelectedMods,
    showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    addDebugLog,
  } = useApp();

  const [profileName, setProfileName] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const importInputRef = useRef(null);
  const importZipInputRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  const saveProfile = () => {
    const name = profileName.trim();
    if (!name || selectedMods.size === 0) {
      alert('Invalid name or no mods selected.');
      return;
    }
    const newProfiles = [...profiles, { name, mods: Array.from(selectedMods), date: new Date().toLocaleDateString() }];
    saveProfiles(newProfiles);
    setProfileName('');
    setProfileMsg('Saved!');
    setTimeout(() => setProfileMsg(''), 2000);
  };

  const loadProfile = (index) => {
    if (!confirm('Load profile? Current selection will be cleared.')) return;
    const profile = profiles[index];
    replaceSelectedMods(profile.mods);
    closeMenu();
  };

  const deleteProfile = (index) => {
    if (!confirm('Delete this profile?')) return;
    const newProfiles = [...profiles];
    newProfiles.splice(index, 1);
    saveProfiles(newProfiles);
  };

  const exportProfile = (index) => {
    const profile = profiles[index];
    if (!profile) return;
    const encodedName = encodeURIComponent(profile.name);
    const rawString = `MMPROF1:${encodedName}:${profile.mods.join(',')}`;
    const blob = new Blob([btoa(rawString)], { type: 'text/plain' });
    saveAs(blob, `${profile.name.replace(/\s+/g, '_')}_profile.txt`);
  };

  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parts = atob(ev.target.result.trim()).split(':');
        if (parts.length < 3 || parts[0] !== 'MMPROF1') throw new Error('Invalid Signature');
        const profile = {
          name: decodeURIComponent(parts[1]) + ' (Imported)',
          mods: parts[2] ? parts[2].split(',') : [],
          date: new Date().toLocaleDateString(),
        };
        saveProfiles([...profiles, profile]);
        alert(`Imported "${profile.name}" successfully!`);
      } catch {
        alert('Failed to load profile.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const importZip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.crypto || !window.crypto.subtle) {
      alert('Cryptography API is not supported in this environment.');
      e.target.value = '';
      return;
    }

    showLoading('Reading ZIP...');
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const entries = Object.values(loadedZip.files).filter(f => !f.dir && f.name.endsWith('.jar'));

      if (entries.length === 0) {
        alert('No .jar files found in the ZIP.');
        hideLoading();
        e.target.value = '';
        return;
      }

      showProgress(entries.length);
      let processed = 0;
      const startTime = Date.now();

      const hashes = await asyncPool(CONCURRENCY_LIMIT, entries, async (zipEntry) => {
        try {
          const arrayBuffer = await zipEntry.async('arraybuffer');
          const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (err) {
          addDebugLog('error', `Failed to hash ${zipEntry.name}: ${err}`);
          return null;
        } finally {
          processed++;
          updateProgress(processed, entries.length, startTime);
          updateLoading(`Calculating hashes... (${processed}/${entries.length})`);
        }
      });

      const validHashes = hashes.filter(Boolean);
      updateLoading('Identifying mods...');

      const projectIds = new Set();
      let fetchProcessed = 0;
      const fetchStartTime = Date.now();
      showProgress(validHashes.length);

      await asyncPool(CONCURRENCY_LIMIT, validHashes, async (hash) => {
        try {
          const version = await API.getVersionFile(hash);
          if (version?.project_id) projectIds.add(version.project_id);
        } catch (err) {
          addDebugLog('error', `Network error for hash ${hash}: ${err}`);
        } finally {
          fetchProcessed++;
          updateProgress(fetchProcessed, validHashes.length, fetchStartTime);
          updateLoading(`Identifying mods... (${fetchProcessed}/${validHashes.length})`);
        }
      });

      if (projectIds.size === 0) {
        alert('Could not identify any mods from Modrinth in this ZIP.');
      } else {
        const profileName = file.name.replace(/\.[^/.]+$/, '');
        const profile = {
          name: profileName,
          mods: Array.from(projectIds),
          date: new Date().toLocaleDateString(),
        };
        saveProfiles([...profiles, profile]);
        alert(`Identified ${projectIds.size} mods and saved as profile "${profileName}"!`);
      }
    } catch (err) {
      addDebugLog('error', String(err));
      alert('Failed to process ZIP file.');
    } finally {
      hideLoading();
      e.target.value = '';
    }
  };

  return (
    <>
      {menuOpen && <div className="overlay" onClick={closeMenu} />}
      <div className={`side-menu ${menuOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderHeart size={20} /> My Profiles
          </span>
          <button onClick={closeMenu} className="icon-btn">
            <X size={20} />
          </button>
        </div>
        <div className="side-menu-content">
          <div className="save-profile-box">
            <label>Save Current Selection</label>
            <div className="input-group">
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && saveProfile()}
                placeholder="Name (ex: RPG Pack)"
                className="input-base"
              />
              <button onClick={saveProfile} className="btn-primary">Save</button>
            </div>
            <p className="profile-msg">{profileMsg}</p>
          </div>

          <div className="profile-list-header">
            <h3>Saved Profiles</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => importZipInputRef.current?.click()} className="btn-text-icon" title="Scan ZIP for Mods">
                <FileArchive size={12} /> ZIP
              </button>
              <button onClick={() => importInputRef.current?.click()} className="btn-text-icon" title="Import TXT">
                <Import size={12} /> TXT
              </button>
            </div>
            <input type="file" ref={importInputRef} accept=".txt" style={{ display: 'none' }} onChange={importFile} />
            <input type="file" ref={importZipInputRef} accept=".zip" style={{ display: 'none' }} onChange={importZip} />
          </div>

          <div className="profile-list">
            {profiles.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                No profiles saved yet.
              </div>
            ) : (
              profiles.map((p, i) => (
                <div key={i} className="profile-card">
                  <div className="profile-info">
                    <div className="profile-name">{p.name}</div>
                    <div className="profile-date">{p.mods.length} mods • {p.date}</div>
                  </div>
                  <div className="profile-actions">
                    <button onClick={() => loadProfile(i)} className="btn-icon-small blue" title="Load">
                      <Upload size={16} />
                    </button>
                    <button onClick={() => exportProfile(i)} className="btn-icon-small gray" title="Export">
                      <Share2 size={16} />
                    </button>
                    <button onClick={() => deleteProfile(i)} className="btn-icon-small red" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
