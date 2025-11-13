
  // --- State ---
  const slotsEl = document.getElementById('slots');
  const slotCountInput = document.getElementById('slotCount');
  const applySlotsBtn = document.getElementById('applySlots');
  const resetBtn = document.getElementById('reset');
  const clearBtn = document.getElementById('clear');
  const saveBtn = document.getElementById('save');
  const loadBtn = document.getElementById('load');
  const palette = document.getElementById('palette');
  const addCustom = document.getElementById('addCustom');
  const toggleClone = document.getElementById('toggleClone');
  const customName = document.getElementById('customName');

  const COSTS = {
  'A': 0, // Character Card
  'B': 20, // Neutral Card
  'C': 80, // Monster Card
  'D': 20, // Forbidden Card
  'BConverted': 10,
  'RConverted': 10,
  'Character Epiphany': 0,
  'Neutral Epiphany': 10,
  'Divine Epiphany': 20
  };

  //---LOGS---
  let logEl = document.getElementById('slotLog');
    if (!logEl) {
        logEl = document.createElement('div');
        logEl.id = 'slotLog';
        logEl.style.marginTop = '12px';
        logEl.style.fontSize = '12px';
        logEl.style.color = '#ccc';
        slotsEl.parentElement.appendChild(logEl);
    }

    function logAction(message) {
    const entry = document.createElement('div');
    entry.textContent = message;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight; // auto scroll to bottom
}

// Render logs from state.logs (call this after loading or resetting)
function renderLogs() {
    logEl.innerHTML = '';
    state.logs.forEach(msg => {
        const entry = document.createElement('div');
        entry.textContent = msg;
        logEl.appendChild(entry);
    });
    logEl.scrollTop = logEl.scrollHeight;
}

const ACTIONS = [
{
  name: 'Removal',
  cost: [0, 10, 30, 50, 70],
  extraCharCost: 20,
  apply: (slotData, usageCount = 0) => {
    if (!slotData) return 0;

    // Determine cost based on usageCount (or just always pick the first for simplicity)
    const costIndex = Math.min(usageCount, 4);
    let actionCost = ACTIONS.find(a => a.name === 'Removal').cost[costIndex];

    // Extra if Character Card
    if (slotData.type === 'A') actionCost += 20;

    // Save the action cost on the slot
    slotData.actionCost = actionCost;

    // Clear the slot
    slotData.type = null;
    slotData.label = null;
    slotData.modifier = null;
    slotData.img = null;
    slotData.action = null;

    return actionCost;
  }
},
  {
    name: 'Copy',
    cost: [0, 10, 30, 50, 70],
    apply: (slotData, targetSlot, usageCount = 0) => {
      if (!slotData || !targetSlot) return 0;

      // Copy card data
      targetSlot.type = slotData.type;
      targetSlot.label = slotData.label;
      targetSlot.modifier = slotData.modifier;
      targetSlot.img = slotData.img;

      // Cost based on usage
      const costIndex = Math.min(usageCount, 4);
      return ACTIONS.find(a => a.name === 'Copy').cost[costIndex];
    }
  },
];

  function getSlotCap() {
  const tier = parseInt(document.querySelectorAll('.controls input')[1].value, 10) || 1;
  return 30 + (tier - 1) * 10;
  }

function resetSlots() {
  const defaultSlots = Array(state.slotCount).fill(null);

  // Fill first 8 slots with Character Cards
  for (let i = 0; i < Math.min(8, state.slotCount); i++) {
    defaultSlots[i] = { type: 'A', label: 'Character Card' };
  }
  
  state.slots = defaultSlots;
  renderSlots();

  const logEl = document.getElementById('slotLog');
    if (logEl) logEl.innerHTML = '';
}


  let cloneMode = false;
  let state = {
    slotCount: parseInt(slotCountInput.value, 10) || 12,
    slots: [] // each slot: {type,label,modifier,img} or null
  };

  // --- Helpers ---
  function makeItemElement(itemData) {
    const div = document.createElement('div');
    div.className = 'item';
    div.draggable = true;
    div.dataset.type = itemData.type || 'X';
    div.textContent = itemData.label || itemData.type || 'Item';
    if (div.textContent.length > 10) div.classList.add('small');

    div.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', JSON.stringify(itemData));
      const parentSlot = div.closest('.slot');
      if (parentSlot && parentSlot.dataset.index !== undefined) {
        e.dataTransfer.setData('source-slot', parentSlot.dataset.index);
      }
    });

    div.addEventListener('click', () => placeIntoFirstEmptySlot(itemData));
    return div;
  }

  function removeSlotAt(index) {
  const slotData = state.slots[index];
  if (!slotData) return;

  // Mark as removed
  slotData.status = 'removed';
  slotData.action = 'Removal';

  // Remove from current position
  state.slots[index] = null;

  // Push it to the end
  state.slots.push(slotData);

  // Ensure array stays at original length
  while (state.slots.length > state.slotCount) {
    state.slots.splice(state.slotCount, 1);
  }

  renderSlots();
}


