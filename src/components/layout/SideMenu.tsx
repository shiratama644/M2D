'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { CONCURRENCY_LIMIT, asyncPool } from '@/lib/helpers';
import { API } from '@/lib/api';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Icon from '@/components/ui/Icon';

import xIconRaw from '@/assets/icons/x.svg';
import bookmarkIconRaw from '@/assets/icons/bookmark.svg';
import fileArchiveIconRaw from '@/assets/icons/file-archive.svg';
import importIconRaw from '@/assets/icons/import.svg';
import uploadIconRaw from '@/assets/icons/upload.svg';
import shareIconRaw from '@/assets/icons/share.svg';
import trashIconRaw from '@/assets/icons/trash.svg';
import pencilIconRaw from '@/assets/icons/pencil.svg';
import checkIconRaw from '@/assets/icons/check.svg';

export default function SideMenu() {
  const {
    menuOpen, setMenuOpen,
    profiles, saveProfiles,
    selectedMods, replaceSelectedMods,
    showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    addDebugLog,
    showAlert, showConfirm,
  } = useApp();

  const [profileName, setProfileName] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importZipInputRef = useRef<HTMLInputElement | null>(null);

  const closeMenu = () => setMenuOpen(false);

  const saveProfile = async () => {
    const name = profileName.trim();
    if (!name || selectedMods.size === 0) {
      await showAlert('Invalid name or no mods selected.');
      return;
    }
    const newProfiles = [
      ...profiles,
      { name, mods: Array.from(selectedMods), date: new Date().toLocaleDateString() },
    ];
    saveProfiles(newProfiles);
    addDebugLog('info', `Profile saved: "${name}" (${selectedMods.size} mods)`);
    setProfileName('');
    setProfileMsg('Saved!');
    setTimeout(() => setProfileMsg(''), 2000);
  };

  const loadProfile = async (index: number) => {
    if (!await showConfirm('Load profile? Current selection will be cleared.')) return;
    const profile = profiles[index];
    replaceSelectedMods(profile.mods);
    addDebugLog('info', `Profile loaded: "${profile.name}" (${profile.mods.length} mods)`);
    closeMenu();
  };

  const deleteProfile = async (index: number) => {
    if (!await showConfirm('Delete this profile?')) return;
    const profile = profiles[index];
    const newProfiles = [...profiles];
    newProfiles.splice(index, 1);
    saveProfiles(newProfiles);
    addDebugLog('info', `Profile deleted: "${profile.name}"`);
  };

  const startRename = (index: number) => {
    setRenamingIndex(index);
    setRenameValue(profiles[index].name);
  };

  const commitRename = (index: number) => {
    const newName = renameValue.trim();
    if (!newName) { setRenamingIndex(null); return; }
    const oldName = profiles[index].name;
    const newProfiles = profiles.map((p, i) => (i === index ? { ...p, name: newName } : p));
    saveProfiles(newProfiles);
    addDebugLog('info', `Profile renamed: "${oldName}" → "${newName}"`);
    setRenamingIndex(null);
  };

  const exportProfile = (index: number) => {
    const profile = profiles[index];
    if (!profile) return;
    const encodedName = encodeURIComponent(profile.name);
    const rawString = `MMPROF1:${encodedName}:${profile.mods.join(',')}`;
    const blob = new Blob([btoa(rawString)], { type: 'text/plain' });
    saveAs(blob, `${profile.name.replace(/\s+/g, '_')}_profile.txt`);
    addDebugLog('info', `Profile exported: "${profile.name}"`);
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parts = atob((ev.target?.result as string).trim()).split(':');
        if (parts.length < 3 || parts[0] !== 'MMPROF1') throw new Error('Invalid Signature');
        const profile = {
          name: decodeURIComponent(parts[1]) + ' (Imported)',
          mods: parts[2] ? parts[2].split(',') : [],
          date: new Date().toLocaleDateString(),
        };
        saveProfiles([...profiles, profile]);
        addDebugLog('info', `Profile imported from TXT: "${profile.name}" (${profile.mods.length} mods)`);
        await showAlert(`Imported "${profile.name}" successfully!`);
      } catch {
        addDebugLog('error', `Failed to import profile from file: ${file.name}`);
        await showAlert('Failed to load profile.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const importZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.crypto?.subtle) {
      await showAlert('Cryptography API is not supported in this environment.');
      e.target.value = '';
      return;
    }

    addDebugLog('info', `Scanning ZIP: ${file.name}`);
    showLoading('Reading ZIP...');
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const entries = Object.values(loadedZip.files).filter(
        (f) => !f.dir && f.name.endsWith('.jar'),
      );

      if (entries.length === 0) {
        addDebugLog('warn', 'No .jar files found in ZIP.');
        await showAlert('No .jar files found in the ZIP.');
        hideLoading();
        e.target.value = '';
        return;
      }

      addDebugLog('log', `Found ${entries.length} .jar files in ZIP`);
      showProgress(entries.length);
      let processed = 0;
      const startTime = Date.now();

      const hashes = await asyncPool(CONCURRENCY_LIMIT, entries, async (zipEntry) => {
        try {
          const arrayBuffer = await zipEntry.async('arraybuffer');
          const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        } catch (err) {
          addDebugLog('error', `Failed to hash ${zipEntry.name}: ${err}`);
          return null;
        } finally {
          processed++;
          updateProgress(processed, entries.length, startTime);
          updateLoading(`Calculating hashes... (${processed}/${entries.length})`);
        }
      });

      const validHashes = hashes.filter(Boolean) as string[];
      addDebugLog('log', `Hashed ${validHashes.length}/${entries.length} files`);
      updateLoading('Identifying mods...');

      const projectIds = new Set<string>();
      let fetchProcessed = 0;
      const fetchStartTime = Date.now();
      showProgress(validHashes.length);

      await asyncPool(CONCURRENCY_LIMIT, validHashes, async (hash) => {
        try {
          const version = await API.getVersionFile(hash);
          if (version?.project_id) {
            projectIds.add(version.project_id);
            addDebugLog('log', `Identified mod: ${version.project_id} (hash ${hash.slice(0, 8)}...)`);
          } else {
            addDebugLog('warn', `Hash not found on Modrinth: ${hash.slice(0, 8)}...`);
          }
        } catch (err) {
          addDebugLog('error', `Network error for hash ${hash}: ${err}`);
        } finally {
          fetchProcessed++;
          updateProgress(fetchProcessed, validHashes.length, fetchStartTime);
          updateLoading(`Identifying mods... (${fetchProcessed}/${validHashes.length})`);
        }
      });

      if (projectIds.size === 0) {
        addDebugLog('warn', 'Could not identify any mods from Modrinth in this ZIP.');
        await showAlert('Could not identify any mods from Modrinth in this ZIP.');
      } else {
        const pName = file.name.replace(/\.[^/.]+$/, '');
        const profile = {
          name: pName,
          mods: Array.from(projectIds),
          date: new Date().toLocaleDateString(),
        };
        saveProfiles([...profiles, profile]);
        addDebugLog('info', `ZIP import: identified ${projectIds.size} mods, saved as "${pName}"`);
        await showAlert(`Identified ${projectIds.size} mods and saved as profile "${pName}"!`);
      }
    } catch (err) {
      addDebugLog('error', String(err));
      await showAlert('Failed to process ZIP file.');
    } finally {
      hideLoading();
      e.target.value = '';
    }
  };

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="overlay"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
      <motion.div
        className={cn('side-menu', menuOpen && 'open')}
        initial={false}
        animate={{ x: menuOpen ? 0 : '-100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
        style={{ transform: undefined }}
      >
        <div className="side-menu-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon svg={bookmarkIconRaw} size={20} /> My Profiles
          </span>
          <button onClick={closeMenu} className="btn icon-only-btn side-menu-close-btn">
            <Icon svg={xIconRaw} size={20} />
          </button>
        </div>
        <div className="side-menu-content">
          <div className="save-profile-box">
            <label>Save Current Selection</label>
            <div className="input-group">
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveProfile()}
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
              <button
                onClick={() => importZipInputRef.current?.click()}
                className="btn-text-icon"
                title="Scan ZIP for Mods"
              >
                <Icon svg={fileArchiveIconRaw} size={12} /> ZIP
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="btn-text-icon"
                title="Import TXT"
              >
                <Icon svg={importIconRaw} size={12} /> TXT
              </button>
            </div>
            <input
              type="file"
              ref={importInputRef}
              accept=".txt"
              style={{ display: 'none' }}
              onChange={importFile}
            />
            <input
              type="file"
              ref={importZipInputRef}
              accept=".zip"
              style={{ display: 'none' }}
              onChange={importZip}
            />
          </div>

          <div className="profile-list">
            {profiles.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  padding: '1rem 0',
                }}
              >
                No profiles saved yet.
              </div>
            ) : (
              profiles.map((p, i) => (
                <div key={i} className="profile-card">
                  <div className="profile-info">
                    {renamingIndex === i ? (
                      <div className="rename-input-group">
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(i);
                            if (e.key === 'Escape') setRenamingIndex(null);
                          }}
                          className="input-base rename-input"
                        />
                        <button
                          onClick={() => commitRename(i)}
                          className="btn-icon-small blue"
                          title="Confirm Rename"
                        >
                          <Icon svg={checkIconRaw} size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="profile-name">{p.name}</div>
                    )}
                    <div className="profile-date">{p.mods.length} mods • {p.date}</div>
                  </div>
                  <div className="profile-actions">
                    <button onClick={() => loadProfile(i)} className="btn-icon-small blue" title="Load">
                      <Icon svg={uploadIconRaw} size={16} />
                    </button>
                    <button onClick={() => startRename(i)} className="btn-icon-small gray" title="Rename">
                      <Icon svg={pencilIconRaw} size={16} />
                    </button>
                    <button onClick={() => exportProfile(i)} className="btn-icon-small gray" title="Export">
                      <Icon svg={shareIconRaw} size={16} />
                    </button>
                    <button onClick={() => deleteProfile(i)} className="btn-icon-small red" title="Delete">
                      <Icon svg={trashIconRaw} size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
