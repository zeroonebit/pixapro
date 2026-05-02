// PixaPro · constants.js — dados estáticos (MANIFEST, PIXELLAB_TOOLS, WANG_PRESETS)
// Carregado via <script src> antes do inline script. Top-level const é visível
// pra outros scripts no mesmo documento (escopo script-global).

// MANIFEST: edita aqui conforme novas gerações entram
// status: "ready" = baixado em /assets/.../inbox/  |  "pending" = ainda sendo gerado, fetch via API
const MANIFEST = [
  {name:"[HUD] combustivel_v2", id:"17aa311f-84e6-45ac-afbc-3b08b5bd6e1c", status:"ready", path:"../assets/pixel_labs/hud/combustivel_v2.png"},
  {name:"[HUD] graviton_v2", id:"464ceee6-179d-43d2-a87f-fbd216c0ca9c", status:"ready", path:"../assets/pixel_labs/hud/graviton_v2.png"},
  {name:"bromelia_red", id:"9f2e5c63-dc78-45dd-869d-d08485b5cdc8", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/bromelia_red.png"},
  {name:"palm_licuri_small", id:"5af8e2f8-0bc5-4739-8451-daae312e69bf", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/palm_licuri_small.png"},
  {name:"tree_umbuzeiro", id:"c6d57fae-3d47-4c7e-a06d-b67d7abce675", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/tree_umbuzeiro.png"},
  {name:"rock_quartzite_pink", id:"ea149954-619e-45e7-8998-df952bc3c93c", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/rock_quartzite_pink.png"},
  {name:"milk_bucket_full", id:"1fa190a2-e2a9-42f3-9af4-8fc83c8c33ba", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/milk_bucket_full.png"},
  {name:"alien_artifact_glowing", id:"32386db5-6296-4185-9f87-37528a5e65ed", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/alien_artifact_glowing.png"},
  // --- batch 2 ---
  {name:"bromelia_yellow", id:"db2e0ab4-ae07-4093-80d6-a134d596d295", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/bromelia_yellow.png"},
  {name:"palm_licuri_tall", id:"983f04c2-e937-4db6-b0f5-ca4f972e8f2d", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/palm_licuri_tall.png"},
  {name:"grass_tuft_dry", id:"fecd422f-b48f-4f4e-847d-3f4976da763c", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/grass_tuft_dry.png"},
  {name:"rock_dark_basalt", id:"5edfd9c5-a811-469c-8ebc-60995a1bc1b9", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/rock_dark_basalt.png"},
  {name:"rock_flat_chapada", id:"094591e4-6f2f-40fe-bd99-2f2f6497b05f", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/rock_flat_chapada.png"},
  // --- batch 3 ---
  {name:"water_trough_full", id:"e18bf1ca-a8ac-4f7f-ab6d-4bb311acf82f", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/water_trough_full.png"},
  {name:"water_trough_empty", id:"782314ea-b9c5-4a28-9980-d38bef5000ce", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/water_trough_empty.png"},
  {name:"hay_bale_square", id:"d2a745e6-5cb1-432c-b98c-8892cc739eb5", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/hay_bale_square.png"},
  {name:"hay_pile_loose", id:"73fd9e84-7604-41ce-9c56-09b8bb689663", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/hay_pile_loose.png"},
  {name:"feed_bucket", id:"17fdfaf6-b17f-4cbb-b254-4e2eb15534de", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/feed_bucket.png"},
  // --- batch 4 ---
  {name:"milk_bucket_empty", id:"f2704fef-4e29-4045-a087-6899a6684004", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/milk_bucket_empty.png"},
  {name:"windmill_small", id:"5eb12020-982a-4a43-a2a5-0e5cb79a2dca", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/windmill_small.png"},
  {name:"crop_circle_small", id:"47b5a78f-03d4-4a1c-b28a-5b8459cea11f", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/crop_circle_small.png"},
  {name:"crop_circle_complex", id:"e5cbb276-4b7f-43d1-bfa6-9f727a08b9f8", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/crop_circle_complex.png"},
  {name:"burned_grass_patch", id:"96326331-180d-4fdd-b81d-463712694d03", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/burned_grass_patch.png"},
  // --- batch 5 ---
  {name:"satellite_dish_rusty", id:"25484df0-9adb-4773-85e3-b3ffefd07a08", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/satellite_dish_rusty.png"},
  {name:"wrecked_truck", id:"7495e7f0-6eb3-40bc-9fa9-3f78108cc9df", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/wrecked_truck.png"},
  {name:"wrecked_truck_red", id:"768228fe-4842-4d95-8b21-5068a74b2c77", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/wrecked_truck_red.png"},
  {name:"wrecked_truck_blue", id:"81e8f2e6-2ae0-4f04-86d5-1d798fe9f44d", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/wrecked_truck_blue.png"},
  {name:"wrecked_truck_green", id:"e4bfbf89-6453-4afb-9f0e-a904b8744cbe", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/wrecked_truck_green.png"},
  {name:"wrecked_truck_yellow", id:"d662a078-f693-48a9-8998-4b5f17fb6022", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/wrecked_truck_yellow.png"},
  {name:"gas_can_red", id:"b7be67ef-5242-4b97-8cbb-91c05c7cefd1", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/gas_can_red.png"},
  {name:"gas_can_blue", id:"3ed17784-64ff-4b02-9761-a1be472837e6", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/gas_can_blue.png"},
  {name:"gas_can_green", id:"bc3b3645-ff05-4103-ae11-76a4ec0c58b6", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/gas_can_green.png"},
  {name:"gas_can_yellow", id:"150aa3a5-5858-4cf1-890c-b93e4b1e98da", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/gas_can_yellow.png"},
  {name:"meat_grinder_alien", id:"72294b90-4d18-4667-864e-9d2ca3ed5ecd", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/meat_grinder_alien.png"},
  {name:"radio_tower_small", id:"e03d02be-b84c-44ed-bc9d-af4392fdb28d", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/radio_tower_small.png"},
  // --- batch 6 ---
  {name:"lantern_post_off", id:"443908a9-e37d-43f1-9b88-6ed7717fcf08", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/lantern_post_off.png"},
  {name:"barrel_wood", id:"40b05634-3279-46c6-8303-e7103c834acd", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/barrel_wood.png"},
  {name:"barrel_metal_rusty", id:"285318dd-339e-488b-94e6-259f4080ec70", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/barrel_metal_rusty.png"},
  {name:"crate_wood_closed", id:"86b4ae1d-6886-4766-9774-cbd399657916", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/crate_wood_closed.png"},
  {name:"crate_wood_broken", id:"d68eeeb5-67a2-4138-a008-58bb6a488da2", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/crate_wood_broken.png"},
  // --- batch 7 FINAL ---
  {name:"flower_patch_purple", id:"70008e22-cb63-4ba4-94b5-574805f48f4a", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/flower_patch_purple.png"},
  {name:"flower_patch_white", id:"648275bc-f1f0-4df3-8daa-20ab9c3bcbe5", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/flower_patch_white.png"},
  {name:"bone_skull_cow", id:"88d07672-88ab-4a17-a506-b72f5e5dc956", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/bone_skull_cow.png"},
  {name:"church_small_white", id:"f63dbdb7-3238-4af9-b48e-4fc61879cc59", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/church_small_white.png"},
  {name:"mesa_rock_chapada", id:"a27ae87b-6a4a-4402-9e7b-c1f1a8497b8d", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/mesa_rock_chapada.png"},
  // --- scarecrows ---
  {name:"scarecrow_topdown_fresh", id:"d01e074c-4d30-4eb7-b711-8f809e2da666", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_topdown_fresh.png"},
  {name:"scarecrow_topdown_weathered", id:"406d28f8-ff00-4bd6-af2d-fda1a270c116", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_topdown_weathered.png"},
  {name:"scarecrow_topdown_alien", id:"acf1d568-81e3-48ef-8dc2-50b7be37bf12", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_topdown_alien.png"},
  {name:"scarecrow_side_fresh", id:"a4eae530-0c3f-4127-bdaf-e77e886ba3d4", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_side_fresh.png"},
  {name:"scarecrow_side_weathered", id:"9f3e1b99-80f1-4494-9382-f08081804e0d", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_side_weathered.png"},
  {name:"scarecrow_side_alien", id:"52ca1ac3-be83-41cb-823e-fc51abbe509a", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_side_alien.png"},
  // --- scarecrows v2 (cannon arms, charred hat, no legs) ---
  {name:"scarecrow_v2_topdown_fresh", id:"2e8c05c0-f380-4452-a502-d712ae6f5938", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_v2_topdown_fresh.png"},
  {name:"scarecrow_v2_topdown_weathered", id:"b3eed4d8-2fef-428c-9f0d-29345a2a1305", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_v2_topdown_weathered.png"},
  {name:"scarecrow_v2_topdown_decrepit", id:"0a95b6bb-30cc-4630-9045-60ce95f7c39c", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_v2_topdown_decrepit.png"},
  {name:"scarecrow_v2_side_fresh", id:"36884188-5c3e-49ba-8a51-b6867f7c9f1c", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_v2_side_fresh.png"},
  {name:"scarecrow_v2_side_weathered", id:"9361c7b2-4375-47e2-8dae-7ab1427b44f0", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_v2_side_weathered.png"},
  {name:"scarecrow_v2_side_decrepit", id:"6eba5182-edbc-484d-8834-e42edc145372", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_v2_side_decrepit.png"},
  // --- scarecrow droid v3 (robot+scarecrow hybrid) ---
  {name:"scarecrow_droid_side_fresh", id:"324acfb7-632d-471b-9f48-132fd8615b65", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_side_fresh.png"},
  {name:"scarecrow_droid_side_worn", id:"ed79e89d-ad82-4ebc-8e2d-6477bc67f700", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_side_worn.png"},
  {name:"scarecrow_droid_side_ancient", id:"ec7cb93f-3870-4c85-ab1f-62f55d463233", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_side_ancient.png"},
  {name:"scarecrow_droid_topdown_fresh", id:"b8899253-b45c-4b6b-902d-f5d6cb983f3a", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_topdown_fresh.png"},
  {name:"scarecrow_droid_topdown_worn", id:"343adbba-6dd2-4a23-81fb-ad786555c7f1", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_topdown_worn.png"},
  {name:"scarecrow_droid_topdown_ancient", id:"99773b90-9017-4682-b05a-b5b60a488e82", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_topdown_ancient.png"},
  // --- scarecrow droid v4 (top-down, 5 color variants) ---
  {name:"scarecrow_droid_td_fresh", id:"c81dbad2-71d3-4e36-9105-11e359e3adfb", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_td_fresh.png"},
  {name:"scarecrow_droid_td_worn", id:"3056dbe2-f9e7-41b5-bf86-468918f147f3", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_td_worn.png"},
  {name:"scarecrow_droid_td_ancient", id:"15ffbe65-5b17-4e44-b86f-29c4233ce552", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_td_ancient.png"},
  {name:"scarecrow_droid_td_dark", id:"e2019997-1b6a-4aff-883a-797882d72526", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_td_dark.png"},
  {name:"scarecrow_droid_td_brass", id:"49bfdf05-7edf-4f7c-a382-f2571cc95926", status:"ready", path:"../assets/pixel_labs/chars/nature/v2/inbox/scarecrow_droid_td_brass.png"},
];

// PixelLab MCP tool definitions — usadas pra gerar formulários no Editor tab
const PIXELLAB_TOOLS = [
  // CREATE
  {name:'create_object', cat:'create', label:'🆕 Create Object', args:[
    {k:'description', label:'Description', type:'textarea', required:true},
    {k:'size', label:'Size (px)', type:'number', def:64},
    {k:'view', label:'View', type:'select', opts:['top-down','3/4','side'], def:'top-down'},
    {k:'no_background', label:'No Background', type:'checkbox', def:true},
    {k:'palette_image_id', label:'Palette image ID (opt)', type:'text'},
  ]},
  {name:'create_character', cat:'create', label:'🆕 Create Character', args:[
    {k:'description', label:'Description', type:'textarea', required:true},
    {k:'size', label:'Size', type:'number', def:64},
    {k:'view', label:'View', type:'select', opts:['top-down','3/4','side','low top-down','high top-down'], def:'top-down'},
    {k:'n_directions', label:'N directions', type:'select', opts:['4','8'], def:'8'},
    {k:'palette_image_id', label:'Palette image ID', type:'text'},
  ]},
  {name:'create_map_object', cat:'create', label:'🆕 Create Map Object', args:[
    {k:'description', label:'Description', type:'textarea', required:true},
    {k:'size', label:'Size', type:'number', def:96},
    {k:'no_background', label:'No Background', type:'checkbox', def:true},
  ]},
  {name:'create_topdown_tileset', cat:'create', label:'🆕 Create Top-down Tileset', args:[
    {k:'description', label:'Description', type:'textarea', required:true},
    {k:'tile_size', label:'Tile size', type:'number', def:32},
    {k:'transition', label:'Transition (e.g. grass↔dirt)', type:'text'},
  ]},
  // MODIFY
  {name:'vary_object', cat:'modify', label:'🎨 Vary Object', args:[
    {k:'object_id', label:'Object ID', type:'text', autoFromAsset:true, required:true},
    {k:'description', label:'Variation description', type:'textarea', required:true},
    {k:'n_variations', label:'N variations', type:'number', def:3},
  ]},
  {name:'select_object_frames', cat:'modify', label:'🎯 Select Object Frames', args:[
    {k:'object_id', label:'Object ID', type:'text', autoFromAsset:true, required:true},
    {k:'frame_indices', label:'Frame indices (csv ex: 0,2,4)', type:'text', required:true},
  ]},
  {name:'dismiss_review', cat:'modify', label:'✋ Dismiss Review', args:[
    {k:'object_id', label:'Asset ID', type:'text', autoFromAsset:true, required:true},
  ]},
  // ANIM
  {name:'animate_object', cat:'anim', label:'🎬 Animate Object', args:[
    {k:'object_id', label:'Object ID', type:'text', autoFromAsset:true, required:true},
    {k:'description', label:'Animation description', type:'textarea', required:true},
    {k:'n_frames', label:'N frames', type:'number', def:4},
  ]},
  {name:'animate_character', cat:'anim', label:'🎬 Animate Character', args:[
    {k:'character_id', label:'Character ID', type:'text', autoFromAsset:true, required:true},
    {k:'description', label:'Animation description (e.g. walk, attack)', type:'textarea', required:true},
    {k:'n_frames', label:'N frames', type:'number', def:4},
    {k:'direction', label:'Direction', type:'select', opts:['','south','south-east','east','north-east','north','north-west','west','south-west'], def:''},
  ]},
  // META (get/list)
  {name:'get_object', cat:'meta', label:'📖 Get Object', args:[{k:'object_id', label:'Object ID', type:'text', autoFromAsset:true, required:true}]},
  {name:'get_character', cat:'meta', label:'📖 Get Character', args:[{k:'character_id', label:'Character ID', type:'text', autoFromAsset:true, required:true}]},
  {name:'get_map_object', cat:'meta', label:'📖 Get Map Object', args:[{k:'map_object_id', label:'Map Object ID', type:'text', autoFromAsset:true, required:true}]},
  {name:'get_topdown_tileset', cat:'meta', label:'📖 Get Topdown Tileset', args:[{k:'tileset_id', label:'Tileset ID', type:'text', autoFromAsset:true, required:true}]},
  {name:'list_objects', cat:'meta', label:'📋 List Objects', args:[]},
  {name:'list_characters', cat:'meta', label:'📋 List Characters', args:[]},
  {name:'list_topdown_tilesets', cat:'meta', label:'📋 List Topdown Tilesets', args:[]},
  // DELETE
  {name:'delete_object', cat:'delete', label:'🗑 Delete Object', args:[{k:'object_id', label:'Object ID', type:'text', autoFromAsset:true, required:true}, {k:'confirm', label:'Confirm', type:'checkbox', def:false, required:true}]},
  {name:'delete_character', cat:'delete', label:'🗑 Delete Character', args:[{k:'character_id', label:'Character ID', type:'text', autoFromAsset:true, required:true}, {k:'confirm', label:'Confirm', type:'checkbox', def:false, required:true}]},
  {name:'delete_topdown_tileset', cat:'delete', label:'🗑 Delete Topdown Tileset', args:[{k:'tileset_id', label:'Tileset ID', type:'text', autoFromAsset:true, required:true}, {k:'confirm', label:'Confirm', type:'checkbox', def:false, required:true}]},
];

// Wang tile presets — biome+season tilesets (cr31 corner-2-edge convention)
// 13 tilesets organizados em 3 grupos visuais (PixaPro lê o array flat,
// agrupamento por prefixo no name pra ordenação visual).
const WANG_PRESETS = [
  // ════════════════════════════════════════════════════════════
  // GROUND TRUTH (cores sólidas pra debug)
  // ════════════════════════════════════════════════════════════
  {
    id: 'ground-truth',
    biome: 'ref', season: 'ref',
    name: '[REF] Ground Truth (cr31 cores sólidas)',
    meta: 'cr31 corner-2-edge convention · 16 solid blocks · debug palette',
    sliced: true,
    sliceFn: (i) => `../assets/terrain/test/wang_${String(i).padStart(2,'0')}.png`,
    info: "Canonical reference de Wang tiles 2-edge corner-based. Cada tile = bitmask 4 bits dos 4 cantos (NW=1, NE=2, SE=4, SW=8). 16 tiles total cobrem todas as combinações lower/upper.",
    refs: [
      { url: 'http://www.cr31.co.uk/stagecast/wang/2corn.html', title: 'cr31 — Corner Wang Tiles (2-edge)' },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // GAME ATIVOS (32×32, in-game agora)
  // ════════════════════════════════════════════════════════════
  {
    id: '6068781a-970c-4f9b-99fe-48ee90110038',
    biome: 'costa', season: 'universal',
    name: '[GAME 32px] ocean ↔ sand',
    meta: 'PixelLab · 32×32 · sliced local · ATIVO IN-GAME',
    sliced: true,
    sliceFn: (i) => `../assets/terrain/ocean_sand_32/wang_${String(i).padStart(2,'0')}.png`,
    tileSize: 32,
    info: 'Base IDs: lower=ffb24a7a (ocean) upper=331870a5 (sand). Em uso no game.',
    refs: [{ url: 'https://api.pixellab.ai/mcp/tilesets/6068781a-970c-4f9b-99fe-48ee90110038/metadata', title: 'metadata' }],
  },
  {
    id: '91c93294-a4fd-425e-8b10-eb1baf32890d',
    biome: 'cerrado-verde', season: 'chuva',
    name: '[GAME 32px] dirt ↔ grass',
    meta: 'PixelLab · 32×32 · sliced local · ATIVO IN-GAME',
    sliced: true,
    sliceFn: (i) => `../assets/terrain/dirt_grass_32/wang_${String(i).padStart(2,'0')}.png`,
    tileSize: 32,
    info: 'Base IDs: lower=15201074 (dirt) upper=c92163d3 (grass). Em uso no game.',
    refs: [{ url: 'https://api.pixellab.ai/mcp/tilesets/91c93294-a4fd-425e-8b10-eb1baf32890d/metadata', title: 'metadata' }],
  },

  // ════════════════════════════════════════════════════════════
  // MAPA OPÇÃO 1 — CERRADO VERDE (16×16, v1)
  // 4 materiais (ocean, sand, cerrado_dirt, cerrado_grass) · 6 transitions
  // ════════════════════════════════════════════════════════════
  {
    id: '267836d8-f211-4260-8917-938216d7e0f1',
    biome: 'cerrado-verde', season: 'chuva',
    name: '[MAPA 1] cerrado_dirt ↔ cerrado_grass (BASE)',
    meta: 'PixelLab · 16×16 · base do bioma verde',
    image: 'https://api.pixellab.ai/mcp/tilesets/267836d8-f211-4260-8917-938216d7e0f1/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/267836d8-f211-4260-8917-938216d7e0f1/metadata',
    tileSize: 16,
    info: 'Base IDs: lower=bf4bf323 (cerrado_dirt_v1) upper=e8ede5e5 (cerrado_grass_v1). Tileset BASE do Mapa 1 verde.',
  },
  {
    id: 'ff745b17-679f-4213-b8e8-ce08bd349e86',
    biome: 'cerrado-verde', season: 'chuva',
    name: '[MAPA 1] ocean ↔ cerrado_dirt',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/ff745b17-679f-4213-b8e8-ce08bd349e86/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/ff745b17-679f-4213-b8e8-ce08bd349e86/metadata',
    tileSize: 16,
    info: 'Conecta ocean (2a7b28cc) ↔ cerrado_dirt_v1 (bf4bf323). Praia → terra.',
  },
  {
    id: '70faa0d8-8c99-449c-9699-8d56175824c7',
    biome: 'cerrado-verde', season: 'chuva',
    name: '[MAPA 1] ocean ↔ cerrado_grass',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/70faa0d8-8c99-449c-9699-8d56175824c7/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/70faa0d8-8c99-449c-9699-8d56175824c7/metadata',
    tileSize: 16,
    info: 'Conecta ocean (2a7b28cc) ↔ cerrado_grass_v1 (e8ede5e5). Margem de lago.',
  },
  {
    id: '448352c8-0e6e-4515-b860-e15f70e93722',
    biome: 'cerrado-verde', season: 'chuva',
    name: '[MAPA 1] sand ↔ cerrado_dirt',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/448352c8-0e6e-4515-b860-e15f70e93722/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/448352c8-0e6e-4515-b860-e15f70e93722/metadata',
    tileSize: 16,
    info: 'Conecta sand (343965f3) ↔ cerrado_dirt_v1 (bf4bf323). Areia → terra firme.',
  },
  {
    id: 'ac546645-a924-465e-b474-0b2ab10ecdd4',
    biome: 'cerrado-verde', season: 'chuva',
    name: '[MAPA 1] sand ↔ cerrado_grass',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/ac546645-a924-465e-b474-0b2ab10ecdd4/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/ac546645-a924-465e-b474-0b2ab10ecdd4/metadata',
    tileSize: 16,
    info: 'Conecta sand (343965f3) ↔ cerrado_grass_v1 (e8ede5e5). Praia → savana.',
  },

  // ════════════════════════════════════════════════════════════
  // MAPA OPÇÃO 2 — CERRADO SECO (16×16, v2)
  // ════════════════════════════════════════════════════════════
  {
    id: '5398c10b-52b2-45b3-b6ab-dac141249b1f',
    biome: 'cerrado-seco', season: 'seca',
    name: '[MAPA 2] cerrado_dirt ↔ cerrado_grass v2 (BASE)',
    meta: 'PixelLab · 16×16 · base do bioma seco',
    image: 'https://api.pixellab.ai/mcp/tilesets/5398c10b-52b2-45b3-b6ab-dac141249b1f/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/5398c10b-52b2-45b3-b6ab-dac141249b1f/metadata',
    tileSize: 16,
    info: 'Base IDs: lower=bf54c09f (cerrado_dirt_v2) upper=b18eb30d (cerrado_grass_v2). Bioma mais seco/dourado.',
  },
  {
    id: 'd395054a-5e3c-4e28-9b76-3d8ba82baec1',
    biome: 'cerrado-seco', season: 'seca',
    name: '[MAPA 2] ocean ↔ cerrado_dirt v2',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/d395054a-5e3c-4e28-9b76-3d8ba82baec1/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/d395054a-5e3c-4e28-9b76-3d8ba82baec1/metadata',
    tileSize: 16,
    info: 'Conecta ocean ↔ cerrado_dirt_v2 (bf54c09f).',
  },
  {
    id: '53598aae-b258-47c4-b3fc-6d8a33befe40',
    biome: 'cerrado-seco', season: 'seca',
    name: '[MAPA 2] ocean ↔ cerrado_grass v2',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/53598aae-b258-47c4-b3fc-6d8a33befe40/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/53598aae-b258-47c4-b3fc-6d8a33befe40/metadata',
    tileSize: 16,
    info: 'Conecta ocean ↔ cerrado_grass_v2 (b18eb30d).',
  },
  {
    id: 'e8b56eea-c20e-4ab9-9dff-bab3231eb333',
    biome: 'cerrado-seco', season: 'seca',
    name: '[MAPA 2] sand ↔ cerrado_dirt v2',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/e8b56eea-c20e-4ab9-9dff-bab3231eb333/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/e8b56eea-c20e-4ab9-9dff-bab3231eb333/metadata',
    tileSize: 16,
    info: 'Conecta sand ↔ cerrado_dirt_v2.',
  },
  {
    id: '43ac051b-7e0d-4c84-8575-4dbc269db8db',
    biome: 'cerrado-seco', season: 'seca',
    name: '[MAPA 2] sand ↔ cerrado_grass v2',
    meta: 'PixelLab · 16×16 · transition cross-tileset',
    image: 'https://api.pixellab.ai/mcp/tilesets/43ac051b-7e0d-4c84-8575-4dbc269db8db/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/43ac051b-7e0d-4c84-8575-4dbc269db8db/metadata',
    tileSize: 16,
    info: 'Conecta sand ↔ cerrado_grass_v2.',
  },

  // ════════════════════════════════════════════════════════════
  // SHARED 16×16 (compartilhado entre Mapa 1 e Mapa 2)
  // ════════════════════════════════════════════════════════════
  {
    id: '2640e1f9-1e20-464d-b4ca-f700357733ee',
    biome: 'costa', season: 'universal',
    name: '[SHARED] ocean ↔ sand (16px)',
    meta: 'PixelLab · 16×16 · costa universal (compartilhado Mapa 1 + 2)',
    image: 'https://api.pixellab.ai/mcp/tilesets/2640e1f9-1e20-464d-b4ca-f700357733ee/image',
    metadataUrl: 'https://api.pixellab.ai/mcp/tilesets/2640e1f9-1e20-464d-b4ca-f700357733ee/metadata',
    tileSize: 16,
    info: 'Base IDs: lower=2a7b28cc (ocean) upper=343965f3 (sand). Costa que serve pros 2 biomas (verde/seco).',
  },
];