function renderSlots() {
  slotsEl.innerHTML = '';
  const count = state.slotCount;

  let totalCost = 0; // accumulate total cost across all slots

  for (let i = 0; i < count; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;
    slot.setAttribute('aria-label', `Slot ${i + 1}`);

    const itemData = state.slots[i];

    // --- Drag & Drop ---
    slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', e => {
  e.preventDefault();
  slot.classList.remove('drag-over');
  const json = e.dataTransfer.getData('text/plain');
  if (!json) return;
  const dropped = JSON.parse(json);
const sourceSlotIndex = e.dataTransfer.getData('source-slot');

// Only block palette drops of converted cards onto empty slots
if (!sourceSlotIndex && (dropped.type === 'BConverted' || dropped.type === 'RConverted') && !state.slots[i]?.type) {
  alert("You can only place this on a slot with an existing card.");
  return;
}


  if (dropped.type === 'modifier') {
    const old = slot.querySelector('.modifier-overlay');
    if (old) old.remove();

    const overlay = document.createElement('img');
    overlay.src = dropped.image;
    overlay.className = 'modifier-overlay';
    overlay.title = dropped.effect;
    slot.appendChild(overlay);

    if (!state.slots[i]) state.slots[i] = { type:'', label:'', modifier:'', img:'' };
    state.slots[i].modifier = dropped.effect;
    state.slots[i].img = dropped.image;
    renderSlots();
    return;
  }

  if (sourceSlotIndex) {
    const src = Number(sourceSlotIndex);
    if (src === i) return;
    state.slots[i] = {...state.slots[src]};
    state.slots[src] = null;
  } else {
    const prevLabel = state.slots[i]?.label || '(empty)';
        if (!state.slots[i]) state.slots[i] = {};

        state.slots[i].type = dropped.type;
        state.slots[i].label = dropped.label;

        // If the card is a converted card, mark it as converted
        if (dropped.type === 'BConverted' || dropped.type === 'RConverted') {
            logAction(`Slot ${i + 1} converted: ${prevLabel} → ${dropped.label}, Cost 10`);
        } else {
            logAction(`Slot ${i + 1} card changed: ${prevLabel} → ${dropped.label}`);
        }
    }

  renderSlots();
});

// --- Mobile-friendly menu button ---
const menuBtn = document.createElement('button');
menuBtn.className = 'slot-menu-btn';
menuBtn.textContent = '⋮';
menuBtn.style.position = 'absolute';
menuBtn.style.bottom = '4px';
menuBtn.style.right = '4px';
menuBtn.style.padding = '2px 6px';
menuBtn.style.fontSize = '12px';
menuBtn.style.border = 'none';
menuBtn.style.borderRadius = '4px';
menuBtn.style.background = 'rgba(255,255,255,0.1)';
menuBtn.style.color = 'white';
menuBtn.style.cursor = 'pointer';
menuBtn.style.zIndex = '10';

// When clicked, show the same modifier menu
menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    showModifierMenu(slot, slot.getBoundingClientRect().right, slot.getBoundingClientRect().bottom);
});

slot.appendChild(menuBtn);


    // --- Right-click modifier/action menu ---
    const modifierMenu = document.getElementById('modifierMenu');
