// PixaPro · classify.js — agrupamento e classificação de assets
// Funções puras (exceto findDirectionVariants que lê summaryData global).

// Pega chave de grupo "natural": personagem inteiro (chars/boi) ou categoria (chars/nature/objects)
function groupKeyForPath(path){
  const m = path.match(/pixel_labs\/(.+)$/);
  if(!m) return path;
  const parts = m[1].split('/');
  parts.pop(); // tira filename
  if(parts.length === 0) return 'root';
  if(parts[0] === 'chars'){
    if(parts[1] === 'nature' && parts.length >= 3) return 'chars/nature/' + parts[2];
    if(parts[1]) return 'chars/' + parts[1];
  }
  return parts.slice(0, 2).join('/') || parts[0];
}

function groupByFolder(items){
  const groups = new Map();
  items.forEach(it => {
    const key = groupKeyForPath(it.path);
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  });
  return groups;
}

// Classifica items de um grupo em: bases + anims (com rep + frames).
// Ordem: parent (1ª base) → variações (outras bases) → anim reps → anim frames.
function classifyGroup(items){
  const bases = [];
  const animsByName = new Map();
  items.forEach(it => {
    const m = it.path.match(/\/anims\/([^\/]+)\//);
    if(m){
      const animName = m[1];
      if(!animsByName.has(animName)) animsByName.set(animName, []);
      animsByName.get(animName).push(it);
    } else {
      bases.push(it);
    }
  });
  // Ordem de direções pra base sprites
  const dirOrder = ['south','south-east','east','north-east','north','north-west','west','south-west'];
  const dirRank = (p) => {
    const fname = p.split('/').pop().replace('.png','').toLowerCase();
    const idx = dirOrder.indexOf(fname);
    return idx === -1 ? 999 : idx;
  };
  const isDeprecated = (p) => /\/_(old|deprecated|backup|_)_?/.test(p);
  bases.sort((a,b) => (isDeprecated(a.path)-isDeprecated(b.path)) || dirRank(a.path) - dirRank(b.path) || a.path.localeCompare(b.path));
  const anims = [];
  for(const [name, frames] of animsByName){
    frames.sort((a,b) => a.path.localeCompare(b.path));
    const sFrame = frames.find(f => /\/(south|S)\//i.test(f.path)) || frames[0];
    anims.push({name, rep: sFrame, frames: frames.filter(f => f !== sFrame)});
  }
  anims.sort((a,b) => a.name.localeCompare(b.name));
  return {bases, anims};
}

function groupParent(classified){
  return classified.bases[0] || classified.anims[0]?.rep;
}

// Lista ordenada com tipo de cada item: base/anim-rep/frame
function classifiedFlat(classified){
  const out = [];
  classified.bases.forEach((it, i) => out.push({type: i===0?'parent':'base', item: it}));
  classified.anims.forEach(a => out.push({type:'anim-rep', name:a.name, item:a.rep}));
  classified.anims.forEach(a => a.frames.forEach(f => out.push({type:'frame', anim:a.name, item:f})));
  return out;
}

// HTML do popup quando hover em group thumb (usado em Gallery e Editor list)
function buildGroupPopupHTML(folder, classified, opts={}){
  const folderName = folder.split('/').pop() || folder || 'group';
  const flat = classifiedFlat(classified);
  const styleMap = {
    parent: 'border-color:#f4c95d;outline:1px solid #f4c95d',
    base: 'border-color:#a89368',
    'anim-rep': 'border-color:#a85ba8',
    frame: 'border-color:#4a3826;opacity:.7',
  };
  const labelMap = {
    parent: '★ parent',
    base: 'variação',
    'anim-rep': (it) => `🎬 ${it.name}`,
    frame: (it) => `frame ${it.anim}`,
  };
  const total = flat.length;
  const baseCount = classified.bases.length;
  const animCount = classified.anims.length;
  const frameCount = classified.anims.reduce((s,a)=>s+a.frames.length, 0);
  let html = `<div class="pop-title">${folderName} · ${total} items<br><span style="font-weight:normal;opacity:.6;font-size:12px;">${baseCount} bases · ${animCount} anims · ${frameCount} frames</span></div>`;
  flat.forEach(entry => {
    const tip = (typeof labelMap[entry.type] === 'function' ? labelMap[entry.type](entry) : labelMap[entry.type]) + ' · ' + entry.item.name;
    const cls = opts.clickable ? ' data-click="1"' : '';
    html += `<img src="${entry.item.path}" title="${tip}" style="${styleMap[entry.type]||''}" data-path="${entry.item.path}"${cls}>`;
  });
  return html;
}

// Detecta sprites em todas 8 direções pra um asset (chars/{name}/{dir}.png)
// Lê summaryData global (filesystem scan vindo do gallery_server).
function findDirectionVariants(asset){
  if(!summaryData?.filesystem) return {};
  const m = asset.path.match(/^(.*\/)([^\/]+\.png)$/);
  if(!m) return {};
  const folder = m[1];
  const dirs = ['north','north-east','east','south-east','south','south-west','west','north-west'];
  const found = {};
  dirs.forEach(d => {
    const candidate = folder + d + '.png';
    const exists = summaryData.filesystem.some(f => f.path === candidate);
    found[d] = exists ? candidate : null;
  });
  return found;
}
