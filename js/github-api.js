// PixaPro · github-api.js — Write via GitHub Contents + Trees API
// Permite que PixaPro (deployed em Pages) faca write operations
// (Save preset, Apply renames) sem precisar de project_server.py local.
//
// Auth: Personal Access Token (PAT) com scope `repo`. Stored em localStorage.
// User configura via UI (modal Settings).
//
// API docs:
//   - Contents API: https://docs.github.com/rest/repos/contents
//   - Git Trees API: https://docs.github.com/rest/git/trees

(function(){
  const PAT_KEY = 'pixapro_github_pat';
  const API_BASE = 'https://api.github.com';

  function getPat() {
    return localStorage.getItem(PAT_KEY) || '';
  }
  function setPat(token) {
    if (token) localStorage.setItem(PAT_KEY, token);
    else localStorage.removeItem(PAT_KEY);
  }
  function hasPat() {
    return !!getPat();
  }

  // Parse owner/repo de uma Pages URL
  // ex: 'https://zeroonebit.github.io/chapada-escapade' -> {owner, repo}
  function parsePagesUrl(pagesUrl) {
    const m = pagesUrl.match(/^https:\/\/([^.]+)\.github\.io\/([^/]+)/);
    if (!m) return null;
    return {owner: m[1], repo: m[2]};
  }

  function authHeaders() {
    return {
      'Authorization': `Bearer ${getPat()}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  // Test if PAT is valid + has repo scope
  async function validatePat(pat) {
    try {
      const r = await fetch(`${API_BASE}/user`, {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json',
        },
      });
      if (!r.ok) return {ok: false, error: `HTTP ${r.status}`};
      const u = await r.json();
      const scopes = r.headers.get('x-oauth-scopes') || '';
      const hasRepo = scopes.includes('repo') || scopes.includes('public_repo');
      return {
        ok: true,
        user: u.login,
        scopes,
        hasRepo,
        warning: hasRepo ? null : 'PAT nao tem scope "repo" -- writes vao falhar',
      };
    } catch (e) {
      return {ok: false, error: e.message};
    }
  }

  // GET file content (e SHA, necessario pra update)
  async function getFile(owner, repo, path) {
    const r = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
      headers: authHeaders(),
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`getFile ${path}: HTTP ${r.status}`);
    return await r.json();
  }

  // PUT file (create OR update). content = string, sera base64-encoded.
  async function putFile(owner, repo, path, content, message, sha) {
    // base64-encode (UTF-8 safe)
    const b64 = btoa(unescape(encodeURIComponent(content)));
    const body = {
      message,
      content: b64,
      branch: 'main',
    };
    if (sha) body.sha = sha;
    const r = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {...authHeaders(), 'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(`putFile ${path}: HTTP ${r.status} ${err.message || ''}`);
    }
    return await r.json();
  }

  // High-level: save text file. Detecta se existe (pra pegar SHA) ou cria novo.
  async function saveTextFile(owner, repo, path, content, message) {
    let sha = undefined;
    try {
      const existing = await getFile(owner, repo, path);
      if (existing && existing.sha) sha = existing.sha;
    } catch {}
    return await putFile(owner, repo, path, content, message, sha);
  }

  // Batch tree API pra renames atomicos (1 commit pra batch inteiro)
  // operations: [{action: 'move', from, to} | {action: 'update', path, content}]
  async function batchTreeOperations(owner, repo, operations, message) {
    // 1. Get current ref + commit
    const refR = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/refs/heads/main`, {headers: authHeaders()});
    if (!refR.ok) throw new Error(`get ref: HTTP ${refR.status}`);
    const ref = await refR.json();
    const baseSha = ref.object.sha;

    const commitR = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/commits/${baseSha}`, {headers: authHeaders()});
    if (!commitR.ok) throw new Error(`get commit: HTTP ${commitR.status}`);
    const baseCommit = await commitR.json();
    const baseTreeSha = baseCommit.tree.sha;

    // 2. Build tree changes
    // Pra rename: precisa GET o blob SHA do source + criar entry no destino + delete entry no source
    // Pra update: criar blob novo com content + entry no path
    const treeEntries = [];

    for (const op of operations) {
      if (op.action === 'move') {
        // Get source file SHA (blob)
        const src = await getFile(owner, repo, op.from);
        if (!src) {
          console.warn(`[github-api] move skip: ${op.from} not found`);
          continue;
        }
        // Add destination with same blob
        treeEntries.push({path: op.to, mode: '100644', type: 'blob', sha: src.sha});
        // Remove source (sha: null)
        treeEntries.push({path: op.from, mode: '100644', type: 'blob', sha: null});
      } else if (op.action === 'update') {
        // Create blob with new content
        const blobR = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          headers: {...authHeaders(), 'Content-Type': 'application/json'},
          body: JSON.stringify({content: op.content, encoding: 'utf-8'}),
        });
        if (!blobR.ok) throw new Error(`create blob ${op.path}: HTTP ${blobR.status}`);
        const blob = await blobR.json();
        treeEntries.push({path: op.path, mode: '100644', type: 'blob', sha: blob.sha});
      }
    }

    if (treeEntries.length === 0) {
      throw new Error('no tree entries to commit');
    }

    // 3. Create new tree (base on existing)
    const treeR = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: {...authHeaders(), 'Content-Type': 'application/json'},
      body: JSON.stringify({base_tree: baseTreeSha, tree: treeEntries}),
    });
    if (!treeR.ok) throw new Error(`create tree: HTTP ${treeR.status}`);
    const newTree = await treeR.json();

    // 4. Create commit
    const newCommitR = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: {...authHeaders(), 'Content-Type': 'application/json'},
      body: JSON.stringify({message, tree: newTree.sha, parents: [baseSha]}),
    });
    if (!newCommitR.ok) throw new Error(`create commit: HTTP ${newCommitR.status}`);
    const newCommit = await newCommitR.json();

    // 5. Update ref to new commit
    const updateRefR = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: {...authHeaders(), 'Content-Type': 'application/json'},
      body: JSON.stringify({sha: newCommit.sha}),
    });
    if (!updateRefR.ok) throw new Error(`update ref: HTTP ${updateRefR.status}`);

    return {commitSha: newCommit.sha, htmlUrl: newCommit.html_url || `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`};
  }

  // Expose globalmente
  window.PixaGithubApi = {
    getPat, setPat, hasPat, parsePagesUrl, validatePat,
    getFile, putFile, saveTextFile, batchTreeOperations,
  };
})();