document.body.appendChild(modifierMenu);
modifierMenu.style.position = 'fixed'; // fixed works best for right-click menus


    function showModifierMenu(slot, x, y) {
      modifierMenu.innerHTML = '';

      // Header: Epiphanies + Close
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '4px';

      const epiphTitle = document.createElement('span');
      epiphTitle.textContent = 'Epiphanies';
      epiphTitle.style.fontWeight = 'bold';
      header.appendChild(epiphTitle);

      const closeBtn = document.createElement('span');
      closeBtn.textContent = '✕';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.fontWeight = 'bold';
      closeBtn.addEventListener('click', () => modifierMenu.style.display = 'none');
      header.appendChild(closeBtn);

      modifierMenu.appendChild(header);

      // Epiphanies
      const modifierItems = Array.from(document.querySelectorAll('#modifiers .modifier'));
      modifierItems.forEach(mod => {
  const btn = createMenuButton(mod.dataset.effect, mod.querySelector('img').src, () => {
    const idx = Number(slot.dataset.index);
    if (!state.slots[idx]) state.slots[idx] = { type:'', label:'', modifier:'', img:'' };

    const prevModifier = state.slots[idx].modifier || 'None';
    state.slots[idx].modifier = mod.dataset.effect;
    state.slots[idx].img = mod.querySelector('img').src;

    // Log the epiphany being applied
    logAction(`Slot ${idx + 1}: Epiphany applied — ${mod.dataset.effect} (was: ${prevModifier})`);

    modifierMenu.style.display = 'none';
    renderSlots();
  });
  modifierMenu.appendChild(btn);
});


      // Actions
      const actionsTitle = document.createElement('div');
      actionsTitle.textContent = 'Actions';
      actionsTitle.style.fontWeight = 'bold';
      actionsTitle.style.marginTop = '8px';
      actionsTitle.style.marginBottom = '4px';
      modifierMenu.appendChild(actionsTitle);

      ACTIONS.forEach(action => {
  const btn = document.createElement('div');
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'flex-start';
  btn.style.gap = '6px';
  btn.style.padding = '4px 6px';
  btn.style.cursor = 'pointer';
  btn.style.borderRadius = '6px';
  btn.style.background = 'rgba(255,255,255,0.03)';
  btn.style.marginBottom = '4px';
  btn.textContent = action.name;

  btn.addEventListener('click', () => {
    const idx = Number(slot.dataset.index);
    if (!state.slots[idx]) state.slots[idx] = { type:'', label:'', modifier:'', img:'', action:null, actionCost:0 };

    const slotData = state.slots[idx];
    slotData.action = action.name;

    if (action.name === 'Removal') {
    slotData.status = 'removed';

    let tierCost = 0;
    let extraChar = 0;

    if (slotData.type !== 'RConverted') {
        // Count removed cards excluding RConverted
        const removedCount = state.slots.filter(s => s?.status === 'removed' && s?.type !== 'RConverted').length;

        const tierIndex = Math.min(removedCount - 1, action.cost.length - 1);
        tierCost = action.cost[tierIndex];

        if (slotData.type === 'A') extraChar = action.extraCharCost;
    }

    slotData.actionCost = tierCost + extraChar;

    logAction(`Slot ${idx+1} removed: Tier Cost ${tierCost}, Total Cost ${slotData.actionCost}`);
} if (action.name === 'Copy') {
        
    // Find an empty slot to place the copy
    const emptyIdx = state.slots.findIndex(s => !s);
    if (emptyIdx === -1) return; // no space

   // Count existing replicated slots (excluding the one we're about to create)
    const copyCount = state.slots.filter(s => s?.status === 'replicated').length;

    // Determine tiered cost
    const tierIndex = Math.min(copyCount, action.cost.length - 1);
    const tierCost = action.cost[tierIndex];

    slotData.actionCost = tierCost;

    // Extra cost if Character Card
    const extraChar = slotData.type === 'A' ? action.extraCharCost : 0;

    // Place the new copy
    state.slots[emptyIdx] = {
        type: slotData.type,
        label: slotData.label,
        modifier: slotData.modifier,
        img: slotData.img,
        status: 'replicated',
        action: 'Copy',
        actionCost: tierCost + extraChar
    };

    logAction(`Slot ${idx+1} copied: Cost ${tierCost}`);

    renderSlots();
}

    modifierMenu.style.display = 'none';
    renderSlots();
  });

  modifierMenu.appendChild(btn);
});

      modifierMenu.style.left = x + 'px';
      modifierMenu.style.top = y + 'px';
      modifierMenu.style.display = 'block';
    }

    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      const isOpen = modifierMenu.style.display === 'block' &&
                     modifierMenu.dataset.slot === slot.dataset.index;
      if (isOpen) {
        modifierMenu.style.display = 'none';
        return;
      }
      showModifierMenu(slot, e.pageX, e.pageY);
    });

    // --- Render item ---
    if (itemData) {
      if (itemData.type) slot.appendChild(makeItemElement(itemData));

      if (itemData.modifier) {
        const overlay = document.createElement('img');
        overlay.className = 'modifier-overlay';
        overlay.src = itemData.img || '';
        overlay.title = itemData.modifier;
        slot.appendChild(overlay);
      }

      if (itemData.status) {
        const statusTag = document.createElement('span');
        statusTag.textContent = itemData.status.charAt(0).toUpperCase() + itemData.status.slice(1);
        statusTag.style.fontSize = '10px';
        statusTag.style.color = '#aaa';
        statusTag.style.position = 'absolute';
        statusTag.style.top = '2px';
        statusTag.style.middle = '2px';
        slot.appendChild(statusTag);
      }

      const rem = document.createElement('button');
      rem.className = 'remove';
      rem.innerText = '✕';
      rem.addEventListener('click', ev => {
        ev.stopPropagation();
        state.slots[i] = null;
        renderSlots();
      });
      slot.appendChild(rem);
    }

    // --- Cost calculation ---
    let baseCost = itemData?.type && itemData.status !== 'replicated' ? COSTS[itemData.type] || 0 : 0;
    totalCost += baseCost;
    totalCost += itemData?.modifier ? COSTS[itemData.modifier] || 0 : 0;
    totalCost += itemData?.actionCost || 0;


    slotsEl.appendChild(slot);
  }

  // --- Display total ---
  let totalDisplay = document.getElementById('totalCostDisplay');
  if (!totalDisplay) {
    totalDisplay = document.createElement('div');
    totalDisplay.id = 'totalCostDisplay';
    totalDisplay.style.marginTop = '8px';
    totalDisplay.style.fontWeight = '600';
    slotsEl.parentElement.insertBefore(totalDisplay, slotsEl.nextSibling);
  }
  const cap = getSlotCap();
  totalDisplay.textContent = `Total: ${totalCost} / ${cap}`;
  totalDisplay.style.color = totalCost > cap ? 'red' : 'white';
}


function createMenuButton(label, imgSrc, onClick) {
  const btn = document.createElement('div');
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.gap = '6px';
  btn.style.padding = '4px 6px';
  btn.style.cursor = 'pointer';
  btn.style.borderRadius = '6px';
  btn.style.background = 'rgba(255,255,255,0.03)';
  btn.style.marginBottom = '4px';

  if(imgSrc){
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.width = '24px';
    img.style.height = '24px';
    btn.appendChild(img);
  }

  const lbl = document.createElement('span');
  lbl.textContent = label;
  btn.appendChild(lbl);

  btn.addEventListener('click', onClick);
  return btn;
}


  function placeIntoFirstEmptySlot(itemData) {
    const idx = state.slots.findIndex(x => !x);
    if (idx === -1) { alert('No empty slots available.'); return; }
    state.slots[idx] = { ...itemData };
    renderSlots();
  }

  function setupPalette() {
    const items = Array.from(palette.querySelectorAll('.item, .modifier'));
    items.forEach((it, idx) => {
      const isModifier = it.classList.contains('modifier');
      const data = isModifier
        ? { type:'modifier', effect: it.dataset.effect, image: it.querySelector('img')?.src || '' }
        : { type: it.dataset.type || 'T'+idx, label: it.textContent.trim() };

      it.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
        e.dataTransfer.setData('source-slot', '');
      });

      if (isModifier) {
        it.addEventListener('click', () => {
          placeModifierIntoFirstSlot(data);
        });
      }
    });
  }

  function placeModifierIntoFirstSlot(modifierData){
    const slot = Array.from(slotsEl.children).find(s => !s.dataset.modifier);
    if (!slot) return alert('No slots available for modifier.');
    const old = slot.querySelector('.modifier-overlay'); if(old) old.remove();
    const overlay = document.createElement('img');
    overlay.src = modifierData.image;
    overlay.className = 'modifier-overlay';
    overlay.title = modifierData.effect;
    slot.appendChild(overlay);

    const idx = Number(slot.dataset.index);
    if (!state.slots[idx]) state.slots[idx] = { type:'', label:'', modifier:'', img:'' };
    state.slots[idx].modifier = modifierData.effect;
    state.slots[idx].img = modifierData.image;
  }

  addCustom.addEventListener('click', ()=>{
    const name = customName.value.trim() || 'Custom';
    const type = 'C'+Math.floor(Math.random()*999);
    const el = document.createElement('div');
    el.className='item'; el.draggable=true; el.dataset.type=type; el.textContent=name;
    palette.appendChild(el);
    setupPalette();
    customName.value='';
  });

  toggleClone.addEventListener('click', ()=>{
    cloneMode = !cloneMode;
    toggleClone.textContent=`Clone Mode: ${cloneMode?'ON':'OFF'}`;
  });

  applySlotsBtn.addEventListener('click', ()=>{
    const newCount = Math.max(1, Math.min(48, parseInt(slotCountInput.value,10)||12));
    state.slotCount = newCount;
    state.slots = state.slots.slice(0,newCount);
    while(state.slots.length<newCount) state.slots.push(null);
    renderSlots();
  });

  clearBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all slots?')) return;
    state.slots = Array(state.slotCount).fill(null);
    const logEl = document.getElementById('slotLog');
    if (logEl) logEl.innerHTML = '';
    renderSlots();
  });

  resetBtn.addEventListener('click', () => {
  resetSlots();
  renderSlots();
});

// --- Encode/decode helpers ---
function encodeBase64(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function decodeBase64(str) {
    try {
        return JSON.parse(decodeURIComponent(escape(atob(str))));
    } catch {
        return null; // invalid Base64 or corrupted data
    }
}

// --- Copy current loadout to clipboard ---
saveBtn.addEventListener('click', () => {
    const payload = {
        slotCount: state.slotCount,
        slots: state.slots,
        logs: state.logs || [] // always include logs
    };
    const code = encodeBase64(payload);
    navigator.clipboard.writeText(code)
        .then(() => alert('Loadout code copied!'))
        .catch(() => alert('Failed to copy loadout code'));
});

// --- Paste a loadout code from user input ---
loadBtn.addEventListener('click', () => {
    const code = prompt('Paste loadout code:');
    if (!code) return;

    const data = decodeBase64(code.trim());
    if (!data || !Array.isArray(data.slots)) {
        alert('Invalid loadout code');
        return;
    }

    state.slotCount = data.slotCount || state.slotCount;
    state.slots = data.slots.concat();
    while (state.slots.length < state.slotCount) state.slots.push(null);
    state.logs = Array.isArray(data.logs) ? data.logs : [];

    renderSlots();
    renderLogs();
    logAction('Loadout restored from code');
    alert('Loadout loaded successfully!');
});



// --- Generate a shareable code ---
function generateLoadoutCode() {
    const payload = {
        slotCount: state.slotCount,
        slots: state.slots,
        logs: state.logs
    };
    return encodeBase64(payload);
}

// --- Load from a code ---
function loadFromCode(code) {
    try {
        const data = decodeBase64(code.trim());
        state.slotCount = data.slotCount || state.slotCount;
        state.slots = data.slots.concat();
        while (state.slots.length < state.slotCount) state.slots.push(null);
        state.logs = data.logs || [];
        renderSlots();
        renderLogs();
        logAction('Loadout restored from code');
    } catch (e) {
        alert('Invalid loadout code');
    }
}



  function init(){
    state.slotCount = parseInt(slotCountInput.value,10) || 12;
    state.slots = Array(state.slotCount).fill(null);
    state.actionUsage = { Removal: 0, Copy: 0, Conversion: 0 };

    resetSlots();
    setupPalette();
    renderSlots();
  }
  init();